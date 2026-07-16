# ADR-016 - Supplier partners & onboarding terms

## Status

Accepted.

## Context

The PRD reserves supplier partners, supplier onboarding terms, and supplier contracts as human decisions (PRD §12, "Human definitions": "Supplier onboarding terms," "Supplier contracts," "Supplier partners"). Nothing is built yet (point-in-time context as of this decision, 2026-07-10; 2026-07-15: a working web app + backend are now built and verified locally — see ADR-024+ and the current-system summary — so this reads as historical, not a present-tense claim).

Why this matters:

- Local suppliers' catalogs power the entire marketplace (PRD §5, "User type 2"); a giving them a digital sales channel is a core value proposition (PRD §1, §2).
- Two-sided cold start is a documented risk: insufficient supplier coverage produces poor results for specific styles, budgets, or locations (PRD §10). The assumption of "enough local catalog coverage" (PRD §11) depends on which suppliers join.
- Suppliers provide the required catalog attributes (BR-1; FR-057), stock classification and lead times (BR-3–BR-5; FR-058), supplier-declared warranty (BR-18; FR-038) and delivery/production estimates (BR-17; FR-036), and delivery coverage/zones (FR-013, FR-020; BR-11).
- Onboarding terms interact with commission (ADR-007), sponsored placement (ADR-017), ingestion channels (ADR-006), and merchant-of-record (ADR-004).

Pilot context: the pilot uses a **small manually curated catalog from a few local suppliers** in Bogotá, curated and approved by an operator (Pilot, "Included"; "The human's role"; FR-056). The specific pilot suppliers and the general partner strategy/terms remain human decisions.

## Decision

Hand-pick 2-4 Bogotá suppliers with a one-page written agreement covering commission, lead times, and warranty. This is a business task, done manually.

Scope: one-week iOS pilot.

## Alternatives considered

1. **A few hand-picked "anchor" suppliers with close, curated onboarding (pilot-style).**
   - Pros: Ensures clean, complete, real, in-stock catalog data (BR-1, BR-6); fastest to a believable render; matches the pilot; strong relationships.
   - Cons: Limited breadth/styles/price ranges (cold-start risk, PRD §10); dependency on few partners; not yet scalable (NFR-016).

2. **Broad open onboarding (many suppliers self-serve).**
   - Pros: Maximizes breadth and coverage quickly; scales by region (NFR-016).
   - Cons: Data quality and completeness harder to guarantee (BR-1, BR-2); needs ingestion infrastructure (ADR-006) and strong curation; higher risk of bad renders.

3. **Hybrid: anchor suppliers first, then progressively open onboarding.**
   - Pros: Balances quality (anchors) with future breadth; aligns with phased launch (PRD §11) and market sequencing (ADR-015).
   - Cons: Two operating modes to manage; timing of the transition must be decided.

4. **Onboarding-terms options: commission-only vs. listing/subscription fees vs. SLA-based terms.**
   - Pros (commission-only): Low barrier to join (helps coverage); aligns Spazio's revenue with supplier sales (BR-28; ADR-007).
   - Cons (commission-only): No revenue from non-selling suppliers; SLA enforcement (stock accuracy, lead times) needs separate mechanisms.
   - Pros (SLA-based): Enforces data reliability (addresses PRD §10 supplier-data risk).
   - Cons (SLA-based): Higher barrier; harder to negotiate with small local suppliers.

## Positive consequences

- Choosing partners with strong local coverage and clean data directly mitigates cold start (PRD §10) and supports the catalog-completeness bar (ADR-014).
- Clear onboarding terms and contracts set expectations on stock accuracy, lead times, and warranty (BR-1, BR-17, BR-18), improving buyer trust and reducing disputes (ADR-020).

## Negative consequences

- Too few or too narrow partners limits styles/budgets/localities and worsens cold start (PRD §10); too open an approach risks poor data quality and bad renders (BR-1, BR-2).
- Terms interact with commission (ADR-007), merchant-of-record (ADR-004), and ingestion (ADR-006); setting them in isolation risks misalignment and supplier churn.

## Date

2026-07-10.
