# ADR-017 - Sponsored-placement plan & pricing

## Status

Proposed.

## Context

The PRD reserves the sponsored-plan pricing as a human decision (PRD §12, "Human definitions": "Sponsored-plan pricing"). Nothing is built yet.

What the PRD states:

- Suppliers may pay for premium visibility (PRD §9, "Sponsored supplier visibility"), a secondary revenue stream after commission.
- Sponsored placement may only break ties among similarly relevant and high-quality products (BR-29; FR-054) and must never override relevance, product quality, budget, locality, or availability (BR-30; PRD §9; FR-054).
- The canonical `SponsoredPlacement` entity is "a paid premium-visibility record usable only to break ties among similarly relevant products."

Pilot context: sponsored placement is not part of the pilot (the pilot has a small curated catalog and focuses only on render-to-purchase). This is a full-product monetization decision that depends on having enough catalog breadth for ties to occur and enough suppliers to sell placements to (ADR-016).

This ADR should decide whether to offer sponsored placement at launch and, if so, the plan/pricing model — while preserving the strict tie-breaker-only constraint (BR-29, BR-30).

## Decision

PENDING - to be decided by the team.

## Alternatives considered

1. **No sponsored placement at launch (defer monetization of visibility).**
   - Pros: Keeps ranking purely relevance/quality/budget/locality/availability driven; simplest; avoids trust risk while the core loop is unproven.
   - Cons: Forgoes a stated secondary revenue stream (PRD §9).

2. **Cost-per-click (CPC) on sponsored tie-break placements.**
   - Pros: Suppliers pay only for engagement; measurable; scales with usage.
   - Cons: Requires click tracking and anti-abuse; only applies where ties exist (BR-29), so inventory is limited.

3. **Cost-per-impression (CPM) / flat monthly premium-visibility fee.**
   - Pros: Predictable supplier cost and Spazio revenue; simple to sell.
   - Cons: Weaker link to actual value delivered; must still respect tie-break-only rule (BR-30).

4. **Auction for tie-break priority.**
   - Pros: Market-priced; maximizes revenue where demand exists.
   - Cons: Most complex; risk of appearing to compromise neutrality unless the BR-29/BR-30 guardrails are strictly enforced and visible.

(Any model must enforce that sponsorship only breaks ties among already-qualified products and never overrides relevance, quality, budget, locality, or availability — BR-29, BR-30, FR-054.)

## Positive consequences

- A resolved model adds a secondary revenue stream (PRD §9) without compromising match quality, as long as the tie-break-only rule is enforced.
- Deferring or scoping it carefully protects the render-to-purchase metric and user trust while the core loop is validated.

## Negative consequences

- Any model that appears to bias results beyond genuine tie-breaks would violate BR-29/BR-30 and erode trust — the mechanism must be provably constrained.
- Revenue depends on catalog breadth (enough ties) and supplier demand (ADR-016); introduced too early it adds complexity for little return.

## Date

TBD.
