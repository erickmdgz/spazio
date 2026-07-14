# ADR-025 build plan — the render-to-purchase loop without human gates in the request path

> **Status: Proposed** (companion to [`ADR-025`](../decisions/ADR-025_automated-render-qa-and-order-forwarding.md); GitHub Issue #24). Nothing here is implemented. This document (1) states precisely what is wrong with the current human-gated design, (2) specifies the automated design that replaces it, and (3) maps every change onto the existing `backend/` scaffold, file by file. Confidence-based routing is **out of scope for v1** and specified as v2 in §7.
>
> **Revision note (2026-07-14):** originally drafted as ADR-023; renumbered after ADR-023 (class-demo delivery) and ADR-024 (web-platform pivot) landed. Code citations updated for the #31 increments: matching (`services/matching.ts`), `RenderItem` persistence with a fabrication guard, real cart population (`services/cart.ts`), and the operator console shell (`operator/`, PR #27) now exist. The client is the web app (ADR-024), not iOS.

**Scope guard — what this proposal does NOT touch:** operator catalog curation (FEAT-015) stays fully human. The curated, operator-approved catalog is the mechanism that structurally guarantees *"the AI never invents furniture"* (BR-6 / BR-14): the render pipeline receives `candidateProductIds` drawn only from approved, in-stock products and can compose nothing else (`backend/src/services/render/pipeline.ts`). Curation sits **outside** the request path — a user never waits on it — so none of the problems in §1 apply to it. The two gates this proposal removes are the ones **inside** the request path: render review (FR-027) and order forwarding (FR-061).

---

## 1. The problem with the current version

### 1.1 Privacy: a human views every user's room

FEAT-006 requires an operator to look at every render — and, per its own §8, the review surface shows "the source photo, matched products, and the generated image." So a human inspects a photograph of every user's home, for every render, unconditionally.

This sits in tension with the project's own privacy posture:

- BR-33 / NFR-007: photos and renders are **private by default**.
- ADR-019: "Photos and renders are private by default … collect the minimum data"; the PRD's adoption assumption (§11) is that users are *willing to upload personal-space photos* — a willingness that mandatory human inspection quietly strains.
- FEAT-006 §8 itself flags the tension ("Operator access … must respect privacy by default and be limited to what review requires") without resolving it: what review "requires" is *everything*, every time.

The existing mitigation is pseudonymity: with no user accounts (ADR-022), the operator sees a room tied only to an opaque `deviceToken` — no name or address until checkout. That helps, but a photo of someone's home is personal data in itself (and under Colombia's Ley 1581 regime, ADR-019, minimization is the norm). **The strongest form of "private by default" is that no human looks at all unless the user asks.**

### 1.2 Latency: the 2–5 minute target is actually unbounded

