# FEAT-009 - Estimates & warranty display

> **Status legend:** **VERIFIED** = stated in the PRD v0.7 or the one-week iOS pilot; **DRAFT / PROPOSED** = author's structuring, not confirmed; **TBD / PENDING** = reserved for a human decision (PRD §12), tracked as an ADR. Nothing here is implemented; this is a specification.

## 1. Summary

Make the purchase decision **transparent before checkout** by showing, for each item, its **supplier-sourced production and delivery estimate** and its **supplier-declared warranty terms**, plus an **aggregated production/delivery estimate for the whole order**. This is the "no surprises" layer on top of the cart: the user sees *when* each product will arrive and *how* it is warranted before committing to pay.

- **Pilot scope (VERIFIED):** the pilot shows *"price and estimated delivery/production time per item"* — the per-item production/delivery estimate is FR-036 (pilot-included). *(Price itself is surfaced by the product tag / cart, FEAT-007 / FEAT-008; local currency is FR-046, FEAT-004.)*
- **Full-product scope (VERIFIED, PRD, out of pilot):** an **aggregated** order-level production/delivery estimate (FR-037) and **per-item warranty terms** (FR-038). **Warranty display is explicitly out of the pilot** (see FR-038 origin note).

## 2. Problem or need

Delivery time and warranty **strongly influence purchase decisions**, and the PRD requires that **price, delivery, and warranty be visible before checkout** (PRD §5; NFR-015). The estimates must be **real supplier data**, not invented: *"Delivery and production estimates must come from supplier data and be shown before checkout"* (PRD BR-17) and *"Warranty terms must be supplier-declared and displayed before checkout"* (PRD BR-18). Surfacing this information at the cart/checkout boundary keeps the promise of *transparent pricing, delivery, and warranty* stated as the flow's expected outcome (PRD §8).

## 3. Affected user

- **Actor: System** — reads supplier lead-time and warranty data for each cart item and displays the per-item estimate (FR-036), the aggregated order estimate (FR-037), and the per-item warranty terms (FR-038) before checkout.
- **Homeowner/renter** — reads these estimates and warranty terms to decide whether to confirm and pay.

Both are consumers of **supplier-declared** catalog data (FEAT-015): the supplier is the origin of the lead-time and warranty values, but is not an interactive actor in this feature.

## 4. Related requirements

Functional:

- FR-036 — Display supplier-sourced production and delivery estimates **per item** before checkout *(pilot)*
- FR-037 — Display **aggregated** production and delivery estimates for the full order before checkout *(full product, out of pilot)*
- FR-038 — Display supplier-declared **warranty** terms per item before checkout *(full product, out of pilot — warranty display is excluded from the one-week pilot)*

Non-functional:

