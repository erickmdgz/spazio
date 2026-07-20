# Spazio — One-Week iOS Pilot · Build Plan

> **Update (ADR-024, 2026-07-14) — read before anything else:** the native-iOS client and the one-week pilot *program* are **superseded** — the product continues on the **web app** (`web-demo/`) at class-demo scale, wired to the real backend. This plan remains the reference for the loop's design (data model §1.3, API §1.4, render pipeline §1.5, operator console §1.7, scope boundaries §0.1, build order §2.1). Read iOS-specific items (the `ios/` scaffold, TestFlight/Apple enrollment, SwiftUI screens in FEAT-002/003/007) as void or as their web equivalents.
>
> **Update (ADR-025, 2026-07-14):** the mandatory operator render-review gate is retired **entirely** — renders are published to the user immediately on generation success. Read FEAT-006, the operator-QA/release-gate steps (§1.5 step 6, §1.7 job 2), the `pending_review → approved | rejected` review states, `reviewed_by` stamping on renders, the render-review queue, the `render_reviewer` role, and TC-051/TC-052/TC-053 (plus the render approve/reject state-machine preconditions among TC-107..109) as **Retired — ADR-025**. The render lifecycle keeps only generation states (`queued → processing → completed | failed`, per `RenderRequest.status` in 07_data_model.md). ADR-002's **no-custom-model rule stands; its hosted-generative-image-API engine clause is superseded by ADR-026 (2026-07-14)** — the engine is now self-hosted FLUX.2 Klein 4B run locally via the mflux CLI (see the next update). Catalog curation (FEAT-015) and manual order forwarding (FEAT-011) are unchanged. The removal of the review flow from the code is implemented by FEAT-016 (#38) (see `05_backlog.md` and `decisions/ADR-025_autonomous-render-publication.md`).
>
> **Update (ADR-026, 2026-07-14):** the render engine is now **self-hosted FLUX.2 Klein 4B (Apache-2.0), run locally via the mflux CLI as a child process** (`mflux-generate-flux2-edit --model flux2-klein-4b`, quantized), replacing the earlier hosted-generative-image-API choice. This supersedes **only** ADR-002's hosted-API clause (its no-custom-model rule and the real-SKU-only invariant BR-6/BR-14/FR-016 are unchanged) and introduces **no API/data-model contract change** (the `POST /renders` → `202` + poll model already fits a slow local child process). New deployment constraint: mflux requires Apple MLX, so the render host **must be Apple Silicon** — the render engine runs as a **self-hosted mflux child process on a separate Apple-Silicon render worker** consuming the async render-job queue (the owner's M2 for the class demo); any residual "hosted image-gen API / vendor" phrasing below is superseded and should be read that way. In code, a new `MfluxRenderPipeline` replaces the placeholder; `FakeRenderPipeline` stays the default/test/CI implementation. See `decisions/ADR-026_self-hosted-render-engine.md`.
>
> **Update (ADR-027, 2026-07-15) — public-catalog bootstrap fallback:** this plan assumes an **operator-loaded supplier catalog** (30–60 curated SKUs, ADR-006/014), but **Spazio has no onboarded suppliers yet** — the two-sided cold start (PRD §10, top risk (2) in §0.1/§2.6). To give the loop real products to match/render/display in the meantime, ADR-027 adds a **temporary, clearly-labeled `source=public` bootstrap track** sourced from the **Amazon Berkeley Objects** dataset (**CC BY 4.0**, attribution required), seeded as an **ABO subset alongside** the supplier catalog. Public products are **display-only** — labeled **"not sold by Spazio"** with a **"View at retailer" outbound link**, **never** in cart/checkout/orders/commission/merchant-of-record, and **excluded from the render-to-purchase go/no-go metric** (§1.10 / NFR-006). The founding real-purchasable-SKU guarantee (**BR-6/BR-14/FR-016**) and the entire supplier-track loop this plan builds (matching → render → cart → single COP capture → PO forwarding) are **unchanged** and stay demoed with seeded fake-supplier data; ADR-027 only **qualifies** FR-016 and the vision thesis with a narrow dated caveat. Data-model impact is spec-level: a `source` provenance (`supplier|public`), a conditional `supplier_id`, and attribution fields (see `07_data_model.md`); a public-dataset fetch/import is a **new ingestion channel** beyond ADR-006's four (external egress recorded under NFR-019). New requirements FR-062..065 and NFR-019; new TCs from TC-110. This is **docs-first** — no code has shipped. See `decisions/ADR-027_public-catalog-bootstrap-fallback.md` and `features/FEAT-017_public-catalog-fallback.md`. *(Built & verified locally — 2026-07-15: the docs-first framing above is superseded — the `source=public` track has since landed and runs on the local dev stack (schema `source`/attribution fields and `RenderItem.source`/`attribution`/`outboundUrl`, `GET /catalog` + `/catalog/products/:id/image`, ~12 seeded ABO products, cart/metric exclusion of public, web Brand track), covered by `backend/test/public-catalog.test.ts`. Still not deployed or released; Local-supplier images remain placeholders. See `10_release_notes.md` "Current system (as built)" and FEAT-017.)*

**Status: APPROVED 2026-07-13. Build started.** Since approval, the backend §1 foundation scaffold landed on `develop` via **PR #21** (typed route stubs + Prisma schema + CI — no feature logic), the class demo via **PR #22** (`web-demo/`), and the operator console shell + operator session auth via **PR #27** (see the §1.7 as-built note). Per **#31** (post-ADR-024), the render-to-purchase loop now runs end-to-end — matching → render → operator QA → cart → estimates → checkout → forwarding — with the web app as the client over `/api/v1` and a seeded catalog (PR #32/#33), verified on a local Postgres stack; the ADR-002 image-gen and ADR-003 payment vendors remain fake drivers, and nothing is deployed. *(Additive marker, 2026-07-15: this sentence records the loop as it stood at #31. Since then the "operator QA" render-review step is retired (ADR-025 / FEAT-016 #38 — renders publish on generation success), the engine is self-hosted FLUX.2 Klein 4B via mflux (ADR-026), and the primary flow is user-curated browse-and-select rather than auto-match (ADR-028 / FEAT-018); the historical plan below is left unchanged.)* Produced by an orchestrated planning pass (foundation + 11 per-feature plans + sequencing synthesis + completeness critic) over the merged `docs_en/` and the **Accepted** ADR decisions. Per `11_implementation_flow.md`, this plan was the approval gate before any code; the §0.1 scope-boundary decisions were approved and now govern implementation.

