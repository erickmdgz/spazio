# Product Vision

> **Sources of truth:** `Spazio_PRD_v0.7.md` (full PRD, source of truth) and `Spazio_One_Week_iOS_Pilot.md` (the first milestone). This document summarizes and structures that material; where the two differ in scope, the pilot defines what the first version builds and the PRD defines the full-product intent.
>
> **Nothing here is built yet.** These are specifications, not delivered features.
>
> **Update (ADR-024, 2026-07-14):** the client platform decision changed — the product continues on the **web app** at class-demo scale; no native iOS app will be built. References below to the "one-week iOS pilot" describe the first-milestone source material and the decisions as originally scoped; ADR-024 records what changed.
>
> **Update (ADR-025, 2026-07-14):** the human render-review gate is removed entirely — renders are published to the requesting user immediately upon successful generation. FR-027 and FEAT-006 are retired; the "mandatory operator QA" clause of ADR-002 is superseded (the rest of ADR-002 stands). References below to operator render review describe the decisions as originally scoped; ADR-025 records what changed.
>
> **Status labels used below:**
> - **VERIFIED** — stated directly in the PRD or the pilot doc (cited).
> - **DRAFT / PROPOSED** — reasonable structuring by the author, not a decision.
> - **DECIDED (pilot)** — a decision that was reserved for humans and has now been accepted for the one-week iOS pilot (tracked as an `ADR-`; see *Human-reserved decisions* at the end).

## Problem

*(VERIFIED — PRD §2 "Problem to solve"; the pilot doc "The problem" frames the same pain for one user.)*

Interior design is expensive, difficult to visualize, and confusing before purchase. Consumers may overspend, choose incompatible pieces, or abandon the process because they cannot picture how real, purchasable furniture will actually look in their own space before spending money.

At the same time, local furniture and decor suppliers often lack the digital tools and visibility to compete with large retailers, so motivated buyers struggle to find and buy from them.

## Target user

*(VERIFIED — PRD §5 "Users"; pilot persona from the pilot doc "The one user".)*

The full product serves three user types:

| User type | Who they are | Role |
|---|---|---|
| **Homeowners and renters** | Individuals furnishing or redesigning a room; most lack formal design vocabulary and want a fast path from visualization to purchase. | Primary consumer (buyer). |
| **Local suppliers** | Furniture and decor vendors whose catalog powers the marketplace. | Supply side (products, stock, lead time, warranty, delivery coverage). |
| **Spazio operators** | Staff responsible for catalog curation, the style taxonomy, monetization thresholds, render-quality monitoring, and order-flow supervision. | Internal curation and oversight. |

**Pilot primary user (VERIFIED — pilot doc):** the one-week pilot is designed for one specific person — **Valentina, 33**, who rents an apartment in Bogotá, wants to furnish her living room, has a rough budget, shops from her iPhone, and has no design training. She has a photo of the empty or partially furnished room and wants to see how it could look, then buy the furniture without hiring anyone. Every pilot decision is judged against whether it helps Valentina go from photo to purchase.

*(User context, VERIFIED — PRD §5: style selection should be visual; budget must be visible throughout; delivery time and warranty strongly influence purchase decisions.)*

## Main goal

*(VERIFIED — PRD §2 "Main goal" and "Success signal: render-to-purchase".)*

Enable a user to generate a realistic, purchasable interior design for their own space in minutes, using real furniture and accessories from local suppliers, matched to style, room dimensions, location, and budget.

The central constraint that makes this a marketplace rather than an inspiration tool: **the AI never invents furniture. Every rendered item must correspond to a real, purchasable SKU already loaded into the marketplace** (VERIFIED — PRD §1, BR-6, BR-14; canonical FR-016).

> **Scoped caveat (ADR-027, 2026-07-15).** This main-goal constraint stays fully in force for the **supplier track**. Because Spazio has no onboarded suppliers yet, a clearly-labeled, temporary **public-catalog bootstrap fallback** (real products from the Amazon Berkeley Objects dataset, CC BY 4.0, attributed) may additionally be shown so the demo has real products to match, render, and display. These `source=public` products are **display-only** — labeled "not sold by Spazio", offered with a "View at retailer" outbound link, and **never** added to cart/checkout/orders/commission/merchant-of-record. They are real, attributed, non-fabricated inventory that sits **outside** the purchasable-SKU guarantee; they do not weaken it and are not "invented furniture". The guarantee is qualified with this narrow dated exception, not rewritten. See FEAT-017, FR-062..065, NFR-019.

