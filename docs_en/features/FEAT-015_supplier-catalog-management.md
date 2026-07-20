# FEAT-015 - Supplier catalog management & operator curation

> **Status legend:** **VERIFIED** = stated in the PRD v0.7 or the one-week iOS pilot; **DRAFT / PROPOSED** = author's structuring, not confirmed; **TBD / PENDING** = reserved for a human decision (PRD §12), tracked as an ADR. **As built (2026-07-15):** operator catalog curation (the `catalog_curator` gate, product create/edit and approve/reject, the seeded catalog served through the public browse endpoint) is implemented and **verified on a local stack (not deployed)**; supplier self-service ingestion (ADR-006) stays specification.

## 1. Summary

The catalog layer that **guarantees every rendered item is a real, purchasable product** *(scoped by ADR-027, 2026-07-15: the guarantee governs the supplier track; temporary `source=public` demo products render display-only, never enter cart/checkout, and do not pass this feature's curation)*. It provides the SKUs the rendering engine (FEAT-005) is allowed to composite, with the attributes, availability, classification, and style mapping the render depends on. Because Spazio's central invariant is that **the AI never invents furniture** (PRD §1, BR-6, BR-14), the quality of this catalog is what makes that invariant true.

- **Pilot scope (VERIFIED):** the catalog is **curated by hand**. An operator manually loads a **small, clean set of SKUs from a few local suppliers**, each with photo, price, dimensions, stock, and a style tag, and approves what becomes renderable (pilot, "The human's role" and Day 1: *"manually load approximately 30–60 clean SKUs with photo, price, dimensions, stock, and style tag"*). This is the pilot's **real-SKU guarantee**: FR-056 (operator curation), FR-057 (required attributes), FR-058 (ready-made / in-stock classification), FR-059 (style-taxonomy mapping).
- **Full-product scope (VERIFIED, PRD, out of pilot):** suppliers **self-ingest** catalog data through supported channels (FR-055) and catalog data **synchronizes automatically**, in real time for ready-made stock (FR-060). Both are explicitly deferred: *"Supplier self-service ingestion through API, FTP, or Excel automation — the catalog is manually loaded"* (pilot, "Cut for the pilot").

## 2. Problem or need

The whole product rests on the promise that a rendered room can be **bought as shown**. That is only possible if the underlying catalog is real, priced, in stock, correctly sized, and style-tagged. The PRD lists **accurate supplier catalog data** as a dependency (PRD §10) and names **catalog curation** and **style taxonomy** as operator responsibilities (PRD §5). Incomplete or wrong catalog data breaks rendering eligibility (BR-1, BR-2 → FR-019) and, downstream, the real-SKU guarantee (BR-6, BR-14 → FR-016).

For the pilot the need is deliberately narrowed: rather than build ingestion infrastructure for a large catalog, a human curates a **small, clean catalog** so that *"every rendered product is real, priced, and in stock"* (pilot rationale). Building self-service ingestion is called out as *"unnecessary for 30–60 hand-picked SKUs"* (pilot). The full product later needs supplier self-service and automatic synchronization so onboarding can scale by region (NFR-016).

## 3. Affected user

- **Actor: Operator** (Spazio staff) — curates and approves catalog entries, maps products to the style taxonomy, and in the pilot loads the catalog by hand (PRD §5; pilot "The human's role"; FR-056, FR-059).
- **Actor: Supplier** — the source of catalog data; self-ingests entries in the full product (FR-055) and declares the required per-SKU attributes and classification (FR-057, FR-058). In the pilot the supplier does not self-serve; their data is entered by an operator.
- **Actor: System** — imports, stores, classifies, and (full product) synchronizes catalog data (FR-055, FR-057, FR-058, FR-060).
- **Downstream beneficiary: Homeowner/renter** — never interacts with this feature directly, but every product they see and buy comes from it.
- **Downstream consumer: FEAT-005 (AI rendering engine)** — matches and renders only from the catalog this feature produces.

## 4. Related requirements

Functional (canonical set for FEAT-015, per `05_backlog.md`):

- FR-056 — Operator curates and approves catalog entries *(pilot)*
- FR-057 — Store required catalog attributes per SKU *(pilot; minimum completeness threshold — Decided (pilot): all PRD BR-1 fields present, operator-enforced — see ADR-014)*
- FR-058 — Classify products as in-stock ready-made or made-to-order with required stock/lead-time data *(the pilot spec planned ready-made only; **as built the seeded catalog ships both** — 2 made-to-order of 11 SKUs, `backend/prisma/seed.ts`)*
- FR-059 — Map each product to the shared style taxonomy *(pilot; taxonomy values — Decided (pilot): 1–2 predefined visual styles + free-text description — see ADR-005; **as built the demo ships three styles**, `backend/prisma/seed.ts` — this applies wherever "1–2" appears in this doc)*
- FR-055 — Let suppliers self-ingest catalog data through supported channels *(full product, out of pilot; pilot ingestion — Decided (pilot): operator manually loads a CSV/Excel spreadsheet, no self-service channels — see ADR-006)*
- FR-060 — Synchronize supplier catalog data regularly, and in real time for ready-made stock *(full product, out of pilot; pilot sync — Decided (pilot): manual/on-demand refresh by the operator, no automated sync — see ADR-012)*

Non-functional:

- NFR-016 — Supplier onboarding scales by region *(directly cites FEAT-015 / FR-055–FR-060; pilot catalog is small, manually curated, one city — supplier partners and onboarding terms — Decided (pilot): hand-pick 2–4 Bogotá suppliers with a one-page written agreement — ADR-016)*
- NFR-017 — Architecture supports multiple countries and currencies *(catalog is scoped per market; pilot is single-market Bogotá, COP — initial markets — Decided (pilot): Bogotá, Colombia; COP only — ADR-015)*
- NFR-018 — Per-market taxes, payment methods, and legal config *(supplier/catalog onboarding resolves per `Market`; values — Decided (pilot): single market (Colombia), taxes/invoicing handled manually, no tax engine (revisit before scale) — ADR-018)*

Upstream/downstream dependencies (owned by other features, referenced for context, **not** FEAT-015's own FRs):

- FR-019 — Exclude catalog entries with incomplete required data from rendering eligibility *(FEAT-005; consumes the completeness state this feature sets)*
- FR-016 — Restrict every rendered item to a real, purchasable SKU *(FEAT-005; the invariant this catalog exists to uphold)*
- FR-018 / FR-020 — Availability and locality gates *(FEAT-005 / FEAT-004; consume stock and delivery-coverage data sourced here)*

## 5. Expected flow

The PRD §8 numbered basic flow describes the **user's** journey (photo → inputs → render → cart → checkout); it does **not** contain a numbered step for catalog management. This feature is a **prerequisite operator/supplier-side process** derived from the **pilot human-in-the-loop model** (pilot "The human's role"; Day 1 catalog load) and the **operator responsibilities in PRD §5** (catalog curation, style taxonomy). It underpins the matching-and-render portion of PRD §8 (steps where the AI decides which real, in-stock products fit) by guaranteeing a valid catalog exists first.

Pilot flow (VERIFIED — manual curation):

1. The operator **selects the supplier set** and obtains their product data (pilot Day 1; supplier partners — Decided (pilot): hand-picked 2–4 Bogotá suppliers with a one-page written agreement — ADR-016).
2. The operator **loads each SKU by hand** with its required attributes — photo, price, dimensions, stock, style tag (FR-057; pilot Day 1). Entries missing a required attribute are stored `incomplete` and flagged (FR-057, feeding FR-019).
3. Each product is **classified** — in the pilot, in-stock **ready-made** with current stock data (FR-058; pilot "real, in-stock catalog products").
4. Each product is **mapped to the shared style taxonomy** (the style tag) so it can be style-matched (FR-059; taxonomy values — Decided (pilot): 1–2 predefined visual styles + free-text description — ADR-005).
5. The operator **approves** the entry into the active, renderable catalog (or rejects it) (FR-056).
6. The approved catalog is then consumed by matching/rendering (FEAT-005) and locality/delivery filtering (FEAT-004).

Full-product additions (VERIFIED, out of pilot):

7. Suppliers **self-ingest** catalog data through supported channels (FR-055; pilot ingestion — Decided (pilot): operator manually loads a CSV/Excel spreadsheet, no self-service channels — ADR-006); imported entries still pass operator curation (FR-056) and completeness checks (FR-057 / FR-019).
8. Catalog data **synchronizes automatically** on a schedule, and **ready-made stock in real time** (FR-060; frequency — Decided (pilot): manual/on-demand refresh by the operator, no automated sync — ADR-012), keeping availability current for the rendering availability gate (FR-018).

## 6. Acceptance criteria

Acceptance criteria **are defined in the corresponding functional requirement (FR)**, not here (see `docs_en/03_requirements.md`). This FEAT only references them:

- FR-055 → criteria in `docs_en/03_requirements.md`
- FR-056 → criteria in `docs_en/03_requirements.md`
- FR-057 → criteria in `docs_en/03_requirements.md`
- FR-058 → criteria in `docs_en/03_requirements.md`
- FR-059 → criteria in `docs_en/03_requirements.md`
- FR-060 → criteria in `docs_en/03_requirements.md`

If you detect a new criterion during implementation, first add it to the FR (with its `TC-`) and then continue.

## 7. Business rules

Business rules **live in the FR** (`docs_en/03_requirements.md`); they are not rewritten here. Reference:

- FR-056 (derived from the pilot's manual-curation model and PRD §5 operator responsibilities: a small, clean, manually curated catalog ensures every rendered product is real, priced, and in stock. Catalog quality is a **human responsibility** — PRD §12.)
- FR-057 (PRD BR-1: catalog entries must include photos, dimensions, price, available colors, materials, stock, category, style attributes, production/delivery lead time, and warranty terms — minimum completeness threshold — Decided (pilot): all PRD BR-1 fields present, operator-enforced — see ADR-014)
- FR-058 (PRD BR-3, BR-4, BR-5: products are classified ready-made or made-to-order; ready-made requires current stock, made-to-order requires supplier-declared production and delivery times)
- FR-059 (PRD BR-16: products must be mapped to the shared style taxonomy — taxonomy values — Decided (pilot): 1–2 predefined visual styles + free-text description — see ADR-005)
- FR-055 (PRD FR-23: candidate ingestion channels are software integration, Excel, API, FTP — the pilot supported set — Decided (pilot): operator manually loads a CSV/Excel spreadsheet, no API/FTP/self-service — see ADR-006)
- FR-060 (PRD BR-32: supplier data must synchronize regularly, and in real time for ready-made stock — frequency — Decided (pilot): manual/on-demand refresh by the operator, no automated sync — see ADR-012)

## 8. Proposed technical design

*High-level only. Technology, ingestion, and synchronization mechanisms are human decisions (PRD §12), Decided for the pilot — see ADR-001 (stack), ADR-006 (manual CSV/Excel ingestion), ADR-012 (manual/on-demand sync); the choices below reflect those pilot decisions.*

### Frontend

- An **operator catalog console** *(as built 2026-07-15: a static web shell served at `/operator/console` (`operator/public/`) surfacing `incomplete`/`unmapped`/`pending` filters with approve/reject; `invalid-classification` remains unbuilt specification)* to load, edit, classify, style-tag, review, and **approve / reject** catalog entries. Client/tooling technology **Decided (pilot): native iOS (SwiftUI) app + one managed backend service + managed Postgres DB + object storage; specific tool choices left to implementation — see ADR-001**.
- (Full product) A **supplier-facing ingestion surface** (DRAFT / PROPOSED) for self-service submission (FR-055); presentation depends on the supported channel set **Decided (pilot): operator manually loads a CSV/Excel spreadsheet, no self-service ingestion surface — see ADR-006**.

### Backend

- **Catalog ingestion service** (DRAFT / PROPOSED): accepts supplier submissions via supported channels and imports entries for curation; rejects unsupported formats/channels with an `unsupported-format` status (FR-055). The concrete channels are **Decided (pilot): operator manually loads a CSV/Excel spreadsheet, no API/FTP/self-service ingestion — see ADR-006**. **In the pilot this path is not built — entries are loaded manually by an operator.**
- **Curation / approval workflow** (as built with different vocabulary: `approvalStatus` = `pending`/`approved`/`rejected`, approve/reject handlers in `backend/src/routes/operator/catalog.ts`): an entry moves from ingested/loaded → operator review → approved (renderable) or rejected (FR-056).
- **Completeness validation** (DRAFT / PROPOSED): checks required attributes on save; complete entries are marked renderable-eligible, incomplete entries are stored `incomplete` and flagged (FR-057), which the rendering-eligibility gate consumes (FR-019). The **minimum completeness threshold is Decided (pilot): all PRD BR-1 fields present, operator-enforced — see ADR-014**.
- **Classification logic** (as built: `ready_made` requires current stock, `made_to_order` requires production/delivery times; missing classification data marks the entry `incomplete` — the distinct `invalid-classification` flag (TC-101) remains unbuilt specification) (FR-058).
- **Style-taxonomy mapping** (DRAFT / PROPOSED): maps each product to the shared taxonomy; unmapped products are flagged `unmapped` and excluded from style matching (FR-059). The **taxonomy vocabulary is Decided (pilot): 1–2 predefined visual styles + free-text description — see ADR-005**.
- **Catalog synchronization** (DRAFT / PROPOSED — full product): scheduled sync for catalog data and **real-time sync for ready-made stock**; a per-feed failure records `sync-failed` (FR-060). The **sync frequency is Decided (pilot): manual/on-demand refresh by the operator, no automated sync — see ADR-012**; this path is **not built in the pilot** (manual load).

### Database

- Entities involved (canonical registry in `07_data_model.md`; fields **DRAFT / PROPOSED** — the stack is Decided (pilot, ADR-001); field-level schema still to be finalized):
  - `Product` — the real, purchasable SKU and its required attributes: `sku`, `name`, `category`, `photos`, `dimensions`, `price`, `currency`, `available_colors`, `materials`, `product_type` (`ready_made` / `made_to_order`), `stock_quantity` (required for ready-made), `production_lead_time` / `delivery_lead_time`, `warranty_terms`, `style_attributes`, `is_complete` (derived flag), `last_synced_at`. **(All field names DRAFT / PROPOSED.)**
  - `Supplier` — owner of products; `ingestion_channel` (candidate channels software integration / Excel / API / FTP — pilot ingestion — Decided (pilot): operator manually loads a CSV/Excel spreadsheet, no API/FTP/self-service — see ADR-006), `market_id`, `onboarding_terms_ref` (Decided (pilot): hand-picked 2–4 Bogotá suppliers with a one-page written agreement — ADR-016). **(Fields DRAFT / PROPOSED.)**
  - `StyleTaxonomy` and `Style` — the shared classification products are mapped to (FR-059); vocabulary **Decided (pilot): 1–2 predefined visual styles + free-text description — see ADR-005**. **(Fields DRAFT / PROPOSED.)**
  - `Operator` — the staff member who curates/approves and maps entries (FR-056, FR-059).
  - `DeliveryZone` / `Market` — supplier delivery coverage and market scoping, consumed downstream by locality filtering (FEAT-004) and multi-market onboarding (NFR-016, NFR-017); markets **Decided (pilot): Bogotá, Colombia; COP only — see ADR-015**.
- Field-level schema: the pilot subset (`Product` incl. `completenessStatus`/`approvalStatus`/`source`, `Supplier`, `Style`, `DeliveryZone`, `Operator`) is **as built** in `backend/prisma/schema.prisma` (Postgres per ADR-001) and modeled in `07_data_model.md`; `Market`/`StyleTaxonomy` and the full-product extensions remain specification.

### Security

- Only authorized **Operators** may approve entries into the renderable catalog; approval is a privileged action (NFR-008).
- (Full product) Supplier self-ingestion must authenticate the submitting supplier and scope writes to that supplier's own products (DRAFT / PROPOSED; NFR-008).
- Ingested/self-served entries must still pass **operator curation** before becoming renderable — self-service must not bypass the human approval gate (FR-055 → FR-056).

## 9. Required tests

Test cases live in `08_test_plan.md`, where **each `TC-` maps 1:1 to an acceptance criterion of an FR** (see `03_requirements.md`). The `TC-` rows for this feature's related FRs (FR-055–FR-060) **already exist** in `08_test_plan.md` (all with `Status: Pending`) — they are **TC-093 through TC-105**. **Build-status correction (2026-07-15):** the pilot slice is **built and verified on a local stack** — operator catalog curation (FR-056 create/edit + approve/reject, gated by the `catalog_curator` role on `POST/PATCH /api/v1/operator/catalog/products` and `.../approve|reject` — the `GET` queue read requires only a signed-in operator session), required-attribute storage (FR-057), ready-made/made-to-order classification (FR-058), and style-taxonomy mapping (FR-059) run against the backend, with the seeded catalog served through the public browse endpoint (`GET /catalog`) — so the earlier "since nothing is implemented" boilerplate is superseded for the pilot FRs; `Pending` here means **TCs pending automation**. Supplier self-service ingestion (FR-055) and automatic sync (FR-060) remain out of pilot/specification:

- FR-055 (full product) — **TC-093** (supplier submits via a supported channel → entries imported for curation) and **TC-094** (unsupported format/channel → `unsupported-format` status).
- FR-056 (pilot) — **TC-095** (operator approves an ingested/manually loaded entry → becomes an active, renderable product) and **TC-096** (operator rejects → marked `not-approved` and excluded from rendering).
- FR-057 (pilot) — **TC-097** (SKU with all required attributes → stored complete) and **TC-098** (SKU missing a required attribute → stored `incomplete` and flagged, excluded from rendering per FR-019).
- FR-058 (pilot) — **TC-099** (ready-made → carries current stock data), **TC-100** (made-to-order → carries supplier-declared production/delivery times), and **TC-101** (missing required stock/lead-time data → `invalid-classification`).
- FR-059 (pilot) — **TC-102** (product mapped → carries its style-taxonomy classification) and **TC-103** (no mapping → flagged `unmapped` and excluded from style matching).
- FR-060 (full product) — **TC-104** (scheduled sync with updates → catalog updated and ready-made stock synced in real time) and **TC-105** (feed sync fails → `sync-failed` status recorded for that supplier).

The **Security** check for curation (NFR-008 — a non-`catalog_curator` cannot create/approve an entry) is covered by **TC-107** (`08_test_plan.md`, Automated #34); still not covered: supplier-scoped write isolation for self-ingestion (NFR-008, full product). Add a `TC-` against the relevant FR when that criterion is written.

## 10. Documentation impact

- [ ] Update README.
- [ ] Update requirements.
- [ ] Update API spec.
- [ ] Update user guide.
- [ ] Not applicable.

## 11. Checklist before implementing

- [ ] The feature has a clear objective.
- [ ] It is linked to requirements.
- [ ] It has acceptance criteria.
- [ ] It has defined tests.
- [ ] The technical impact is understood.
- [ ] The user impact is understood.

## 12. Checklist before closing

- [ ] Code implemented.
- [ ] Tests executed.
- [ ] Acceptance criteria met.
- [ ] Pull request reviewed.
- [ ] Documentation updated.
- [ ] Release notes updated.
</content>
</invoke>
