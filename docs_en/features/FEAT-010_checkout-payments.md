# FEAT-010 - Checkout & payments

> **Status legend:** **VERIFIED** = stated in the PRD v0.7 or the one-week iOS pilot; **DRAFT / PROPOSED** = author's structuring, not confirmed; **TBD / PENDING** = reserved for a human decision (PRD §12), tracked as an ADR. **As built (2026-07-15):** a single-COP **mock** checkout producing a per-supplier `PurchaseOrder` (forwarded manually) is implemented and **verified on a local stack (not deployed)**; the payment gateway is a mock/fake (ADR-003 vendor unchosen — no real money). Split settlement, guest checkout, and commission automation stay specification (full product).

## 1. Summary

Let the user **pay in-app** for the products in their confirmed cart. In the full product this is a marketplace payment: **one user payment** across multiple suppliers, split settlement, **one purchase order per supplier**, guest checkout, and automatic commission retention. In the pilot it is deliberately reduced to **one simple in-app checkout** with **manual** order handoff.

- **Pilot scope (VERIFIED):** *"One simple in-app checkout"* (pilot "Included" list) — FR-042 (single in-app payment). The operator then **places the purchase order with the supplier manually** (pilot, "The human's role"; see FEAT-011/FR-061). The pilot **excludes** automated split payments, one-PO-per-supplier automation, and guest checkout.
- **Full-product scope (VERIFIED, PRD, out of pilot):** guest checkout (FR-004), price/availability **revalidation at checkout** (FR-041), **split settlement** to suppliers (FR-043), **one purchase order per supplier** (FR-044), and **marketplace commission** retention (FR-045).

## 2. Problem or need

The product's success metric is **render-to-purchase**: a user buying the exact products shown **inside Spazio, in the same session, without leaving to search elsewhere** (PRD §2; pilot, "The signal that it is working"). That requires a working in-app payment. The full marketplace model needs to pay **multiple local suppliers from a single user payment** and retain Spazio's commission, which is why the PRD calls for a gateway supporting **split settlement, multi-supplier payouts, multi-currency, guest checkout, and automatic commission retention** (PRD §7). The pilot strips this to the minimum because *"no automated split payment or supplier integration is built in week one"* (pilot).

## 3. Affected user

- **Homeowner/renter** — completes the in-app payment (and, in the full product, may check out as a guest).
- **System** — processes the payment and (full product) performs revalidation, split settlement, per-supplier PO generation, and commission retention.
- **Operator** — in the pilot, **manually forwards** the confirmed order to the supplier (FEAT-011/FR-061).
- **Supplier** — receives the (manual in pilot / automated in full product) purchase order.

## 4. Related requirements

Functional:

- FR-004 — Complete guest checkout with validated email, phone, and shipping info *(full product, out of pilot)*
- FR-041 — Revalidate price and availability at checkout before payment *(full product, out of pilot)*
- FR-042 — Process a single in-app payment for the order *(pilot)*
- FR-043 — Settle funds to multiple suppliers via split settlement *(full product, out of pilot)*
- FR-044 — Generate one purchase order per supplier at checkout *(full product, out of pilot)*
- FR-045 — Apply and retain the marketplace commission on every completed purchase *(full product, out of pilot)*

Non-functional:

- NFR-008 — Authentication protects account and order data
- NFR-009 — Payment processing is PCI-compliant
- NFR-010 — Gateway supports marketplace-style split settlement and multi-supplier payouts
- NFR-011 — Gateway supports multi-currency processing
- NFR-012 — Gateway supports guest checkout and automatic commission retention
- NFR-015 — Price, delivery, and warranty are visible before checkout

## 5. Expected flow

This feature covers PRD §8 steps 15–17 (payment and PO generation), continuing after the cart is explicitly confirmed (FEAT-008/FR-035):

1. (Full product, PRD §8 step 17 / BR-24) The system **revalidates price and availability** before charging (FR-041). *Not built in the pilot.*
2. (PRD §8 step 15) The user **checks out with one payment** (FR-042). In the full product, unauthenticated users may complete **guest checkout** with validated email, phone, and shipping info (FR-004 / PRD BR-26). *The pilot excludes guest checkout. **Decided (pilot):** minimal contact capture (email+phone+shipping), no accounts, single COP capture, manual payout — see ADR-022, ADR-003, ADR-004. Accounts (FEAT-001) remain out of the pilot per `05_backlog.md`, NFR-008, and `02_architecture.md`; this resolves how the pilot user is identified at checkout.*
3. (PRD §8 step 16, full product) The system **generates one purchase order per supplier** (FR-044 / PRD BR-25) and **settles funds to suppliers via split settlement** (FR-043), **retaining Spazio's commission** (FR-045 / PRD BR-28).
4. In the pilot, instead of automated split/PO, the **operator manually forwards** the confirmed order to the supplier (FEAT-011/FR-061).
5. Prices are shown in the user's local currency (pilot **COP**, VERIFIED; general rule FR-046 in FEAT-004); delivery/production estimates shown before checkout come from FEAT-009 (FR-036, pilot-included).

## 6. Acceptance criteria

Acceptance criteria **are defined in the corresponding functional requirement (FR)**, not here (see `docs_en/03_requirements.md`). This FEAT only references them:

- FR-004 → criteria in `docs_en/03_requirements.md`
- FR-041 → criteria in `docs_en/03_requirements.md`
- FR-042 → criteria in `docs_en/03_requirements.md`
- FR-043 → criteria in `docs_en/03_requirements.md`
- FR-044 → criteria in `docs_en/03_requirements.md`
- FR-045 → criteria in `docs_en/03_requirements.md`

If you detect a new criterion during implementation, first add it to the FR (with its `TC-`) and then continue.

## 7. Business rules

Business rules **live in the FR** (`docs_en/03_requirements.md`); they are not rewritten here. Reference:

- FR-042 / FR-044 (PRD BR-25: checkout produces **one user payment and one purchase order per supplier**)
- FR-041 (PRD BR-24: price and stock must be validated again at checkout)
- FR-004 (PRD BR-26: guest checkout requires email validation, phone number, and shipping information)
- FR-045 (PRD BR-28: Spazio applies a marketplace commission to every completed purchase — **PRD default "10%" adopted for the pilot (ADR-007)**; reconciled manually in the pilot)
- Related decisions — **Decided (pilot):** a single PCI-compliant hosted checkout collecting one payment in COP with **no split settlement** (ADR-003), and the **Spazio operating entity as merchant-of-record** paying suppliers manually (ADR-004); split settlement, gateway/provider selection, and tax/legal implications **revisit before scale** (PRD §12).

## 8. Proposed technical design

*High-level only. **Decided (pilot):** a single PCI-compliant hosted COP checkout with **no split settlement** (ADR-003) and the Spazio operating entity as merchant-of-record paying suppliers manually (ADR-004); split settlement, gateway/provider selection, and tax/legal implications **revisit before scale** (PRD §12).*

### Frontend

- On iOS (pilot, VERIFIED): a **checkout screen** and a **single payment** flow (FR-042), showing order total in local currency (COP in pilot) with per-item delivery/production estimates (FEAT-009). Broader stack **Decided (pilot): native iOS (SwiftUI) app + one managed backend service + managed Postgres + object storage, single environment/region — see ADR-001**.
- Full product adds a **guest-checkout** form (email/phone/shipping, FR-004).

### Backend

- **Payment processing** via a **PCI-compliant gateway** (NFR-009). **Decided (pilot):** a single PCI-compliant hosted checkout collecting one payment in COP with **no split settlement** — see ADR-003; in the full product the gateway must support **split settlement, multi-supplier payouts, multi-currency, guest checkout, and automatic commission retention** (NFR-010/011/012).
- **Checkout revalidation** of price and availability before charging (FR-041, full product; coordinates with stock holds in FEAT-008).
- **Order/PO generation** (full product): create an `Order` from the confirmed cart and **one `PurchaseOrder` per supplier** (FR-044); apply/retain **commission** (FR-045). **Merchant-of-record** model — **Decided (pilot): the Spazio operating entity collects the single payment and pays suppliers manually (revisit before scale) — see ADR-004**.
- **Pilot substitute:** record the paid `Order` and hand it to an operator for **manual** forwarding to the supplier (FEAT-011/FR-061); automated split/PO not built.

### Database

- Entities involved (canonical registry; fields **DRAFT / PROPOSED** until modeled in `07_data_model.md`):
  - `Order` — a confirmed purchase from a single user payment spanning one or more suppliers.
  - `Payment` — the single PCI-processed user payment record, feeding split settlement and commission retention.
  - `PurchaseOrder` — one per supplier (full product), generated from an `Order`.
  - `Commission` — the marketplace fee Spazio retains (**PRD default 10% adopted for the pilot — ADR-007**; reconciled manually in the pilot).
- Field-level schema is **TBD**.

### Security

- **PCI-compliant** payment handling (NFR-009); sensitive card data handled by the gateway, not stored by Spazio (**Decided (pilot): single hosted COP checkout, no split; Spazio operating entity as merchant-of-record paying suppliers manually — see ADR-003/ADR-004**).
- Authentication protects account and order data (NFR-008); order access limited to its owner and authorized operators.
- Commission retention and settlement must be auditable (full product).

## 9. Required tests

Test cases live in `08_test_plan.md`, where **each `TC-` maps 1:1 to an acceptance criterion of an FR** (see `03_requirements.md`). The `TC-` rows for this feature's FRs **already exist** in `08_test_plan.md`: **TC-008–TC-010** (FR-004) and **TC-072–TC-079** (FR-041–FR-045).

The tests for this feature are the following `TC-` rows in `08_test_plan.md`, grouped by related FR:

- FR-042 (pilot) — **TC-074** (a single in-app payment completes the order → `paid`) and **TC-075** (payment-failure handling → `payment-failed`, no order).
- FR-041 (full product) — **TC-072** (checkout revalidates unchanged price/availability and proceeds) and **TC-073** (a stale/changed item halts checkout and is flagged).
- FR-004 (full product) — **TC-008** (guest checkout with validated email/phone/shipping accepted), **TC-009** (email fails validation → rejected), **TC-010** (missing phone or shipping → rejected).
- FR-043 (full product) — **TC-076** (split settlement across multiple suppliers) and **TC-077** (a supplier settlement failure is flagged for reconciliation).
- FR-044 (full product) — **TC-078** (one purchase order per supplier for items from M suppliers).
- FR-045 (full product) — **TC-079** (marketplace commission applied/retained on a completed purchase; rate per ADR-007).
- Cross-cutting NFR checks — PCI compliance (NFR-009), auth-protected order data (NFR-008).

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