> **Class-demo note —** A **time-boxed, 2-day academic class-project demo** — a *scoped subset* of this plan covering the render-to-purchase happy path — is delivered **separately** as a web app (`web-demo/`; see `docs_en/13_class_demo_scope.md` and **ADR-023**). It is a scoped visual demo, **not** production and **not** the full pilot: a Next.js 15 (App Router) + React 19 + TypeScript app with **no database** (in-memory state), a **mock** checkout (no real payment, no settlement), a **faked/cached** render, and a **seeded in-code catalog** *(describes the original ADR-023 standalone delivery, PR #22 — since #31/PR #32-33 `web-demo/` runs against the real `backend/` (Postgres, real render job queue, `RENDER_ENGINE=fake|mflux`); of this list only the mock checkout remains true, as an accepted demo limit, ADR-029)*. **For the demo scope only**, this supersedes ADR-001 (web app instead of native iOS), ADR-003/ADR-004 (mock checkout), and ADR-006/ADR-012/ADR-015 (seeded catalog instead of operator/self-service ingestion). This changes **nothing** about the real product decisions — the production plan and ADRs are unchanged; it only records how the class demo is delivered. **This document remains the full, production-oriented pilot build plan.**

**The one loop to prove:** a real user in Bogotá sees their own room photorealistically furnished with **real, purchasable** SKUs and buys ≥1 shown item in-session — *render-to-purchase* — operator-in-the-loop, manual fulfilment.

---

## §0. Executive summary

**What we build (from the Accepted ADRs — not reopened here):**

- Native **iOS (SwiftUI)** app + one small **managed backend** (REST/JSON over HTTPS) + **managed Postgres** + **object storage** for private photos/renders.
- **Rendering:** **self-hosted FLUX.2 Klein 4B run locally via the mflux CLI as a child process** (ADR-026, 2026-07-14 — supersedes ADR-002's ~~hosted generative image API~~ engine clause), compositing operator-curated product images into the room photo~~, gated by **mandatory operator QA** before the user sees it~~ (**QA gate retired — ADR-025, 2026-07-14**: renders publish immediately on generation success). No custom model (Klein is pretrained open weights). (The engine is now **decided** — no image-gen vendor pick; the open task is provisioning the Apple-Silicon render worker.)
- **Payments:** a single **COP** capture via a hosted PCI checkout; **no split settlement** — operator pays suppliers manually; commission 10% recorded manually.
- **Identity:** minimal contact capture at checkout (email + phone + shipping) — **no accounts, no login** (ADR-022).
- **Catalog:** operator loads 30–60 curated SKUs by spreadsheet; every SKU carries all required fields (ADR-006/014).
- **Operator console:** catalog curation and manual order forwarding (~~render review/approval~~ retired — ADR-025).

**Build order (detail in §2):** Foundation → [Supplier catalog · Localization · Room capture · Style & budget] → **AI render engine** → ~~Render review~~ (retired — ADR-025) → Tagging → Cart → Estimates → Checkout → Fulfilment.

**Effort (rough sizing):**

| Size | Items |
|---|---|
| **XL** | Foundation · FEAT-005 (render engine) |
| **M** | FEAT-015 catalog · 002 capture · 007 tagging · 008 cart · 010 checkout · 011 fulfilment |
| **S** | FEAT-004 localization · 003 style/budget · ~~006 render review~~ (retired — ADR-025) · 009 estimates |

**Honest schedule reality:** the source doc frames this as "one week." Building a from-scratch iOS app **plus** a backend **plus** a novel real-SKU render pipeline **plus** operator tooling is aggressive for 7 calendar days. §2 gives a realistic milestone view; the render engine (FEAT-005) and the catalog/operator loop are the schedule risk. I flag this rather than pretend the scope fits a literal week.

**Top risks:** (1) render fidelity — highest; (2) catalog cold-start / real-SKU coverage for Bogotá; (3) operator throughput as the loop bottleneck; (4) COP payment-provider capability; (5) inference cost per render.

---

## §0.1 Resolved scope boundaries — these govern §1–§3

The parallel planning surfaced **9 edge contradictions** between sections (foundation vs feature agents disagreed on a few FR boundaries). Below are the **pinned resolutions** — each the simplest choice consistent with the Accepted ADRs. **They override any contradicting detail in the sections that follow.**

1. **PurchaseOrder ownership.** **Checkout (FEAT-010)** creates the minimal `PurchaseOrder` row(s) at payment as pilot fulfilment scaffolding (one per supplier, or one per order); **FEAT-011** only *forwards* them. This is **not** the deferred FR-044 automation. Extend **TC-106** to assert the PO row exists post-payment.
2. **No manual "add to cart" in the pilot.** The cart is **auto-populated** from the render (FR-031). Manual add (**FR-030**, `POST /cart/items`, TC-056/057) is **deferred** — remove it from the foundation pilot API; the tag detail sheet (FEAT-007) offers **view + remove/swap** (FR-032/033), not "add."
3. **Project bootstrap.** A `Project` is created on **first input** (session bootstrap tied to the anonymous device token) *before* `POST /photos`. `POST /renders` **finalizes** the project — it does not create it.
4. **Pilot checkout scope.** Checkout builds **FR-042 (single COP capture) + ADR-022 contact + a recorded 10% commission value** only. FR-041 revalidation, FR-044 PO fan-out, FR-045 retention (and TC-072/073/078/079) are **out of pilot** — strike from foundation §1.4/1.6/1.11.
5. **Operator read endpoints.** Foundation gains ~~three~~ **two** operator list endpoints (~~a pending **render-review queue**~~ retired — ADR-025): a **curation catalog list** that surfaces incomplete/unmapped/not-approved SKUs, and a **paid/un-forwarded order queue**. Without them the console jobs have nothing to drive.
6. **Localization.** Keep one thin `GET /localization/resolve` (returns the fixed Bogotá zone + deliverable curated suppliers); list it in the foundation API. It satisfies TC-022/024.
7. **FR-019 eligibility filter.** The *automated* "exclude incomplete entries from rendering" filter is **out of pilot**; the guarantee is met **upstream** by operator-enforced completeness on load (**FR-057 / ADR-014**). Record this in `03_requirements.md`; retarget TC-037 to curation.
8. **Instrumentation emit points (NFR-006 render-to-purchase trail):** `render_created` → FEAT-005 · ~~`render_approved` → FEAT-006~~ (retired — ADR-025) · `render_viewed` → FEAT-007 · `cart_confirmed` → FEAT-008 · `checkout_started` + `purchase_completed` → FEAT-010.
9. **Estimates test data.** The pilot catalog is ready-made only, so include **1–2 made-to-order SKUs** so **TC-065**'s production-estimate path is actually exercised; otherwise scope TC-065 to **delivery estimate only** for the pilot.

> These 9 items are the concrete decisions I'd want your sign-off on — they shape the data model and API before the first line of code.

---

## 1. Foundation & architecture

This section defines the technical substrate every pilot feature is built on: the app
topology, the repository, the pilot data schema, the concrete API surface, how the
render and payment integrations are wired, the operator console, storage/auth/config,
CI/CD, and the cross-cutting concerns (currency, instrumentation, privacy). It builds
strictly to the accepted ADRs (ADR-001, ADR-002, ADR-003/004, ADR-019, ADR-022, and now ADR-026 for the render engine) and does
not reopen them. The render engine is now **decided** — self-hosted FLUX.2 Klein 4B via the mflux CLI (ADR-026), so there is no image-gen vendor pick; the remaining render-side implementation task — provisioning the Apple-Silicon render worker — was completed: the mflux stack runs on the owner's M2 (ADR-026; see its 2026-07-16 measurement note). For payments, where ADR-003/004 fixed an *approach* but not a *vendor* (hosted PCI checkout), the vendor pick is still called out as an explicit implementation task and
the capability is named by role. This section was written as a plan for human approval; since
approval, its backend scaffold landed via PR #21 (stubs only — see §1.2) and the operator console
shell + auth via PR #27 (see §1.7), while the iOS app and all feature logic remain unbuilt.

Scope discipline: this section only wires the pilot-included FRs. The detailed behaviour of
each feature (matching rules, tag layout, cart edits, checkout screens) lives in its own plan
section; here we establish the plumbing those sections plug into and the tables/endpoints they
share.

### 1.1 App topology

Two runtime components plus three managed dependencies, per ADR-001:

```text
  ┌─────────────────────┐        REST/JSON over HTTPS        ┌──────────────────────────┐
  │  iOS app (SwiftUI)   │  ───────────────────────────────▶ │  Backend service         │
  │  Valentina's iPhone  │  ◀───── 202 + poll GET ─────────  │  (one small managed svc) │
  │  inputs · render     │                                    │  matching · render orch. │
  │  view · tags · cart  │                                    │  cart · checkout · orders│
  │  · hosted checkout   │                                    └───────┬─────────┬────────┘
  └─────────────────────┘                                            │         │
                                                                     │         ├──▶ Apple-Silicon render worker
  ┌─────────────────────┐        authenticated web             ┌─────▼───┐     │    (self-hosted FLUX.2 Klein 4B
  │  Operator console    │  ───────────────────────────────▶  │ Postgres │     │     via mflux CLI child process;
  │  (Spazio staff, web) │                                     │ (managed)│     │     ADR-026; consumes render queue)
  │  catalog · POs       │  ◀───────────────────────────────  └──────────┘     ├──▶ Hosted PCI checkout
  └─────────────────────┘                                     ┌──────────┐     │    (single COP capture;
                                                              │ Object   │◀────┘     ADR-003/004; vendor = task)
                                                              │ storage  │  private photos + renders
                                                              └──────────┘
```

- **Client ↔ backend transport:** REST/JSON over HTTPS. Concrete base path, versioning and
  auth header are implementation details (ADR-001); `06_api.md` uses `/api/v1` illustratively.
- **Async rendering (job + poll).** A render takes minutes (~2–5 min soft target, no hard SLA —
  ADR-013)~~, and an operator must approve it before the user sees it (FR-027)~~ (**approval gate
  retired — ADR-025**). So render creation is **submit → poll**, never a blocking call:
  `POST /renders` returns `202 Accepted` with a `renderId` and status `queued`; the app polls
  `GET /renders/{renderId}` until status is `completed` (image + tags returned; published
  immediately on generation success — ADR-025) or `failed`. A push-notification nudge on
  completion is a nice-to-have and out of the pilot; polling is the contract. ~~The operator QA
  step sits inside this async window, so the poll may legitimately stay `pending_review` for a
  while.~~ (Retired — ADR-025.)
- **No always-on client session state on the server beyond the Project.** With no accounts
  (ADR-022), the app scopes its work with a lightweight anonymous per-install/session token
  (issued on first launch) so a Project's photos, renders and cart stay bound to that device and
  remain private (NFR-007). This is not a login and carries no password; concrete token scheme is
  an implementation detail (ADR-001).

### 1.2 Repository layout

At planning time the repo was **docs-only** (`/docs_en`, ADRs, CLAUDE.md); `backend/` (PR #21) and
`web-demo/` (PR #22) now exist on `develop`. Proposal: keep **one repository**
(the existing one) and add app subfolders, so the `main` + `develop` workflow, branch protection,
Issues and traceability defined in CLAUDE.md continue to govern all code in one place. A monorepo
also keeps the iOS app, the backend and the shared API contract versioned together for a one-week
build with one team.

```text
/                      (existing repo root; CLAUDE.md, /docs_en, ADRs stay as-is)
├── ios/               Native iOS app (SwiftUI) — ADR-001
│   ├── Spazio/            app target: inputs, render view, tags, cart, hosted-checkout screen
│   ├── SpazioTests/       unit tests (TC- happy + error paths)
│   └── SpazioUITests/     smoke UI test for the core loop
├── backend/           One small managed backend service — ADR-001
│   ├── src/
│   │   ├── api/           HTTP handlers (client + operator + internal routes)
│   │   ├── domain/        matching, render orchestration, cart, checkout, orders (business logic)
│   │   ├── integrations/  image-gen client, payment-gateway client, object-storage client
│   │   ├── data/          Postgres schema, migrations, repositories
│   │   └── config/        env/config loading, seeded pilot constants
│   └── tests/             backend unit/integration tests (TC-)
├── operator/          Minimal operator console (protected web UI) — served by/with backend
├── ops/               CI/CD workflows source, IaC/config, seed data (catalog CSV template)
└── docs_en/           (unchanged; architecture rule: keep code tied to FR/ADR/TC)
```

> **As-built note (PR #21):** the backend landed with `backend/src/routes | services | jobs | auth` plus `prisma/` (schema + migrations), which supersedes the proposed `backend/` internal layout above. **PR #27** added `operator/` (static console shell, served by the backend — see §1.7); the rest of this layout (`ios/`, `ops/`) remains the plan.

Architecture rule from `02_architecture.md` is honoured by this split: frontend, backend and data
concerns are separated; the frontend never queries the database directly; business logic lives in
`domain/`, not in SwiftUI views. If the team prefers physical separation, `ios/` and `backend/` can
later split into two repos without changing the contract; the monorepo is the recommended default
for the pilot.

### 1.3 Data layer — pilot subset of the model

`07_data_model.md` is the full-product draft. The pilot builds the reduced set below. Types stay
generic (UUID/String/Decimal/Enum/JSON/DateTime) per that document; Postgres is the engine (ADR-001).

**Tables built for the pilot**

| Table | Purpose in the pilot | Key pilot notes |
|---|---|---|
| `Supplier` | The 2–4 hand-picked Bogotá suppliers (ADR-016). | `ingestion_channel` fixed to manual (ADR-006); `payout_account_ref`/`commission_rate` unused (manual payout, flat 10% — ADR-003/007). |
| `Product` (SKU) | The 30–60 curated, purchasable SKUs; every render item maps here (BR-6/BR-14). | All BR-1 fields required to be renderable (ADR-014); `is_complete` derived; `style_attributes` carries the pilot style tag directly (no taxonomy engine — ADR-005); `last_synced_at` set by manual refresh (ADR-012). |
| `Style` | The 1–2 predefined visual styles for selection (ADR-005). | Seeded rows; `taxonomy_id` left null — no separate taxonomy table is built. |
| `Project` | One user session's inputs (style, free-text, budget min/max, dimensions, locality). | `user_id` null (no accounts — ADR-022); `keep_replace_map`/`room_change_description` unused in the pilot. |
| `RoomPhoto` | The uploaded room photo, private, quality-gated. | `source` = `upload` only (camera capture FR-006 is out); `is_private` default true (NFR-007/BR-33). |
| `RenderRequest` | One render job; carries cost tracking. | `type` = `generate` only (edits out); `inference_cost` recorded from day one (NFR-005); `counts_against_limit` unused (no metering — ADR-009). |
| `Render` | The generated image. | `status` keeps generation states only (`completed`/`failed` — ADR-025); ~~`pending_review`/`approved`/`rejected`; `reviewed_by`/`reviewed_at` set by operator (FR-027)~~ **Retired — ADR-025 (2026-07-14)**; `within_budget` uses 10% tolerance (ADR-008); private by default. |
| `RenderItem` | The tag link render→product (name, price, supplier, listing). | Every row references a real `Product` (FR-016); `is_kept_item` unused (keep-or-replace out). |
| `Cart` | Auto-populated suggestion from a render; confirmable. | `status` ∈ `draft`/`confirmed`; `confirmed_at` on explicit confirm (FR-035/BR-31). |
| `CartItem` | One line per shown product; captured price. | `unit_price` revalidated at checkout (FR-041/BR-24). |
| `Order` | Confirmed purchase from one payment. | **Minimal contact (ADR-022) is stored here**: `contact_email`, `contact_phone`, `shipping_address` captured at checkout; `commission_id` replaced by a recorded commission value (see below). |
| `PurchaseOrder` | One per supplier, forwarded manually. | `forwarded_by`/`forwarded_at` set by operator (FR-061); status advances manually. |
| `Payment` | The single COP capture. | Stores only `gateway_reference` + `status` (card data stays in the gateway — NFR-009); `split_settlement` unused (ADR-003). |
| `DeliveryZone` | One seeded row: Bogotá. | Locality gate (FR-020) resolves against this single zone; `fallback_options` unused (FR-053 out). |
| `Operator` | Console login accounts for Spazio staff. | `password_hash` used **for the operator surface only** (the pilot's sole authenticated actor); roles: curator / ~~render_reviewer~~ / order_handler (**render_reviewer retired — ADR-025**). |
| `Market` (reduced) | Single seeded config row: Bogotá / COP. | Provides the currency for FR-046; `tax_config`/`payment_methods`/`legal_config` handled manually (ADR-018). May be collapsed into config constants rather than a full table. |

**Minimal Contact (ADR-022).** ADR-022 says: capture email + phone + shipping at checkout, store
it with the order, no account/login. The plan stores these as columns on `Order` (as the draft data
model already does) rather than introducing a `User`/accounts entity. If a dedicated `Contact` shape
is preferred for cleanliness, it is a small satellite row linked 1:1 to `Order` and carrying only
those three fields — never a credential, never reused across sessions. Recommendation: embed on
`Order` to keep the "no accounts" invariant unambiguous.

**Draft entities explicitly OUT of the pilot (not built):**
`User`/accounts (ADR-022), `StyleTaxonomy` engine (folded into `Style` + `Product.style_attributes`,
ADR-005), `StockHold` (ADR-011), `OrderTracking` (full tracking out; FR-047 served by a status field
on `Order`/`PurchaseOrder`), `Commission` as its own table (10% is computed and recorded as a value
for manual reconciliation — ADR-007, not an automated billing entity), and `SponsoredPlacement`
(ADR-017). These remain in `07_data_model.md` as future scope.

### 1.4 API surface (pilot endpoints)

Concrete pilot endpoints from `06_api.md`, marked by actor. **Client** = iOS app; **Operator** =
console; **Internal** = service-internal (matching/orchestration, not client-exposed). Paths are the
illustrative `/api/v1/...` shapes; final contract shape is an implementation task.

| Actor | Endpoint | Does | FRs | TCs |
|---|---|---|---|---|
| Client | `POST /photos` | Upload room photo (multipart) + quality gate; store private | FR-005, FR-024 | TC-011, TC-012, TC-046, TC-047 |
| Client | `GET /styles` | List the 1–2 predefined styles | FR-007 | TC-015 |
| Client | `POST /renders` | Submit render job with style/free-text/budget/dimensions → `202` + renderId | FR-007–FR-009, FR-011, FR-014–FR-023 | TC-016–TC-047 (matching/render set) |
| Client | `GET /renders/{id}` | Poll status; when ~~`approved`~~ `completed` (ADR-025), return image + tags | FR-015~~, FR-027~~ | TC-028~~, TC-051, TC-053~~ |
| Client | `GET /renders/{id}/items` | List tagged products on the render | FR-028 | TC-054 |
| Client | `GET /renders/{id}/items/{itemId}` | Tap a tag → product detail | FR-029 | TC-055 |
| Client | `GET /cart` | Auto-populated cart contents | FR-031, FR-032 | TC-058, TC-059 |
| Client | ~~`POST /cart/items`~~ | **Struck per §0.1#2** — no manual add in the pilot; the cart is auto-populated from the render (FR-031) | ~~FR-030~~ | ~~TC-056, TC-057~~ |
| Client | `DELETE /cart/items/{id}` | Remove a cart item | FR-033 | TC-060 |
| Client | `POST /cart/confirm` | Explicit cart confirmation (gate to pay) | FR-035 | TC-063, TC-064 |
| Client | `GET /cart/estimates` | Per-item production/delivery estimate | FR-036 | TC-065, TC-066 |
| Client | `GET /localization/resolve` | Thin resolver: returns the fixed Bogotá/COP zone + deliverable curated suppliers (§0.1#6) | FR-012, FR-013 | TC-022, TC-024 |
| Client | `POST /checkout` | FR-042 single COP capture + ADR-022 contact + recorded 10% commission; creates Order + PurchaseOrder scaffolding (§0.1#1/#4) | FR-042, FR-046 | TC-074, TC-075, TC-080 |
| Client | `POST /payments/{id}/confirm` | Finalize the single COP capture | FR-042 | TC-074, TC-075 |
| Client | `GET /orders/{id}` | Order + per-PO status (minimal) | FR-047 | TC-081, TC-082 |
| Operator | `POST /operator/catalog/products` · `PATCH .../{sku}` | Curate/approve SKUs; store BR-1 attributes; classify; map style | FR-056, FR-057, FR-058, FR-059 | TC-095–TC-103 |
| Operator | ~~`POST /operator/renders/{id}/approve` · `.../reject`~~ | **Retired per ADR-025 (2026-07-14)** — the human render gate is removed; renders publish on generation success | ~~FR-027~~ | ~~TC-051, TC-052~~ |
| Operator | `POST /operator/purchase-orders/{id}/forward` | Mark a PO forwarded to the supplier | FR-061 | TC-106 |
| Internal | `GET /catalog/products` | Matching input: real, in-stock, complete, deliverable SKUs | FR-014, FR-018, FR-019, FR-020 | TC-026, TC-027, TC-034–TC-039 |

**Endpoints intentionally NOT built in the pilot** (present in `06_api.md`, deferred): accounts/auth
(`/auth/*`, FR-001–003), guest-contact feature endpoint (FR-004 — pilot instead embeds contact on the
order), camera capture (`/photos/capture`, FR-006), localization/delivery-coverage endpoints
beyond the thin resolver (dynamic FR-020 coverage logic and FR-053 fallback — replaced by the single
seeded Bogotá zone), render edits/quota (FR-048–052), cart swap (`PATCH /cart/items`, FR-034), supplier
self-ingest (FR-055), automated sync (FR-060).
Per **§0.1#6**, localization is *not* on this deferred list: one thin `GET /localization/resolve` is
exposed and returns the fixed Bogotá/COP zone + deliverable curated suppliers, satisfying TC-022/TC-024.

### 1.5 Rendering integration (ADR-002)

Pipeline is **match → render → tag → publish** (~~operator QA → release~~ **QA step retired — ADR-025**), honouring the "AI never invents furniture"
invariant. The engine is **decided (ADR-026): self-hosted FLUX.2 Klein 4B run locally via the mflux CLI as a child process**, compositing
operator-curated product images into the room photo; no custom model. **There is no image-gen vendor to pick**; the render-side Day-1 task is standing up the Apple-Silicon render worker (mflux requires Apple MLX) and the compositing prompt/pipeline.

1. **Upload & quality gate** — `POST /photos` stores the photo to private object storage and runs the
   quality check; unusable photos are rejected with a retake request (FR-024, TC-047). → `RoomPhoto`.
2. **Submit job** — `POST /renders` creates `Project` + `RenderRequest` (status `queued`), returns
   `202` + renderId. No blocking (ADR-013).
3. **Match real, in-stock SKUs** — the matching step (internal `GET /catalog/products`) selects only
   SKUs that are real and purchasable (FR-016), in current stock (FR-018), complete on all BR-1 fields
   (FR-019), deliverable to Bogotá (FR-020), style/dimension-fit and within budget+10% (FR-014, FR-017,
   FR-021), with disclose/alternative behaviour on unmet budget or no match (FR-022, FR-023). Match-then-
   render is the order ADR-002 requires so nothing is fabricated.
4. **Invoke the self-hosted mflux child process** (`mflux-generate-flux2-edit --model flux2-klein-4b`, quantized; ADR-026) on the Apple-Silicon render worker — composite the matched SKUs' curated product images into the room
   photo, scaled by the approximate dimensions (FR-015, FR-017). The composite is assembled *from actual
   catalog product images*, which is the structural guard for BR-6/BR-14.
5. **Store render + tags** — persist `Render` (image_ref → private object storage, status
   `completed` — ~~`pending_review`~~ retired, ADR-025) and one `RenderItem` per shown SKU carrying name, price, supplier, listing
   (FR-028). Record `RenderRequest.inference_cost` (NFR-005). A fabrication check validates every
   `RenderItem` resolves to an existing `Product`; a mismatch blocks the render with a `fabricated-item`
   flag (FR-016, TC-031).
6. ~~**Operator QA gate (mandatory)** — the render is invisible to the user until an operator approves it
   via the console (`/operator/renders/{id}/approve`). Reject → `rejected`, never shown (FR-027, TC-052/53).
   This human gate is the ADR-002 backstop against a plausible look-alike slipping through.~~
   **Retired — ADR-025 (2026-07-14):** renders are published immediately on generation success; no
   operator reviews, approves, or rejects renders.
7. **Publish** — on generation success (~~on approval~~ — ADR-025), the cart is auto-populated from
   `RenderItem`s (FR-031) and `GET /renders/{id}` returns the image + tags to the polling app.

### 1.6 Payments integration (ADR-003 / ADR-004)

- **Single COP capture** through a hosted PCI-compliant checkout (NFR-009). The gateway/provider is an
  **implementation task** (approach fixed, vendor not — must support COP + PCI + an iOS flow).
- **Flow:** `POST /checkout` creates the `Order` with the embedded contact (ADR-022), creates **one
  `PurchaseOrder` per supplier** as pilot fulfilment scaffolding (§0.1#1 — not the deferred FR-044
  fan-out), computes totals and records a **10% commission value** for manual reconciliation (ADR-007),
  and returns a payment-intent placeholder from the hosted checkout. Per §0.1#4, FR-041 revalidation
  and FR-045 retention are out of the pilot. The app completes payment through the
  gateway's hosted flow; `POST /payments/{id}/confirm` (plus a provider webhook) marks `Payment.status =
  captured` and the order paid (FR-042, TC-074/75).
- **No split settlement** (FR-043 out). The Spazio operating entity is merchant of record and **pays
  suppliers manually** (ADR-004); the operator forwards each PO (FR-061). Commission is **not**
  auto-retained (NFR-012 deferred) — it is a recorded value for manual bookkeeping.
- **Card data** never touches Spazio storage; only `gateway_reference` is persisted (NFR-009).

### 1.7 Operator console

A minimal internal, authenticated web tool served by/alongside the one backend service (no second
backend). Two jobs, both pilot-core (a third — render review — was retired by ADR-025):

1. **Catalog curation** — load the 30–60 SKU spreadsheet (CSV/Excel), validate BR-1 completeness
   (ADR-014), classify ready-made vs made-to-order with required stock/lead-time data, map the pilot
   style tag, approve/reject into the renderable catalog; manual/on-demand refresh (FR-056–059, ADR-006/012;
   TC-095–105). Self-service supplier ingestion (FR-055) is out.
2. ~~**Render review/approval** — a queue of `pending_review` renders showing the original room photo,
   the composite, and the matched SKU list; approve or reject (FR-027). This is the release gate in §1.5.~~
   **Retired — ADR-025 (2026-07-14):** renders publish immediately on generation success; there is no
   review queue.
3. **Manual order forwarding** — list paid orders and their POs; forward to the supplier (out-of-band)
   and mark forwarded (FR-061).

**Auth:** the console is the pilot's **only authenticated surface** — operators sign in against the
`Operator` table (hashed credentials), satisfying the intent of NFR-008 for catalog~~/render~~/order
operations (render review retired — ADR-025). End users have no accounts (ADR-022).

> **As-built note (PR #27):** the console shell + auth land with this PR. A static three-queue
> shell (`operator/public`) is served by the backend at `/operator/console` (no second backend);
> operators sign in via `POST /api/v1/operator/session` against the `Operator` table
> (scrypt-hashed credentials; HMAC-signed httpOnly session cookie keyed by
> `OPERATOR_SESSION_SECRET` — §1.8), replacing PR #21's interim shared-secret header. Approve /
> reject / forward stamp `reviewed_by` / `forwarded_by` from the session, and the three §0.1#5
> queue reads drive the shell. Per-action role enforcement and the §2.4 NFR-008 security TCs landed
> with **#34** (TC-107..109); the full curation/review/forwarding UX (CSV import, signed-URL image
> review) remains with FEAT-015/006/011.

### 1.8 Storage, auth, config, environments

- **Object storage for private photos/renders (BR-33 / NFR-007).** `RoomPhoto` and `Render` images live
  in private buckets with no public ACLs; access is via short-lived signed/expiring URLs granted only to
  the owning session ~~and the reviewing operator~~ (operator render review retired — ADR-025). Minimum-data retention per ADR-019.
- **Auth model (summary):** operator console = authenticated login (Operator table). Client app = no user
  login; an anonymous per-install/session token scopes a Project's private assets (NFR-007). Contact is
  captured only at checkout and stored on the order (ADR-022).
- **Config & secrets:** zero secrets in git (CLAUDE.md rule 4) — DB creds, object-storage creds,
  payment-gateway keys, and the operator session-signing key come from environment variables /
  a managed secret store. *(ADR-026: the render engine is now self-hosted mflux run as a child process on the Apple-Silicon render worker, so there is **no image-gen API key** — configuration is the mflux model id/quantization and the worker's queue connection, not a third-party render vendor secret.)* Pilot constants are seeded config, not scattered literals: market = Bogotá,
  currency = COP (ADR-015), budget tolerance = 10% (ADR-008), commission = 10% (ADR-007), render soft
  target ~2–5 min with no SLA (ADR-013).
- **Environments:** a **single** managed environment/region (ADR-001) — one Postgres, one bucket set, one
  backend deployment. There is no separate staging in the one-week window; the Day-5 internal dry run uses
  a flagged **test dataset** in the same environment, with a clean cutover to real pilot data for Days 6–7
  so test rows never pollute the render-to-purchase metric.

### 1.9 CI/CD

Matches the `main` + `develop` model and branch protection already defined in CLAUDE.md, via GitHub Actions:

- **Branch protection:** no direct commits/pushes to `main` or `develop`; all changes via PR; merge-commit
  strategy (no squash/rebase); PR→`develop` review recommended, PR→`main` (release/hotfix) requires ≥1
  approval; branches `feature/FEAT-XXX-…` / `fix/BUG-XXX-…` off `develop`; commits carry the ID prefix.
- **Checks on every PR:** backend build + unit/integration tests (TC- happy path + error paths), lint/format,
  **secret scan** (enforces rule 4), dependency review (no unjustified deps). iOS: build + SwiftUI unit tests
  and a core-loop smoke UI test.
- **iOS distribution:** on merge to `develop` (or on a release tag) CI builds the app and uploads to
  **TestFlight** for the pilot group (Days 6–7). Apple signing certs/provisioning profiles are CI secrets in
  the managed secret store — never in git.
- **Backend deploy:** on release (`develop → main`, ≥1 approval) deploy to the single environment, tag
  `vX.Y.Z`, update `10_release_notes.md`.

### 1.10 Cross-cutting

- **Localization / currency (COP).** Single locale (es-CO), single currency (COP) via the seeded `Market`
  row; all monetary amounts are stored and displayed in COP (FR-046, TC-080). COP is conventionally a
  whole-unit currency — amounts are handled without decimal subunits to avoid rounding surprises. Multi-
  currency (NFR-011/017) is architecture-only, out of the pilot.
- **Instrumentation from day one (NFR-005, NFR-006).** Two metrics must exist on Day 1: **cost per render**
  (`RenderRequest.inference_cost`, recorded on every job) and **render-to-purchase** — the pilot's primary
  go/no-go signal. A minimal event trail links `render_id → order_id → payment captured`
  (`render_created`, ~~`render_approved`~~ (retired — ADR-025), `render_viewed`, `cart_confirmed`, `checkout_started`,
  `purchase_completed`), so `render-to-purchase = purchases / renders` is queryable from the first real user.
- **Privacy defaults (ADR-019).** Photos and renders private by default (NFR-007/BR-33); collect only email
  + phone + shipping, only at checkout; show a short privacy notice + consent at first use, aligned with
  Colombia Ley 1581 (full legal review deferred to scale). No sharing feature exists to leak private assets.

### 1.11 Traceability summary

| Foundation concern | Pilot FRs enabled | Proof (TCs) |
|---|---|---|
| Async render job + poll~~, operator QA gate~~ (gate retired — ADR-025) | FR-015~~, FR-027~~ | TC-028~~, TC-051, TC-052, TC-053~~ |
| Real-SKU-only / no fabrication guard | FR-016, FR-018, FR-019 | TC-030, TC-031, TC-034–TC-037 |
| Private photo/render storage | FR-005, (NFR-007) | TC-011, TC-047 |
| Single COP checkout + PO scaffolding (§0.1#1) + commission value | FR-042, FR-046 | TC-074, TC-075, TC-080 |
| Operator console: curation /~~ QA /~~ forwarding (render QA retired — ADR-025) | ~~FR-027,~~ FR-056–FR-059, FR-061 | ~~TC-051, TC-052,~~ TC-095–TC-103, TC-106 |
| Cart plumbing (auto-populate, review, confirm) | FR-031–FR-033, FR-035 | TC-058–TC-060, TC-063, TC-064 |

### 1.12 Deferred (not in this foundation, tracked elsewhere)

Accounts/auth (FR-001–003), guest-checkout feature (FR-004), camera capture (FR-006), room-change text
(FR-010), dynamic localization/delivery (FR-012/013/020/053), keep-or-replace (FR-025/026), cart swap
(FR-034), aggregated estimates (FR-037), warranty display (FR-038), stock holds (FR-039/040), split
settlement (FR-043), metering & packages (FR-048–050), targeted edits (FR-051/052), sponsored placement
(FR-054), supplier self-ingest (FR-055), automated sync (FR-060). These stay in the docs as future scope.

### 1.13 Implementation tasks the ADRs left open (must resolve Day 1)

- ~~**Select the hosted image-gen API vendor**~~ **Resolved by ADR-026 (2026-07-14):** the render engine is decided — self-hosted FLUX.2 Klein 4B via the mflux CLI; no vendor to pick. The residual render-side Day-1 task is **provisioning the Apple-Silicon render worker** (mflux requires Apple MLX) and standing up the mflux child-process pipeline + compositing prompt.
- **Select the hosted PCI checkout / payment provider** supporting COP + PCI + an iOS flow (ADR-003/004).
- **Select the managed backend host, managed Postgres, and object-storage products** and the Git/CI host
  (all left to implementation by ADR-001).
- **Pin the client↔backend contract shape** (base path, auth header, error bodies) currently illustrative in
  `06_api.md`.

## 2. Build sequence, timeline & done-criteria

This section sequences the foundation plus the eleven pilot features into a buildable
order, maps that order onto the pilot's Day 1–7 structure (and states plainly where seven
calendar days is or is not realistic), defines the milestone gates and the per-feature
Definition of Done, consolidates the risks the feature sections raised, and restates the
render-to-purchase go/no-go and the governance flow. It was written as a plan for human approval;
since approval, only the backend foundation scaffold (PR #21), the class demo (PR #22), and the
operator console shell + auth (PR #27) exist — the iOS app and all feature logic remain unbuilt.

### 2.1 Dependency graph & critical path

**Reading the two kinds of "depends on."** The per-feature dependency lists carry two distinct
relationships that must not be conflated when scheduling:

- **Hard prerequisite** — feature B cannot be *built or tested* until feature A exists (A owns
  a table/endpoint/state B reads). These define the critical path.
- **Co-development / downstream consumer** — B and A are wired together to close the loop, but B
  is not blocked from being built (e.g. FEAT-005 *feeds* FEAT-006/FEAT-007; FEAT-008's "Add to
  cart" is a hand-off entry point from FEAT-007). Each feature doc's own "Depends on / Feeds"
  split is the authority here.

The dependency list handed to this plan (e.g. FEAT-005 depends on FEAT-006/FEAT-007, FEAT-002
depends on FEAT-003 which depends on FEAT-002) contains **logical cycles**. Those cycles are real
— they reflect that the render loop is a tightly-coupled set co-developed together, not a clean
line — but you cannot *schedule* a cycle. For sequencing, the plan collapses each cycle to its
hard prerequisite and treats the rest as parallel/downstream, exactly as the feature docs do.
This is an interpretation of the coupling, flagged as such; the build order below is the load-bearing output.

**Hard-prerequisite critical path (longest chain):**

```text
  business prereqs (ADR-016 supplier agreements ·
  COP payment merchant account · Apple Developer enrolment)
                    │
                    ▼
  FOUNDATION (§1)   ─ repo · Postgres schema · API contract · object storage ·
                       operator console shell + auth · CI/CD · Day-1 vendor picks
                    │
                    ▼
  FEAT-015 catalog (M) ──► FEAT-004 locality/COP (S)          [catalog + Bogotá/COP tags]
                    │                 │
  FEAT-002 photo+dims (M) ─┐          │                        [user inputs, parallel track]
  FEAT-003 style+budget (S)─┼─────────┤
                            ▼         ▼
                    FEAT-005 AI render engine (XL)             ◀── the make-or-break core
                            │  match → composite → completed (ADR-025)
                            ▼
                    FEAT-006 operator QA gate (S)              [release gate — RETIRED, ADR-025;
                            ▼                                    FEAT-005 feeds FEAT-007 directly]
                    FEAT-007 product tags (M)
                            ▼
                    FEAT-008 cart (M) ──► FEAT-009 estimates (S)
                            ▼
                    FEAT-010 checkout / single COP capture (M)
                            ▼
                    FEAT-011 forward + single-order status (M)
```

**Critical path (what gates the go/no-go):**
`foundation → FEAT-015 → FEAT-004 → FEAT-005 → FEAT-007 → FEAT-008 → FEAT-010 → FEAT-011`
(~~FEAT-006~~ dropped from the path — retired per ADR-025; FEAT-005 feeds FEAT-007 directly).
FEAT-005 (XL) dominates the middle; its cost is render-fidelity tuning, not code volume.

**Runs in parallel (off the critical path):**

- **Inputs track** — FEAT-002 (photo+dimensions) and FEAT-003 (style+budget) co-write the
  shared `Project`; they only need the foundation session bootstrap and must land *before*
  FEAT-005 can run end-to-end, but they build alongside the catalog track, not after it.
- **FEAT-004** is a thin seed + constant-resolver + COP formatter; it rides on the FEAT-015
  catalog load (suppliers/SKUs tagged Bogotá/COP) and feeds FEAT-005's locality gate.
- **FEAT-009** (estimates) attaches to FEAT-008's cart line; small, parallel to FEAT-010.

**External lead-time items are on the true critical path even though they are not code.** COP
payment-gateway **merchant onboarding + PCI** (FEAT-010 §risks), the **Apple Developer Program /
TestFlight** pipeline (foundation §1.9), and the **ADR-016 supplier one-page agreements**
(FEAT-015) are third-party approvals that routinely take days to weeks and are *outside* the
team's control. If any of these starts on Day 1, it — not the engineering — becomes the binding
constraint. This is called out again in §2.6.

### 2.2 Does it fit one week? An honest read

The pilot doc's Day 1–7 table (Spazio_One_Week_iOS_Pilot.md §"One-week plan") is a real target,
and this plan maps to it below. Two things must be said plainly, per the planning rules:

1. **The seven-day plan is a "thin working loop with heavy manual glue," not "all 11 features
   built to full Definition of Done in seven calendar days."** The source itself makes this fit by
   putting humans in the loop everywhere automation is missing (operator curates, ~~operator QA's
   every render,~~ operator forwards every order — render QA retired per ADR-025). Roughly twelve build items — one backend service
   (~15 endpoints), ~16 Postgres tables, an iOS app (~8–9 screens), a 3-function operator console,
   and **two** third-party integrations — cannot all reach the §2.4 DoD (every TC automated, all
   `/docs_en` updated, PR-reviewed) in seven days for a small team. What *can* land in seven days
   is the **core loop demonstrably working** for a real user, with the non-core TCs and doc
   backfill trailing.

2. **Seven days is only feasible if (a) the work is split across parallel iOS / backend / ops
   tracks, and (b) the three external lead-time items in §2.1 are already in progress or done
   before Day 1.** If merchant onboarding or Apple enrolment starts cold on Day 1, the honest
   calendar for a *paid* order in TestFlight is longer than a week regardless of engineering pace —
   because payment capture (FEAT-010) and TestFlight distribution are prerequisites for the
   go/no-go, and both depend on third parties.

**Realistic fallback if the external prereqs are not pre-cleared:** run the same milestone order
over **~2–3 weeks**, with Week 1 = foundation + catalog + inputs + first ~~operator-approved~~ published (ADR-025) render
(gates G0–G3), Week 2 = shoppable render + cart + checkout wired against the gateway sandbox
(G4–G5 in TestFlight), Week 3 = real-money cutover + pilot cohort (G6). The milestone gates in
§2.3 are identical in both the 7-day and the 2–3-week versions; only the calendar stretches. Do
not compress G3 (render fidelity) or G5 (payment capture) to hit a date — those are the two places
the pilot actually fails.

### 2.3 Phased plan mapped to Day 1–7 + milestone gates

Days are the pilot doc's structure; the parallel-track note makes them achievable only with
concurrent workstreams. Each gate lists its proof TCs.

**Day 1 — Foundation, vendors, catalog load. → Gate G0, start G1**
- Foundation (§1): scaffold the monorepo (`ios/`, `backend/`, `operator/`, `ops/`), migrate the
  pilot Postgres subset (§1.3), stand up object storage + private/signed-URL access, seed the
  single Bogotá/COP `Market` + `DeliveryZone` (FEAT-004 step 1), pin the client↔backend contract,
  wire CI/CD + branch protection + secret scan (§1.9).
- **Resolve the ADR-open vendor picks today** (§1.13): hosted PCI COP
  checkout, backend/Postgres/object-storage hosts. *(The render engine is no longer a vendor pick — decided as self-hosted FLUX.2 Klein 4B via mflux, ADR-026; the render-side Day-1 task is instead **provisioning the Apple-Silicon render worker** + mflux pipeline.)* These block FEAT-005 and FEAT-010.
- FEAT-015 (M): finalize `Product`/`Supplier`/`Style` schema incl. curation state; operator loads
  and **approves** 30–60 real, complete, style-tagged, in-stock SKUs; seed the 1–2 `Style` rows
  shared with FEAT-003; set up the render pipeline + prompt.
- **Business prereq (must already be moving):** ADR-016 supplier agreements; payment merchant
  account; Apple enrolment.
- **Gate G0 — Foundation up:** schema migrated, CI green, vendors selected, contract pinned.
- **Gate G1 — Catalog loaded:** 30–60 SKUs approved/complete/mapped, Bogotá+COP tagged.
  Proof: TC-095…TC-103 (curation/completeness/classification/mapping), TC-080 (COP), TC-038 (locality gate).

**Days 2–3 — iOS input flow, render pipeline, tags, cart. → Gates G2, G3, start G4**
- FEAT-002 (M) + FEAT-003 (S) on the inputs track: `RoomPhotoInputView` (upload→`POST /photos`),
  `RoomDimensionsInputView`, `StylePicker`/free-text/`BudgetRange`, all writing the shared
  `ProjectDraft`; `GET /styles`; budget validation on `POST /renders`.
- FEAT-004 (S): constant resolver assigns Bogotá/COP on Project creation; shared `CurrencyFormatter`
  wired into every price surface.
- FEAT-005 (XL): matching service (style/dimension/budget+10%/in-stock/locality), rendering
  orchestration (composite operator-curated images into the room photo), the **real-SKU /
  `fabricated-item` guard**, `RenderRequest.inference_cost` instrumentation, submit→poll iOS client.
- ~~FEAT-006 (S): `pending_review → approved|rejected` state machine, fail-closed serve guard,
  operator review queue.~~ **Retired — ADR-025.**
- FEAT-007 (M): tag overlay + detail sheet on the ~~approved~~ completed (ADR-025) render.
- FEAT-008 (M): cart auto-populate on ~~approval~~ render completion (ADR-025), review/remove/confirm.
- **Gate G2 — Inputs captured:** photo+dimensions+style+budget persist on a `Project`.
  Proof: TC-011/TC-012, TC-020/TC-021, TC-015…TC-018.
- **Gate G3 — First believable render:** match→render→`completed`→user sees it
  (~~operator-approved: `pending_review`→operator approves~~ — gate retired, ADR-025). This is the
  pilot's pivot gate. Proof: TC-026/TC-028/TC-030/TC-031/
  TC-032/TC-034/TC-040 (FEAT-005)~~, TC-051/TC-052/TC-053 (FEAT-006)~~ (retired — ADR-025).
  Render-fidelity iteration begins here and continues through Day 5.

**Day 4 — Estimates, checkout, fulfillment handoff. → complete G4, wire G5**
- FEAT-009 (S): per-item production/delivery estimate on each cart line; `missing-estimate`
  placeholder, never fabricated.
- FEAT-010 (M): `POST /checkout` (confirmed-cart guard + minimal ADR-022 contact) → pending
  `Order` + recorded 10% commission value → single COP payment intent; `POST /payments/{id}/confirm`
  + gateway webhook, idempotent on `gateway_reference`.
- FEAT-011 (M): operator forward action (`forwarded_by`/`forwarded_at`/`status`) + login-less
  single-order status screen with `no-tracking-yet`.
- **Gate G4 — Shoppable render → confirmed cart:** tags tap through; cart auto-populates, reviews,
  removes, confirms; estimates shown pre-checkout. Proof: TC-054/TC-055, TC-058…TC-060/TC-063/
  TC-064, TC-065/TC-066.

**Day 5 — End-to-end internal dry run + render tuning. → Gate G5 (in test dataset)**
- Run the full loop on **real rooms** against the flagged **test dataset** in the single
  environment (foundation §1.8). Tune render quality and product matching against the tiny catalog.
- Automate TC-074/TC-075 (payment capture/decline) against the gateway **sandbox**.
- **Gate G5 — First end-to-end render→cart→paid order (test dataset, TestFlight-ready):**
  render → cart → single COP capture → `paid` order → operator forwards → status screen. Proof:
  TC-074/TC-075, TC-064, TC-106, TC-081/TC-082; event trail `render_id → order_id → payment captured`
  queryable (NFR-006).

**Day 6 — Fix + TestFlight to a few real users. → clean cutover**
- Fix the top issues from the dry run. Ship the TestFlight build (foundation §1.9). Perform the
  **clean cutover from test dataset to real pilot data** so test rows never pollute the
  render-to-purchase metric.

**Day 7 — Pilot launch + measure. → Gate G6 (go/no-go)**
- Launch to the pilot cohort; operators monitor the ~~render-review and~~ order-forward ~~queues~~ queue promptly
  (render review retired — ADR-025; no render SLA — ADR-013). Track `render-to-purchase = purchases / renders`.
- **Gate G6 — Render-to-purchase:** at least one real pilot user buys ≥1 rendered piece in-session
  (see §2.5).

### 2.4 Definition of Done (per feature)

A feature is **Done** only when all of the following hold, per `11_implementation_flow.md` Step 8
and CLAUDE.md §8:

1. **Implemented** to the pilot scope in its feature section (pilot-included FRs only; deferred FRs
   explicitly out).
2. **Its pilot TCs pass** (the "Tests to satisfy" list in that section) — happy path **and** the
   named error paths; deferred TCs are not run.
3. **Acceptance criteria met** for each covered FR in `03_requirements.md`.
4. **Docs updated** (the Step-2 impact set): the `/docs_en/features/FEAT-XXX_*.md` doc created/
   updated, plus any touched `03_requirements.md`, `06_api.md`, `07_data_model.md`, and new/updated
   `08_test_plan.md` rows.
5. **PR merged into `develop`** via the governance flow (§2.7), Issue closed with `Closes #<n>`.
6. **Release notes** updated at the tagged `develop → main` release (`10_release_notes.md`).

**DoD carve-outs to record now, so "Done" is honest:** three privileged-action **security TCs do
not yet exist** and must be added before the owning feature closes — non-operator cannot approve a
catalog entry (FEAT-015, NFR-008), non-operator/wrong-role cannot approve a render (FEAT-006,
NFR-008) *(render-approval item since retired — ADR-025)*, and non-operator cannot forward / a buyer cannot read another buyer's order (FEAT-011,
NFR-008). For the 7-day loop, "Done" for a feature means its **core loop TCs** pass in TestFlight;
non-core TC automation and full doc backfill may trail into the following days but block the tagged
release, not the go/no-go demo.

> **Update (#34):** the three carve-outs are closed — per-action role gating (curator / reviewer /
> handler; role-less staff stay all-purpose), status-machine preconditions (approve/reject only from
> `pending_review`, forward only from `paid_unforwarded`, approve only BR-1-complete SKUs), and
> NFR-007 device scoping on every client read/write are implemented and automated as **TC-107..109**
> (`08_test_plan.md`). *(The render approve/reject preconditions and the `render_reviewer` role among
> these have since been retired — ADR-025, 2026-07-14; see TC-108 in `08_test_plan.md`.)*

### 2.5 Pilot go / no-go

**Criterion (single, from the pilot doc):** continue building only if real pilot users complete
**render-to-purchase** — they buy at least one piece they saw in their own render, in the same
session, inside Spazio, without leaving to search elsewhere.

```text
render-to-purchase rate = purchases / renders
```

- **Go:** even a small number of genuine render-to-purchase completions justifies continuing.
- **No-go:** users generate renders but do not buy → the loop is not working *regardless of image
  quality metrics*; fix the loop — **render fidelity, catalog fit, or trust** — before adding **any**
  deferred FR from the full PRD.

Measurement is wired from Day 1: the event trail `render_created → render_viewed →
cart_confirmed → checkout_started → purchase_completed` (~~`render_approved`~~ retired — ADR-025; foundation §1.10, NFR-006) makes the ratio
queryable from the first real user, and `RenderRequest.inference_cost` (NFR-005) tracks the cost side.

### 2.6 Consolidated risks & mitigations

Pulled from the feature sections; ranked by pilot impact.

| # | Risk | Source | Mitigation | Residual |
|---|---|---|---|---|
| 1 | **Render fidelity** — 2D diffusion compositing (now self-hosted FLUX.2 Klein 4B via mflux — ADR-026) can show a plausible *look-alike*, not the exact SKU (ADR-002 flags the BR-6/BR-14 tension; the engine swap does not change this risk); wrong scale from approximate dimensions erodes trust. **Highest product risk.** | FEAT-005, FEAT-002 | Composite **only** from operator-curated product images; ~~**mandatory operator QA** (FEAT-006) as the human backstop; the real-SKU guarantee is manual/visual in the pilot, not a pixel proof~~ (**QA backstop retired — ADR-025**; the structural guard is compositing from real catalog images + the `fabricated-item` check); budget explicit Day-5 fidelity tuning. | ~~Fidelity is judged by a human, not proven technically~~ (human backstop retired — ADR-025; fidelity is not proven technically and no human judges it); bad user photos still waste a cycle (no FR-024 gate — deferred). |
| 2 | **Catalog cold-start** — 30–60 SKUs under a strict *all-BR-1-fields* gate (ADR-014) makes `empty-match` / `budget-exceeded` likely; a style-tag ↔ `Product.style_attributes` drift empties every render. | FEAT-015, FEAT-003, FEAT-005 | Pre-qualify suppliers and curate only SKUs that clear the bar; one shared pilot style-tag list for `Style` seeds and product tags; COP budget hints tuned to the catalog; pilot *raises* the `empty-match`/`budget-exceeded` status and the **operator resolves edge cases by hand** (FR-022/FR-023 fallbacks deferred). | Tiny catalog limits matchable combinations; degenerate locality gate (all-Bogotá) means TC-039 must be verified synthetically. |
| 3 | **Payments in COP** — vendor unresolved (ADR-003/004 fix approach, not vendor); merchant onboarding + PCI is an external lead-time item; webhook/confirm races; real money + tax/legal exposure (ADR-018). | FEAT-010, foundation §1.6 | Pick the COP+PCI+iOS gateway **Day 1** and start merchant onboarding *before* Day 1; idempotency on `gateway_reference` so webhook+client-confirm can't double-create/charge; card data confined to the hosted flow (NFR-009); confirm merchant-of-record/tax posture before real users. | Onboarding can exceed a week (see §2.2); real funds move in the pilot. |
| 4 | **Operator throughput** — ~~no render SLA (ADR-013); the operator is the only thing between a queued render and the user, and~~ (render review retired — ADR-025) the operator is the only thing between a paid order and the supplier; manual stock refresh; a missed forward silently strands a paid order. | ~~FEAT-006,~~ FEAT-011, FEAT-015 | ~~Oldest-first review +~~ un-forwarded-order ~~queues~~ queue (render queue retired — ADR-025); prompt operator monitoring Days 6–7; refresh stock/price before sessions; `forwarded_at` audit surfaces stalls. | Human bottleneck ~~directly hits render-to-purchase~~ now sits on fulfilment (render queue retired — ADR-025); unautomated, no retry. |
| 5 | **Inference cost / render capacity** — with the engine self-hosted (ADR-026), per-render **marginal cost is near-zero local compute**, not a metered third-party call; the residual risk is **render-host capacity** (throughput bounded by the Apple-Silicon worker's hardware, ~a few min for a 1-reference edit; worst case measured 617 s ≈ 10.3 min for a 3-reference render, capped at 15 min — BUG-004, 2026-07-16). | FEAT-005, foundation §1.10 | Record `inference_cost` per render from Day 1 (NFR-005, now local-compute cost); enforce a global cost/capacity threshold (NFR-003) and degrade gracefully via queue/slower rendering (NFR-004). | Cost depends on owned hardware and prompt iteration, not a vendor meter; capacity is fixed by the render host. |
| 6 | **Privacy of assets** — ~~room photos/renders transit to third parties~~ **largely mitigated by ADR-026**: self-hosting means room photos and renders **no longer egress to a third-party image vendor** (they stay on the owner-controlled render worker), strengthening BR-33/NFR-007/ADR-019. | FEAT-002/005~~/006~~ (006 retired — ADR-025), NFR-007/ADR-019 | Private buckets, short-lived signed URLs scoped to owner-session~~ + reviewing operator~~ (review retired — ADR-025); minimum-data retention; consent notice at first capture (Ley 1581). Assets stay on the self-hosted render worker (ADR-026). | Full legal review deferred to scale; render worker is owner-controlled, not a third party. |
| 7 | **Login-less access control (NFR-008 partial)** — no accounts (ADR-022); buyer order status rests on an unguessable order reference. | FEAT-011, FEAT-008 | Sufficiently random order token; cart/order scoped to originating session/project; add the missing security TCs (§2.4). | Only partially meets NFR-008 until accounts (FEAT-001) return. |
| 8 | **DRAFT status enums / scope tensions to sign off** — `PurchaseOrder.status` `forwarded` value and `no-tracking-yet` are DRAFT (FEAT-011); **FR-047 pilot inclusion** disagrees across docs; **FR-041 revalidation / FR-044 PO fan-out** are wired into `POST /checkout` by the foundation but classed out-of-pilot by FEAT-010/test-plan. | FEAT-011, FEAT-010 | Fix the enums and resolve both scope tensions by **human sign-off before build** (CLAUDE.md: AI proposes, human decides); this plan follows the FEAT/test-plan scoping (no FR-041/FR-044 automation in the pilot) and the single-order FR-047 form. | Building the wrong side wastes effort or ships an unsigned-off feature. |

### 2.7 Governance reminder

Every feature follows the same non-negotiable flow (CLAUDE.md §4/§5, `11_implementation_flow.md`):

```text
plan (this document, human-approved)
   └─► GitHub Issue  (already created: #4–#18, one per foundation + feature)
         └─► branch  feature/FEAT-XXX-… cut from develop   (fix/BUG-XXX-… for fixes)
               └─► atomic commits, ID-prefixed:  FEAT-XXX: <imperative>
                     └─► Pull Request → develop  (review recommended; secret scan + tests green)
                           └─► merge commit into develop; delete the branch; Closes #<n>
```

- **Nothing goes to `main` except a tagged release:** when `develop` is ready, open a `develop → main`
  PR requiring **≥1 approval**, merge, tag `vX.Y.Z`, and update `10_release_notes.md`. `main` and
  `develop` are both protected — no direct commits/pushes, ever.
- **Traceability per feature must close the chain:** `FEAT-XXX → FR/NFR → feature doc → Issue (#4–#18)
  → branch → commits → PR → TC-XXX → release notes`.
- **Guardrails:** zero secrets in commits (gateway/image-gen/DB keys via the managed secret store); no
  unjustified dependencies; every plan item traces to a real FR and a TC in `08_test_plan.md`.

> Note on Issue numbers: the range **#4–#18** was provided as already created and is treated as one
> Issue per foundation + feature. The exact Issue-to-feature mapping is not asserted here (not verified
> in-plan); confirm it against the GitHub backlog before cutting branches.


---

## 3. Per-feature build plans

## FEAT-015 — Supplier catalog management

**Goal:** Give the operator a way to hand-load, complete-check, classify, style-tag, and approve 30–60 real Bogotá SKUs so that the render/matching engine (FEAT-005) can only ever composite real, purchasable, in-stock products — this is the pilot's real-SKU guarantee.

**Pilot FRs covered:**

- **FR-056** — Operator curates and approves catalog entries (approve → active/renderable; reject → `not-approved`, excluded).
- **FR-057** — Store required catalog attributes per SKU; all PRD BR-1 fields required (ADR-014); missing any field → stored `incomplete` and flagged.
- **FR-058** — Classify each product as `ready_made` (requires current stock) or `made_to_order` (requires supplier-declared production/delivery times); missing data → `invalid-classification`. *Pilot loads ready-made in-stock SKUs; the made-to-order path is built and tested but not exercised in the pilot catalog.*
- **FR-059** — Map each product to the shared style taxonomy (the 1–2 predefined pilot styles + free text, ADR-005); unmapped → flagged `unmapped` and excluded from style matching.

**Deferred (out of pilot):**

- **FR-055** — Supplier self-ingestion via software integration / Excel / API / FTP. Pilot ingestion is an operator-loaded CSV/Excel; no self-service channel is built (ADR-006). TCs TC-093/TC-094 stay `Pending`.
- **FR-060** — Automated/real-time catalog synchronization. Pilot sync is a manual/on-demand refresh by the operator (ADR-012). TCs TC-104/TC-105 stay `Pending`.
- Supplier-facing ingestion surface, per-supplier scoped write auth, sync scheduler, `sync-failed`/`unsupported-format` handling — all part of the deferred FRs above.

### iOS work

- **None in the consumer SwiftUI app.** FEAT-015 has no end-user screen; the homeowner never touches catalog management. The consumer app consumes this data only indirectly, through the render/tags flow (FEAT-005/FEAT-007).
- The **operator catalog console** is a separate internal surface (tool choice left to implementation per ADR-001). For the pilot it can be minimal — a simple form-based admin surface or a validated CSV/Excel import path — not a polished app. It must let the operator: create/edit a SKU with all BR-1 fields, set `product_type` and its stock/lead-time data, pick the style tag, see `incomplete` / `unmapped` / `invalid-classification` flags, and **approve/reject** each entry into the renderable catalog. This surface must sit behind operator authentication (NFR-008).

### Backend work

**Endpoints** (base path/auth per ADR-001; shapes DRAFT):

- `POST /api/v1/operator/catalog/products` · `PATCH /api/v1/operator/catalog/products/{sku}` — create/update a SKU with the full BR-1 attribute set, classification, and style mapping. Runs completeness + classification + mapping validation on save (FR-057, FR-058, FR-059).
- `POST /api/v1/operator/catalog/products/{sku}/approve` · `.../reject` — curation transition (FR-056), mirroring the operator render approve/reject pattern already in `06_api.md` §5 *(that render pattern is itself retired — ADR-025; this catalog curation transition stands)*. Approve → renderable/active; reject → `not-approved`, excluded.
- `GET /api/v1/catalog/products` *(internal read, consumed by FEAT-005)* — returns only entries that pass the eligibility predicate (approved **and** `is_complete` **and** style-mapped **and**, for `ready_made`, `stock_quantity > 0`), enforcing BR-2/BR-4/BR-16 downstream. Owned here, read by matching.

**Services (managed backend service, ADR-001):**

- **Completeness validation** — checks every required BR-1 field is present/valid on save; sets `is_complete`; incomplete entries stored `incomplete` and flagged, which FR-019 (FEAT-005) consumes to exclude from rendering. Threshold = all BR-1 fields (ADR-014).
- **Classification logic** — records `product_type`; requires `stock_quantity` for `ready_made` and `production_lead_time` + `delivery_lead_time` for `made_to_order`; missing required data → `invalid-classification` (FR-058).
- **Style-taxonomy mapping** — maps `style_attributes` to a `StyleTaxonomy` term; unmapped → `unmapped` flag, excluded from style matching (FR-059).
- **Curation / approval state machine** — loaded → operator review → `active` (renderable) or `not-approved` (FR-056).
- *Not built:* catalog ingestion service (FR-055) and synchronization job (FR-060).

**Data entities touched** (canonical registry `07_data_model.md`):

- **Product** — `sku`, `name`, `category`, `photos`, `dimensions`, `price`, `currency`, `available_colors`, `materials`, `product_type`, `stock_quantity` (required for `ready_made`), `production_lead_time` / `delivery_lead_time`, `warranty_terms`, `style_attributes`, `listing_url`, `is_complete` (derived), plus a **curation/approval state**. *Schema note:* the current `Product.status` enum is `active`/`inactive`; the pilot needs a distinct curation state (e.g. add `not_approved`, or a separate `curation_status` of `loaded`/`approved`/`not_approved`) so an incomplete or unreviewed SKU can never read as renderable — this is a small schema task to finalize.
- **Supplier** — `name`, `market_id`, `ingestion_channel` = manual/spreadsheet (ADR-006), `onboarding_terms_ref` (one-page agreement, ADR-016). `payout_account_ref` unused in the pilot (manual fulfillment).
- **StyleTaxonomy** / **Style** — seed with the 1–2 predefined pilot styles (ADR-005); products map to these.
- **Operator** — `catalog_curator` role; auth gates create/edit/approve (NFR-008).
- **Market** / **DeliveryZone** — single market Bogotá/COP (ADR-015); supplier delivery coverage stored here and consumed downstream by locality filtering (FEAT-004).
- **Object storage** for product photos (ADR-001).

### Operator work

- Select 2–4 Bogotá suppliers and obtain their product data under a one-page written agreement (ADR-016) — business prerequisite, gates the load.
- Hand-load 30–60 SKUs, each with all BR-1 fields; classify as `ready_made` with current `stock_quantity`; apply the style tag; then approve each into the renderable catalog (FR-056/057/058/059; pilot Day 1).
- Since there is no auto-sync (ADR-012), **manually refresh stock/price before pilot sessions** so availability stays accurate for the render availability gate (FR-018) and checkout revalidation (FR-041).

### Approach / key steps (ordered)

1. Finalize the `Product` / `Supplier` / `Style` / `StyleTaxonomy` schema in managed Postgres, including the curation-state field decision above; provision the object-storage bucket for photos (ADR-001).
2. Seed `StyleTaxonomy` + `Style` with the 1–2 pilot styles (ADR-005), shared with FEAT-003.
3. Implement completeness validation (all BR-1 fields → `is_complete` / `incomplete` flag) — ADR-014.
4. Implement classification logic (`ready_made` requires stock; `made_to_order` requires lead times; else `invalid-classification`).
5. Implement style-mapping enforcement (`unmapped` flag; exclude from style matching).
6. Implement `POST`/`PATCH` operator catalog-product endpoints that run steps 3–5 on save.
7. Implement the curation approve/reject transition (FR-056).
8. Build the minimal operator surface (form or validated CSV/Excel import) to enter/edit/classify/tag/approve and surface the three flags, behind operator auth.
9. Expose `GET /api/v1/catalog/products` with the eligibility predicate for FEAT-005 to read.
10. Operator loads and approves 30–60 real SKUs; validate against the TCs below.

### Tests to satisfy

- **FR-056:** TC-095 (approve → active, renderable), TC-096 (reject → `not-approved`, excluded from rendering).
- **FR-057:** TC-097 (all attributes → stored complete), TC-098 (missing attribute → `incomplete`, flagged, excluded per FR-019).
- **FR-058:** TC-099 (ready-made → carries current stock), TC-100 (made-to-order → carries production/delivery times), TC-101 (missing stock/lead-time → `invalid-classification`).
- **FR-059:** TC-102 (mapped → carries style-taxonomy classification), TC-103 (no mapping → `unmapped`, excluded from style matching).
- **Gap to add:** no TC yet asserts a non-operator cannot approve an entry (NFR-008). Add a security TC against FR-056 before implementing the approval endpoint.
- Deferred (do not run in pilot): TC-093/TC-094 (FR-055), TC-104/TC-105 (FR-060).

### Depends on

- **foundation** — managed backend service, managed Postgres, object storage, and operator authentication (ADR-001); the `Operator`, `Supplier`, `Market`/`DeliveryZone` base entities.
- **Business dependency:** supplier partner selection and one-page agreements (ADR-016) — no SKUs to load without it.
- Shares the `Style`/`StyleTaxonomy` seed with **FEAT-003**.
- This feature is a **prerequisite for FEAT-005** (matching/rendering) and **FEAT-004** (locality/delivery); those consume its output but are not blockers to building it.

### Effort

**M.** Bounded (30–60 SKUs, no ingestion/sync, no consumer UI), but real work: schema finalization, three validation services, a curation state machine, and a minimal operator surface. Trends toward **L** if the operator console is built as a full internal app rather than a form/CSV-import path.

### Risks

- **Catalog data quality is the whole guarantee.** Wrong price/stock/dimensions/style silently breaks the real-SKU invariant (BR-6/BR-14) and render scale (BR-7); quality is a human responsibility (PRD §12). Mitigate with the strict BR-1 gate and operator approval.
- **Stale stock (no auto-sync, ADR-012).** Between manual refreshes, stock/price can drift, causing rendered/carted items to be unavailable and checkout revalidation failures (FR-041). Mitigate: operator refreshes before sessions; tiny catalog makes this feasible.
- **Strict all-BR-1-fields gate (ADR-014) may starve the catalog.** If suppliers cannot supply every field (e.g. materials, warranty terms), too few SKUs become renderable → cold-start / unmet-budget risk (PRD §10, FR-022). Mitigate: pre-qualify suppliers and curate only SKUs that clear the bar.
- **Eligibility-predicate ambiguity.** `is_complete`, curation state, and `status` (active/inactive) overlap; a loosely defined predicate could leak an unapproved or incomplete SKU into rendering. Mitigate: define the single eligibility predicate (approved ∧ complete ∧ mapped ∧ in-stock-if-ready-made) in one place and test it.
- **Missing security coverage.** Approval is a privileged action (NFR-008) with no TC yet; without it, a non-operator approval path could ship untested.


## FEAT-004 — Localization & delivery coverage

**Goal:** Collapse localization to fixed constants — a single seeded market (Bogotá) and delivery zone with one currency (COP) — so every Project is assigned that locality, all prices render in COP, and the matching/render locality gate is present (and trivially satisfied) for the pilot's single-zone catalog.

### Pilot FRs covered

- **FR-046** — Display prices in the user's local currency. Genuinely exercised in the pilot for COP only → TC-080.
- **FR-020** — Restrict rendering to products deliverable to the user's locality. The locality gate is implemented and trivially satisfied because every curated SKU belongs to the one Bogotá zone → TC-038 (happy path); TC-039 (exclusion) code path exists but is not triggered by pilot data (see Tests).
- **FR-012** — Determine applicable suppliers from location — **collapsed to a fixed constant**: a constant resolver returns the single seeded Bogotá supplier set instead of geocoding. Happy path only → TC-022.
- **FR-013** — Determine the delivery zone from location — **collapsed to a fixed constant**: every Project is assigned the single seeded Bogotá zone. Happy path only → TC-024.

> FR-012/FR-013 exist in the pilot only in their degenerate constant form (seed + assignment). Their dynamic-resolution error paths (`unresolved-location`, `no-coverage`) are deferred.

**Deferred (out of pilot):**

- **FR-053** — Delivery fallback (nearby regions / alternative shipping / pickup) → TC-089, TC-090. Not built.
- Dynamic location resolution / geocoding, multi-zone and multi-market support, multi-currency display (FR-046 beyond COP), and the `unresolved-location` (TC-023) / `no-coverage` (TC-025) statuses. `GET /api/v1/delivery/coverage` is excluded from the pilot (single fixed zone).
- Automated tax/legal per-market config (per ADR-018 taxes/invoicing are manual, no tax engine).

### iOS work (SwiftUI)

- **`CurrencyFormatter` (shared utility):** a single COP formatter used everywhere a price appears — product tags (FEAT-007), cart (FEAT-008), per-item estimates (FEAT-009), checkout totals (FEAT-010). Every price-bearing payload carries `currency` (`"COP"`); the client never hard-codes a symbol per screen. COP is displayed with thousands separators and no decimal subunit.
- **Static locality indicator (optional, minimal):** a fixed "Delivering to Bogotá · COP" label. No location-permission UX and no fallback UI in the pilot (fixed to Bogotá per ADR-015). Aligns with the ADR-021 minimal palette.

### Backend work (one managed service + Postgres, per ADR-001)

- **Endpoint `GET /api/v1/localization/resolve`** (pilot surface, effectively constant): returns the fixed Bogotá `Market`, its `DeliveryZone`, and display currency COP. Serves FR-012/FR-013/FR-046 in degenerate form.
- **Endpoint `GET /api/v1/delivery/coverage`** — deferred (FR-020/FR-053); not implemented in the pilot.
- **Location-resolution service (constant resolver):** maps any pilot session to the single seeded `Market` + `DeliveryZone`; no geocoding. `unresolved-location` / `no-coverage` branches are stubbed as post-pilot.
- **Locality gate (internal, consumed by FEAT-005 matching):** a product is eligible only if its `Supplier` serves the Project's `DeliveryZone`. Must **fail closed** — a product whose supplier has no resolved zone is excluded (preserves architecture invariant #4). Trivially passes for the all-Bogotá catalog.
- **Currency/market resolution:** attaches the market's currency (COP) to every price-bearing response so the client formats consistently (FR-046).
- **Data entities touched:**
  - `Market` — seed one row: `name = "Bogotá, Colombia"`, `currency = "COP"`; `tax_config`/`payment_methods`/`legal_config` as manual placeholders (ADR-018 no tax engine, ADR-003 single hosted COP checkout, ADR-019 privacy).
  - `DeliveryZone` — seed one row: `name = "Bogotá"`, linked to the Bogotá `Market`; `delivery_available = true`; `fallback_options` unused (FR-053 deferred).
  - `Supplier` — the 2–4 pilot suppliers (ADR-016) carry `market_id = Bogotá` and are linked to the Bogotá `DeliveryZone`.
  - `Project` — assign `market_id = Bogotá` and `currency = "COP"` at creation.
  - `Product` — `currency = "COP"`; read via its `Supplier` → `DeliveryZone` coverage for the FR-020 gate.

### Operator work

- During catalog load (FEAT-015): ensure all 2–4 suppliers are tagged `market_id = Bogotá` and linked to the Bogotá `DeliveryZone`, and every SKU price is stored in COP. If these are omitted the gate fails closed and renders go empty — enforce via the load checklist.
- **Determine which curated suppliers can deliver in Bogotá** (the scope-note task): confirm each supplier's Bogotá delivery coverage as part of the one-page written agreement (ADR-016) and reflect it in the `Supplier` → `DeliveryZone` link.

### Approach / key steps (ordered)

1. **Seed** the single `Market` (Bogotá / COP) and single `DeliveryZone` (Bogotá) via a foundation migration; set the manual tax/payment/legal placeholders per ADR-018/003/019.
2. **Tag suppliers/SKUs** (FEAT-015 load): every pilot supplier gets `market_id = Bogotá` + Bogotá zone; every SKU price stored with `currency = "COP"`.
3. **Constant resolver:** on Project creation assign `market_id = Bogotá` and `currency = "COP"`; expose `GET /localization/resolve` returning the fixed market/zone/currency.
4. **Locality gate:** implement the matching-time filter (product eligible iff its supplier serves the Project's zone), fail-closed for unknown coverage; expose it to FEAT-005. Trivially passes in the pilot.
5. **Attach currency** (COP) to every price-bearing response consumed by tags/cart/estimates/checkout.
6. **iOS:** wire the shared `CurrencyFormatter` into all price displays; add the static "Bogotá · COP" indicator; no permission/fallback UI.
7. **Verify** TC-080 (all prices in COP) and TC-038 (Bogotá products pass the gate) end to end.

### Tests to satisfy (pilot)

- **FR-046 → TC-080** — all prices displayed in COP across tags, cart, estimates, checkout.
- **FR-020 → TC-038** — only locally-deliverable products are rendered (trivially true for the Bogotá catalog). **TC-039** (locality exclusion) — the fail-closed gate path exists but is not naturally triggered by single-zone data; verify with a synthetic non-Bogotá product so the invariant does not silently rot before scale.
- **FR-012 → TC-022** — supplier set returned for the (constant) resolvable location.
- **FR-013 → TC-024** — the Bogotá delivery zone is assigned to the project.

**Deferred TCs (not run in the pilot):** TC-023 (`unresolved-location`), TC-025 (`no-coverage`), TC-089 / TC-090 (FR-053 fallback).

### Depends on

- **foundation** — ADR-001 backend service + Postgres + the seeded `Market`/`DeliveryZone` rows and `Project` schema (`market_id`, `currency`).
- **FEAT-015** (supplier catalog management) — suppliers and SKUs must be tagged with the Bogotá market/zone and COP prices, or the locality gate has no data and fails closed.
- **Feeds** FEAT-005 (matching consumes the locality gate) and FEAT-007/008/009/010 (which display the COP-formatted prices) — these are downstream consumers, not prerequisites.

### Effort

**S.** The pilot reduces this feature to two seed rows, a constant assignment on Project creation, one shared currency formatter, and a trivially-passing gate hook. No geocoding, multi-zone, multi-currency, or fallback logic is built.

### Risks

- **Over-building.** Implementing dynamic geocoding / multi-zone resolution is out of scope and a schedule risk; keep resolution a constant.
- **Currency-formatting drift.** Independent per-screen formatting can diverge; mitigate with one shared `CurrencyFormatter` and always carrying `currency` on price payloads. COP magnitudes are large with no decimal subunit — the formatter must handle separators/no-decimals correctly.
- **Trivial gate rot.** Because the gate always passes on all-Bogotá data, TC-039 never fires from real catalog; the fail-closed behavior (unknown coverage → excluded) must still be implemented and verified synthetically so architecture invariant #4 holds when multi-zone arrives.
- **Seeding coupling.** FR-012/FR-020 only work because FEAT-015 tags every supplier/SKU with the Bogotá market/zone and COP; an omission fails the gate closed and empties renders. The operator load checklist must enforce it.


## FEAT-002 — Room capture & inputs

**Goal:** Let the pilot user (Valentina) give Spazio the two raw spatial inputs the render depends on — a photo of her room and its approximate dimensions — stored privately and attached to her design session (`Project`) so FEAT-005 can match and scale real SKUs.

### Pilot FRs covered

- **FR-005 — Upload a room photo.** Store a supported image, associate it with the current `Project`, mark it private by default (NFR-007 / BR-33). → TC-011, TC-012.
- **FR-011 — Capture approximate room dimensions.** Validate and persist positive dimension values on the `Project` for later scaling (BR-7). → TC-020, TC-021.

> Note: FR-017 (using those dimensions to *scale* rendered products) is **not** in this feature — it belongs to the render engine (FEAT-005). FEAT-002 only captures and persists the inputs.

**Deferred (out of pilot):**

- **FR-006 — In-app camera capture** (pilot ships photo *upload* only; pilot "Included": "Photo upload"). → TC-013, TC-014.
- **FR-024 — Automated photo-quality validation + retake request** (BR-15). In the pilot there is **no automated quality gate**; ~~input quality is protected by the mandatory operator render review in FEAT-006 (FR-027) instead (per FEAT-002 §4 and the pilot's human-in-the-loop model)~~ **Superseded by ADR-025 (2026-07-14):** the operator render review is retired; FR-024 remains deferred and there is no photo-quality gate in the target spec (no replacement automation is specified). → TC-046, TC-047.

### iOS work (SwiftUI, ADR-001)

- **RoomPhotoInputView** — a photo-upload step backed by the system photo-library picker (`PHPickerViewController`). No camera path in the pilot (FR-006 deferred). Shows selected-image thumbnail, an upload/progress state (upload is async), and a client-side pre-check for allowed type/size that mirrors the server rule so obvious rejects fail fast; surfaces the server `file-format` / `file-size` rejection (TC-012) as a clear retry message.
- **RoomDimensionsInputView** — minimal numeric entry for approximate width / length / height (NFR-013 "minimal steps"), with unit labels (cm, matching the `room_dimensions` sub-fields). Client validation for positive/numeric input; surfaces the server `dimension-validation` error inline (TC-021).
- **Privacy affordance** — a short "your photo is private" note consistent with the minimal privacy notice/consent (ADR-019); photos are private by default (NFR-007).
- **Session/state plumbing** — hold the returned `photoId` and the persisted dimensions in the flow state so they can be handed to the render request (FEAT-005). No accounts/login (ADR-022); the flow runs against the anonymous `Project` session.

### Backend work (one managed service + Postgres + object storage, ADR-001)

- **`POST /api/v1/photos`** (multipart upload; API §2) — the FR-005 endpoint.
  - Validate media type and size before storing → reject with `file-format` / `file-size` (HTTP 415 / 413) and store nothing (TC-012). Concrete allowed formats and the size ceiling are DRAFT and must be fixed as an implementation task.
  - On success, write the binary to **object storage** and create a **`RoomPhoto`** row (`image_ref`, `source = upload`, `is_private = true`, `project_id`), associated with the current `Project` (TC-011). Because FR-024's automated gate is out of pilot, set `quality_status = accepted` (or `pending`, unused) rather than running a check.
  - Any returned photo URL is access-controlled / expiring (private by default — NFR-007, ADR-019).
- **Dimension persistence** — persist FR-011 dimensions onto **`Project.room_dimensions`** (JSON `{width_cm, length_cm, height_cm}`). Proposed surface: `PATCH /api/v1/projects/{id}` (project-inputs update, co-owned with FEAT-003 style/budget and FEAT-004 locality). The API draft (§2/§5) alternatively carries dimensions as fields on the render request; either is acceptable, but the FR-011 acceptance requires them **persisted on the Project** with a `dimension-validation` error path, so validation (reject non-positive / non-numeric, persist nothing → TC-021; persist valid → TC-020) lives on whichever endpoint writes the `Project`.
- **Services / components**
  - A **RoomCapture / Photo service** in the backend service: multipart handling, format/size validation, object-storage put, `RoomPhoto` persistence, private-access URL issuance.
  - **Access control**: `RoomPhoto` readable only by the owning session ~~and authorized operators (the operator needs it for the FEAT-006 render review)~~ (operator read grant retired with the render review — ADR-025; NFR-007 owner-session scoping stands).
- **Data entities touched:** `RoomPhoto` (created), `Project` (`room_dimensions` written; `currency`/other inputs written by FEAT-003/004). Both are specified in `07_data_model.md`.

### Operator work

None directly in FEAT-002 for the pilot. ~~The operator's involvement is **indirect**: because the automated photo-quality gate (FR-024) is deferred, the operator render review in **FEAT-006 (FR-027)** is the safeguard that catches unusable input photos before the render reaches the user. This requires operator read access to the private `RoomPhoto` (see access control above).~~ **Superseded by ADR-025 (2026-07-14):** the operator render review is retired; there is no photo-quality safeguard in the target spec (FR-024 stays deferred, and no replacement automation is specified). The operator read grant on `RoomPhoto` goes with it.

### Approach / key steps (ordered)

1. Confirm the `Project` session lifecycle: a `Project` must exist (or be created) before photo upload so `RoomPhoto.project_id` and `Project.room_dimensions` have a target. This creation point is shared with FEAT-003/FEAT-004 and should come from the foundation/session bootstrap.
2. Fix the DRAFT input limits as an implementation task: allowed image formats, max file size, and the dimension bounds/units (cm) used for validation.
3. Backend: implement `POST /api/v1/photos` — validation → object-storage put → `RoomPhoto` insert (private) → return `photoId` + private flag. Cover TC-011 and TC-012.
4. Backend: implement dimension persistence on `Project` with positive/numeric validation. Cover TC-020 and TC-021.
5. Backend: enforce private-by-default access on stored photos (owner session~~ + authorized operator~~ — operator render-review grant retired, ADR-025).
6. iOS: build `RoomPhotoInputView` (PHPicker upload) wired to `POST /photos`, with progress and rejection handling.
7. iOS: build `RoomDimensionsInputView` wired to the project-inputs write, with inline validation.
8. Carry `photoId` + dimensions into the flow state for hand-off to the render request (FEAT-005).
9. End-to-end check on a real room photo (aligns with the pilot Day-5 dry run): upload → dimensions persisted → inputs available to the render step.

### Tests to satisfy

Pilot (must pass):

- **FR-005:** TC-011 (supported image stored, associated with project, private by default), TC-012 (unsupported/oversized rejected with `file-format`/`file-size`, nothing stored).
- **FR-011:** TC-020 (valid positive dimensions persisted on project), TC-021 (non-positive/non-numeric rejected with `dimension-validation`, nothing persisted).

Deferred (do not build in the pilot): TC-013 / TC-014 (FR-006 camera), TC-046 / TC-047 (FR-024 quality gate).

### Depends on

- **Foundation (ADR-001):** the iOS app shell (SwiftUI), the managed backend service, Postgres (schema for `RoomPhoto` and `Project`), and object storage for photos — plus the `Project` session bootstrap.
- **Shared `Project` session:** co-written with **FEAT-003** (style/budget) and **FEAT-004** (locality); FEAT-002 needs the `Project` to exist to attach the photo and dimensions.
- **Downstream consumer (not a dependency):** **FEAT-005** (AI rendering) reads the uploaded photo and dimensions~~; **FEAT-006** (operator review) reads the private photo~~ (retired — ADR-025).

### Effort

**M.** Two focused iOS screens plus one upload endpoint and one dimension-persistence write; complexity is concentrated in object-storage integration, private/expiring URLs, and multipart validation rather than in business logic. No AI, payment, or matching logic in this feature.

### Risks

- **No automated quality gate in the pilot (accepted trade-off).** Poor user photos are the PRD's top render-fidelity risk (PRD §10); ~~with FR-024 deferred, the *only* backstop is the operator review in FEAT-006~~ with FR-024 deferred and the operator review retired (ADR-025), there is **no** backstop. A bad photo can waste a render cycle and hurt the render-to-purchase signal.
- **Privacy / access control on object storage.** Photos must be private by default (NFR-007, BR-33, ADR-019); a misconfigured or non-expiring storage URL would leak a user's room photo. Needs deliberate signed/expiring-URL handling scoped to the owning session (~~operator-only read scope~~ — the operator render-review grant is retired, ADR-025).
- **Approximate dimensions are unverified free input.** Validation only checks positivity/numeric-ness, not realism; wildly wrong dimensions silently degrade scaling downstream (FR-017/FEAT-005). ~~No pilot mechanism catches this beyond operator review.~~ No mechanism catches this (the operator review that was the last backstop is retired — ADR-025).
- **`Project` lifecycle ambiguity.** The creation point of the `Project` (before photo/dimension writes) is shared across FEAT-002/003/004 and must be nailed down in the foundation, or uploads have no valid `project_id` target.
- **Undecided input limits.** Allowed formats, max size, and dimension bounds are DRAFT in the requirements/API; they must be fixed before the validation tests (TC-012, TC-021) are meaningful.
- **iOS media handling.** HEIC/large-image handling, EXIF orientation, and photo-library permission states need explicit treatment so uploaded images render correctly and permission denial degrades gracefully.


## FEAT-003 — Style & budget selection

**Goal:** Let Valentina say how she wants the room to look (pick a predefined visual style and/or describe it in free text) and how much she can spend (a COP budget range), and persist those choices on her `Project` so the render engine can match real, in-stock SKUs to her taste and budget.

**Pilot FRs covered:**

- **FR-007** — Select a predefined visual style (persisted on the project). → TC-015
- **FR-008** — Provide a free-text style description (persisted on the project). → TC-016
- **FR-009** — Enter a budget range, minimum ≤ maximum (validated + persisted). → TC-017, TC-018

**Deferred (out of pilot):**

- **FR-010** — Free-text description of the intended room change (full product only; PRD §8 step 5). The `Project.room_change_description` column exists but is left unused in the pilot (foundation §1.2), the iOS field is not built, and **TC-019 is not exercised**.
- **StyleTaxonomy engine** — no taxonomy table/hierarchy is built; the pilot folds style into a flat tag on `Style` + `Product.style_attributes` (ADR-005, foundation §1.3). `Project.style_id` may be null when only free text is used.
- **User-configurable budget tolerance** — tolerance is a fixed 10% applied downstream in matching (ADR-008), not a FEAT-003 input.

---

### iOS work (SwiftUI screens/components)

All three controls live in one step of the design-input flow and write into a shared `ProjectDraft` view-model (the same draft that FEAT-002 fills with `photoId` + room dimensions and that is submitted together at render time).

- **`StylePickerView`** — a visual, single-select picker rendering the 1–2 predefined styles returned by `GET /styles` as cards (name + `preview_image_url`); style selection is optional and designed for minimal steps (visual selection per PRD §5; NFR-013). Backed by a `StylesRepository` that loads and caches the style list.
- **`StyleDescriptionField`** — optional multiline free-text field (FR-008) with the PRD example as placeholder text ("A modern living room, Mediterranean style, light colors, natural wood, beige sofa, minimalist decor").
- **`BudgetRangeControl`** — two numeric inputs (min, max) formatted as **COP** (fixed currency; ADR-015). Enforces client-side validation (numeric, non-negative, min ≤ max) and shows an inline `budget-range` error that blocks "Continue," mirroring the server rule that backs TC-018. Sensible COP placeholder/hint values reduce unrealistic budgets that would otherwise force the downstream over-budget fallback.
- **Persistent budget indicator (DRAFT / PROPOSED)** — a small budget chip carried into later steps so budget stays visible through the experience (PRD §5; NFR-015). Treatment is proposed, not decided.
- **Not built:** the FR-010 room-change field (deferred).

### Backend work (endpoints, services, entities)

- **`GET /api/v1/styles`** *(new, FEAT-003-owned; foundation §1.4)* — read-only list of the seeded predefined styles (`id`, `name`, `description`, `preview_image_url`). Source of the selectable catalog for TC-015. Entity read: **`Style`**.
- **Style / free-text / budget fields on `POST /api/v1/renders`** — per the decided API modelling (`06_api.md` §3, PROPOSED), these inputs are submitted as fields on the render request rather than through a separate project endpoint: `styleId` (optional), `styleDescription` (optional), `budget: { min, max, currency }` (required). The shared `POST /renders` handler (owned by FEAT-005) creates the `Project` and this feature contributes the mapping + validation:
  - **Server-side budget validation** — reject with **HTTP 400, error code `budget-range`** when min > max, negative, or non-numeric; **no `Project` is persisted** on rejection (satisfies TC-018 as the source of truth; the client check is UX only).
  - **Field mapping** — valid inputs map onto `Project.style_id`, `Project.style_description`, `Project.budget_min`, `Project.budget_max`, `Project.currency` (fixed `"COP"`).
- **Entities touched:** **`Project`** (write: `style_id` FK, `style_description`, `budget_min`, `budget_max`, `currency`), **`Style`** (read). **`StyleTaxonomy` is not built** (ADR-005; folded into `Style` + `Product.style_attributes`).

### Operator work

- **Seed the 1–2 predefined `Style` rows** (name + `preview_image_url`) whose style tag exactly matches the `style_attributes` tag used on the curated `Product` catalog (BR-16 shared vocabulary; ADR-005). `taxonomy_id` is left null. This is what makes a selected style resolve to real SKUs during matching (FEAT-005); a drift between the style tag and the catalog tags is the main way this feature silently breaks.

### Approach / key steps (ordered)

1. **Fix the pilot style tag list (1–2 values)** shared by the `Style` seed rows and `Product.style_attributes`; operator seeds the `Style` rows and preview images against it.
2. **Backend `GET /styles`** — return the seeded rows (read-only).
3. **Backend input contract + validation** — add `styleId` / `styleDescription` / `budget{min,max,currency}` to the `POST /renders` request; implement the budget validator (numeric, non-negative, min ≤ max) that returns 400 `budget-range` and persists nothing on failure, and maps valid values onto the `Project` at creation.
4. **iOS controls** — build `StylePickerView` (loads `GET /styles`), `StyleDescriptionField`, `BudgetRangeControl` (COP formatting + inline validation); wire all three into the shared `ProjectDraft`.
5. **iOS budget indicator (proposed)** — persistent budget chip for later steps.
6. **Integration** — inputs travel with `photoId` + dimensions into `POST /renders`; on success the `Project` carries the persisted style/free-text/budget.
7. **Run the TCs** below.

### Tests to satisfy

- **TC-015** (FR-007) — select a predefined style from the catalog → selection persisted on the project.
- **TC-016** (FR-008) — enter a free-text style description → text persisted on the project.
- **TC-017** (FR-009) — valid budget, min ≤ max → range persisted on the project.
- **TC-018** (FR-009) — min > max, or negative/non-numeric → rejected with a `budget-range` validation error, nothing persisted.
- *Deferred (not run in pilot):* TC-019 (FR-010, room-change description).

> Note: in the decided model the `Project` is created at render submission, so the persistence assertions in TC-015–TC-018 are exercised through `POST /renders` (with a valid `photoId` + dimensions present). `GET /styles` is independently testable.

### Depends on

- **Foundation** — `Project` entity + Postgres, `/api/v1` base path, anonymous device-token scoping of the Project (no accounts, ADR-022), and the submit→poll render model that creates the Project.
- **FEAT-002** (Photo & dimensions) — the same render submission that persists these inputs also requires a valid `photoId` and room dimensions, so the end-to-end persistence TCs need FEAT-002 present.
- **FEAT-005** (Render / matching) — owns `POST /renders` (where the `Project` is created and these fields are persisted) and consumes `style_id` / `style_description` / budget as matching constraints (budget + 10% tolerance, ADR-008).
- **Catalog/operator seeding** — the predefined `Style` tag must match `Product.style_attributes` (BR-16) for matching to return SKUs.

### Effort

**S** — one small read-only endpoint, three input controls, a budget validator, field mapping onto an existing entity, plus operator seed data. The heavy matching/render logic sits in FEAT-005, not here.

### Risks

- **Style-tag ↔ catalog drift (primary):** if a seeded style's tag doesn't match the `Product.style_attributes` tags, matching returns nothing and every render is empty/over-budget. Mitigate with one shared pilot style-tag list used for both `Style` seeds and product tagging.
- **Unrealistic COP budgets:** a budget far below the cheapest catalog combination forces the downstream over-budget/no-match fallback (FR-022/FR-023, out of FEAT-003 but driven by its input). Mitigate with COP placeholder/hint ranges tuned to the seeded catalog.
- **Persistence coupling:** inputs are only persisted at render submission (decided model), so they live in client state until "Continue → render." Acceptable for the pilot; flagged because TC-015–TC-018 assert persistence and therefore run through `POST /renders`.
- **COP numeric/locale handling:** large COP magnitudes and locale separators are the main TC-018 edge cases; validation must reject non-numeric/thousands-separator garbage cleanly on both client and server.
- **Optionality ambiguity:** `style_id` nullable + free-text optional lets a user submit with no style signal at all, weakening matching. Recommend a soft gate: budget always required; expect at least one style signal (predefined style or free text) before render.


## FEAT-005 — AI rendering engine

**Goal:** Match only real, in-stock catalog SKUs to the user's style, dimensions, budget, and locality, then composite them into the user's own room photo as a believable render — published to the user immediately on generation success (~~leaving it in `pending_review` so the operator (FEAT-006) must approve before it is ever shown~~ retired — ADR-025).

**Pilot FRs covered:** FR-014 (match real, available SKUs), FR-015 (generate composite render), FR-016 (real-SKU-only, never fabricate), FR-017 (scale to room dimensions), FR-018 (in-stock only), FR-021 (within budget + 10% tolerance, ADR-008).

**Deferred (out of pilot):**
- FR-019 — automated exclusion of incomplete catalog entries. In the pilot, completeness is enforced *upstream by the operator at catalog load* (all BR-1 fields required — ADR-014, FEAT-015), so the matching service can trust that active products are complete. The render-eligibility *filter mechanism* itself is deferred (TC-036/TC-037).
- FR-022 — budget-unmet disclosure + closest alternative (TC-042/TC-043). The pilot *raises* the `budget-exceeded` status but does not build the disclosure/alternative flow; the operator handles it against the tiny catalog.
- FR-023 — no-match "suggest similar / mark unavailable" (TC-044/TC-045). The pilot *raises* the `empty-match` status but does not build the suggestion flow.
- FR-020 (locality gate) is consumed here but *owned by FEAT-004* (TC-038/TC-039). NFR-002 (targeted edits, FEAT-014) and FR-048/FR-049 (render metering, FEAT-013) are out.

### iOS work (screens / components)

- **`RenderRequestService` (client):** submits `POST /renders` once the input set is complete (photo + dimensions + style + budget), then polls `GET /renders/{renderId}`. Rendering is async submit→poll (ADR-013: ~2–5 min soft, no SLA), so no blocking call.
- **`RenderProgressView`:** indeterminate "preparing your render" wait state. The wait spans generation only (~~Because operator QA is mandatory (FEAT-006), the wait spans generation *and* review~~ review retired — ADR-025); copy must not imply an SLA or read as a failure during the wait.
- **Error / non-happy states** (surfaced from the poll response, no image shown): `render-failed` (TC-029), `missing-dimensions` block (TC-033), `empty-match` (TC-027), `budget-exceeded` (TC-041). These render as ret/adjust-inputs prompts.
- Note: the *completed render image + tappable tags* is FEAT-007~~, and the *release gate* is FEAT-006~~ (gate retired — ADR-025). FEAT-005's client surface stops at submit, poll, wait, and error states — it never displays a render before `completed` (~~`pending_review`~~ retired state — ADR-025).

### Backend work

**Endpoints (paths illustrative per 06_api.md; ADR-001 stack):**
- `POST /api/v1/renders` — create a `RenderRequest` (`type=generate`), kick off match→generate, return `202` with `renderId` + `status=queued`.
- `GET /api/v1/renders/{renderId}` — poll status; FEAT-005 owns the whole status machine (`queued → processing → completed | failed`); ~~the generation portion ended at `pending_review`, with `approved | rejected` transitions in FEAT-006~~ **retired — ADR-025**.
- `GET /api/v1/catalog/products` *(internal, read)* — matching input; owned by FEAT-015, consumed here.

**Services:**
- **Product matching service** (module *Product matching*): selects candidate SKUs constrained by style (via `Style`/`StyleTaxonomy`, ADR-005), room-dimension fit, budget (`budget_min/max` + 10% tolerance, ADR-008), availability (`product_type=ready_made` ⇒ `stock_quantity > 0`, FR-018), and locality/delivery (from FEAT-004, FR-020 gate). Returns a matched SKU set, or `empty-match` (FR-014 error path), or `budget-exceeded` (FR-021 error path).
- **Rendering pipeline / orchestration service** (module *Rendering pipeline*): takes the matched SKUs + accepted `RoomPhoto` + `room_dimensions`, invokes the **self-hosted mflux child process (FLUX.2 Klein 4B, `mflux-generate-flux2-edit --model flux2-klein-4b`, quantized; ADR-026, superseding ADR-002's hosted-API clause)** on the Apple-Silicon render worker, compositing the operator-curated product images into the photo at realistic scale (FR-015, FR-017), stores the result in object storage (private), and writes `Render` + `RenderItem` links. In code this is `MfluxRenderPipeline`; `FakeRenderPipeline` stays the default/test/CI implementation.
- **Real-SKU guarantee / validation** (FR-016, the central invariant): every `RenderItem` must reference an existing, purchasable `Product`; a `fabricated-item` check blocks the render from ~~reaching review~~ publishing (ADR-025) if any shown item has no backing SKU (TC-031). In the 2D-inpainting pilot this binding is *the matched set + RenderItem records*~~ + operator visual QA~~ (QA retired — ADR-025), not a pixel-level proof.
- **Cost & conversion instrumentation:** record `RenderRequest.inference_cost` per render (NFR-005), seed the render-to-purchase counter (NFR-006), enforce a global inference-cost threshold (NFR-003) and degrade gracefully via queueing/slower rendering when exceeded (NFR-004).

**Data entities touched (07_data_model.md):**
- *Writes:* `RenderRequest` (`type`, `status`, `inference_cost`), `Render` (`image_ref`, `status=completed` — ~~`pending_review`~~ retired, ADR-025, `total_product_cost`, `within_budget`, `is_private=true`), `RenderItem` (`product_id`, `display_name`, `captured_price`, `supplier_id`, `rendered_scale`, `tag_position`).
- *Reads:* `Product` (SKU, dimensions, price, `product_type`, `stock_quantity`, `style_attributes`, photos), `Style`/`StyleTaxonomy`, `Project` (`style_id`, `style_description`, `budget_min/max`, `room_dimensions`), `RoomPhoto` (accepted image), `DeliveryZone`/`Market` (locality via FEAT-004).

### Operator work

No operator UI is built *inside* FEAT-005. ~~FEAT-005 sets `Render.status = pending_review` and hands off to the mandatory operator QA in **FEAT-006** (FR-027) — nothing is displayed to the user before approval.~~ **Superseded by ADR-025 (2026-07-14):** FEAT-005 sets `Render.status = completed` and the render publishes to the requesting user immediately. Two operator responsibilities that FEAT-005 *depends on* live elsewhere: catalog completeness/curation and the operator-curated product images used as the compositing source (FEAT-015, ADR-002/ADR-014). Prompt/pipeline set-up and render-quality tuning are builder tasks (pilot Day 1 and Day 5), not an operator screen.

### Approach / key steps (ordered)

1. Persist `RenderRequest` / `Render` / `RenderItem` and define the generation status machine (`queued → processing → completed | failed`; ~~`pending_review`~~ retired — ADR-025).
2. Build the matching service: query active, complete, in-stock, locally-deliverable products; filter by style taxonomy; keep only those that fit the room dimensions; select a combination whose total is within `budget_max` + 10% (ADR-008). Emit `empty-match` / `budget-exceeded` when no valid set exists.
3. **Implementation task — render worker setup (no vendor):** the engine is decided (ADR-026 — self-hosted FLUX.2 Klein 4B via mflux; ADR-002's ~~hosted generative image API~~ engine clause superseded, and its ~~mandatory operator QA~~ clause superseded by ADR-025). Stand up the **Apple-Silicon render worker** (mflux requires Apple MLX), install mflux, and build the pipeline + compositing prompt (pilot Day 1).
4. Build the rendering orchestration: assemble prompt + room photo + matched product images, invoke the mflux child process (`mflux-generate-flux2-edit --model flux2-klein-4b`, quantized), scale placement using room + product dimensions (FR-017), retrieve the composite, store privately in object storage.
5. Bind every shown item to its real `Product` via `RenderItem`; run the `fabricated-item` validation and block on failure (FR-016).
6. Compute `total_product_cost`, set `within_budget` against budget + 10%; raise `budget-exceeded` when the only combination exceeds tolerance (FR-021).
7. Guardrails: block generation with `missing-dimensions` when `room_dimensions` is absent (FR-017/TC-033); record `render-failed` and show nothing to the user on generation failure (FR-015/TC-029).
8. Set `status = completed` and publish immediately (~~`pending_review` hand-off to FEAT-006~~ retired — ADR-025); wire `RenderItem` data for FEAT-007 tagging.
9. Instrument inference cost, cost threshold, graceful degradation, and the render-to-purchase seed (NFR-003/004/005/006).
10. iOS: submit render, poll, wait state, and error states.

### Tests to satisfy (pilot FRs)

- FR-014 → **TC-026** (match set selected), **TC-027** (`empty-match`).
- FR-015 → **TC-028** (composite produced, `completed` — ~~`pending-review`~~ ADR-025), **TC-029** (`render-failed`, nothing shown).
- FR-016 → **TC-030** (every item resolves to a real SKU), **TC-031** (`fabricated-item` blocks). *Critical.*
- FR-017 → **TC-032** (scaled to room dimensions), **TC-033** (`missing-dimensions` block).
- FR-018 → **TC-034** (in-stock only rendered), **TC-035** (`out-of-stock` exclusion).
- FR-021 → **TC-040** (within budget + 10%), **TC-041** (`budget-exceeded` raised).

*Deferred TCs (not built in the pilot):* TC-036/TC-037 (FR-019), TC-042/TC-043 (FR-022), TC-044/TC-045 (FR-023). Locality TC-038/TC-039 (FR-020) are proven by FEAT-004. NFR checks (NFR-001/005/006/007) have no dedicated TC rows yet (08_test_plan.md).

### Depends on

- **foundation** — ADR-001 stack (iOS/SwiftUI app, one managed backend service, Postgres, object storage) and the self-hosted render engine on a separate Apple-Silicon render worker (FLUX.2 Klein 4B via mflux — ADR-026, superseding ADR-002's hosted-API clause).
- **FEAT-002** — room photo (accepted quality) + `room_dimensions`.
- **FEAT-003** — style + budget inputs (`style_id`/`style_description`, `budget_min/max`).
- **FEAT-004** — resolved locality / delivery zone (FR-020 gate; single fixed Bogotá zone in the pilot, ADR-015).
- **FEAT-015** — curated `Product` catalog: complete per ADR-014, in-stock flags, style-taxonomy mapping, and the operator-curated product images used for compositing.
- **Feeds:** ~~FEAT-006 (operator review of the `pending_review` render — mandatory release gate)~~ (retired — ADR-025) and FEAT-007 (product tagging from `RenderItem`), fed directly on completion.

### Effort & risks

**Effort: XL.** Two logical modules (matching + rendering), a self-hosted mflux render pipeline (FLUX.2 Klein 4B) with prompt iteration on the Apple-Silicon render worker (ADR-026), the real-SKU binding invariant, cost instrumentation, and iOS polling. Most of the effort and risk is *render-fidelity tuning* (pilot Day 5), not raw code volume — this is the make-or-break core of the pilot.

**Key risks:**
- **Render fidelity (PRD §10, the highest product risk).** A 2D diffusion edit (now self-hosted FLUX.2 Klein 4B via mflux — ADR-026) can show a plausible look-alike rather than the *exact* SKU — ADR-002 explicitly flags this tension with BR-6/BR-14, and the engine swap does not change it. Mitigation: composite from operator-curated product images~~ + mandatory operator QA (FEAT-006); the real-SKU guarantee is manual/visual in the pilot, not a technical proof~~ (QA backstop retired — ADR-025; the structural guard is the real-catalog compositing + the `fabricated-item` check, and the guarantee is not technically proven).
- **Scale realism from approximate dimensions (FR-017).** A 2D pipeline has weak 3D scale control; wrong-sized furniture erodes trust and raises returns.
- **Engine decided, self-hosted (ADR-026).** No third-party provider — the engine is self-hosted FLUX.2 Klein 4B via mflux on an Apple-Silicon render worker. Per-render marginal cost is near-zero local compute; latency (~a few min for a 1-reference edit; measured worst case 617 s ≈ 10.3 min for 3 references — BUG-004) and throughput now depend on **owned hardware capacity**, bounded by the global cost/capacity threshold (NFR-003/005). New operational dependency: the Apple-Silicon render host (mflux requires Apple MLX).
- **Tiny catalog (30–60 SKUs).** `empty-match`/`budget-exceeded` are likely; the pilot returns the status but the FR-022/FR-023 fallbacks are deferred, so the operator resolves edge cases manually.
- **Latency + no SLA.** ~2–5 min generation~~ plus operator-review time~~ (review retired — ADR-025); the wait UX must not read as a failure.
- **Privacy (improved by ADR-026).** Room photos and renders **no longer leave to a third-party image vendor** — they stay on the owner-controlled Apple-Silicon render worker; they must still be private-by-default and access-controlled (NFR-007, ADR-019).


## FEAT-006 — Render review & moderation

> **Retired — ADR-025 (2026-07-14).** The human render-approval gate is removed entirely: no operator
> reviews, approves, or rejects renders; renders are published immediately on generation success.
> FR-027 is superseded, the `render_reviewer` role is retired, and TC-051/TC-052/TC-053 (and the
> render approve/reject state-machine preconditions among TC-107..109) are retired with it. The
> client's waiting-for-approval hold state (`RenderWaitingView` through `pending_review`) is likewise
> removed. This section is preserved for history and is no longer part of the target build plan
> (see `decisions/ADR-025_autonomous-render-publication.md`).

**Goal:** Enforce the mandatory human-in-the-loop gate — no render reaches the user until an authorized operator approves it (FR-027, ADR-002).

**Pilot FRs covered:**

- **FR-027** — Operator reviews and approves each render before it is shown to the user (pilot).

This feature is the release gate described in Foundation §1.5 step 6 and §1.7 job 2. It owns the `pending_review → approved | rejected` transition on `Render`, the operator review surface that drives it, and the enforcement that a non-approved render is never served to the client. Related NFRs it must honor (not standalone FRs): **NFR-007 / PRD BR-33** (renders private by default — operator access is scoped and time-limited) and **NFR-008** (approval is a privileged action — only an authorized operator role may perform it).

**Deferred (out of pilot):**

- Targeted edit-by-question refinement of a rejected/imperfect render (FEAT-014, FR-051/FR-052) — the pilot's only rejection outcome is "not shown / re-render," no in-place correction.
- Keep-or-replace review of segmented items (FEAT-012, FR-025/FR-026).
- Push-notification nudge to the user on approval (Foundation §1.1 nice-to-have) — polling is the pilot contract.
- Any automated/model-based moderation or auto-approval — the pilot gate is 100% human by decision (ADR-002).

### iOS work

Minimal — the client's only job is to respect the gate and never render a non-approved image.

- **RenderWaitingView (hold state).** While `GET /renders/{id}` returns `queued` / `processing` / `pending_review`, the app stays on a non-dismissive waiting state ("your design is being prepared / reviewed") and keeps polling (Foundation §1.1 submit→poll). No render image, tags, or cart is shown during `pending_review` — this is the client half of TC-053.
- **Render reveal transition.** Only when the poll flips to `approved` does the app fetch and display the image + tags (hands off to FEAT-007/FEAT-008). A `rejected`/`failed` terminal status routes to a graceful message (retry/re-render path), not a broken/blank render.
- No new operator UI ships in the iOS app; operators use the web console.

### Backend work

**Endpoints (real ids from Foundation §1.4 / `06_api.md`):**

- `POST /operator/renders/{id}/approve` (Operator) — transition `Render.status` `pending_review → approved`, stamp `reviewed_by` (the acting `Operator`) and `reviewed_at`, emit `render_approved`, trigger cart auto-population (FR-031, FEAT-008). → TC-051.
- `POST /operator/renders/{id}/reject` (Operator) — transition `pending_review → rejected`, stamp `reviewed_by`/`reviewed_at`; the render is never served. → TC-052.
- `GET /renders/{id}` (Client) — the gate: returns image + tags only when `status = approved`; for `pending_review`/`queued`/`processing` it returns the pending status with no image payload; `rejected`/`failed` returns a terminal status. → TC-053.
- **New operator listing endpoint needed by this feature (API addition — implementation task):** `GET /operator/renders?status=pending_review` — the review queue backing the console. The Foundation API table lists only approve/reject; the queue read is implied by §1.7 job 2 and must be added to `06_api.md`. Returns each pending render with references to its source `RoomPhoto`, composite `Render.image_ref`, and `RenderItem` list (via short-lived signed URLs — NFR-007).

**Services / domain:**

- **Render state machine** (`domain/`, per Foundation §1.5) — the single authority for `pending_review → approved | rejected`. Transitions are one-way and idempotent-safe: approving/rejecting an already-decided render returns its current state, never re-fires side effects. This state machine is the object every serve/read path checks — the gate is enforced in the domain layer, not in the view.
- **Fail-closed serving rule** — any read path that could expose a render (`GET /renders/{id}`, and the RenderItem/tag endpoints in FEAT-007) must default to "not visible" for any status other than `approved`. A missing/unknown status is treated as not-approved.
- **Authorization check** — approve/reject require an authenticated `Operator` with the `render_reviewer` role (NFR-008); a non-operator or wrong-role caller is rejected. The operator console is the pilot's only authenticated surface (Foundation §1.7).
- **Signed-URL scoping** — the operator review surface reads the private source photo and composite through short-lived signed URLs granted only to the reviewing operator (Foundation §1.8), honoring privacy-by-default (NFR-007 / BR-33).
- **Instrumentation** — emit `render_approved` into the event trail so `render_created → render_approved → render_viewed → … → purchase_completed` stays queryable for render-to-purchase (Foundation §1.10, NFR-006).

**Data entities touched:**

- `Render` — owns `status` (`pending_review`/`approved`/`rejected`), `reviewed_by` (FK → `Operator`), `reviewed_at`, `image_ref` (private) (`07_data_model.md` L224–227).
- `Operator` — the acting reviewer; `role = render_reviewer` gates the action (L75–86).
- `RenderItem` (read-only here) — the matched-SKU list shown in the review detail so the operator can confirm the composite matches real products (L104 foundation; FR-028 data).
- `RoomPhoto` (read-only here) — the original room photo shown alongside the composite for the fidelity check.

### Operator work

This feature exists to be operated. In the web console (Foundation §1.7 job 2):

- **Review queue screen** — lists `pending_review` renders (oldest first) so nothing stalls unattended; each row shows the source photo, the composite, and the matched-SKU list.
- **Review action** — the operator confirms the image matches the real products and looks believable (the pilot's stated human check), then **Approve** (releases to the user) or **Reject** (never shown; re-render path). Every decision is attributed (`reviewed_by`/`reviewed_at`) for traceability.
- Operators must monitor the queue promptly during pilot Days 6–7: there is no render SLA (ADR-013) and the small team is the only thing between a queued render and the user, so queue latency directly affects conversion.

### Approach / key steps (ordered)

1. **Model the state machine** in `domain/` with `pending_review` as the created state (set by FEAT-005 at persist time, Foundation §1.5 step 5), and the only legal transitions `pending_review → approved` and `pending_review → rejected`. Reject any transition from a terminal state.
2. **Add the fail-closed serve guard** to `GET /renders/{id}` (and wire it as the shared predicate the FEAT-007 tag reads also call): image/tags visible iff `status = approved`. Prove TC-053.
3. **Implement `approve`/`reject` handlers** with the `render_reviewer` authorization check, `reviewed_by`/`reviewed_at` stamping, and idempotent side-effect firing. Approve emits `render_approved` and kicks cart auto-population; reject is terminal. Prove TC-051 / TC-052.
4. **Add the operator review queue** endpoint + console screen, reading private assets via short-lived signed URLs scoped to the reviewer (NFR-007).
5. **iOS hold + reveal** — keep the client on the waiting state through `pending_review`, reveal only on `approved`, graceful message on `rejected`/`failed`.
6. **Add the missing security TC** — write a TC against FR-027 for "a non-operator (or wrong-role) cannot approve a render" (NFR-008), flagged as not-yet-covered in the FEAT-006 doc §9 and Foundation §1.11; register it in `08_test_plan.md` before implementation closes.
7. **Verify the audit/event trail** records approvals so render-to-purchase is measurable from the first real user (NFR-006).

### Tests to satisfy

Existing `TC-` rows for FR-027 (all currently `Pending` in `08_test_plan.md`):

- **TC-051** — Operator approves a `pending-review` render → status becomes `approved` and it is released to the user. *(Happy path — POST .../approve.)*
- **TC-052** — Operator rejects a `pending-review` render → status becomes `rejected` and it is not shown. *(Rejection path — POST .../reject.)*
- **TC-053** — User attempts to view a not-yet-reviewed render → it is not displayed (blocked by the `pending_review` gate). *(Gate — GET /renders/{id} + iOS hold state.)*

To be added (new `TC-` against FR-027, not yet in the plan — see step 6):

- **TC-0xx (new)** — A non-operator / wrong-role caller attempts to approve a render → rejected, render unaffected (NFR-008). Add to `03_requirements.md` acceptance criteria and `08_test_plan.md`.

### Depends on

- **foundation** — async render job + submit→poll contract (§1.1), the `Render` state fields and enums (§1.3), `GET /renders/{id}` and the operator approve/reject endpoints (§1.4), the render pipeline that persists `pending_review` renders (§1.5), the operator console shell + `Operator` auth/roles (§1.7), private object storage + signed URLs (§1.8), and the event trail (§1.10).
- **FEAT-005** (AI rendering engine) — produces the render in `pending_review` with its `RenderItem`s; this feature reviews that output. FEAT-006 has nothing to gate until FEAT-005 emits a render.
- **Downstream consumers (not dependencies):** FEAT-007 (tagging) and FEAT-008 (cart auto-population) run only on `approved` renders released by this gate; FEAT-007's tag-read endpoints must call this feature's fail-closed guard.

### Effort

**S** — small, bounded code: two decision endpoints, one shared serve guard, one console review screen, and thin iOS hold/reveal logic; most plumbing (state machine scaffolding, poll contract, console auth, signed URLs) is delivered by the foundation. Effort is dominated by getting the gate provably correct and secure, not by volume of code.

### Risks

- **The gate is a hard security boundary.** A bug that serves a `pending_review`/`rejected`/`failed` render defeats the entire ADR-002 rationale (the human backstop against a plausible look-alike) and undermines the highest-risk area in the PRD. Mitigation: enforce fail-closed in the domain layer, treat any non-`approved` (including unknown) status as not-visible, and cover with TC-053.
- **Missing security test.** No `TC-` yet proves NFR-008 (only an authorized operator can approve). Shipping the gate without it leaves the privileged action unverified — must add the TC (step 6) before close.
- **Operator access to private assets.** The review surface exposes the user's room photo and render to staff; broad, long-lived, or leaking URLs would break privacy-by-default (NFR-007 / BR-33). Mitigation: short-lived signed URLs scoped to the reviewing operator only.
- **Rejection handling is under-specified.** The FEAT-006 doc marks rejection paths DRAFT/PROPOSED; the pilot must decide what `rejected` does next (re-render vs. dead-end) so a user is not stranded indefinitely in the waiting state with no resolution.
- **No render SLA + human bottleneck.** With ~2–5 min soft target and no hard SLA (ADR-013) and a tiny pilot team, an unattended queue makes the user wait; queue latency hits render-to-purchase directly. Mitigation: oldest-first queue, prompt operator monitoring on Days 6–7.


## FEAT-007 — Product tagging & interaction

**Goal:** Turn a completed (~~operator-approved~~ — ADR-025) render into a *shoppable image* — every product shown carries a real, tappable tag (name / price / supplier / listing link), and tapping it opens that product's details, bridging "seeing" to "buying."

**Pilot FRs covered:**
- **FR-028** — Tag every rendered product with its details (pilot subset: name, price, supplier, listing link). *(actor: System)*
- **FR-029** — View a tagged product's details by tapping it in the render. *(actor: Homeowner/renter)*

Cross-cutting NFRs surfaced here: **NFR-015** (price/delivery visible before checkout — warranty excluded, see below) and **NFR-007** (tag data served only to authorized viewers of a private render).

**Deferred (out of pilot):**
- **Warranty field on the tag** — the tag field list in FR-028/TC-054 includes *warranty terms*, but warranty display is out of pilot (ADR-020; FR-038 in FEAT-009). The **pilot tag subset carries name, price, supplier, and listing link**; the warranty portion of TC-054 is validated only when FR-038 ships. Schema keeps the `warranty_terms` column but the pilot iOS tag UI does not render it.
- **Add / remove from the tagged render** — cart actions live in **FEAT-008**, not here. FEAT-007 owns the tag overlay + detail view only. Per **§0.1#2**, manual add-to-cart (FR-030, `POST /cart/items`) is **deferred out of the pilot**: the cart is auto-populated on render ~~approval~~ completion (ADR-025) (FR-031/FEAT-008), and the pilot detail sheet shows product details without an "Add to cart" affordance (remove/swap happen in the cart via FEAT-008).
- **`is_kept_item` / kept-vs-purchased visual distinction** (NFR-014) — depends on keep-or-replace (FEAT-012), out of pilot; every tagged item in the pilot is a purchasable catalog SKU.

### iOS work (SwiftUI, ADR-001)
- **`TaggedRenderView`** — the completed (~~approved~~ — ADR-025) render image with an overlaid, interactive **tag hotspot layer**. Renders one tappable marker per `RenderItem` at its `tag_position`, mapping normalized/image-space coordinates onto the displayed (scaled/aspect-fit) image frame so hotspots track the image on resize and rotation. Includes accessible hit targets (min ~44pt) and a visible label chip (name + price in COP).
- **`ProductTagDetailSheet`** — presented on tap; shows **name, price (COP), supplier, listing link** (opens externally), and the product photo. Renders gracefully when an optional field (e.g., `listing_url`) is missing/omitted (covers the TC-055 missing-optional-data case). No "Add to cart" button in the pilot (manual add is deferred per §0.1#2; the cart is auto-populated — FR-031).
- **`RenderTagsViewModel`** — fetches tag data for the completed (~~approved~~ — ADR-025) render, holds the tag list, and drives the detail lookup. Reuses the app's networking layer and COP currency formatter from FEAT-004.
- Guard: the tagged view is only reachable for a render whose status is `completed` (~~`approved`, gate owned by FEAT-006~~ retired — ADR-025); no tag layer is shown for in-progress/failed renders.

### Backend work (managed backend service + managed Postgres, ADR-001)
Endpoints (already specified in `06_api.md §6`):
- **`GET /api/v1/renders/{renderId}/items`** — list the products shown in a completed (~~approved~~ — ADR-025) render, each with tag data. Returns, per item: `render_item_id`, `product_id`, `tag_position`, `display_name`, `captured_price`, `supplier` (name), `listing_url` (`warranty_terms` present in payload but not surfaced in pilot UI). → FR-028.
- **`GET /api/v1/renders/{renderId}/items/{itemId}`** — details for one tapped tag, returning current catalog data joined to the captured tag values. → FR-029.

Service / logic:
- **Tag-projection service** — on the read path, assemble each tag from the stored **`RenderItem`** row joined to **`Product`** and **`Supplier`** catalog data. `display_name` and `captured_price` come from the `RenderItem` (captured at render time, from FEAT-005); `supplier` name and `listing_url` from the joined catalog. No tag data is *generated* here — `RenderItem` rows are produced during rendering (FEAT-005); FEAT-007 is the read/serve + interaction layer.
- **Authorization gate** — serve items only for renders the requesting contact/session owns and only when status is `completed` (NFR-007~~, FR-027~~ — review gate retired, ADR-025). Displayed data is read-only.

Data entities touched (read-only for this feature; `07_data_model.md`):
- **`RenderItem`** — `render_id`, `product_id`, `tag_position` (JSON), `display_name`, `captured_price`, `supplier_id`, `warranty_terms`, `listing_url`. Source of truth for the tag.
- **`Product`** / **`Supplier`** — source of `supplier.name`, `listing_url`, current price/photo for the detail lookup.

### Operator work
No dedicated operator step in FEAT-007. Operator involvement is upstream and reused:
- ~~**FEAT-006 render review** — during render QA the operator confirms each visible product maps to the correct real SKU, which is what makes the tags trustworthy (BR-6/BR-14).~~ **Retired — ADR-025:** tag trustworthiness rests on FEAT-015 curation and the FR-016 `fabricated-item` guard.
- **FEAT-015 catalog curation** — the operator loads the SKUs so `display_name`, `price`, `supplier`, and `listing_url` are present and correct (BR-1). If `listing_url` is intentionally omitted for a SKU, the tag/detail UI must still render (TC-055 missing-optional case).

### Approach / key steps (ordered)
1. **Confirm the read contract** for `GET /renders/{renderId}/items` and `.../items/{itemId}` against `RenderItem`/`Product`/`Supplier` — freeze the pilot field set (name, price, supplier, listing link; warranty carried but not surfaced).
2. **Backend: tag-projection service + two GET endpoints**, with the `completed` (~~`approved`~~ — ADR-025) + ownership authorization gate (NFR-007). Return `tag_position` for hotspot placement.
3. **iOS: `RenderTagsViewModel`** to fetch the item list once the render is completed (~~consumes FEAT-006's approval state~~ retired — ADR-025).
4. **iOS: `TaggedRenderView`** overlay — map `tag_position` onto the displayed image frame; render tappable, accessible hotspots with name+COP price chips.
5. **iOS: `ProductTagDetailSheet`** — populate from the item detail lookup; handle a missing optional field (e.g., no `listing_url`) without breaking layout. (No add-to-cart affordance in the pilot — §0.1#2.)
6. **Currency + formatting** — reuse FEAT-004's COP formatter for all prices.
7. **Test** TC-054 (tag generation/serving, pilot subset) and TC-055 (tap-to-view happy path + missing-optional case); verify the private-render/unauthorized-viewer guard (NFR-007) and that price is visible pre-checkout (NFR-015).

### Tests to satisfy (`08_test_plan.md`)
- **TC-054** (FR-028) — Generate/serve tags for a completed (~~approved~~ — ADR-025) render: each rendered product carries name, price, supplier, and listing link. *(Warranty part of TC-054 deferred to FR-038 per ADR-020; validated only when FEAT-009 ships.)*
- **TC-055** (FR-029) — Tap a product tag on a completed (~~approved~~ — ADR-025) render: the product's details are displayed. Covers the happy path **and** a tag with missing/omitted optional data (e.g., no listing link).
- Cross-cutting (referenced, not FEAT-007-owned TC rows): NFR-015 (price visible before checkout), NFR-007 (tag data served only to authorized viewers).

### Depends on
- **Foundation** — iOS app shell, backend service, managed Postgres, object storage, networking/auth-context layer (ADR-001).
- **FEAT-005** (AI rendering engine) — produces the `RenderItem` rows (incl. `tag_position`, `display_name`, `captured_price`) that this feature serves.
- ~~**FEAT-006** (Render review & moderation) — supplies the `approved` gate; tags are only served/shown for approved renders (FR-027).~~ **Retired — ADR-025:** tags are served for `completed` renders owned by the requesting session.
- **FEAT-015** (Supplier catalog management) — source of `Product`/`Supplier` fields shown in tags/details.
- **FEAT-004** (currency/formatting) — COP price display.
- Downstream (not a build dependency): **FEAT-008** (cart) — consumes the same `RenderItem` data to auto-populate the cart (FR-031); the pilot detail sheet has no add affordance (§0.1#2).

### Effort
**M.** Two thin read endpoints plus a projection join are small; the real work is the iOS interactive tag overlay (coordinate mapping across image scaling/rotation, accessible hit targets) and the detail sheet with graceful optional-field handling.

### Risks
- **Tag positioning fidelity** — if `tag_position` from FEAT-005 is inaccurate or in an unclear coordinate space, hotspots drift off their products. Mitigate by fixing a normalized coordinate convention with FEAT-005 and testing on multiple device sizes/orientations.
- **Warranty scope tension (FR-028 vs ADR-020)** — TC-054 lists warranty; pilot must ship the name/price/supplier/link subset only. Risk of accidentally surfacing an unpopulated/legally-unreviewed warranty field. Mitigate by explicitly excluding warranty from the pilot tag UI while keeping the column.
- **Stale captured vs. current price** — the detail lookup joins live catalog data; if catalog price changed after render capture, the tag chip (`captured_price`) and detail could differ. Decide display rule (pilot: show captured price for consistency with the render/cart) to avoid user confusion at checkout.
- **Authorization leakage** — items endpoint must enforce render ownership + `completed` status (~~approved~~ — ADR-025) (NFR-007); a missing check would expose another user's private render contents.


## FEAT-008 — Shopping cart

**Goal:** Turn the completed (~~operator-approved~~ — ADR-025) render into a ready-to-buy cart that is auto-populated with the exact tagged products, lets the user review and remove lines, and requires an explicit confirmation before payment is allowed.

**Pilot FRs covered:**

- **FR-031** — Auto-populate the cart with every product shown in the render.
- **FR-032** — Review the cart contents (product, quantity, price per line).
- **FR-033** — Remove a product from the cart (total recalculated).
- **FR-035** — Require explicit cart confirmation before payment.

Per-item price/delivery estimates shown next to each line are owned by **FEAT-009 (FR-036)**, not this feature.

**Deferred (out of pilot):**

- **FR-030** — Add an individual tagged product to the cart (TC-056, TC-057).
- **FR-034** — Swap a cart item for an alternative (TC-061, TC-062).
- **FR-039 / FR-040** — Place / release time-boxed stock holds. Per **ADR-011** there is **NO stock hold in the pilot** (tiny operator-curated catalog; the operator checks availability); the PRD 15-minute default applies only post-pilot (TC-069, TC-070, TC-071). The `StockHold` entity is not written or read in the pilot.

---

### iOS work (SwiftUI)

- **CartView** — the cart screen, opened after the completed (~~approved~~ — ADR-025) render is shown. Renders the auto-populated line list from `GET /api/v1/cart` (FR-031, FR-032; TC-058, TC-059).
- **CartLineRow** — one row per `CartItem`: product name/thumbnail, supplier, quantity, captured unit price, and a **remove** control (FR-033; TC-060). The estimate/warranty text in the row is fed by FEAT-009.
- **CartSummaryBar** — subtotal in COP, and the primary **Confirm cart** action (FR-035; TC-063).
- **Confirm-gating in the client:** the "Proceed to pay" affordance (handed off to FEAT-010 checkout) is disabled until the cart is confirmed; the app relies on the server `confirmed` state, not only local UI state, so the block is real (TC-064).
- **CartViewModel** — loads the cart, issues remove/confirm calls, recomputes and displays the subtotal after each mutation, handles empty-cart and error states.
- Remove and confirm are lightweight, few-step interactions (NFR-013); price is visible before checkout (NFR-015, satisfied jointly with FEAT-009).

### Backend work (managed backend service + managed Postgres)

**Endpoints (pilot subset of API §7):**

- `GET /api/v1/cart` — return the cart with its `CartItem`s (product, quantity, captured `unit_price`, `currency`, `subtotal`, `status`). Serves FR-031 (auto-populated result) and FR-032. → TC-058, TC-059.
- `DELETE /api/v1/cart/items/{itemId}` — remove a line and recompute `subtotal`. Serves FR-033. → TC-060.
- `POST /api/v1/cart/confirm` — set `Cart.status = confirmed` and stamp `confirmed_at`; idempotent. Serves FR-035. → TC-063.

**Not built in the pilot:** `POST /api/v1/cart/items` (FR-030 add + would place a hold), `PATCH /api/v1/cart/items/{itemId}` (FR-034 swap). Leave routes unimplemented/stubbed with a `not-in-pilot` response; do not wire any `StockHold` logic (ADR-011).

**Services:**

- **Cart service** — (1) **auto-populate**: on render ~~approval~~ completion (ADR-025), build one `Cart` from the render and one `CartItem` per `RenderItem`, capturing `unit_price` from the product/tag at populate time and `currency = COP`; (2) **review**: read cart + lines; (3) **remove**: delete a line and recompute subtotal; (4) **confirm**: transition `draft → confirmed`. No hold placement, no swap.
  - **Populate trigger:** invoked when the render completes generation successfully (~~when FEAT-006 (operator console) marks the render **approved** — consistent with ADR-002 mandatory operator QA before the user sees the render~~ retired — ADR-025), so the cart never materializes from a failed render.
- **Confirmation gate:** `Cart.status` is the single source of truth for "may pay." FEAT-010 checkout reads it and rejects an unconfirmed cart with a `confirmation-required` status (BR-31). → TC-064 is proven end-to-end across FEAT-008 (state) + FEAT-010 (enforcement at `POST /api/v1/checkout`).

**Data entities touched:**

- `Cart` — `id`, `project_id`, `render_id`, `status` (`draft`/`confirmed`), `confirmed_at`, `currency`, `subtotal`, `created_at`. Written by populate/confirm, read by review.
- `CartItem` — `id`, `cart_id`, `product_id`, `render_item_id`, `quantity` (default 1), `unit_price`, `currency`, `created_at`. Created by populate, deleted by remove.
- Read-only references: `Render` and `RenderItem` (source of the auto-population; FEAT-002/005/007), `Product` (price/supplier).
- **Not touched in the pilot:** `StockHold` (deferred with FR-039/FR-040).

### Operator work

- None specific to cart mechanics. ~~The operator's render **approval** in the console (FEAT-006) is what triggers auto-population~~ Auto-population triggers on render **completion** (approval retired — ADR-025); no separate operator cart step. Availability is checked by the operator during curation~~/QA~~ (this is why holds are unnecessary per ADR-011).

### Approach / key steps (ordered)

1. Add `Cart` and `CartItem` tables/migrations in managed Postgres (pilot fields only); omit `StockHold`.
2. Implement **auto-populate** in the cart service, triggered by render ~~approval~~ completion (ADR-025): create `Cart(status=draft)` + one `CartItem` per `RenderItem`, capturing `unit_price`/`currency` (FR-031). → TC-058.
3. Implement `GET /api/v1/cart` returning lines + derived `subtotal` (FR-032). → TC-059.
4. Implement `DELETE /api/v1/cart/items/{itemId}` with subtotal recomputation (FR-033). → TC-060.
5. Implement `POST /api/v1/cart/confirm` (`draft → confirmed`, stamp `confirmed_at`, idempotent) (FR-035). → TC-063.
6. Scope ownership: since there are no accounts (ADR-022), bind the cart to its originating `project_id`/`render_id` + the session identity used across the pilot flow, so only that session may read/remove/confirm it (NFR-008).
7. Build **CartView** + rows + summary/confirm bar; wire the "proceed to pay" affordance to the server `confirmed` state and hand off to FEAT-010.
8. Coordinate the confirm gate with FEAT-010 so an unconfirmed cart is rejected at `POST /api/v1/checkout` with `confirmation-required` (FR-035). → TC-064.
9. Handle edge cases: empty cart after removing the last line (block confirm/checkout), and a cart already `confirmed` (confirm is a no-op).

### Tests to satisfy (pilot FRs)

- **FR-031 → TC-058** — a completed (~~approved~~ — ADR-025) render with N tagged products auto-populates N cart lines.
- **FR-032 → TC-059** — opening a populated cart shows every line with product, quantity, price.
- **FR-033 → TC-060** — removing a line removes it and recalculates the total.
- **FR-035 → TC-063** — confirming marks the cart `confirmed` and enables payment.
- **FR-035 → TC-064** — attempting payment on an unconfirmed cart is blocked with `confirmation-required` (verified jointly with FEAT-010).

Deferred TCs (not run in the pilot): TC-056, TC-057 (FR-030); TC-061, TC-062 (FR-034); TC-069, TC-070, TC-071 (FR-039/FR-040).

### Depends on

- **foundation** — managed backend service, managed Postgres (migrations), iOS app shell/navigation, session identity plumbing (no accounts, ADR-022).
- **FEAT-002 / FEAT-005 (rendering) + FEAT-007 (product tagging)** — must produce the `Render` and its `RenderItem`s that the cart is populated from.
- ~~**FEAT-006 (operator console)** — render **approval** event is the auto-population trigger (ADR-002 QA gate).~~ **Retired — ADR-025:** the render **completion** event (FEAT-005) is the auto-population trigger.
- **FEAT-009 (estimates & warranty)** — supplies per-line delivery/production estimates shown in the cart rows (FR-036); parallel, not blocking cart CRUD.
- **FEAT-010 (checkout & payment)** — consumes the confirmed cart and enforces the payment block for TC-064; downstream dependency.

### Effort: M

Straightforward CRUD over two entities, but non-trivial because auto-population is event-driven off render ~~approval~~ completion (ADR-025), the confirmation gate spans two features (TC-064), and ownership must be scoped without accounts.

### Risks

- **Confirm-gate split across FEAT-008/FEAT-010:** TC-064 only passes if checkout actually reads `Cart.status`; a client-only disable would leave the block unenforced. Mitigate by making the server the source of truth and covering it in FEAT-010.
- **Ownership without accounts (NFR-008):** with no login (ADR-022), a cart must be reliably bound to its session/project so another session cannot read/confirm it; needs a clear session-identity decision in foundation.
- **Price capture vs checkout revalidation:** `unit_price` is captured at populate time; it may diverge from the price at pay time. Revalidation is FEAT-010/FR-041 (BR-24) — keep the boundary explicit so the cart does not silently show stale totals.
- **Populate timing / duplicates:** ~~re-approval or ~~retriggering/regeneration (ADR-025) must not create duplicate carts/lines for the same render; make auto-population idempotent per `render_id`.
- **Empty cart:** removing the last line must block confirm/checkout to avoid a zero-item "purchase."
- **No holds (accepted):** without stock holds (ADR-011), an item could go unavailable between populate and checkout; accepted for the pilot because the catalog is tiny and operator-checked, with revalidation at checkout as the backstop.


## FEAT-009 — Estimates display

**Goal:** Before checkout, show each cart line its supplier-declared production/delivery estimate (or a `missing-estimate` flag when the data is absent), so the user sees *when* a piece arrives before committing to pay.

**Pilot FRs covered:**
- **FR-036** — Display supplier-sourced production and delivery estimates **per item** before checkout. *(Pilot "Included": "Price and estimated delivery or production time per item.")*

**Deferred (out of pilot):**
- **FR-037** — Aggregated production/delivery estimate for the **full order** (full product only).
- **FR-038** — Per-item **warranty** display. Explicitly excluded from the pilot per **ADR-020** (suppliers' own warranty terms apply; disputes handled manually by the operator). The `warranty_terms` field remains present on `Product`/`RenderItem` but is **not surfaced** in the pilot UI.

---

### iOS work (SwiftUI)

- **Cart line estimate label** — extend the existing cart line component (owned by FEAT-008) to render, next to price and supplier, the item's production/delivery estimate string returned by the estimates endpoint (FR-036 → TC-065). No new screen; this is an additive field on the cart/checkout review surface.
- **`missing-estimate` indicator** — when the API marks a line `missing-estimate`, show a neutral placeholder indicator (e.g. "Delivery time to be confirmed") instead of any fabricated value (FR-036 → TC-066). Never invent a number.
- **No warranty UI, no order-summary estimate row** in the pilot (FR-038 and FR-037 deferred).

### Backend work (managed backend service + managed Postgres — ADR-001)

- **Endpoint:** `GET /api/v1/cart/estimates` (already specified in `06_api.md` §8). For the pilot it returns **per-item** estimates only; the aggregated block (FR-037) and warranty block (FR-038) are omitted/feature-flagged off.
- **Estimate read service (read-only):** for each `CartItem` in the caller's `Cart`, resolve the linked `Product` and read its supplier-declared `production_lead_time` and `delivery_lead_time`, returning them per line. This feature does **not** create purchase orders and does **not** revalidate price/availability (that is FEAT-010 / FR-041, FR-044).
- **Per-item rule:** `delivery_lead_time` is required for every `Product` (BR-1); `production_lead_time` is required for `made_to_order` and may be null for `ready_made` (BR-5). Compose the per-item estimate from whichever apply.
- **`missing-estimate` derivation:** if a required lead-time field is absent for a line, tag that line `missing-estimate` rather than returning an invented value (FR-036 → TC-066). Catalog completeness (BR-1/BR-5 → FEAT-015) makes this a defensive/edge path for renderable products.
- **Data entities touched (read-only):** `Cart`, `CartItem` (the lines estimates attach to; `product_id` join), `Product` (source of `production_lead_time`, `delivery_lead_time`; `warranty_terms` present but not read for pilot display). No schema changes required for the pilot. `missing-estimate` is a response-level status value, not a stored column.
- **Access scope:** serve estimates only within the caller's own private cart context (NFR-007); data is read-only to the user.

### Operator work

- None UI-facing in this feature. The operator's responsibility is upstream: ensure `production_lead_time` / `delivery_lead_time` are populated when loading the SKU spreadsheet (FEAT-015), so estimates are real supplier data (BR-17) and `missing-estimate` stays an edge case. Warranty/disputes are handled manually by the operator per ADR-020, outside this display feature.

### Approach / key steps (ordered)

1. Confirm `Product.production_lead_time` / `delivery_lead_time` are populated by catalog ingestion (FEAT-015) so estimates are real supplier data.
2. Implement the read-only estimate service: given a cart, join `CartItem → Product`, project the two lead-time fields per line.
3. Compose the per-item estimate string and derive the `missing-estimate` status for lines with an absent required lead-time.
4. Wire `GET /api/v1/cart/estimates` to return the per-item list scoped to the caller's cart (pilot: per-item block only; aggregated/warranty blocks off).
5. Extend the iOS cart line to display the estimate (or the `missing-estimate` placeholder) next to price/supplier.
6. Verify estimates render **before** checkout (NFR-015) on the cart/checkout review surface; confirm no warranty and no order-level aggregate appear in the pilot build.

### Tests to satisfy (pilot FRs)

- **TC-065** (FR-036) — Cart/checkout with items that have supplier lead-time data: each item displays its supplier-sourced production and delivery estimate before checkout.
- **TC-066** (FR-036) — A cart item lacking supplier estimate data: the line is flagged `missing-estimate` (no fabricated value).
- Cross-cutting check (not a FEAT-009-specific TC): price/delivery visible before checkout (NFR-015).

*Deferred TCs (not run in the pilot): TC-067 (FR-037 aggregate), TC-068 (FR-038 warranty).*

### Depends on

- **foundation** — backend service, managed Postgres, object storage; access-scoping (ADR-001, NFR-007).
- **FEAT-008** (shopping cart) — provides `Cart`/`CartItem` and the cart-line UI component the estimate attaches to.
- **FEAT-015** (supplier catalog management) — source of the supplier-declared `Product` lead-time fields; guarantees completeness (BR-1/BR-5).

### Effort: **S**

Read/display only, no schema changes, one endpoint reading two existing `Product` fields, one additive iOS label. Small surface.

### Risks

- **Supplier data reliability (PRD §10):** estimates are only as good as the supplier-declared lead times; garbage-in shows a misleading date. Mitigated by the `missing-estimate` path and by operator catalog QA (FEAT-015) — the app never invents a value.
- **`missing-estimate` is a DRAFT/PROPOSED status name** (per FEAT-009 doc); the exact wire value/label needs sign-off, but the behavior (flag, don't fabricate) is fixed.
- **Scope creep toward warranty/aggregate:** FR-037 and FR-038 must stay off in the pilot build (ADR-020); the shared `GET /api/v1/cart/estimates` contract can carry those blocks later, so guard them behind a flag to avoid leaking warranty into the pilot UI.
- **Ordering artifact:** PRD §8 lists "show delivery/production/warranty" as step 18 (after checkout in the numbered list); the authoritative rule is **before** checkout (FR-036, BR-17, NFR-015) — build to before-checkout.


## FEAT-010 — Checkout & payments

**Goal:** Turn a confirmed cart into a paid order via one simple in-app checkout — a single COP capture through a hosted PCI checkout, with the minimum contact/shipping data the operator needs to fulfil manually — so a pilot user completes render-to-purchase without leaving Spazio.

### Pilot FRs covered

- **FR-042 — Process a single in-app payment for the order.** The only formally-scoped pilot FR here (FEAT-010 doc §4/§9; test plan). Checkout produces one COP payment and, on capture, a `paid` order.

Two ADR-driven behaviours ride with FR-042 in the pilot but are **not** additional FRs — they are decisions, and their "full" FRs are deferred:

- **Minimal contact capture at checkout (ADR-022):** email + phone + shipping stored on the order for manual fulfilment. This is a stripped-down capture, deliberately *not* the full guest-checkout feature (FR-004, deferred) and *not* accounts (FEAT-001, out of pilot).
- **Manual commission (ADR-007):** a flat 10%-of-product-price value is computed and recorded on the order for manual reconciliation. It is *not* auto-retained by the gateway (automated retention = FR-045 / NFR-012, deferred).

The precondition **FR-035 (explicit cart confirmation)** is owned by FEAT-008; "confirm order" here means creating/finalising the `Order`, which is part of FR-042. Local-currency display **FR-046** is owned by FEAT-004 (single seeded COP market).

### Deferred (out of pilot)

| FR | What it is | Why deferred |
|---|---|---|
| FR-004 | Full guest checkout (validated email/phone/shipping as a feature) | Guest-checkout feature excluded (pilot); ADR-022 uses minimal capture instead |
| FR-041 | Revalidate price & availability at checkout | Full product (FEAT-010 §4/§9). See **scope note** below |
| FR-043 | Split settlement to multiple suppliers | No split in pilot; operator pays suppliers manually (ADR-003/004) |
| FR-044 | Generate one purchase order per supplier at checkout | Automated PO fan-out deferred; operator forwards manually (FEAT-011/FR-061) |
| FR-045 | Apply and **retain** the marketplace commission automatically | Auto-retention (NFR-012) deferred; pilot records a 10% value for manual reconciliation (ADR-007) |

> **Scope note / source tension to flag for the reviewer.** The foundation plan (§1.4, §1.6, §1.11) wires **FR-041 revalidation** and **FR-044 one-PO-per-supplier fan-out** into `POST /checkout`. The FEAT-010 doc, `08_test_plan.md`, and this task all class FR-041/FR-043/FR-044/FR-045 as full-product/out-of-pilot. This plan follows the FEAT/test-plan scoping: the pilot checkout does **not** build FR-041 revalidation or FR-044 automation. Because the pilot has no stock holds (ADR-011) and a tiny operator-curated catalog, staleness is mitigated by the operator verifying availability before forwarding (FEAT-011), not by an FR-041 revalidation service. If the team wants a formal revalidation or PO fan-out in the pilot, add it to the FR's pilot scope first, then to this section.

### iOS work (SwiftUI)

- **Checkout screen** — final order summary rendered from the confirmed cart: line items (name, supplier, unit price), order total in **COP** (FR-046, via FEAT-004), and each item's supplier-sourced production/delivery estimate shown *before* payment (FR-036 via FEAT-009; NFR-015). A blocked/greyed pay button until the cart is `confirmed` (surfaces FR-035 state from FEAT-008; `confirmation-required` → TC-064).
- **Contact & shipping form** — minimal fields per ADR-022: email, phone, shipping address (Bogotá). Client-side presence + basic email-format checks only, enough to guarantee fulfillable data (aligned with ADR-019 minimum-data). This is deliberately lean; it must not grow into the full FR-004 guest-checkout feature.
- **Hosted-checkout handoff** — present the payment provider's hosted/PCI flow (web-view or provider iOS SDK; the concrete provider is a foundation Day-1 vendor task). Card data never enters Spazio-owned UI or storage (NFR-009).
- **Result states** — success → paid confirmation with order reference and estimates (hands off to FEAT-011 order view); failure → inline `payment-failed` message with retry, no order shown (TC-075). Loading/pending state while the capture/webhook settles.
- **Consent** — short privacy notice + consent at first data capture (ADR-019); a checkbox/notice on the contact step.

### Backend work (one managed service — ADR-001)

**Endpoints** (illustrative `/api/v1` shapes from `06_api.md`; final contract is a foundation task):

- `POST /checkout` — validate the cart is `confirmed` (else `confirmation-required`, TC-064) and the contact block is present/valid; create the `Order` in an unpaid/pending state with the embedded contact; compute `total_amount` in COP and record the **10% commission value** (ADR-007); request a single hosted-COP **payment intent** from the gateway and return its client reference. No split, no auto-retention.
- `POST /payments/{paymentId}/confirm` (+ **gateway webhook** as the source of truth) — on captured payment, set `Payment.status = captured` and promote the order to `status = paid` (**TC-074**); on declined/failed authorization, return `payment-failed` and leave **no paid order** (**TC-075**). Idempotent on the gateway reference so a webhook + client-confirm cannot double-create or double-charge.
- Order-total/commission computation service in `domain/` (not in the API handler); payment-gateway client in `integrations/` (foundation §1.6).

**Data entities touched** (pilot subset per foundation §1.3; types per `07_data_model.md`):

- `Order` — created here. Pilot uses it to hold **minimal contact (ADR-022)**: `contact_email`, `contact_phone`, `shipping_address`; plus `cart_id`, `total_amount`, `currency` (COP), `status` (`pending` → `paid`), and a recorded commission value (the `Commission` table is *not* built in the pilot — foundation §1.3; the 10% is a stored value for manual reconciliation).
- `Payment` — the single COP capture: `order_id`, `amount`, `currency`, `status` (`pending`/`authorized`/`captured`/`failed`), `gateway_reference`. `split_settlement` unused (ADR-003). Card data stays in the gateway (NFR-009).
- `Cart` (read) — must be `confirmed` (FR-035, FEAT-008) and is marked consumed once paid.
- `Product`/`RenderItem` (read) — for line items, prices, and supplier grouping.
- **Handoff, not built here:** the `paid` `Order` is the deliverable that **FEAT-011** picks up for manual per-supplier forwarding (FR-061). Any per-supplier `PurchaseOrder` grouping needed for forwarding is FEAT-011 fulfilment scaffolding, **not** the automated FR-044 fan-out (which stays deferred).

### Operator work

None *inside the checkout flow itself* — the pilot end-user checkout is self-service. Downstream, the paid order enables two manual operator activities that live in other features/roles: **manual supplier payout** (ADR-004, Spazio operating entity as merchant of record) and **manual commission reconciliation** from the recorded 10% value (ADR-007). The manual order **forwarding** step (FR-061) is FEAT-011.

### Approach / key steps (ordered)

1. **Confirm the vendor** — pick the hosted PCI checkout / payment provider that supports **COP + PCI + an iOS flow** (foundation Day-1 task, ADR-003/004). This gates everything below and is on the pilot's critical path.
2. **Data** — add `Order` (with the ADR-022 contact columns) and `Payment` to the pilot Postgres schema; store commission as a recorded value on the order.
3. **`POST /checkout`** — cart-confirmed guard + contact validation → create pending `Order`, compute total + 10% commission, request the single-COP payment intent, return the client reference.
4. **Capture path** — implement `POST /payments/{id}/confirm` and the gateway **webhook**; make the `paid` promotion idempotent on `gateway_reference`; ensure a failed capture yields `payment-failed` with no paid order.
5. **iOS checkout screen** — summary (COP total + per-item estimates from FEAT-009), minimal contact/shipping form + consent, hosted-checkout handoff, success/failure result states.
6. **Wire currency** — display all amounts in COP from the seeded Bogotá market (FR-046, FEAT-004); COP handled as a whole-unit currency (foundation §1.10) to avoid rounding surprises.
7. **Instrument** — emit `checkout_started` and `purchase_completed` events linking `render_id → order_id → payment captured` so `render-to-purchase` is queryable from the first real user (foundation §1.10; NFR-006).
8. **Tests** — automate TC-074 / TC-075; exercise the end-to-end paid loop in the Day-5 dry run against the flagged test dataset before the Day-6/7 real cutover.

### Tests to satisfy

- **FR-042 (pilot):** **TC-074** (confirmed, revalidated* cart → single payment processed, order created `paid`) and **TC-075** (payment authorization fails → `payment-failed`, no order created). *In the pilot there is no FR-041 revalidation service; TC-074 is satisfied via the confirmed-cart precondition and the single COP capture.
- **Adjacent (owned elsewhere, exercised by the checkout screen):** TC-064 (`confirmation-required` gate, FR-035/FEAT-008); TC-080 (COP display, FR-046/FEAT-004); TC-065/TC-066 (estimates before checkout, FR-036/FEAT-009).
- **Cross-cutting NFR checks:** PCI — card data confined to the hosted gateway (NFR-009); order/contact data access limited to its owning session and authorized operators (NFR-008).
- **Deferred tests (not run in the pilot):** TC-008/TC-009/TC-010 (FR-004 guest checkout), TC-072/TC-073 (FR-041 revalidation), TC-076/TC-077 (FR-043 split), TC-078 (FR-044 PO fan-out), TC-079 (FR-045 commission retention).

### Depends on

- **foundation** — one backend service, Postgres, the payment-gateway integration and vendor pick (§1.6), config/secrets for gateway keys, and the `render_id → order_id` instrumentation trail.
- **FEAT-008 (cart & confirmation)** — a `confirmed` cart (FR-035) is the hard precondition for `POST /checkout`.
- **FEAT-009 (estimates)** — supplies the per-item production/delivery estimates shown before payment (FR-036; NFR-015). Soft dependency (display, not payment logic).
- **FEAT-004 (localization/currency)** — the seeded Bogotá/COP market for FR-046 display.
- **FEAT-011 (fulfilment)** — *downstream consumer*: FEAT-010 produces the `paid` order it forwards manually (FR-061). Not a build dependency of FEAT-010.

### Effort & risks

**Effort: M.** Narrow surface (one checkout screen, two endpoints + webhook, two tables, no split settlement), but a real third-party payment integration with an async capture/webhook and money movement raises it above S.

**Risks**

- **Gateway vendor unresolved (highest).** ADR-003/004 fixed the *approach* (single hosted COP capture, merchant of record = Spazio operating entity) but not the *vendor*. A provider supporting COP + PCI + a clean iOS flow must be chosen Day 1; a wrong or slow pick blocks the pilot's entire success metric.
- **Capture/webhook correctness.** TC-074 vs TC-075 hinge on creating a `paid` order **only** on confirmed capture and never on failure. Webhook + client-confirm races need idempotency on `gateway_reference` to avoid orphan orders or double charges.
- **Scope creep on contact capture.** The ADR-022 minimal capture can drift into the excluded full guest-checkout feature (FR-004) or accounts (FEAT-001). Keep validation to presence + email format only.
- **Stale price/availability.** No FR-041 revalidation and no stock holds (ADR-011) mean price/availability can drift between render and pay. Mitigated by the tiny operator-curated catalog and the operator's availability check before manual forwarding (FEAT-011); flag if a lightweight sanity check is wanted.
- **Merchant-of-record / tax exposure.** The Spazio operating entity collects real funds and pays suppliers manually (ADR-004); tax/legal (ADR-018) is "revisit before scale, confirm with an accountant." Real money moves in the pilot, so confirm the entity/tax posture before going live to real users.
- **PCI scope.** Any leakage of card data into Spazio UI or storage breaks NFR-009 — the hosted flow must own all card handling.


## FEAT-011 — Order fulfillment & tracking

**Goal:** After a paid order exists, let the operator manually forward it to the supplier and mark it `forwarded` (the pilot's human handoff), and show the buyer the current status of their single active order — including a `no-tracking-yet` state when no tracking data exists.

**Pilot FRs covered:**
- **FR-061** — Operator manually forwards each confirmed (paid) order to the supplier and marks it `forwarded`. *(Pilot core — the pilot's human bridge that substitutes for automated split settlement / per-supplier PO handoff; pilot "The human's role": "The operator forwards the confirmed order manually.")*
- **FR-047** — Provide per-purchase-order status and tracking, in a **minimal single-order form**: the buyer sees the current status of their one active order, with `no-tracking-yet` shown when no tracking data exists. *(Scope note directs "show single-order status"; `03_requirements.md` line ~103 resolves the pilot to "only the single active order's status via FR-047 / the operator; there is no history list.")*

> **Scope tension (flagged, not resolved here — needs sign-off).** The sources disagree on FR-047's pilot status. The `FEAT-011` feature doc labels FR-047 "full product, out of pilot" and the pilot doc excludes **"Full order tracking."** Against that, `05_backlog.md` marks FEAT-011 `Pilot = Yes` with FR-047 listed, and `03_requirements.md` states the pilot shows the single active order's status via FR-047. This plan follows the task's explicit scope note ("show single-order status (FR-047)") and includes FR-047 **only in the stripped-down single-order form below**. What stays excluded is *full* tracking: carrier tracking numbers, an automated multi-status lifecycle, and an order-history list.

**Deferred (out of pilot):**
- **Full order tracking** — automated per-PO lifecycle states (`sent_to_supplier` → `accepted` → `in_production` → `shipped` → `delivered`), carrier / `tracking_number` feeds, and any supplier-driven status updates. In the pilot, tracking data is populated (if at all) manually by the operator; the common pilot case is `no-tracking-yet`.
- **Order history / "list past orders"** — no `GET /api/v1/orders` list in the pilot (no dedicated FR; deferred per `03_requirements.md`). The pilot exposes only the single active order.
- **FR-043** (split settlement) and **FR-044** (one-PO-per-supplier automation) — the automated successors to FR-061; these live in **FEAT-010** and are excluded from the pilot (ADR-003 / ADR-004). In the pilot the operator pays suppliers manually, out of band.
- **NFR-010** automated multi-supplier payouts — deferred; the manual forward is its pilot substitute.

---

### iOS work (SwiftUI — ADR-001)

- **Order-status screen (single order).** Reached immediately after checkout success (FEAT-010) in the **same session** — there are no accounts or login to return later (ADR-022), so this is the post-purchase confirmation/status surface, not a re-entrant "my orders" tab. It displays the one active order's current status, order reference, contact/shipping summary, and the purchased line items with their per-item estimates (estimates owned by FEAT-009). (FR-047 → TC-081)
- **`no-tracking-yet` state.** When the order has no tracking data — the normal pilot case, since there is no carrier integration — render an explicit neutral state ("No tracking updates yet") instead of any fabricated status or date (FR-047 → TC-082). Never invent a tracking number, carrier, or delivery date.
- **Status rendering is coarse in the pilot.** The visible status is derived from the order/PO state the operator drives (e.g. `confirmed` → `forwarded`); rich carrier detail is deferred. No history list, no multi-order navigation.
- No end-user forwarding controls — the forward action is operator-only (see Operator work).

### Backend work (managed backend service + managed Postgres — ADR-001)

- **Endpoint `GET /api/v1/orders/{orderId}`** (already specified in `06_api.md` §10). Returns the single order with its per-`PurchaseOrder` status and any `OrderTracking` rows; when no tracking data exists for a PO, the response carries a `no-tracking-yet` status value rather than an empty/invented one (FR-047 → TC-081, TC-082). The list endpoint `GET /api/v1/orders` stays **out of the pilot** (order history deferred).
- **Endpoint `POST /api/v1/operator/purchase-orders/{purchaseOrderId}/forward`** (already specified in `06_api.md` §10). Operator-only. On call: set `PurchaseOrder.forwarded_by` → the acting `Operator`, `PurchaseOrder.forwarded_at` → now, and transition the PO/order to a `forwarded` state; record the action for traceability (who/what/when). Returns the updated PO. (FR-061 → TC-106)
- **Forwarding service.** Thin state-transition + audit-write service over `PurchaseOrder`. Precondition: the parent `Order` is paid/`confirmed` (Payment captured by FEAT-010). The *transmission channel to the supplier is out-of-band / manual* in the pilot (email or the contact method fixed in the ADR-016 one-page supplier agreement) — the endpoint records the forwarding fact; it does **not** call any supplier API (no automated integration in week one).
- **Order-status read service (read-only).** Given an `orderId`, resolve its `PurchaseOrder`(s) and any `OrderTracking` rows, projecting current status; derive `no-tracking-yet` when no tracking row exists.
- **Data entities touched:**
  - `PurchaseOrder` — writes `forwarded_by` (FK → `Operator`), `forwarded_at`, `status` (→ `forwarded`); reads for status display. *(Pilot fields are DRAFT/PROPOSED per `07_data_model.md`; the `forwarded` value must be added to / reconciled with the proposed enum `created / sent_to_supplier / …` — see risks.)*
  - `Order` — read for buyer-facing status; `status` may advance to `in_fulfillment` on forward (proposed values, DRAFT).
  - `OrderTracking` — read-only in the pilot (`status`, `status_updated_at`, optional operator `notes`); `tracking_number` / `carrier` unused (deferred). Absence of a row drives `no-tracking-yet`.
  - `Operator` — the acting staff member (`forwarded_by`); role e.g. `order_handler`.
  - `Supplier` — recipient of the forwarded order (contact per ADR-016); not written by this feature.
- **Access control (NFR-008).** The forward action is restricted to authenticated operators. For the buyer-facing status, there are no end-user accounts in the pilot (ADR-022), so ownership is enforced by an **unguessable order reference/token** issued at checkout rather than account auth — this only *partially* satisfies NFR-008; full owner-authenticated access returns with accounts (FEAT-001). Flag for sign-off.

### Operator work

- **Forward-to-supplier action (pilot core, FR-061).** In the operator console (ADR-001 stack; concrete tool choice left to implementation), the operator sees the queue of paid/`confirmed` orders and, for each, triggers the forward action — which records `forwarded_by`/`forwarded_at`, flips the state to `forwarded`, and prompts the operator to actually send the order to the supplier out-of-band (email / agreed channel per ADR-016). This is a person doing the handoff by hand (pilot Day 4: "manual order handoff").
- **Manual supplier payment.** The operator pays the supplier manually — no split settlement (ADR-003 / ADR-004). Out of scope for the software of this feature; noted as the operational counterpart of the forward.
- **Optional manual status note.** If a supplier reports progress, the operator may add an `OrderTracking` note so the buyer's status view reflects it. Not automated; typically absent → `no-tracking-yet`.

### Approach / key steps (ordered)

1. Confirm FEAT-010 produces the paid `Order` + `PurchaseOrder`(s) and issues the unguessable order reference used to fetch status without login.
2. Reconcile the `PurchaseOrder.status` enum to include a `forwarded` state (or map FR-061's "marked forwarded" onto an existing proposed value); get the state set signed off (currently DRAFT/PROPOSED).
3. Build the forwarding service + `POST /api/v1/operator/purchase-orders/{id}/forward`: operator-auth guard, precondition (order paid), write `forwarded_by`/`forwarded_at`/`status`, audit record. (FR-061 → TC-106)
4. Build the order-status read service + `GET /api/v1/orders/{orderId}`: project per-PO status; derive `no-tracking-yet` on missing tracking; scope to the order-reference token. (FR-047 → TC-081, TC-082)
5. Add the operator console forward action (queue of paid orders → forward button → confirmation), wired to the endpoint.
6. Add the iOS post-checkout order-status screen: status, line items + estimates (FEAT-009), and the explicit `no-tracking-yet` empty state; no history/multi-order UI.
7. Verify end-to-end on Day 5 dry run: pay → operator forwards → order shows `forwarded`; a not-yet-forwarded order shows `no-tracking-yet`.

### Tests to satisfy (pilot FRs)

- **TC-106** (FR-061) — Operator forwards a confirmed, paid order → the order is transmitted to the supplier (recorded) and marked `forwarded`. *(Happy path — the pilot's manual handoff.)*
- **TC-081** (FR-047) — User views order tracking for a purchase order → the current status and tracking information are displayed.
- **TC-082** (FR-047) — User views tracking for a purchase order with no tracking data yet → a `no-tracking-yet` status is shown. *(The common pilot case.)*
- **Cross-cutting NFR check (no dedicated TC yet — NFR-008):** a non-operator cannot forward an order, and a buyer cannot read another buyer's order status. Add a `TC-` against FR-061 / FR-047 when that criterion is written (per the FEAT-011 doc §9).

### Depends on

- **foundation** — backend service, managed Postgres, object storage, operator authentication (ADR-001, NFR-008).
- **FEAT-010** (checkout & payments) — creates the paid `Order` + `PurchaseOrder`(s) this feature forwards and displays, captures payment, and issues the order reference used for login-less status access. **Hard upstream dependency.**
- **FEAT-009** (estimates display) — supplies the per-item estimate data shown on the order-status screen.
- **FEAT-015** (supplier catalog management) — provides `Supplier` records / contact used for the out-of-band forward (ADR-016).
- (Deferred) **FEAT-001** (accounts) — needed for full owner-authenticated status access and an order-history list, both out of the pilot.

### Effort: **M**

Two thin endpoints and services, but across two surfaces (operator console forward action + iOS buyer status screen), with a state-machine reconciliation on `PurchaseOrder.status` and a login-less access-control decision to settle. Low algorithmic complexity; the risk is in the DRAFT data model and the scope tension, not the code volume. (The buyer-facing FR-047 slice alone is S; FR-061 + operator tooling pushes it to M.)

### Risks

- **Scope tension on FR-047 (highest).** The feature doc says out-of-pilot; the backlog/requirements say single-order status is in. Building the wrong side wastes effort or ships a pilot feature nobody signed off. Resolved *provisionally* here to the minimal single-order form per the task scope note — **needs explicit human sign-off** before build (per CLAUDE.md: AI proposes, human decides).
- **DRAFT/PROPOSED status enums.** `Order.status`, `PurchaseOrder.status`, and the `forwarded` value are all proposed in `07_data_model.md`. The exact state set and the wire value for "forwarded" / `no-tracking-yet` must be fixed before implementation, or the operator action and the buyer view will disagree.
- **Login-less access control (NFR-008).** With no accounts (ADR-022), buyer status access rests on an unguessable order reference, which only partially meets NFR-008. Weak/guessable references would leak another buyer's order data. Requires a sufficiently random token and a security check written as a new TC.
- **Manual forward is human-dependent (PRD §10 / pilot).** The forward, the out-of-band supplier message, and manual payment are all human steps with no automation or retry; a missed forward silently strands a paid order. Mitigate with the operator queue surfacing un-forwarded paid orders and the `forwarded_at` audit field.
- **Buyer expectation vs. `no-tracking-yet`.** Since real tracking is almost never present in the pilot, most buyers see `no-tracking-yet`; if framed poorly it reads as "nothing happened." Copy must set expectations (operator-fulfilled, updates by other channel) without fabricating a status.


