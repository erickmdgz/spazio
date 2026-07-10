# Product Vision

> **Sources of truth:** `Spazio_PRD_v0.7.md` (full PRD, source of truth) and `Spazio_One_Week_iOS_Pilot.md` (the first milestone). This document summarizes and structures that material; where the two differ in scope, the pilot defines what the first version builds and the PRD defines the full-product intent.
>
> **Nothing here is built yet.** These are specifications, not delivered features.
>
> **Status labels used below:**
> - **VERIFIED** — stated directly in the PRD or the pilot doc (cited).
> - **DRAFT / PROPOSED** — reasonable structuring by the author, not a decision.
> - **TBD / PENDING** — reserved for a human decision (tracked as an `ADR-`; see *Open decisions* at the end).

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

Success toward this goal is measured by **render-to-purchase**: the share of AI-generated renders that lead to a completed in-app purchase of one or more products shown in the render, in the same session, without the user leaving Spazio to search elsewhere. Style accuracy, catalog completeness, and rendering quality matter only insofar as they improve this metric. (Detailed in *Success criteria*.)

## Initial scope

The **first version = the one-week iOS pilot**. The scope below is the pilot's "Included" list (VERIFIED — pilot doc), which proves a single loop: *a real person, in one city, sees their own room furnished with real furniture and buys at least one piece.* The broader full-product scope lives in the PRD "Must have" list (§3) and is **not** part of the first version.

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
| Human (operator) review before the render is shown | FR-027 |
| Tappable product tags on the render | FR-028, FR-029 |
| Auto-populated cart with price and supplier | FR-031 |
| Cart review and item removal | FR-032, FR-033 |
| One simple in-app checkout (single payment) | FR-035 (explicit cart confirmation), FR-042 |
| Price and estimated delivery or production time per item | FR-046 (price), FR-036 (per-item estimate) |
| Operator forwards the confirmed order to the supplier manually | FR-061 |

**Full-product scope (VERIFIED — PRD §3 "Must have"):** the PRD's "Must have" list is broader than the pilot and includes, among others, accounts and saved designs, guest checkout, in-app camera capture, keep-or-replace of existing items, localization and delivery-zone detection, per-supplier purchase orders with automated split settlement, stock holds, warranty display, order tracking, supplier self-service catalog ingestion, and a configurable daily render limit. These are deliberately deferred out of the first version (see *Out of scope*).

> **Known gaps vs. PRD "Must have" (DRAFT — FR-coverage note):** two PRD "Must have" capabilities are not yet catalogued as functional requirements — **saved designs** has no FR, and **order history** is only partially covered by FR-047 (per-purchase-order status and tracking). They are recorded here as deferred / known gaps rather than silently dropped; the same deferral is noted in `03_requirements.md`.

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
- Daily render limits *(PRD default is five attempts/day — a default to be confirmed by humans, not a decision; ADR-009)*.
- Paid render packages *(pricing TBD; ADR-010)*.
- Guest checkout.
- Saved designs, sharing, personalized recommendations, chat assistant.
- Automated split payments and one-purchase-order-per-supplier automation.
- Full order tracking.
- Warranty display.
- Augmented reality and multiple rooms.

> Note on stock holds: the pilot cart supports review and removal but does not implement time-boxed stock holds. The PRD states a 15-minute hold as a **default/example to be confirmed by humans**, not a final value (ADR-011; FR-039/FR-040).

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

- **Render fidelity (highest risk).** Accurately compositing a real SKU into the user's room at the correct size and appearance is hard; a poor match can drive returns and disputes. (Mitigated in the pilot by mandatory operator review — FR-027.)
- **Keep-or-replace segmentation.** Incorrect object detection could conflict with user intent. (Cut from the pilot, so not a first-version risk.)
- **Two-sided cold start.** Insufficient supplier coverage may produce poor results for specific styles, budgets, or locations.
- **Inference cost.** Low conversion may lead to significant rendering expense without offsetting revenue.
- **Multi-country complexity.** Currency is relatively simple; taxes, payment rails, consumer protection, and local legal requirements are not.
- **Payment gateway complexity.** Split settlement across suppliers may not be equally available in every country.
- **Poor user photos.** Low-quality images may reduce render accuracy.
- **Unsatisfied budgets.** The available catalog may not contain enough products within certain budget ranges.
- **Supplier data reliability.** Delivery times and warranty information depend on supplier accuracy.

## Open decisions (reserved for humans)

*(Governance — PRD §12 reserves these for human decision. Listed here so no value above is read as final. Values the PRD gives are examples/defaults to be confirmed, not decisions.)*

| Reserved decision | PRD-stated example/default (if any) | Tracking |
|---|---|---|
| Technology stack | — | ADR-001 |
| Rendering / AI pipeline | — | ADR-002 |
| Payment gateway & split-settlement model | — | ADR-003 |
| Merchant-of-record model | — | ADR-004 |
| Style taxonomy | — | ADR-005 |
| Supplier catalog ingestion channels | PRD lists integration, Excel, API, FTP (TBD) | ADR-006 |
| Commission percentage / fee model | "for example 10%" | ADR-007 |
| Budget tolerance | "such as 10%" | ADR-008 |
| Daily free-render limit | "defaulting to five" per user/day | ADR-009 |
| Render-package pricing | — | ADR-010 |
| Cart-hold duration | "15 minutes" | ADR-011 |
| Catalog synchronization frequency | "regularly, real time for ready-made stock" | ADR-012 |
| Render-time target | "approximately 2–5 minutes" | ADR-013 |
| Minimum catalog completeness | — | ADR-014 |
| Initial launch markets | pilot uses Bogotá / COP (pilot only) | ADR-015 |
| Supplier partners & onboarding terms | — | ADR-016 |
| Sponsored-placement plan & pricing | — | ADR-017 |
| Taxes & multi-market compliance | — | ADR-018 |
| Data privacy & consumer protection | — | ADR-019 |
| Warranty & dispute-resolution rules | — | ADR-020 |
| Brand identity & visual design system | — | ADR-021 |
