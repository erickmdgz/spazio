# ADR-009 - Daily free-render limit

## Status

Proposed.

## Context

The PRD reserves the daily free-render limit as a human decision (PRD §12, "Human definitions": "Daily free-render limit"). Nothing is built yet.

What the PRD states:

- Free render usage is configurable, "**defaulting to five** attempts per user per day" (BR-19). The value five is a **PRD-stated default**, not a final decision.
- The system enforces a configurable daily free-render limit per user (FR-048; BR-19); every generation or edit counts as one attempt (FR-049; BR-20); after the limit, the user may return the next day or buy a render package (FR-050; BR-21).
- This is a cost-control mechanism: rendering is compute-intensive, and the PRD calls for a global inference-cost threshold, graceful degradation, per-render cost tracking, and tracking render-to-purchase from day one (PRD §7; NFR-003, NFR-004, NFR-005, NFR-006). The inference-cost risk is explicit (PRD §10).

Pilot context: **daily render limits are excluded from the pilot** (Pilot, "Excluded from the pilot"; Scope Cuts note they are "scale, monetization, and cost-control mechanisms"). So this is a full-product decision, informed by pilot cost data once available.

This ADR should decide the default limit value and the metering model; the render-package option that follows the limit is covered in ADR-010.

## Decision

PENDING - to be decided by the team.

## Alternatives considered

1. **Fixed N free renders per day per user (e.g., the PRD default of five, to be confirmed).**
   - Pros: Simple to communicate and enforce (FR-048); matches BR-19; predictable daily cost ceiling per user.
   - Cons: A flat number ignores actual cost per render and conversion; may be too generous (cost) or too stingy (hurts exploration and conversion).

2. **Weekly or rolling-window allowance instead of strict daily.**
   - Pros: Lets users concentrate exploration when they need it; smoother experience.
   - Cons: Diverges from the "per day" framing (BR-19); slightly harder to reason about; potential for bursty cost.

3. **Credit / token model where different actions cost different amounts.**
   - Pros: Can price full renders vs. targeted edits differently (a targeted edit is cheaper — NFR-002) rather than counting each as one attempt (BR-20); aligns cost with usage.
   - Cons: More complex UX and accounting; changes the "every generation or edit counts as one" rule (BR-20), which would need human sign-off.

4. **Dynamic limit tied to the global inference-cost threshold.**
   - Pros: Directly protects the cost ceiling (NFR-003, NFR-004); adapts to real spend.
   - Cons: Unpredictable for users; harder to explain; needs reliable per-render cost tracking (NFR-005) first.

## Positive consequences

- A resolved limit protects against the inference-cost risk (PRD §10) while giving users enough free renders to reach purchase (protecting render-to-purchase, NFR-006).
- Setting it after pilot cost data (NFR-005) grounds the number in real economics rather than a guess.

## Negative consequences

- Set too low, the limit frustrates genuine exploration and can suppress conversion; set too high, it exposes Spazio to rendering cost without offsetting revenue (PRD §10).
- The choice interacts with the counting rule (BR-20) and with render-package pricing (ADR-010) and commission economics (ADR-007); it should not be set in isolation.

## Date

TBD.
