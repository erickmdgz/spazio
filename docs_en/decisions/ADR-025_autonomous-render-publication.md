# ADR-025 - Autonomous render publication (operator render-review gate removed)

## Status

Accepted.

Scope: product direction from 2026-07-14 onward, decided by the product owner. Supersedes the **MANDATORY operator QA clause** in ADR-002; everything else in ADR-002 (hosted generative image API for compositing, no custom-trained model) stands. Retires **FR-027** (operator reviews and approves each render), **FEAT-006** (render review & moderation), their test cases (TC-051, TC-052, TC-053, and the `render_reviewer` authorization case TC-108), and the `render_reviewer` operator role, which exists solely for this gate. The other human gates are unaffected: catalog curation approval (FEAT-015, BR-1, `catalog_curator`) and manual order review/forwarding (FEAT-011, `order_handler`, `forwarded_by`, `paid_unforwarded`) keep their operators and their approval semantics.

## Context

The pilot was designed human-in-the-loop for rendering: an operator reviews each render before it reaches the user (FR-027; pilot, "The human's role"), and ADR-002 made operator QA of every render MANDATORY as part of the rendering-pipeline decision. That gate is specified across the docs: FEAT-006 defines the review-and-moderation feature; the `Render` entity carries a review state machine (`pending_review` / `approved` / `rejected`) with `reviewed_by` stamping (07_data_model.md); the API exposes `POST /api/v1/operator/renders/{renderId}/approve` / `.../reject` (06_api.md); the operator console specifies a render-review queue (build plan §1.7 and FEAT-006 task); and the client holds finished renders in a waiting state until approval (build plan `RenderWaitingView`, the client half of TC-053).

The stated rationale was risk mitigation: render fidelity — compositing a real SKU into the user's room at the correct size and appearance — is named the **highest risk** in the PRD (§10), and human review "protects the customer while the AI is still unproven" (pilot, "The human's role").

On 2026-07-14 the product owner decided the trade-off differently: **the rendering process must run without a human approval role.** The mandatory gate makes every render's delivery depend on operator availability and adds a review delay on top of generation time; the owner has decided that AI-generated renders will be published to the requesting user directly.

## Decision

1. **Renders are published immediately on generation success.** No operator reviews, approves, or rejects renders. The render lifecycle keeps only the generation states already defined in the data model (`queued` / `processing` / `completed` / `failed`, per `RenderRequest.status` in 07_data_model.md); a render that completes is immediately visible to the requesting user.
2. **The human review gate is removed entirely:**
   - FR-027 is Deprecated and FEAT-006 is Retired (both superseded by this ADR).
   - The `Render` review state machine (`pending_review` / `approved` / `rejected`) and `reviewed_by` stamping on renders are removed from the data model.
   - The operator approve/reject render endpoints are removed from the API spec, and the render-review queue is removed from the operator console spec.
   - The client's waiting-for-operator-approval hold state for renders is removed; the client waits only on generation.
   - The `render_reviewer` operator role is retired. The operator console and operator auth remain, serving catalog curation and order handling.
   - Test cases TC-051, TC-052, TC-053, and TC-108 are retired with the gate.
3. **This is a pure removal.** No automated QA, ML moderation, or confidence-threshold gating replaces the operator. Where a document needs to state the new behavior, it is: *renders are published immediately on generation success (ADR-025)*.
4. **Everything else around rendering stands:** ADR-002's pipeline choice (no custom model; its hosted-image-API engine clause superseded by ADR-026, 2026-07-14 — engine now self-hosted FLUX.2 Klein 4B via mflux), render privacy (NFR-007 — photos and renders stay private to the requesting user by default), render-to-purchase tracking (NFR-006), render limits and pricing (ADR-009, ADR-010), and the render-time target (ADR-013), except where their text assumes the review step.
5. **Code is not changed in this iteration.** `backend/` and `web-demo/` still implement the review flow; the docs updated under this ADR are the target spec for the next development iteration, tracked as a backlog item in 05_backlog.md (FEAT-016, issue #38). **(Update 2026-07-15 — this clause is now historical: FEAT-016 is built and verified locally; the render-review gate has been removed from the code. Verified: `backend/prisma/schema.prisma` has no `RenderReviewStatus` and no `render_reviewer` — `RenderRequest.status` is only `queued`/`processing`/`completed`/`failed`, and `OperatorRole` is only `catalog_curator`/`order_handler`; there is no render-review route under `backend/src/routes/operator/`; and `web-demo/` has no render-waiting/approval state. The running code now matches this ADR.)**

## Alternatives considered

1. **Keep the mandatory operator gate (status quo: ADR-002 QA clause, FR-027, FEAT-006).** Rejected by the product owner: the rendering process must run without a human approval role.
2. **Sample-based / asynchronous spot review** (publish immediately, review a sample of renders after the fact). Rejected as out of scope: it preserves a render-review operator function; a pure removal was chosen.
3. **Automated QA in place of the human gate** (ML moderation, fidelity scoring, confidence thresholds before publication). Rejected as out of scope for this decision: no replacement automation is introduced; a pure removal was chosen.

## Positive consequences

- No review bottleneck: render delivery no longer depends on operator availability, queue depth, or a review SLA. The user's wait is generation time alone, so the ~2–5 min soft target (ADR-013 / NFR-001) now describes the full wait.
- Simpler render state machine: generation states only. The review states, reviewer stamping, review endpoints, console queue, and client hold state all disappear from the target spec.
- A faster, fully self-serve user experience from photo to shoppable render.
- Operator effort concentrates on the two gates that remain (catalog curation, order forwarding).

## Negative consequences

- **The PRD's highest risk is now unmitigated by review.** Render fidelity (PRD §10 — a real SKU composited at correct size and appearance; a poor match could increase returns and disputes) loses its named mitigation while the AI is still unproven. Bad or unfaithful renders reach users directly, and exposure to returns and disputes increases. This ADR knowingly accepts that risk and introduces no replacement mitigation.
- Fewer eyes on failures: operators no longer see every render, so fidelity regressions and SKU mismatches will surface through downstream signals (user complaints, disputes, conversion movements in NFR-006 tracking) rather than before publication. NFR-007 privacy itself is unaffected — photos and renders remain private by default.
- Docs and code diverge until the next iteration: the backend and the web app still implement the review flow, so the running system enforces a gate the spec has removed. The gap is closed by the backlogged implementation work (FEAT-016, issue #38). **(Update 2026-07-15: this divergence is now resolved — FEAT-016 built and verified locally; the review flow has been removed from `backend/` and `web-demo/`, so code and spec no longer diverge on this gate.)**
- FR-027's acceptance criteria and FEAT-006's rationale were traceable to the pilot source and the PRD's operator responsibilities (§5 render-quality monitoring); retiring them removes that documented accountability for render quality without assigning it elsewhere.

## Date

2026-07-14.