Success toward this goal is measured by **render-to-purchase**: the share of AI-generated renders that lead to a completed in-app purchase of one or more products shown in the render, in the same session, without the user leaving Spazio to search elsewhere. Style accuracy, catalog completeness, and rendering quality matter only insofar as they improve this metric. (Detailed in *Success criteria*.)

> **Success-metric note (ADR-027, 2026-07-15).** Public-catalog fallback products are **non-purchasable** (display-only), so renders that show only `source=public` products cannot produce an in-app purchase. They are **segmented out** of the render-to-purchase denominator so the metric measures the purchasable supplier track only and is not distorted by the temporary bootstrap track (NFR-006 segmentation; NFR-019).

## Initial scope

The **first version = the one-week iOS pilot**. The scope below is the pilot's "Included" list (VERIFIED — pilot doc), which proves a single loop: *a real person, in one city, sees their own room furnished with real furniture and buys at least one piece.* The broader full-product scope lives in the PRD "Must have" list (§3) and is **not** part of the first version.

> **Scope note — public-catalog fallback (ADR-027, 2026-07-15).** The local-supplier marketplace stays fully in scope and fully built (demoed with seeded fake-supplier data, ADR-023). Additively, because there are **no onboarded suppliers yet**, a **public-catalog bootstrap fallback** (FEAT-017) provides real ABO products (CC BY 4.0, attributed) so the app can demonstrate matching → render → display. This fallback track is **temporary demo scaffolding** — non-purchasable, clearly labeled "not sold by Spazio", and expected to be removed once real suppliers are onboarded. It does not remove or weaken any supplier-track capability.

