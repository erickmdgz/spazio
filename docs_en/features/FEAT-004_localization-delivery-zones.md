# FEAT-004 - Localization & delivery coverage

> **Status legend used in this document:** **VERIFIED** = stated in the PRD v0.7 or the one-week iOS pilot; **DRAFT / PROPOSED** = reasonable structuring by the author, not yet confirmed; **TBD / PENDING** = reserved for a human decision (PRD §12), tracked as an ADR. **As built (2026-07-15):** single-market localization (Bogotá / COP — `GET /localization/resolve`, COP price display, the trivially-satisfied single-zone render gate) is implemented and **verified on a local stack (not deployed)**; multi-market resolution, multi-zone/multi-currency, and delivery fallback (FR-012/FR-013/FR-046-multi/FR-053) stay specification.
>
> *Naming note:* this document is filed as `FEAT-004_localization-delivery-zones.md`; its canonical name in `05_backlog.md` and the `08_test_plan.md` feature column is **"Localization & delivery coverage"**, used here for traceability consistency.

## 1. Summary

Resolve **where the user is** and turn that into the two facts the rest of the pipeline needs: **which suppliers can serve them** and **which delivery zone applies**, then show **prices in the local currency** and, when local delivery is unavailable, **offer a fallback** (nearby regions, alternative shipping, or pickup). This is the localization/delivery step of the PRD basic flow (PRD §8 step 2, "User activates localization") that gates matching and rendering downstream (FEAT-005) and the estimates/checkout experience (FEAT-009, FEAT-010).

- **Pilot scope (VERIFIED):** localization collapses to **fixed constants** — **a single delivery zone (Bogotá)** and **a single currency (COP)** (pilot "Included": "One city and one delivery zone: Bogotá", "One currency: COP"). In that setting, price display in local currency (FR-046) is exercised for **COP only**, and locality-restricted rendering (FR-020) is **trivially satisfied** because every catalog product belongs to the one Bogotá zone.
- **Full-product scope (VERIFIED, PRD, out of pilot):** dynamic resolution of a user location into the **applicable supplier set** (FR-012) and the **applicable delivery zone** (FR-013), locality-restricted rendering across multiple zones (FR-020), **multi-currency** price display (FR-046 beyond COP), and **delivery fallback** when local delivery is unavailable (FR-053). Multi-city / multi-country / multi-currency is explicitly **excluded from the pilot** (pilot "Scope Cuts & Triggers": "Localization complexity is deferred until the local loop works").

## 2. Problem or need

Spazio's core promise is furniture the user **can actually buy and receive**: the render must be limited to real products that are **deliverable to the user's locality** (PRD §4 BR-11), and pricing must be shown in the currency the user transacts in (PRD §4 BR-27). Localization is therefore not cosmetic — it is a **hard input to matching and rendering**: without a resolved locality the system cannot know which suppliers and which stock are eligible, and it cannot price the cart correctly. The PRD also flags **multi-country complexity** — taxes, payment rails, consumer protection, local legal requirements, and the fact that **split settlement may not be available in every country** — as a known risk (PRD §10), which is why the pilot deliberately fixes localization to one zone and one currency until the local loop is proven.

## 3. Affected user

- **Actor: System** — resolves the user's location into a supplier set (FR-012) and a delivery zone (FR-013), applies the locality gate to rendering (FR-020), formats prices in the local currency (FR-046), and computes delivery fallback (FR-053).
- **Beneficiary: Homeowner/renter** — sees only products deliverable to them, prices in their currency, and, when local delivery is not possible, an alternative (nearby region / alternative shipping / pickup) instead of a dead end. In the pilot this is "Valentina" in Bogotá, transacting in COP (pilot persona; pilot scope).
- **Supplier** — is included in or excluded from a user's candidate set based on the delivery zones it serves (PRD §5, FR-05; entity `Supplier` → `DeliveryZone`).
- **Operator** — indirectly: catalog curation (FEAT-015) and supplier onboarding define which zones exist; supplier partners and onboarding terms are **Decided (pilot): hand-pick 2-4 Bogotá suppliers with a one-page written agreement** (ADR-016), and initial markets/zones are **Decided (pilot): Bogotá, Colombia — COP only** (ADR-015).

