# ADR-023 - Automated render QA and order forwarding (remove human gates from the request path)

## Status

**Proposed.** (Team decision pending — this ADR records a critique and an alternative design, authored by the incoming team. It amends FR-027 and FR-061 and partially amends ADR-002's "mandatory operator QA" clause. Per CLAUDE.md §2, product decisions are human: this document proposes; the team decides.)

## Context

The pilot places a human operator at two points **inside the request path**:

1. **Render review (FR-027 / FEAT-006):** every render waits in `pending_review` until an operator approves it. Three problems: **(a) privacy** — a human views every user's room photo and render, in tension with "private by default" (BR-33 / NFR-007 / ADR-019); review is pseudonymous (ADR-022) but a photo of a home is personal data in itself. **(b) Latency** — the 2–5 min render target (ADR-013 / NFR-001) becomes unbounded: the render waits until a human acts, and FEAT-006's operator console is DRAFT/PROPOSED with **no notification mechanism anywhere in the scaffold** — in practice, approval latency is "whenever someone polls `GET /operator/renders`". **(c) Availability** — the operator is a single point of failure.
2. **Order forwarding (FR-061):** paid orders stall in `paid_unforwarded` until an operator calls `POST /operator/orders/:id/forward`. Same polling, latency, and single-point-of-failure problems, now with the customer's money already captured.

Catalog curation is **not** part of this critique: the operator-approved catalog is what structurally guarantees "the AI never invents furniture" (BR-6 / BR-14 — the pipeline only composes from `candidateProductIds`), and it sits outside the request path.

## Decision

(Proposed.) Remove both human gates from the request path:

- **Automated render QA:** the render worker validates each pipeline result programmatically (items ⊆ candidate list, products still approved/complete/in-stock, image present in storage, tag coordinates in bounds, total within budget + 10% tolerance per ADR-008) and **auto-publishes** on pass (`auto_approved`) or rejects with a reason on fail. No human sees the render.
- **Post-hoc moderation:** a user-facing **Report** action (`POST /renders/:id/report`) replaces pre-publication review. An open report blocks cart confirmation/checkout for that render and places it in an operator **remediation queue** — a human looks at a render only when its owner explicitly asks (which doubles as consent).
- **Automated order forwarding:** checkout enqueues a forwarding job that sends each `PurchaseOrder` to its supplier through a `SupplierNotifier` interface (templated email in the pilot; fake implementation for dev/test, mirroring `FakePaymentGateway`). Retries with backoff; on repeated failure the PO is marked `forward_failed` and escalated to the operator queue as a fallback.

Humans move from **gatekeepers** (in the path, blocking) to **exception handlers** (off the path, responding to reports and failures). Full detail and scaffold mapping: [`docs_en/proposals/ADR-023_automated_pilot_build_plan.md`](../proposals/ADR-023_automated_pilot_build_plan.md).

Scope: one-week iOS pilot (v1). Confidence-based routing is explicitly **deferred to v2**.

## Alternatives considered

1. **Keep FEAT-006 as specified (human pre-publication gate).**
   - Pros: strongest protection against the top risk (render fidelity, PRD §10) reaching a user; zero automation to build; human judgment on believability, which programmatic checks cannot evaluate.
   - Cons: the privacy, latency, availability, and missing-infrastructure problems above; the operator console + notification system it silently requires is itself unbuilt work.
2. **Confidence-based routing (hybrid).** Pipeline returns a confidence score; high-confidence renders auto-publish, low-confidence ones go to a human.
   - Pros: best long-term shape — automation where it is safe, humans where it is not; the human decisions calibrate the threshold over time.
   - Cons: requires a calibrated confidence signal that does not exist yet, plus both the automated path *and* the operator console. Too much for the pilot timeline. **Deferred to v2** (see build plan §7).
3. **Full automation + Report button (this proposal).**
   - Pros: resolves privacy (no human views renders by default), latency (publish at pipeline speed), and availability; requires no operator console on the happy path; the report flow generates labeled failure data for v2.
   - Cons: a low-fidelity render can reach a user before anyone intervenes — accepted and mitigated (small briefed pilot cohort, checkout block on report, reports-per-render counter-metric; build plan §6).

## Positive consequences

- Renders are seen by no human unless the user reports one — a materially stronger implementation of "private by default" (NFR-007 / ADR-019) than pseudonymous mandatory review.
- End-to-end latency becomes the pipeline's own 2–5 min target (ADR-013) with no unbounded human wait; paid orders reach suppliers in seconds instead of stalling in `paid_unforwarded`.
- The unbuilt operator console + notification system stops being a launch dependency; operator endpoints are repurposed as a remediation/fallback queue.
- Reports and forwarding failures produce exactly the labeled data v2's confidence-based routing needs.

## Negative consequences

- The top product risk (render fidelity, PRD §10) is no longer caught before display; a bad render can reach a pilot user and cost trust or a purchase. Mitigations in build plan §6; residual risk is accepted for a small, briefed cohort.
- Programmatic validation checks integrity (real SKUs, bounds, budget), not *believability* — the one judgment the human gate uniquely provided.
- Automated supplier email introduces deliverability/monitoring work that manual forwarding did not have.
- render-to-purchase readings must now be interpreted alongside the reports-per-render rate to stay comparable with the human-gated design.

## Date

2026-07-13.