FR/FEAT references below map pilot capabilities to the canonical registry for traceability (DRAFT — author's mapping).

| Pilot capability (VERIFIED — pilot doc) | Reference |
|---|---|
| Native iOS app only | Platform constraint (no Android/web) |
| One city and one delivery zone: Bogotá | Localization constrained to a single zone — FEAT-004 |
| One currency: COP | FR-046 (local-currency display), fixed to COP |
| Small, manually curated catalog from a few local suppliers | FEAT-015; FR-056, FR-057, FR-058, FR-059 |
| Photo upload | FR-005 |
| Approximate room dimensions | FR-011 (used to scale products — FR-017) |
| One or two predefined visual styles | FR-007 |
| Optional free-text style description | FR-008 |
| Budget range input | FR-009 |
| AI render using only real, in-stock catalog products | FEAT-005; FR-014, FR-015, FR-016, FR-018, FR-021 |
| Human (operator) review before the render is shown *(Retired — ADR-025, 2026-07-14: renders are published immediately on generation success)* | FR-027 (Superseded by ADR-025) |
| Tappable product tags on the render | FR-028, FR-029 |
| Auto-populated cart with price and supplier | FR-031 |
| Cart review and item removal | FR-032, FR-033 |
| One simple in-app checkout (single payment) | FR-035 (explicit cart confirmation), FR-042 |
| Price and estimated delivery or production time per item | FR-046 (price), FR-036 (per-item estimate) |
| Operator forwards the confirmed order to the supplier manually | FR-061 |

**Full-product scope (VERIFIED — PRD §3 "Must have"):** the PRD's "Must have" list is broader than the pilot and includes, among others, accounts and saved designs, guest checkout, in-app camera capture, keep-or-replace of existing items, localization and delivery-zone detection, per-supplier purchase orders with automated split settlement, stock holds, warranty display, order tracking, supplier self-service catalog ingestion, and a configurable daily render limit. These are deliberately deferred out of the first version (see *Out of scope*).

> **Known gaps vs. PRD "Must have" (DRAFT — FR-coverage note):** two PRD "Must have" capabilities remain uncatalogued as dedicated functional requirements, and both are now resolved for the pilot — **saved designs** is resolved to a Could-have, excluded from the pilot (no FR catalogued yet), and **order history** is resolved to the single active order's status only in the pilot (covered by FR-047 tracking / operator; a dedicated "list past orders" FR is deferred). They are recorded here as resolved deferrals rather than silently dropped; the same deferral is noted in `03_requirements.md`.

## Out of scope

Two layers of exclusion apply.

**1. Out of scope for the full product (VERIFIED — PRD §3 "Out of scope"):**

- Real-time AR overlay.
- Human interior-design consultations.
- Custom furniture outside the catalog.
- Multi-vendor shipment optimization beyond one purchase order per supplier.
- Loyalty or rewards programs.
- Delivery outside launch regions except through fallback options.

**2. Excluded from the pilot / first version (VERIFIED — pilot doc "Excluded from the pilot"):** present in the full PRD but cut from the first milestone —

- Android and web.
- Multiple cities, countries, and currencies.
- Supplier self-service ingestion via API, FTP, or automated Excel processing.
- Keep-or-replace of existing furniture via segmentation.
- Targeted edit-by-question refinement.
- Daily render limits *(Decided (pilot): no limit; the PRD default of five attempts/day applies only when metering is built post-pilot; ADR-009. The original rationale — 'every render is operator-reviewed anyway' — is superseded by ADR-025, 2026-07-14)*.
- Paid render packages *(Decided (pilot): not offered — deferred; no paid packages; ADR-010)*.
- Guest checkout.
- Saved designs, sharing, personalized recommendations, chat assistant.
- Automated split payments and one-purchase-order-per-supplier automation.
- Full order tracking.
- Warranty display.
- Augmented reality and multiple rooms.

> Note on stock holds: the pilot cart supports review and removal but does not implement time-boxed stock holds. **Decided (pilot): no stock hold** (tiny manually-curated catalog; the operator checks availability); the PRD's 15-minute hold is **adopted only when holds are built post-pilot** (ADR-011; FR-039/FR-040).

## Success criteria

*(VERIFIED — PRD §2 and pilot doc "The signal that it is working".)*

**Primary metric — render-to-purchase.** A user completes a real purchase of at least one product shown in their render, in the same session, inside Spazio, without leaving to search elsewhere.

```text
render-to-purchase rate = purchases / renders
```

- If users generate renders but do not buy, the core loop is not working, regardless of image quality (VERIFIED — pilot).
- Even a small number of genuine render-to-purchase completions is enough to justify continuing development; this is the pilot's go/no-go signal (VERIFIED — pilot "Go / no-go decision").

**Supporting signals (VERIFIED — PRD §7 "Cost control"; canonical NFR-006, NFR-005):** render-to-purchase conversion is tracked from day one, alongside cost per render, so image quality and catalog fit can be improved against the metric that matters.

## Main risks

*(VERIFIED — PRD §10 "Known risks", summarized.)*

- **Render fidelity (highest risk).** Accurately compositing a real SKU into the user's room at the correct size and appearance is hard; a poor match can drive returns and disputes. (The pilot's mitigation — mandatory operator review, FR-027 — is retired by ADR-025, 2026-07-14; renders are published immediately on generation success, so this risk is no longer mitigated by a human gate.) *(ADR-026, 2026-07-14: moving the engine to self-hosted FLUX.2 Klein 4B via mflux does not change this risk — it introduces no new fidelity mitigation; the real-SKU-only invariant (BR-6/BR-14/FR-016) still bounds what may be composited.)*
- **Keep-or-replace segmentation.** Incorrect object detection could conflict with user intent. (Cut from the pilot, so not a first-version risk.)
- **Two-sided cold start.** Insufficient supplier coverage may produce poor results for specific styles, budgets, or locations.
- **Inference cost.** Low conversion may lead to significant rendering expense without offsetting revenue.
- **Multi-country complexity.** Currency is relatively simple; taxes, payment rails, consumer protection, and local legal requirements are not.
- **Payment gateway complexity.** Split settlement across suppliers may not be equally available in every country.
- **Poor user photos.** Low-quality images may reduce render accuracy.
- **Unsatisfied budgets.** The available catalog may not contain enough products within certain budget ranges.
- **Supplier data reliability.** Delivery times and warranty information depend on supplier accuracy.