## 4. Related requirements

Functional (canonical set from `05_backlog.md`):

- FR-012 — Determine applicable suppliers from the user's location *(full product; pilot fixes the market to a single Bogotá supplier set)*
- FR-013 — Determine the user's delivery zone from location *(full product; pilot operates a single delivery zone, Bogotá)*
- FR-020 — Restrict rendering to products deliverable to the user's locality *(full-product capability; trivially satisfied in the single-zone pilot)*
- FR-046 — Display prices in the user's local currency *(exercised in the pilot for a single currency, COP; multi-currency is full product)*
- FR-053 — Offer delivery fallback (nearby regions, alternative shipping, or pickup) when local delivery is unavailable *(full product, out of pilot)*

Non-functional:

- NFR-011 — Multi-currency payment processing *(pilot is single-currency COP; gateway is **Decided (pilot): a single PCI-compliant hosted checkout, one payment in COP, no split settlement (provider selection revisit before scale)** — see ADR-003)*
- NFR-016 — Supplier onboarding scales by region *(supplier partners/terms **Decided (pilot): hand-pick 2-4 Bogotá suppliers with a one-page written agreement** — see ADR-016)*
- NFR-017 — Architecture supports multiple countries and currencies *(explicitly traces to FEAT-004; pilot targets a single market/currency)*
- NFR-018 — Per-market taxes, payment methods, and legal config *(values **Decided (pilot): single market Bogotá, Colombia (COP); taxes/invoicing handled manually with no tax engine (revisit before scale)** — see ADR-015, ADR-018)*

## 5. Expected flow

This feature covers the **localization** portion of the PRD §8 basic flow and the delivery-related constraints it feeds; note that delivery fallback (FR-053) is derived from PRD §4 BR-12 rather than from a single numbered step:

1. (PRD §8 step 2) The user **activates localization**; the system obtains the user's location. *In the pilot this resolves to the single fixed market/zone (Bogotá, COP) rather than performing dynamic resolution.*
2. (Internal, full product) The system **determines the applicable suppliers** for that locality (FR-012); an unresolvable location returns an `unresolved-location` status with an empty supplier set.
3. (Internal, full product) The system **determines the delivery zone** and assigns it to the `Project` (FR-013); a location outside all defined zones returns a `no-coverage` status that **triggers delivery fallback** (FR-053).
4. (PRD §8 step 9, feeding FEAT-005) During matching/rendering, candidate products are **restricted to those deliverable to the locality** (FR-020); non-deliverable products are excluded with a `locality` exclusion.
5. (Cross-cutting, PRD §8 steps where prices appear — tags, cart, estimates, checkout) all prices are **displayed in the local currency** (FR-046) — COP in the pilot.
6. (Full product) When local delivery is unavailable, the system **offers a fallback** — nearby regions, alternative shipping, or pickup (FR-053); if no fallback exists, a `no-delivery-available` status is shown.

Adjacent steps handled by other features: account/guest entry (FEAT-001, out of pilot), style/budget/dimensions inputs (FEAT-002, FEAT-003), matching and render generation (FEAT-005), estimates and warranty display (FEAT-009), checkout and multi-currency payment/settlement (FEAT-010).

## 6. Acceptance criteria

Acceptance criteria **are defined in the corresponding functional requirement (FR)**, not here (see `docs_en/03_requirements.md`). This FEAT only references them:

- FR-012 → criteria in `docs_en/03_requirements.md`
- FR-013 → criteria in `docs_en/03_requirements.md`
- FR-020 → criteria in `docs_en/03_requirements.md`
- FR-046 → criteria in `docs_en/03_requirements.md`
- FR-053 → criteria in `docs_en/03_requirements.md`

If you detect a new criterion during implementation, first add it to the FR (with its `TC-`) and then continue.

## 7. Business rules

Business rules **live in the FR** (`docs_en/03_requirements.md`); they are not rewritten here. Reference:

- FR-012 (PRD BR-11: only products deliverable to the user's locality may ultimately be rendered; supplier partner set is **Decided (pilot): hand-pick 2-4 Bogotá suppliers with a one-page written agreement** — see ADR-016)
- FR-013 (pilot: a single delivery zone, Bogotá; additional zones/markets are **Decided (pilot): single market Bogotá, Colombia (COP) — no additional zones/markets in the pilot** — see ADR-015)
- FR-020 (PRD BR-11: only products deliverable to the user's locality may be rendered; fallback per FR-053/BR-12)
- FR-046 (PRD BR-27: prices are shown in the local currency; pilot is single-currency COP; initial markets and per-market taxes/payment methods are **Decided (pilot): single market Bogotá, Colombia (COP); taxes/payment handled manually with no tax engine (revisit before scale)** — see ADR-015, ADR-018)
- FR-053 (PRD BR-12: when local delivery is unavailable, the system may offer nearby regions, alternative shipping, or pickup)

## 8. Proposed technical design

*High-level only. Technology (ADR-001), the rendering/AI pipeline (ADR-002), the payment gateway (ADR-003), initial markets (ADR-015), and per-market taxes/legal config (ADR-018, ADR-019) are human-reserved decisions (PRD §12) that are now **Decided for the pilot** — see the referenced ADRs.*

### Frontend

- A **localization step** on the iOS client corresponding to PRD §8 step 2 (DRAFT / PROPOSED). In the pilot this is effectively fixed to Bogotá / COP (VERIFIED pilot scope); the general location-entry/permission UX is a full-product concern.
- **Local-currency formatting** wherever prices appear — product tags (FEAT-007), cart (FEAT-008), estimates (FEAT-009), checkout (FEAT-010) — driven by the resolved `Market` (FR-046). Pilot renders all prices in **COP**.
- On `no-coverage` / local delivery unavailable (full product), surface the **fallback options** (nearby regions / alternative shipping / pickup) or a clear `no-delivery-available` state (FR-053).

### Backend

- **Location-resolution service** (DRAFT / PROPOSED): maps a user location to a `Market` and a `DeliveryZone`, returning `unresolved-location` when it cannot resolve (FR-012) and `no-coverage` when the location falls outside all defined zones (FR-013). Geocoding/resolution mechanism is **DRAFT / PROPOSED**; the stack is **Decided (pilot): native iOS (SwiftUI) + one managed backend service + managed Postgres + object storage, single environment/region — see ADR-001**.
- **Supplier-coverage service** (DRAFT / PROPOSED): returns the set of suppliers whose `DeliveryZone` coverage includes the locality (FR-012). Candidate supplier/catalog data comes from FEAT-015; the supplier partner set is **Decided (pilot): hand-pick 2-4 Bogotá suppliers with a one-page written agreement — see ADR-016**.
- **Locality gate for matching/rendering:** exposes the deliverable-product constraint consumed by FEAT-005 so non-deliverable products are excluded with a `locality` exclusion (FR-020). Integration point with the rendering pipeline is **Decided (pilot): a hosted generative image API (image-to-image / inpainting) — see ADR-002** *(its hosted-image-API engine clause superseded by ADR-026, 2026-07-14 — self-hosted FLUX.2 Klein 4B via mflux; its mandatory-operator-QA clause superseded by ADR-025, 2026-07-14)*.
- **Delivery-fallback resolver** (DRAFT / PROPOSED): computes nearby regions / alternative shipping / pickup, or `no-delivery-available` (FR-053) from `DeliveryZone.fallback_options`.
- **Currency/market resolution:** attaches the market's currency to prices for display (FR-046). Multi-currency **payment** processing is a gateway capability (NFR-011) and the gateway is **Decided (pilot): a single PCI-compliant hosted checkout, one payment in COP, no split settlement (provider selection revisit before scale) — see ADR-003**; per-market taxes/payment methods/legal config are **Decided (pilot): single market Bogotá, Colombia (COP); taxes/payment handled manually with no tax engine (revisit before scale) — see ADR-015 / ADR-018**.

### Database

- Entities involved (from the canonical registry; treat concrete fields as **DRAFT / PROPOSED** until finalized against `07_data_model.md`):
  - `Market` — a launch region/city with its currency, taxes, payment methods, and legal configuration. Pilot: single market **"Bogotá, Colombia"**, `currency` = **COP**. `tax_config`, `payment_methods`, and `legal_config` are **(proposed)** structures whose pilot values are **Decided (pilot): taxes/invoicing handled manually with no tax engine (ADR-018 taxes), a single hosted checkout with one payment in COP and no split settlement (ADR-003 payment methods), photos/renders private by default with minimum data and consent (ADR-019 privacy/consumer protection); revisit before scale**; initial markets **Decided (pilot): Bogotá, Colombia — COP only (ADR-015)**.
  - `DeliveryZone` — a geographic area a supplier can deliver to, used for the locality gate and fallback. Pilot: one zone named **"Bogotá"**. `geo_definition` (postal codes / city list / polygon), `delivery_available`, and `fallback_options` (nearby regions / alternative shipping / pickup per BR-12) are **(proposed)**.
  - `Supplier` — carries `market_id` and serves one or more `DeliveryZone` areas (PRD FR-05, BR-11).
  - `Project` — carries the resolved `market_id` (locality for suppliers/delivery) and `currency`.
  - Reads/relates: `User.market_id`, and `Product` (via its `Supplier` → `DeliveryZone` coverage and its `currency`) for the FR-020 locality gate.
- These entities are modeled in `07_data_model.md` (see **Entity: Market**, **Entity: DeliveryZone**, **Entity: Supplier**, **Entity: Project**); their field-level schemas are captured there with undecided fields, values, and units tagged **(proposed)** / **TBD**.

### Security

- Location data is user data; access is restricted to the owning user's session and authorized operators. Broader data-privacy rules are human-reserved and **Decided (pilot): photos/renders private by default, minimum data (email, phone, shipping), short privacy notice + consent at first use, aligned with Colombia Ley 1581 (legal review before scale) — see ADR-019**.
- Per-market **legal/compliance** configuration (taxes, consumer protection) must be resolved from `Market` rather than hard-coded (NFR-018); the concrete rules are **Decided (pilot): taxes/invoicing handled manually with no tax engine (ADR-018), and photos/renders private by default with minimum data and consent aligned with Colombia Ley 1581 (ADR-019); revisit before scale — see ADR-018 / ADR-019**.
- Guardrail: the locality gate must **fail closed** — if a locality cannot be resolved or coverage is unknown, products must not be presented as deliverable (consistent with PRD BR-11); the exact fail-closed behavior is **DRAFT / PROPOSED** pending the criteria in FR-012/FR-013/FR-020.

## 9. Required tests

Test cases live in `08_test_plan.md`, where **each `TC-` maps 1:1 to an acceptance criterion of an FR** (see `03_requirements.md`). The `TC-` rows for this feature's FRs already exist in `08_test_plan.md` (all labeled "FEAT-004 Localization & delivery coverage"):

- FR-012 (full product) — **TC-022** suppliers returned for a resolvable location; **TC-023** an `unresolved-location` status with an empty supplier set for a location that cannot be resolved.
- FR-013 (full product; single zone in pilot) — **TC-024** the matching delivery zone is assigned to the project for a resolvable location; **TC-025** a `no-coverage` status for a location outside all defined zones (triggering delivery fallback per FR-053).
- FR-020 (full-product capability; trivial in the single-zone pilot) — **TC-038** only locally-deliverable products are rendered; **TC-039** a non-deliverable product is excluded with a `locality` exclusion.
- FR-046 (pilot, single currency COP) — **TC-080** all prices are displayed in the user's local currency.
- FR-053 (full product, out of pilot) — **TC-089** a fallback (nearby regions, alternative shipping, or pickup) is offered when local delivery is unavailable; **TC-090** a `no-delivery-available` status when no fallback option exists.

Cross-cutting NFR checks conceptually apply as their features ship: multi-currency processing (NFR-011), supplier onboarding by region (NFR-016), multi-country/currency architecture (NFR-017), and per-market taxes/payment/legal config (NFR-018).

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