- NFR-015 — Price, delivery, and warranty are visible before checkout *(the core driver of this feature)*
- NFR-007 — Photos and renders private by default *(the estimates are shown within the user's own private cart/checkout context; see Security)*

## 5. Expected flow

This feature maps to PRD §8 **step 18** — *"System shows delivery, production time, and warranty"* — surfaced at the cart/checkout boundary (PRD §8 steps 11–12, 15).

> **Ordering note (VERIFIED tension):** PRD §8 lists step 18 *after* step 15 (checkout) in its numbered sequence, but the authoritative rule is **before checkout** — FR-036/FR-037/FR-038, PRD BR-17/BR-18, and NFR-015 all state the information must be visible **before** the user pays. This feature follows the *before-checkout* requirement; the §8 numbering is treated as a list artifact, not a decision to show the data after payment.

1. After the cart is auto-populated from the completed render (PRD §8 step 11, FEAT-008; renders publish immediately on generation success — ADR-025), the system reads each cart item's **supplier-declared** production/delivery lead time and displays a **per-item estimate** (FR-036 / PRD BR-17). In the pilot this per-item estimate is shown alongside price and supplier on the cart line (VERIFIED pilot scope).
2. When an item lacks supplier estimate data, the item is flagged with a **`missing-estimate`** status **(DRAFT / PROPOSED status name)** rather than showing an invented estimate (FR-036).
3. (Full product) The system displays an **aggregated production/delivery estimate for the full order** before checkout (FR-037).
4. (Full product, out of pilot) The system displays each item's **supplier-declared warranty terms** before checkout (FR-038 / PRD BR-18).
5. With price (FEAT-007/FEAT-008), estimates, and warranty visible, the user proceeds to explicit cart confirmation and checkout (FR-035, FEAT-008 → FEAT-010).

Related: price/stock **revalidation at checkout** (PRD BR-24) is specified in FEAT-010/FR-041, not here — this feature only *displays* estimates and warranty, it does not revalidate them.

## 6. Acceptance criteria

Acceptance criteria **are defined in the corresponding functional requirement (FR)**, not here (see `docs_en/03_requirements.md`). This FEAT only references them:

- FR-036 → criteria in `docs_en/03_requirements.md`
- FR-037 → criteria in `docs_en/03_requirements.md`
- FR-038 → criteria in `docs_en/03_requirements.md`

If you detect a new criterion during implementation, first add it to the FR (with its `TC-`) and then continue.

## 7. Business rules

Business rules **live in the FR** (`docs_en/03_requirements.md`); they are not rewritten here. Reference:

- FR-036 (PRD BR-17: delivery and production estimates must come from supplier data and be shown before checkout)
- FR-037 (PRD FR-10: aggregated production/delivery estimate for the full order, shown before checkout)
- FR-038 (PRD BR-18: warranty terms must be supplier-declared and displayed before checkout; warranty/dispute rules **Decided (pilot): warranty is NOT displayed in the pilot — suppliers' own warranty terms apply and disputes are handled manually by the operator → ADR-020**)
- Cross-cutting: NFR-015 (price, delivery, and warranty visible before checkout). Supplier lead-time/warranty data is guaranteed present for renderable products by the catalog completeness rules (PRD BR-1, BR-2 → FR-019, FR-057, FEAT-015).

## 8. Proposed technical design

*High-level only. Technology stack decided for the pilot — see ADR-001 (product/tool choices left to implementation).*

### Frontend

- On iOS (pilot, VERIFIED): each **cart line** shows the item's production/delivery estimate next to price and supplier (FR-036). Broader stack **Decided (pilot): native iOS (SwiftUI) app + one managed backend service + managed Postgres + object storage, single environment/region — see ADR-001**.
- Full product adds an **order-summary estimate** line (FR-037) and a **warranty** field per item / in the product detail (FR-038). Warranty presentation is **out of the pilot**.
- Items with no supplier estimate are shown with a `missing-estimate` indicator **(DRAFT / PROPOSED)** rather than a fabricated value.

### Backend

- **Estimate/warranty read service** (DRAFT / PROPOSED): for each cart item, resolve the **supplier-declared** production lead time, delivery lead time, and warranty terms from catalog data (FEAT-015) and return them for display before checkout (FR-036, FR-038).
- **Order-level aggregation** (DRAFT / PROPOSED): compute an aggregated production/delivery estimate for the full order from the per-item lead-time data (FR-037). The aggregation method (e.g. longest lead time vs. per-supplier grouping) is **DRAFT / PROPOSED**.
- This feature is **read/display only**: it does not create purchase orders or revalidate price/availability (those are FEAT-010 / FR-041, FR-044).

### Database

- Entities involved (canonical registry in `07_data_model.md`; fields **DRAFT / PROPOSED** until the stack is decided):
  - `Product` — source of **supplier-declared** `production_lead_time`, `delivery_lead_time`, and `warranty_terms` (PRD BR-1, BR-5; used as pre-checkout estimates per BR-17/BR-18).
  - `CartItem` / `Cart` — the cart lines the per-item estimate and warranty are displayed against, and the scope over which the order-level estimate (FR-037) is aggregated.
  - `RenderItem` — carries `warranty_terms` captured at render time (PRD FR-07), a possible display source for FR-038.
  - `PurchaseOrder` — carries `production_estimate` / `delivery_estimate` **(proposed)** as the *post-order* counterpart (generated at checkout, FEAT-010/FR-044); the *pre-checkout* aggregate for FR-037 is derived at the cart level.
- Field-level schema and the `missing-estimate` status value are **DRAFT / PROPOSED**; final types follow the pilot stack, now decided (ADR-001).

### Security

- Estimates and warranty are shown within the user's own **private** cart/checkout context; cart/render data is served only to the authorized viewer (NFR-007).
- Displayed estimate and warranty data is **read-only** to the user and originates from supplier-declared catalog data (no user-editable values here).

## 9. Required tests

Test cases live in `08_test_plan.md`, where **each `TC-` maps 1:1 to an acceptance criterion of an FR** (see `03_requirements.md`). The `TC-` rows for this feature **already exist** in `08_test_plan.md` (status `Pending` — written, not yet executed; nothing here is implemented): **TC-065–TC-068** (FR-036, FR-037, FR-038).

- **TC-065** (FR-036, pilot) — show cart/checkout for items with supplier lead-time data: each item displays its supplier-sourced production and delivery estimate before checkout.
- **TC-066** (FR-036, pilot) — show a cart item lacking supplier estimate data: the item is flagged with a `missing-estimate` status **(status name is DRAFT / PROPOSED)**.
- **TC-067** (FR-037, full product) — show the order summary for multiple items with estimates: an aggregated production/delivery estimate for the full order is displayed before checkout.
- **TC-068** (FR-038, full product, out of pilot) — show cart/checkout for items with supplier-declared warranty terms: each item displays its warranty terms before checkout.

Cross-cutting check referenced by this feature (not a FEAT-009-specific `TC-` row): price/delivery/warranty visible before checkout (NFR-015).

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