## Human-reserved decisions (resolved for the pilot)

*(Governance — PRD §12 reserved these for human decision. Each has now been decided and accepted for the one-week iOS pilot and recorded as an `ADR-` (Status: Accepted, Date: 2026-07-10), so no value above is open. Values marked "revisit before scale" stay accepted for the pilot with an explicit scale caveat; the PRD's examples/defaults are noted where the pilot adopts them.)*

| Decision | Decided for the one-week pilot | Tracking |
|---|---|---|
| Technology stack | Native iOS (SwiftUI) app + one small managed backend service + a managed Postgres DB + object storage for photos/renders; single environment/region; no multi-platform | ADR-001 |
| Rendering / AI pipeline | Self-hosted **FLUX.2 Klein 4B** run locally via the **mflux** CLI (image-to-image / edit) compositing operator-curated product images into the room photo; still **no custom-trained model** (Klein is pretrained open weights) *(Updated by ADR-026, 2026-07-14 — the render engine is self-hosted Klein via mflux, superseding only ADR-002's hosted-image-API clause; the "no custom-trained model" rule stands. The mandatory-operator-QA clause was superseded earlier by ADR-025, 2026-07-14 — renders publish immediately on generation success; the rest of ADR-002 stands)* | ADR-002; ADR-026 |
| Payment gateway & split-settlement model | Single PCI-compliant hosted checkout collecting one payment in COP; no split settlement (operator pays suppliers manually). Split settlement + COP gateway: revisit before scale | ADR-003 |
| Merchant-of-record model | The Spazio operating entity collects the single payment and pays suppliers manually. Tax/legal (ties ADR-018): revisit before scale; confirm with an accountant | ADR-004 |
| Style taxonomy | 1–2 predefined visual styles + free-text description; no taxonomy engine | ADR-005 |
| Supplier catalog ingestion channels | Operator manually loads a CSV/Excel of 30–60 curated SKUs; no API/FTP/self-service ingestion in the pilot | ADR-006 |
| Commission percentage / fee model | 10% of product price (PRD §9 default); reconciled manually in the pilot | ADR-007 |
| Budget tolerance | 10% (PRD BR-9 default) | ADR-008 |
| Daily free-render limit | No limit in the pilot; the PRD default of five/day applies only when metering is built post-pilot *(original rationale 'every render is operator-reviewed' superseded by ADR-025)* | ADR-009 |
| Render-package pricing | Not offered in the pilot (deferred) | ADR-010 |
| Cart-hold duration | No stock hold in the pilot; the PRD's 15-minute hold applies only when holds are built post-pilot | ADR-011 |
| Catalog synchronization frequency | Manual / on-demand refresh by the operator; no automated sync in the pilot | ADR-012 |
| Render-time target | ~2–5 minutes soft target (PRD §7); no hard SLA in the pilot | ADR-013 |
| Minimum catalog completeness | A SKU is renderable only if all PRD BR-1 fields are present; the operator enforces this on load | ADR-014 |
| Initial launch markets | Bogotá, Colombia; COP only | ADR-015 |
| Supplier partners & onboarding terms | Hand-pick 2–4 Bogotá suppliers with a one-page written agreement (commission, lead times, warranty) | ADR-016 |
| Sponsored-placement plan & pricing | Not offered in the pilot (deferred) | ADR-017 |
| Taxes & multi-market compliance | Single market (Colombia); taxes/invoicing handled manually for the pilot; no tax engine. Revisit before scale; confirm with an accountant | ADR-018 |
| Data privacy & consumer protection | Photos/renders private by default (PRD BR-33); collect the minimum data (email, phone, shipping); short privacy notice + consent at first use. Align with Colombia Ley 1581; legal review before scale | ADR-019 |
| Warranty & dispute-resolution rules | Pilot does not display warranty; suppliers' own warranty terms apply; disputes handled manually by the operator. Revisit before scale; legal / consumer-protection review needed | ADR-020 |
| Brand identity & visual design system | Dark-green + off-white palette (PRD v0.3), a simple wordmark, system font; minimal. Full design system later | ADR-021 |