ADR-013 / NFR-001 set a ~2–5 min soft render target. But the pipeline finishing does not release the render: `renderWorker.ts` (post-#31 included) persists the image and items and leaves `reviewStatus = "pending_review"`; the web client (ADR-024) sits in FEAT-006's "waiting/hold state" until a human acts. Real user-visible latency is:

```text
latency = pipeline time (2–5 min target) + [unbounded human wait]
```

The human wait is unbounded **by construction**, because of §1.3.

### 1.3 Missing infrastructure: nobody is told there is something to review

The right questions are: *where would approvers even watch this stuff? Would they be notified?* The honest answers from the current repo (updated 2026-07-14):

- **Where:** a console **shell** now exists — `operator/` (static HTML/JS served by `routes/operator/console.ts`) with operator session auth (`Operator` model, `auth/passwords.ts`; PR #27). This answers "where" in a way the original scaffold did not; when this proposal was first drafted, no console existed at all. It remains a shell: it must be manually opened and manually refreshed.
- **Notified:** still no. The `Event` table and `events.ts` *write* rows (`render_created`, …) but **nothing consumes them**. There is no push, email, webhook, or worker that alerts an operator that a render is waiting. Review latency is therefore literally *"whenever a human happens to open the console and look."*
- Same for orders: after payment capture the order sits in `paid_unforwarded` until someone calls `POST /api/v1/operator/orders/:id/forward` (`routes/operator/orders.ts`) — with the customer's money already taken.

So the human-gated design still depends on an unbuilt notification system — and on a person keeping the console open — unscheduled work hiding inside "a human checks it." (The console shell's existence sharpens the point rather than blunting it: the gap was real enough that PR #27 had to start filling it, and the notification half is still missing.)

### 1.4 Availability and scaling: the operator is a single point of failure

Every render and every paid order blocks on one person being awake, reachable, and attentive. Operator asleep → product down. This is acceptable as a *deliberate* pilot trade-off, but §1.1–1.3 show its costs are higher than the pilot doc accounts for, and one of them (privacy) is paid by the user rather than the team.

### 1.5 What the human gate actually provides (stated fairly)

Pre-publication review provides exactly one thing automation cannot yet replace: **a believability judgment** — does the composited image *look right*? (PRD §10 names render fidelity the top risk; FR-027's business rule exists for it.) Everything else the gate is assumed to provide — "products are real," "prices are right" — is already guaranteed structurally by the closed candidate list and price snapshots, or is programmatically checkable (§2.1). The proposal accepts losing the pre-publication believability judgment and compensates post-hoc (§2.2, §6.1).

---

## 2. The solution

Three parts. Humans move from **gatekeepers** (in the path, blocking every request) to **exception handlers** (off the path, responding only to reports and failures).

### 2.1 Automated render QA (replaces the FR-027 gate)

When the pipeline returns, the render worker runs a **validation suite** instead of parking the render for review:

| # | Check | Rule | Source of the rule |
|---|---|---|---|
| V1 | Closed catalog | every `item.productId` ∈ `candidateProductIds` given to the pipeline; `items.length ≥ 1` | BR-6 / BR-14 (defense-in-depth; the input list already enforces it) |
| V2 | Product still sellable | each product is `approvalStatus = approved`, `completenessStatus = complete`, and `ready_made → stock > 0` (BR-4) or `made_to_order → productionLeadTimeDays` set (BR-5) | BR-2/BR-4/BR-5, `schema.prisma` |
| V3 | Image exists | `imageKey` non-empty and the object is retrievable from storage | NFR (render must be displayable) |
| V4 | Tags in bounds | every `tagPosition.{x,y}` ∈ [0, 1] | FR-028/FR-029 tag contract |
| V5 | Budget respected | `Σ priceCopSnapshot ≤ budgetMaxCop × 1.10` when a budget was provided | ADR-008 (10% tolerance) |

- **All pass →** `reviewStatus = auto_approved`, `reviewedAt = now`; emit `render_auto_published`; **trigger cart auto-population** (FR-031 — `populateCartFromRender` in `services/cart.ts` exists since #31 but is called from the operator approve endpoint; the call must move here, §3.3).
- **Any fail →** `reviewStatus = rejected` with a machine-readable `rejectionReason`; `RenderRequest.status = failed`; emit `render_validation_failed`. The client is told the render failed and may retry — no human intervention, no silent limbo.

The pending gate itself is kept: `GET /renders/:id` still hides anything not (auto-)approved, so TC-053's protection ("a not-yet-validated render is never shown") survives — the *decider* changes from a person to the validator.

### 2.2 Report button (post-hoc moderation, replaces pre-publication review)

A user who receives a bad render — wrong scale, product looks nothing like the photo, hallucinated-looking output — taps **Report**:

- `POST /api/v1/renders/:id/report` with a reason (`not_believable | product_mismatch | wrong_scale | inappropriate | other`) and optional free text. Only the render's owner (matching `deviceToken` via the project) may report; one open report per render.
- Effects, immediately and automatically: render `reviewStatus = reported`; **cart confirmation and checkout are blocked (409) for that project** while a report is open — a user can never pay against a render they just flagged; emit `render_reported`.
- The render enters the **operator remediation queue** (`GET /operator/renders?status=reported`). Only now does a human look — *at the explicit request of the user*, which converts the §1.1 privacy problem into consent. The operator resolves it (re-render, apologize, refund if already paid) and records the resolution on the report.

This inverts FEAT-006: instead of *every* render costing a human review and every user their privacy, only *failed* renders cost either — and each report is a labeled training example for v2 (§7).

### 2.3 Automated order forwarding (amends FR-061)

- New `SupplierNotifier` interface with two implementations, mirroring the scaffold's existing `RenderPipeline` / `PaymentGateway` pattern: `FakeSupplierNotifier` (dev/test, deterministic, no I/O) and, for the pilot, `EmailSupplierNotifier` — a templated purchase-order email to `Supplier.contactEmail` (already in the schema) listing SKUs, quantities, snapshot prices, and the delivery address.
- After payment capture, checkout enqueues a `forward-order` job on the existing queue abstraction. A forwarding worker sends each `PurchaseOrder`, marking it `sent_to_supplier` + `forwardedAt` on success; when all POs are sent, the order becomes `forwarded` — the exact state transitions `POST /operator/orders/:id/forward` performs today, executed by a worker seconds after payment instead of stalling in `paid_unforwarded`.
- **Failure path:** 3 attempts with exponential backoff; then the PO is marked `forward_failed` (new enum value), `po_forward_failed` is emitted, and the order surfaces in the operator queue. `POST /operator/orders/:id/forward` is **kept as the manual fallback** — the human is the exception handler, not the path.

---

## 3. How to implement it (mapped to the scaffold)

Ordered so the branch compiles and tests pass at every step. All paths relative to `backend/`.

### 3.1 `prisma/schema.prisma`

```prisma
enum RenderReviewStatus {
  pending_review   // kept: state between enqueue and validation
  auto_approved    // NEW: passed automated validation; visible to the user
  approved         // kept: manual approval during remediation (and any v2 human path)
  rejected         // kept: now set by the validator, with a reason
  reported         // NEW: user filed a report; checkout blocked; in remediation queue
}

enum ReportReason { not_believable product_mismatch wrong_scale inappropriate other }

model RenderReport {
  id         String       @id @default(uuid())
  renderId   String       @unique            // one open report per render (pilot)
  reason     ReportReason
  comment    String?
  createdAt  DateTime     @default(now())
  resolvedAt DateTime?
  resolution String?                          // re_rendered | refunded | dismissed …
  render     Render       @relation(fields: [renderId], references: [id], onDelete: Cascade)
}
```

- `Render`: add `rejectionReason String?` and `reports RenderReport[]`; `reviewedAt` semantics widen to "validated/reviewed at". `reviewedById` (added in #27) stays: `null` for auto-approved renders, set on remediation actions — a free audit trail distinguishing machine from human decisions.
- The `Operator` model added in #27 is kept as-is: remediation (§2.2) and the v2 human path (§7) already have their identity model.
- `PurchaseOrderStatus`: add `forward_failed`.
- Migration: `npm run db:migrate` (dev migration; enum additions are additive, no data backfill needed — nothing is deployed).

### 3.2 `src/services/render/validate.ts` (new)

Pure function `validateRenderResult(result, input, products, storage): { ok: true } | { ok: false; reason: string }` implementing V1–V5 from §2.1. Keeping it pure (products pre-fetched, storage check injected) makes it unit-testable without a DB, matching the suite's injected-mock pattern (`test/helpers.ts`).

### 3.3 `src/jobs/renderWorker.ts`

Since #31 the worker already does most of the mechanical work this proposal needs: it matches real SKUs (`services/matching.ts`), passes them as `candidateProductIds`, persists `RenderItem` rows with price snapshots from the real `Product` rows, and applies a **fabrication guard** that drops any pipeline item not in the matched set — i.e., check V1 is effectively implemented in-line. What remains is the decision step: the worker still parks every render in `pending_review`. Change the post-persistence block to:

1. Run `validateRenderResult` (V1 stays in the worker's guard; the validator re-asserts it plus V2–V5).
2. Pass → `reviewStatus: "auto_approved"`, `reviewedAt: now`, `reviewedById: null`; emit `render_auto_published`; call `populateCartFromRender` (FR-031). **The cart-population call moves here from the approve endpoint in `routes/operator/renders.ts`** — with no mandatory approval, approval can no longer be the trigger.
3. Fail → `reviewStatus: "rejected"`, `rejectionReason`; `RenderRequest.status: "failed"`; emit `render_validation_failed`.

### 3.4 `src/routes/client/renders.ts`

- `GET /renders/:id`: include `rejectionReason` when rejected so the client can show *why* and offer retry. Continue serving `imageKey` only for `auto_approved`/`approved` (TC-053 gate).
- New `POST /renders/:id/report`: body `{ deviceToken, reason, comment? }`; verify the token matches the render's project; 409 if a report is already open; create `RenderReport`, set `reviewStatus: "reported"`, emit `render_reported`.

### 3.5 `src/routes/client/cart.ts` and `checkout.ts`

Guard in `POST /cart/confirm` and `POST /checkout`: if any render backing the project has an open report (`reviewStatus = reported`), return `409 { error: "request_error", message: "A reported render is under review." }`.

### 3.6 `src/services/supplierNotifier.ts` (new)

```ts
export interface SupplierNotifier {
  sendPurchaseOrder(po: PurchaseOrderWithLines, supplier: Supplier, shipping: ShippingInfo): Promise<void>;
}
export class FakeSupplierNotifier implements SupplierNotifier { /* deterministic no-op, records calls */ }
```

`EmailSupplierNotifier` (pilot) is a later feature; vendor choice stays open behind the interface, exactly like ADR-002/ADR-003 vendors. Wire into `AppDeps` (`src/types.ts`) and construct in `src/server.ts`, as `FakePaymentGateway` is today.

### 3.7 `src/jobs/forwardWorker.ts` (new) + `src/jobs/queue.ts`

- `queue.ts`: generalize the job type to `RenderJob | ForwardOrderJob` (or instantiate a second `InMemoryQueue` — simpler, no type surgery; recommended).
- `forwardWorker.ts`: dequeue `{ orderId }` → for each PO call `notifier.sendPurchaseOrder` → per-PO success: `sent_to_supplier` + `forwardedAt`, emit `po_forwarded`; all sent: order `forwarded`; failure after 3 backoff attempts: PO `forward_failed`, emit `po_forward_failed`.
- `routes/client/checkout.ts`: enqueue `{ orderId }` after capture succeeds (order stays `paid_unforwarded` until the worker finishes — same state, now measured in seconds).

### 3.8 `src/routes/operator/*` — repurposed as remediation, kept as fallback

- `renders.ts`: extend the status filter with `reported`; approve/reject stay for remediation (approve after manual fix keeps emitting `render_approved` and recording `reviewedById`, as it does since #27); add `POST /renders/:id/reports/:reportId/resolve`.
- `orders.ts`: unchanged — `forward` is now the documented manual fallback for `forward_failed`.
- The console shell (`operator/`) gains a "Reported" tab instead of a "Pending review" firehose — its queue shrinks from *every render* to *only renders users flagged*.

### 3.9 `src/events.ts`

Add: `RENDER_AUTO_PUBLISHED`, `RENDER_VALIDATION_FAILED`, `RENDER_REPORTED`, `PO_FORWARDED`, `PO_FORWARD_FAILED`. NFR-006's funnel (`render_viewed` → `purchase_completed`) is untouched; the new events add the counter-metric of §6.1.

### 3.10 Tests (`test/`, vitest with injected Prisma mock — no DB, per `test/helpers.ts`)

| TC | Replaces / new | Asserts |
|---|---|---|
| TC-051-A | replaces TC-051 | worker + all-pass validation → `auto_approved`, cart populated, `render_auto_published` emitted |
| TC-052-A | replaces TC-052 | failing any of V1–V5 → `rejected` + `rejectionReason`, request `failed`, never visible |
| TC-053 | kept as-is | non-approved render's image is not served (gate survives, decider changed) |
| TC-107 | new | report → `RenderReport` created, status `reported`, `render_reported` emitted; second report → 409 |
| TC-108 | new | open report → `POST /cart/confirm` and `POST /checkout` return 409 |
| TC-109 | new (amends TC-106) | paid order → forward worker sends each PO, marks `sent_to_supplier` → `forwarded` |
| TC-110 | new | notifier failing 3× → PO `forward_failed`, `po_forward_failed` emitted, order visible in operator queue; manual `forward` still works |
| TC-111 | new | `validateRenderResult` unit table: each of V1–V5 individually violated |

### 3.11 Suggested implementation order

1. Schema + migration (§3.1) → 2. validator + unit tests (§3.2, TC-111) → 3. worker rewrite (§3.3, TC-051-A/052-A) → 4. report route + checkout guards (§3.4–3.5, TC-107/108) → 5. notifier + forward worker + checkout enqueue (§3.6–3.7, TC-109/110) → 6. operator remediation extensions (§3.8) → 7. docs (§4). Steps 1–4 and 5 are independent and can be two branches/PRs if the team splits the work.

---

## 4. Documentation impact (if accepted)

Per CLAUDE.md §3 / `11_implementation_flow.md`:

- `03_requirements.md` — FR-027 superseded by two new FRs: **FR-062** "the system shall validate and auto-publish each render" (criteria = V1–V5 + gate) and **FR-063** "a user shall be able to report a published render" (criteria = TC-107/108, blocking rule). FR-061 amended: "the **system** shall forward each confirmed order…; the operator forwards manually on automated failure." (Numbering final at requirements-edit time; FR-062/063 assumed free after FR-061.)
- `04_non_functional_requirements.md` — strengthen NFR-007 note (no human render access without a user report); add forwarding-latency note.
- `05_backlog.md` — done on this branch ("Proposals under discussion").
- `06_api.md` — add `POST /renders/:id/report`, report-resolve endpoint, 409 guards; re-describe operator endpoints as remediation/fallback.
- `07_data_model.md` — `RenderReport`, enum additions, `rejectionReason`.
- `08_test_plan.md` — table in §3.10.
- `docs_en/features/FEAT-006_render-review-moderation.md` — superseded by a new FEAT doc ("Automated render QA & post-hoc moderation") on acceptance.
- ADR-002 — add an amendment note ("mandatory operator QA" clause superseded by ADR-025 if accepted).

## 5. What this buys (tied back to §1)

| §1 problem | After this proposal |
|---|---|
| 1.1 Privacy | No human sees any render unless its owner reports it; reporting **is** the consent. |
| 1.2 Latency | User-visible latency = pipeline time; the ADR-013 target becomes real. Orders forwarded in seconds. |
| 1.3 Missing infra | The unbuilt notification system stops being a launch dependency; the remediation queue is served by the *existing* console shell and operator API. |
| 1.4 Availability | Nothing in the happy path blocks on a person; humans handle exceptions asynchronously. |

## 6. Risks and mitigations

1. **A low-fidelity render reaches a user** (the top PRD §10 risk, no longer pre-screened). Mitigations: (a) small pilot cohort explicitly briefed that renders are AI-generated and reportable ("beta" framing); (b) checkout block on report — a user cannot pay against a render they flagged; (c) refund-on-report policy for anything already paid (remediation flow, §2.2); (d) counter-metric in §6.1.
2. **Metric contamination.** render-to-purchase could drop because renders are worse *or* because trust framing changed. Mitigation: track **reports-per-render** alongside it from day one (`render_reported` / `render_auto_published`); a low report rate + low purchase rate implicates the loop, a high report rate implicates fidelity — more diagnostic signal than the human gate gave.
3. **Validator passes garbage** (V1–V5 check integrity, not believability — the honest limit from §1.5). Mitigation: accepted for v1 by design; the report rate quantifies exactly how often it happens, which is the calibration data v2 needs.
4. **Email deliverability / supplier misses a PO.** Mitigations: `forward_failed` escalation + manual fallback endpoint; supplier onboarding (ADR-016 one-page agreement) adds "confirm PO receipt" while the pilot is 2–4 suppliers.
5. **Report abuse** (spurious reports blocking checkout). Low risk at pilot scale (owner-only, one open report per render); remediation can dismiss.

## 7. Deferred to v2: confidence-based routing

The end-state this team actually believes in, cut from v1 purely for schedule:

- The pipeline returns a **confidence score** per render (vendor signal, and/or checks like product-crop similarity between catalog photo and rendered region).
- `confidence ≥ τ` → auto-publish (v1 path); `confidence < τ` → human review queue (FEAT-006's flow, now for a small minority of renders).
- **τ is calibrated from v1's own data:** reports (§2.2) and remediation decisions are labeled examples of "the validator passed it but a human/user would not have." v1 is not a detour from v2 — it is v2's data-collection phase.
- Prerequisites v1 deliberately skips: a confidence signal, a production-grade review console (the #27 shell is the seed), and a notification consumer for the `Event` trail.

## 8. Traceability

`ADR-025 → Issue #24 → branch docs/ADR-025-automated-render-qa-and-order-forwarding → this doc → (if accepted) FR-062/FR-063 + FR-061 amendment → implementation per §3 → TC-051-A…TC-111 → release notes.`
