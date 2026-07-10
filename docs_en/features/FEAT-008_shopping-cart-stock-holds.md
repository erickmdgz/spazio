# FEAT-008 - Shopping cart & stock holds

> **Status legend:** **VERIFIED** = stated in the PRD v0.7 or the one-week iOS pilot; **DRAFT / PROPOSED** = author's structuring, not confirmed; **TBD / PENDING** = reserved for a human decision (PRD §12), tracked as an ADR. Nothing here is implemented; this is a specification.

## 1. Summary

Turn the tagged render into a ready-to-buy **cart**: automatically populate it with every product shown, let the user **review** and **remove** items, and require **explicit confirmation** before payment. The full product also supports **swapping** items and **time-boxed stock holds**.

- **Pilot scope (VERIFIED):** *"Automatically populated cart with price and supplier"* and *"Cart review and item removal"* (pilot "Included" list) — FR-031 (auto-populate), FR-032 (review), FR-033 (remove); plus explicit cart confirmation before payment (FR-035; the pilot states *"the user must explicitly approve the purchase"* / *"User confirms the cart before paying"*).
- **Full-product scope (VERIFIED, PRD, out of pilot):** add an individual tagged product (FR-030), **swap** a cart item (FR-034), and **stock holds** placed on add and **released on expiry** (FR-039, FR-040).

## 2. Problem or need

The render is **a suggestion, not an order** — the user must be able to see exactly what they would buy, adjust it, and consciously approve it (pilot, "The human's role"; PRD BR-31). Auto-populating the cart from the render keeps the path from inspiration to purchase short (PRD §2). **Stock holds** (full product) reduce the risk that an item sells out between adding it and paying, addressing the reliability of availability for ready-made stock (PRD BR-22/BR-23).

## 3. Affected user

- **Homeowner/renter** — reviews the auto-populated cart, removes items, (full product) swaps items, and confirms before paying.
- **System** — auto-populates the cart, (full product) places and releases stock holds, and enforces explicit confirmation before payment.

## 4. Related requirements

Functional:

- FR-030 — Add a rendered/tagged product to the cart *(full product, out of pilot)*
- FR-031 — Auto-populate the cart with every product shown in the render *(pilot)*
- FR-032 — Review the cart contents *(pilot)*
- FR-033 — Remove a product from the cart *(pilot)*
- FR-034 — Swap a cart item for an alternative product *(full product, out of pilot)*
- FR-035 — Require explicit cart confirmation before payment *(pilot)*
- FR-039 — Place a stock hold when a product is added to the cart, for the configured duration *(full product, out of pilot)*
- FR-040 — Release held stock back to availability when the hold expires *(full product, out of pilot)*

Non-functional:

- NFR-015 — Price, delivery, and warranty are visible before checkout
- NFR-013 — Style, dimensions, and budget entry require minimal steps *(applies to keeping the review/confirm interaction lightweight)*

## 5. Expected flow

This feature covers PRD §8 steps 11, 12, and 14:

1. (PRD §8 step 11) The system **auto-populates the cart** with every product shown in the render (FR-031); each line shows at least price and supplier (pilot).
2. (PRD §8 step 12) The user **reviews** the cart (FR-032) and may **remove** items (FR-033); in the full product they may also **add** a tagged product (FR-030) or **swap** an item for an alternative (FR-034).
3. (PRD §8 step 14, full product) Adding an item **places a stock hold** for the configured duration (FR-039); an **expired hold releases** the stock back to availability (FR-040). **Duration:** the PRD states **"15 minutes" as a default (BR-22), which is TBD** (see ADR-011).
4. Before payment, the user must **explicitly confirm** the cart (FR-035 / PRD BR-31). The flow then continues to checkout (PRD §8 step 15, FEAT-010).

Per-item price and estimated delivery/production time shown alongside the cart are provided by FEAT-009 (FR-036, pilot-included).

## 6. Acceptance criteria

Acceptance criteria **are defined in the corresponding functional requirement (FR)**, not here (see `docs_en/03_requirements.md`). This FEAT only references them:

