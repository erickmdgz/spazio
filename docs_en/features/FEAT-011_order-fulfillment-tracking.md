# FEAT-011 - Order fulfillment & tracking

> **Status legend:** **VERIFIED** = stated in the PRD v0.7 or the one-week iOS pilot; **DRAFT / PROPOSED** = author's structuring, not confirmed; **TBD / PENDING** = reserved for a human decision (PRD §12), tracked as an ADR. Nothing here is implemented; this is a specification.

## 1. Summary

What happens **after** a confirmed, paid order: getting the order to the supplier and letting the user see its progress. This feature groups two distinct capabilities that sit at opposite ends of the product's maturity:

- **Pilot scope (VERIFIED):** the **operator manually forwards** each confirmed (paid) order to the supplier and marks it `forwarded` — FR-061. This is the pilot's human bridge: *"No automated split payment or supplier integration is built in week one. The operator forwards the confirmed order manually"* (pilot, "The human's role"). It substitutes for the automated split-settlement and per-supplier-PO handoff (FR-043 / FR-044, FEAT-010) that the pilot excludes.
- **Full-product scope (VERIFIED, PRD, out of pilot):** **per-purchase-order status and tracking** shown to the user — FR-047 (PRD FR-12; PRD §3 "Must have": *basic order tracking*). **Full order tracking is excluded from the one-week pilot** (pilot "Excluded" list).

## 2. Problem or need

The full marketplace model settles one user payment across multiple local suppliers and generates one purchase order per supplier (PRD §4 BR-25; FEAT-010). In the pilot, that infrastructure does not exist yet, so *"a human operator handles fulfillment manually because the infrastructure does not yet exist"* (pilot, "Why each is excluded"). FR-061 is the operational bridge that makes the pilot's end-to-end loop complete: a paid order still has to reach the supplier, and in week one a person does that by hand (pilot Day 4: *"manual order handoff"*).

Order tracking is a PRD **Must have** (*"Basic order tracking"*, PRD §3) and the closing step of the PRD basic flow (*"User tracks order status"*, PRD §8 step 19). The pilot treats it as **secondary** — *"Everything else … order tracking … is secondary. If the render is not believable or the furniture is not actually purchasable, nothing else matters"* (pilot) — and therefore excludes full tracking. FR-047 specifies the capability for the full product; it is not exercised in the pilot.

## 3. Affected user

- **Operator** (Spazio staff) — **manually forwards** each confirmed, paid order to the supplier and marks it forwarded (FR-061, pilot). Order-flow supervision is an operator responsibility (PRD §5).
- **Homeowner/renter** — **views** the status and tracking of their purchase order(s) (FR-047, full product).
- **Supplier** — **receives** the forwarded order (manually in the pilot; via automated PO handoff in the full product, FEAT-010).
- **System** — records the forwarding action and surfaces per-purchase-order status/tracking to the user.

## 4. Related requirements

Functional:

- FR-061 — Operator manually forwards each confirmed order to the supplier *(pilot)*
- FR-047 — Provide per-purchase-order status and tracking *(full product, out of pilot)*

Non-functional:

- NFR-008 — Authentication protects account and order data (tracking and order records are reachable only by their owner and authorized operators)
- NFR-010 — Gateway supports marketplace-style split settlement and multi-supplier payouts (the automated successor to the pilot's manual forwarding; NFR-010 explicitly names FR-061 as the pilot substitute — model **TBD**, ADR-003 / ADR-004)
- NFR-006 — Track render-to-purchase conversion from day one (a completed, forwarded order is the terminal state of the purchase this metric measures)

## 5. Expected flow

This feature covers two points in the lifecycle, one of which is a numbered PRD basic-flow step and one of which is derived from the pilot's human-in-the-loop model:

1. **Manual order forwarding (FR-061)** — *derived from the pilot's human-in-the-loop model, not a numbered PRD basic-flow step.* After checkout produces a paid `Order` and (full product) one `PurchaseOrder` per supplier at PRD §8 step 16, the pilot has no automated split/PO handoff. Instead, an **operator forwards** the confirmed, paid order to the supplier and the order is marked `forwarded` (pilot, "The human's role"; pilot Day 4 "manual order handoff"). This stands in for the automated split settlement / per-supplier PO of FEAT-010 (FR-043 / FR-044), which are **excluded from the pilot**.
2. **Order status & tracking (FR-047)** — **PRD §8 step 19** (*"User tracks order status"*). The user views the current status and tracking information for each purchase order. When a purchase order has no tracking data yet, a `no-tracking-yet` status is shown (FR-047 criteria). *Full order tracking is excluded from the pilot.*

## 6. Acceptance criteria

Acceptance criteria **are defined in the corresponding functional requirement (FR)**, not here (see `docs_en/03_requirements.md`). This FEAT only references them:

- FR-047 → criteria in `docs_en/03_requirements.md`
- FR-061 → criteria in `docs_en/03_requirements.md`

If you detect a new criterion during implementation, first add it to the FR (with its `TC-`) and then continue.

## 7. Business rules

Business rules **live in the FR** (`docs_en/03_requirements.md`); they are not rewritten here. Reference:

- FR-061 (pilot operating rule: in the pilot the operator forwards the confirmed order **manually** because no automated split payment or supplier integration is built in week one. This is a **pilot bridge for FR-043 / FR-044**, not a numbered PRD business rule — VERIFIED, pilot.)
- FR-047 (from PRD FR-12 and PRD §3 "Must have" — *basic order tracking*; PRD §8 step 19. Per-purchase-order granularity follows PRD BR-25's one-PO-per-supplier model.)
- Related human-reserved decisions: the **payment gateway & split-settlement model** (ADR-003) and **merchant-of-record model** (ADR-004) are **PENDING** (PRD §12). They govern the automated fulfillment path that eventually replaces FR-061; do not treat any gateway / settlement / MoR choice as decided.

## 8. Proposed technical design

*High-level only. Technology, payment gateway, split-settlement, and merchant-of-record choices are reserved for humans (PRD §12) and marked PENDING; do not select or assume any of them here.*

### Frontend

- **Operator surface (pilot, DRAFT / PROPOSED — internal tool/console):** a list of confirmed, paid orders with a **forward-to-supplier** action that marks the order `forwarded` (FR-061). Operator tooling technology is **[PENDING — see ADR-001]**.
- **User surface (full product, out of pilot):** an **order-tracking view** showing per-purchase-order status and tracking info (FR-047), including a `no-tracking-yet` state when no tracking data exists. Client stack is **[PENDING — see ADR-001]**.

### Backend

- **Manual forwarding (pilot):** record the operator's forwarding action against the paid order / purchase order and transition it to `forwarded` (FR-061). The *transmission channel* to the supplier is manual/out-of-band in the pilot (no automated supplier integration — pilot); any future automated handoff depends on **[PENDING — see ADR-003 / ADR-004]**.
- **Status & tracking (full product):** expose the current status and tracking information per purchase order (FR-047); return a `no-tracking-yet` status when tracking data is absent. A purchase-order **status lifecycle** (DRAFT / PROPOSED) would drive both the operator forwarding transition and the user-facing tracking view; the exact state set is **TBD**.

### Database

- Entities involved (canonical registry in `07_data_model.md`; fields **DRAFT / PROPOSED** until confirmed with the stack — `ADR-001`):
  - `Order` — the confirmed, paid purchase the operator forwards (`status` values e.g. `pending` / `confirmed` / `in_fulfillment` / `completed` / `cancelled` are **DRAFT / PROPOSED**).
  - `PurchaseOrder` — one per supplier, forwarded to the supplier for fulfillment. Draft fields relevant here: `status` (proposed lifecycle `created` / `sent_to_supplier` / `accepted` / `in_production` / `shipped` / `delivered` / `cancelled`), and the pilot forwarding fields `forwarded_by` → `Operator` and `forwarded_at` (all **DRAFT / PROPOSED**, pilot; FR-061).
  - `OrderTracking` — status and tracking updates per purchase order (FR-047 / PRD FR-12); draft fields `status`, `tracking_number`, `carrier`, `status_updated_at`, `notes` (all **DRAFT / PROPOSED**). *Full tracking is out of pilot.*
  - `Operator` — the staff member who forwards the purchase order in the pilot.
  - `Supplier` — the recipient of the forwarded order.
- Field-level schema is **TBD** and depends on the technology decision (ADR-001).

### Security

- **Authentication protects order data (NFR-008):** a user may view tracking only for their **own** purchase orders; the manual-forward action is restricted to authorized **operators**.
- The eventual automated fulfillment path (split settlement / payouts) must be **auditable** (full product); the pilot's manual forwarding should still record **who** forwarded **what** and **when** (`forwarded_by` / `forwarded_at`, DRAFT / PROPOSED) for traceability.

## 9. Required tests

Test cases live in `08_test_plan.md`, where **each `TC-` maps 1:1 to an acceptance criterion of an FR** (see `03_requirements.md`). The `TC-` rows for this feature's FRs **already exist** in `08_test_plan.md` (all with `Status: Pending`, since nothing is implemented): **TC-081** and **TC-082** (FR-047), and **TC-106** (FR-061).

The tests for this feature are the following `TC-` rows in `08_test_plan.md`, grouped by related FR:

- FR-061 (pilot) — **TC-106** (operator forwards a confirmed, paid order → the order is transmitted to the supplier and marked `forwarded`). *(Happy path — the pilot's manual handoff.)*
- FR-047 (full product) — **TC-081** (user views order tracking for a purchase order → the current status and tracking information are displayed) and **TC-082** (user views tracking for a purchase order with no tracking data yet → a `no-tracking-yet` status is shown).
- Cross-cutting NFR checks not yet covered by a dedicated `TC-` in `08_test_plan.md`: **Security** — a non-operator cannot forward an order and a user cannot view another user's order tracking (NFR-008). Add a `TC-` against FR-061 / FR-047 when that criterion is written.

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
