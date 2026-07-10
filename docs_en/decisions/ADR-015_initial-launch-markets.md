# ADR-015 - Initial launch markets

## Status

Proposed.

## Context

The PRD reserves initial markets as a human decision (PRD §12, "Human definitions": "Initial markets"). Nothing is built yet.

What the PRD and pilot state:

- The architecture should support multiple countries and currencies, with taxes, payment methods, and legal requirements configured per market (PRD §7; NFR-017, NFR-018). Launch is expected to be phased (PRD §11).
- The system determines applicable suppliers and delivery zones from the user's location (FR-012, FR-013), restricts rendering to products deliverable to the locality (FR-020; BR-11), and displays prices in the local currency (FR-046; BR-27).
- Documented assumptions: the architecture can support multiple countries while launch remains phased, and initial launch markets have enough local catalog coverage (PRD §11). Multi-country complexity (taxes, payment rails, consumer protection, legal) is a documented risk (PRD §10).
- **Pilot:** one city and one delivery zone — **Bogotá** — and one currency — **COP** (Pilot, "Included"; Scope Cuts). This is the pilot's chosen scope, not a decided long-term market set.

This ADR is about which market(s) to launch beyond the pilot, and in what order. Bogotá/COP is stated for the pilot; the broader initial-markets decision is human-reserved.

## Decision

PENDING - to be decided by the team.

## Alternatives considered

1. **Continue in Bogotá only (extend the pilot city) before expanding.**
   - Pros: Reuses pilot suppliers, delivery zone, and COP setup; lowest added complexity; lets the local loop mature before multi-market risk (PRD §10).
   - Cons: Limited market size; delays learning about multi-currency/multi-tax handling (NFR-017, NFR-018).

2. **Single country, multiple cities (e.g., expand within Colombia).**
   - Pros: One currency, one legal/tax regime; tests multi-delivery-zone logic (FR-013, FR-020) with limited legal complexity; supplier onboarding scales by region (NFR-016).
   - Cons: Requires supplier coverage in each new city (cold-start risk, PRD §10); catalog-completeness thresholds per city (ADR-014).

3. **Multiple countries early.**
   - Pros: Exercises the full i18n architecture (currencies, taxes, payment rails) sooner; larger addressable market.
   - Cons: Directly incurs the multi-country complexity risk (PRD §10) — taxes, payment rails, consumer protection, split-settlement availability (ADR-003, ADR-004, ADR-018); heaviest legal/compliance load.

## Positive consequences

- A resolved market plan lets localization, delivery-zone, currency, tax, and legal configuration (FEAT localization; ADR-018, ADR-019) be built for concrete, known markets rather than in the abstract.
- Sequencing markets by catalog readiness (ADR-014) and supplier coverage (ADR-016) reduces cold-start risk (PRD §10).

## Negative consequences

- Expanding before catalog coverage is sufficient triggers the cold-start risk (PRD §10) and unsatisfied-budget outcomes (FR-022; BR-10).
- Each new country multiplies tax, payment-rail, consumer-protection, and split-settlement complexity (PRD §10), coupling this decision tightly to ADR-003, ADR-004, and ADR-018.

## Date

TBD.