- FR-030 → criteria in `docs_en/03_requirements.md`
- FR-031 → criteria in `docs_en/03_requirements.md`
- FR-032 → criteria in `docs_en/03_requirements.md`
- FR-033 → criteria in `docs_en/03_requirements.md`
- FR-034 → criteria in `docs_en/03_requirements.md`
- FR-035 → criteria in `docs_en/03_requirements.md`
- FR-039 → criteria in `docs_en/03_requirements.md`
- FR-040 → criteria in `docs_en/03_requirements.md`

If you detect a new criterion during implementation, first add it to the FR (with its `TC-`) and then continue.

## 7. Business rules

Business rules **live in the FR** (`docs_en/03_requirements.md`); they are not rewritten here. Reference:

- FR-035 (PRD BR-31: the cart is a suggestion and must be explicitly confirmed before payment)
- FR-031 (PRD FR-08: the cart is auto-populated with every rendered product)
- FR-039 (PRD BR-22: adding an item holds stock for the configured duration — **PRD default "15 minutes" is TBD**, see ADR-011)
- FR-040 (PRD BR-23: expired holds return stock to availability)
- Related: price/stock **revalidation at checkout** (PRD BR-24) is specified in FEAT-010/FR-041.

## 8. Proposed technical design

*High-level only. Technology choices are reserved for humans (PRD §12) and marked PENDING.*

### Frontend

- On iOS (pilot, VERIFIED): a **cart screen** pre-filled from the render, each line showing price and supplier (pilot); **remove** control (FR-033); an explicit **confirm** action before checkout (FR-035). Broader stack **[PENDING — see ADR-001]**.
- Full product adds **add** (FR-030) and **swap** (FR-034) controls, and a **hold countdown** indicator (FR-039).

### Backend

- **Cart service** (DRAFT / PROPOSED): build a `Cart` from a render's `RenderItem`s (FR-031); support review/remove/add/swap; capture item price at add time.
- **Stock-hold service** (full product, DRAFT / PROPOSED): place a `StockHold` on add for the **configured duration** and release it on expiry (FR-039/FR-040). Hold-duration value is **[PENDING — see ADR-011]**; requires coordination with catalog availability (FEAT-015) and checkout revalidation (FEAT-010).
- Enforce **explicit confirmation** before allowing payment (FR-035).

### Database

- Entities involved (canonical registry; fields **DRAFT / PROPOSED** until modeled in `07_data_model.md`):
  - `Cart` — the auto-populated, user-confirmable suggestion derived from a render.
  - `CartItem` — a single product entry with quantity and captured price.
  - `StockHold` — a time-boxed reservation for a cart item (**PRD default 15 minutes, TBD**), released on expiry.
- Field-level schema is **TBD**.

### Security

- A cart belongs to its user; only the owner may review/modify/confirm it (NFR-008).
- Confirmation must be an explicit, auditable user action (FR-035).
- Stock holds must not allow overselling; concurrency handling is **DRAFT / PROPOSED** pending the hold-duration decision (ADR-011) and revalidation design (FEAT-010).

## 9. Required tests

Test cases live in `08_test_plan.md`, where **each `TC-` maps 1:1 to an acceptance criterion of an FR** (see `03_requirements.md`). The `TC-` rows for this feature **already exist** in `08_test_plan.md`: **TC-056–TC-064** and **TC-069–TC-071** (FR-030–FR-035, FR-039, FR-040).

The `TC-` rows in `08_test_plan.md` for this feature's related FRs are:

- FR-031 (pilot) — **TC-058**: cart is auto-populated with every product shown in the render.
- FR-032 (pilot) — **TC-059**: user can open and review a populated cart.
- FR-033 (pilot) — **TC-060**: user can remove an item and the total is recalculated.
- FR-035 (pilot) — **TC-063, TC-064**: cart is confirmed; payment is blocked until the cart is explicitly confirmed.
- FR-030 (full product) — **TC-056, TC-057**: add a tagged, available product; adding an unavailable product is rejected.
- FR-034 (full product) — **TC-061, TC-062**: swap an item for an alternative; swap with no available alternative.
- FR-039 (full product) — **TC-069, TC-070**: a hold is placed on add; add fails on insufficient stock (duration per ADR-011).
- FR-040 (full product) — **TC-071**: an expired hold releases the stock back to availability.

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
