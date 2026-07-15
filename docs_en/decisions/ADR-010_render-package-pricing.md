# ADR-010 - Render-package pricing

## Status

Accepted. **Update (ADR-026, 2026-07-14):** the cost-recovery rationale below shifts — with the render engine now self-hosted (FLUX.2 Klein 4B via mflux, ADR-026), the per-render marginal cost is near-zero local compute rather than a metered third-party call, so the inference-cost pressure that a paid package would offset is weaker post-pilot (the cost that remains is render-host hardware/capacity, not per-render vendor fees). The not-offered-in-the-pilot decision is unchanged.

## Context

The PRD reserves render-package pricing as a human decision (PRD §12, "Human definitions": "Render-package pricing"). Nothing is built yet.

What the PRD states:

- Rendering is free up to a configurable daily limit; users may buy additional render packages after reaching the limit (PRD §9, "Render packages"; §3 "Could have": "Paid render packages").
- After reaching the daily limit, the user may return the next day or buy a render package (FR-050; BR-21).
- This is a secondary monetization and cost-recovery lever tied to the inference-cost risk (PRD §10) and cost tracking (NFR-005).

Pilot context: **paid render packages are excluded from the pilot** (Pilot, "Excluded from the pilot"; Scope Cuts). This ADR depends on the daily-render-limit decision (ADR-009) and on real per-render cost data (NFR-005), so it is best decided after those exist.

This ADR should decide whether to offer paid packages at all, and if so the packaging and price structure. No amounts are proposed here — pricing is human-reserved.

## Decision

Not offered in the pilot (deferred). No paid render packages. Scope: one-week iOS pilot.

## Alternatives considered

1. **Pay-per-render (buy single additional renders).**
   - Pros: Simple; user pays only for what they use; easy to map to per-render cost (NFR-005).
   - Cons: Friction at each purchase; small transactions; may feel nickel-and-dime.

2. **Bundled packages (buy a pack of N renders at a per-render discount).**
   - Pros: Fewer transactions; encourages continued exploration; matches the PRD's "render packages" language (PRD §9).
   - Cons: Requires balance/credit tracking; users may over- or under-buy.

3. **Subscription (unlimited or high monthly render allowance).**
   - Pros: Predictable recurring revenue; removes per-render friction for power users.
   - Cons: Risks unbounded inference cost for heavy users unless capped (PRD §10); may not suit an occasional-use, purchase-driven product.

4. **No paid packages at launch (free limit only; return next day).**
   - Pros: Simplest; avoids monetizing exploration before render-to-purchase is proven; matches the pilot's exclusion.
   - Cons: Leaves the after-limit path as return-next-day only (still valid per BR-21); no cost recovery from heavy non-buyers.

## Positive consequences

- A resolved package model gives a cost-recovery path for users who exceed the free limit, directly addressing the inference-cost risk (PRD §10).
- Pricing grounded in measured per-render cost (NFR-005) and conversion (NFR-006) keeps the mechanism economically sound rather than arbitrary.

## Negative consequences

- Charging for renders before the render-to-purchase loop is proven could suppress exploration and hurt the primary metric.
- Pricing is coupled to the daily-limit decision (ADR-009), commission economics (ADR-007), and multi-currency display (FR-046); setting it prematurely risks misalignment.

## Date

2026-07-10.
