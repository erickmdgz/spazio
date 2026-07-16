# ADR-020 - Warranty & dispute-resolution rules

## Status

Accepted.

## Context

The PRD reserves warranty rules and dispute resolution as human decisions (PRD §12, "Human definitions": "Warranty rules," "Dispute resolution"). Nothing is built yet (point-in-time context as of this decision, 2026-07-10; 2026-07-15: a working web app + backend are now built and verified locally — see ADR-024+ and the current-system summary — so this reads as historical, not a present-tense claim).

What the PRD states:

- Warranty terms must be supplier-declared and displayed before checkout (BR-18; FR-038); warranty information is shown per item (PRD §3 "Must have"; FR-010). Delivery time and warranty strongly influence purchase decisions (PRD §5, "User context").
- Production and delivery estimates come from supplier data and are shown before checkout (BR-17; FR-036).
- **Documented risks:** render fidelity is the highest risk — a poor match could increase returns and disputes (PRD §10); and delivery times and warranty information depend on supplier accuracy (PRD §10, "Supplier data reliability").
- Dispute and warranty responsibility depends on the merchant-of-record model (ADR-004) and on supplier onboarding terms/contracts (ADR-016).

Pilot context: **warranty display is excluded from the pilot**, and fulfillment is handled manually by an operator (Pilot, "Excluded from the pilot"; FR-061). The pilot still shows price and estimated delivery/production time per item (Pilot, "Included"). Formal warranty and dispute policy is human-reserved and needs legal/operational input. This ADR frames the choice.

## Decision

The pilot does NOT display warranty (out of pilot); suppliers' own warranty terms apply; disputes are handled MANUALLY by the operator.

Scope: one-week iOS pilot. Revisit before scale; formal warranty and dispute-resolution policy needs legal / consumer-protection review (this is an operational pilot bridge, not a settled consumer-protection policy; depends on ADR-004 merchant-of-record, ADR-016 supplier contracts, and ADR-019 consumer-protection law).

## Alternatives considered

1. **Supplier-owned warranty and disputes; Spazio passes through supplier-declared terms.**
   - Pros: Matches BR-18 (supplier-declared warranty) and supplier-sourced estimates (BR-17); lighter liability for Spazio; aligns if suppliers are merchant of record (ADR-004).
   - Cons: Fragmented buyer experience across suppliers for a single payment (FR-042); resolution quality depends on each supplier (PRD §10 risk); weaker trust.

2. **Spazio-mediated resolution (Spazio coordinates disputes/returns between buyer and supplier).**
   - Pros: Single, consistent buyer touchpoint; better trust; Spazio can enforce supplier SLAs (ties to ADR-016).
   - Cons: Operational overhead; requires clear policies and staffing; ambiguous liability unless MoR is settled (ADR-004).

3. **Platform-guaranteed buyer protection (Spazio backs a return/refund guarantee).**
   - Pros: Strongest trust signal; can offset the render-fidelity risk (PRD §10) that drives returns; competitive differentiator.
   - Cons: Direct financial exposure for Spazio; needs reserves/insurance and strict supplier recourse; heaviest commitment.

4. **Hybrid / tiered (pass-through warranty + Spazio-mediated disputes within a defined window).**
   - Pros: Balances liability and trust; can start light and strengthen over time.
   - Cons: More rules to define and communicate; potential inconsistency.

## Positive consequences

- Clear warranty display (BR-18; FR-038) and dispute rules build the buyer trust that delivery/warranty visibility is meant to create (PRD §5), supporting conversion.
- A defined dispute path helps absorb the returns/disputes risk from render-fidelity issues (PRD §10) and supplier-data unreliability (PRD §10).

## Negative consequences

- The more Spazio guarantees, the more financial and operational exposure it takes on; the less it guarantees, the more fragmented and risky the buyer experience.
- Responsibility for warranty and disputes cannot be fixed without the merchant-of-record decision (ADR-004) and supplier contracts (ADR-016); it also depends on per-market consumer-protection law (ADR-019).

## Date

2026-07-10.
