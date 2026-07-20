# ADR-013 - Render-time target

## Status

Accepted. **Update (ADR-025, 2026-07-14):** the operator render-review step (FR-027) referenced below is retired; renders are published immediately on generation success (ADR-025), so operator-review time no longer adds to the user-perceived render time. The ~2–5 minute soft target and the no-hard-SLA decision stand. **Update (BUG-004, 2026-07-16):** a measured worst-case render — 3 reference products on the demo's M2 host — takes **~10.3 min**, beyond the ~2–5 min soft figure; because this ADR set a soft target with **no hard SLA**, nothing here changes. The backend's 15-min hard cap (BUG-004) is a hang backstop, not an SLA; the measurement itself is recorded in NFR-001 and `10_release_notes.md`.

## Context

The PRD reserves the render-time target as a human decision (PRD §12, "Human definitions": "Render-time target"). Nothing is built yet (point-in-time context as of this decision, 2026-07-10; 2026-07-15: a working web app + backend are now built and verified locally — see ADR-024+ and the current-system summary — so this reads as historical, not a present-tense claim).

What the PRD states:

- Typical single-room renders should complete within **approximately 2–5 minutes** (PRD §7, "Performance"; NFR-001). The 2–5 minute figure is a **PRD-stated target**, not a locked commitment.
- Targeted edits should complete faster than full renders (NFR-002; FR-052).
- The objective is to let a user generate a purchasable design "in minutes" (PRD §2).
- Render time trades off against inference cost and fidelity: the PRD asks for a global inference-cost threshold, graceful degradation via queueing or slower rendering when thresholds are exceeded, and per-render cost tracking (PRD §7; NFR-003, NFR-004, NFR-005). Render fidelity is the highest risk (PRD §10).

Pilot context: the rendering pipeline is set up on Day 1 and renders are human-reviewed before reaching the user (Pilot; FR-027), which adds operator time on top of machine render time. A workable target matters even in the pilot, but the formal NFR target is a full-product decision.

## Decision

Adopt a ~2-5 minute soft target for a single-room render (PRD §7); NO hard SLA in the pilot (operator-review time is additional). Scope: one-week iOS pilot.

## Alternatives considered

1. **Adopt the PRD target of ~2–5 minutes for a single-room render (to be confirmed).**
   - Pros: Matches NFR-001 and the "in minutes" goal (PRD §2); realistic for a compositing/inpainting pipeline; balances quality and wait.
   - Cons: Several minutes is a long wait in-app; must be paired with clear progress UX; operator review (FR-027) adds further delay in the pilot.

2. **Aggressive fast target (e.g., under ~1 minute).**
   - Pros: Snappier experience; supports more exploration within the daily limit (FR-048).
   - Cons: May force lower fidelity or higher cost per render (NFR-003, NFR-005); risks the highest-risk area (render fidelity, PRD §10).

3. **Asynchronous "notify when ready" (longer wall-clock time acceptable, user is pinged).**
   - Pros: Decouples quality/cost from perceived wait; naturally supports queueing under load (NFR-004); fits operator review in the pilot.
   - Cons: Breaks same-session immediacy, which the render-to-purchase metric assumes (purchase "in the same session," Pilot); requires notifications and re-engagement.

4. **Tiered: fast low-res preview first, then a slower high-fidelity final render.**
   - Pros: Gives instant feedback and preserves final quality; good perceived performance.
   - Cons: Two-stage pipeline is more to build; risk of mismatch between preview and final; more compute overall.

## Positive consequences

- A resolved target sets a clear performance bar for the pipeline (ADR-002) and lets the team design UX (progress, async) and cost controls (NFR-003, NFR-004) around it.
- Choosing with the same-session purchase goal in mind protects the render-to-purchase metric (NFR-006).

## Negative consequences

- Too aggressive a target can push the pipeline toward lower fidelity or higher cost — worsening the top risk (PRD §10) or the inference-cost risk.
- Too slow a target (or async) can break the same-session flow the primary metric depends on; the target is inseparable from the pipeline choice (ADR-002) and cost thresholds.

## Date

2026-07-10.
