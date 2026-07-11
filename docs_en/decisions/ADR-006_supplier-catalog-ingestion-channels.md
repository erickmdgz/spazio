# ADR-006 - Supplier catalog ingestion channels

## Status

Accepted.

## Context

The PRD reserves the supported ingestion channels as a human decision (PRD §12, "Human definitions": "Supported ingestion channels"). Nothing is built yet.

What the PRD states:

- Suppliers should be able to self-ingest catalog data through software integration, Excel, API, or FTP (PRD §3 "Must have"; FR-023 / FR-055). These four channels are listed as the target set, but which to support (and in what order) is TBD.
- Catalog entries must include a full required attribute set — photos, dimensions, price, colors, materials, stock, category, style attributes, lead time, warranty (BR-1; FR-057) — so any channel must carry these fields reliably.
- Supplier data must synchronize regularly, or in real time for ready-made stock (BR-32; FR-060) — related but handled separately in ADR-012.
- Supplier onboarding should scale by region (NFR-016).

Pilot context: the pilot uses a **small, manually curated catalog** and **excludes supplier self-service ingestion through API, FTP, or Excel automation** (Pilot, "Excluded from the pilot"; Scope Cuts). An operator curates and approves catalog entries by hand (FR-056; Pilot, "The human's role"). So the pilot needs no ingestion infrastructure; this ADR concerns the full product.

## Decision

Adopted for the pilot: the operator manually loads a spreadsheet (CSV/Excel) of 30-60 curated SKUs. No API/FTP/self-service ingestion in the pilot.

Scope: one-week iOS pilot.

## Alternatives considered

1. **Manual operator ingestion only (pilot approach) as the interim state.**
   - Pros: Guarantees clean, complete, real, in-stock entries (BR-1, BR-2, BR-6) for a small catalog; zero ingestion build; matches the pilot.
   - Cons: Does not scale by region (NFR-016); not a self-service channel (FR-023); only valid as an explicit interim step.

2. **Excel / CSV upload (with validation against the required attribute set).**
   - Pros: Low barrier for local suppliers who already keep spreadsheets; one of the four PRD-listed channels; easy to validate BR-1 completeness on import.
   - Cons: Batch, not real time; error-prone formatting; needs an import UI and validation rules; weak for real-time stock (BR-32).

3. **REST API integration.**
   - Pros: Best fit for real-time stock sync (BR-32; FR-060) and larger/tech-capable suppliers; a PRD-listed channel; scales.
   - Cons: Requires suppliers to have engineering capability; more to build, document, and secure; the AI is expected to define ingestion schemas/contracts (PRD §12), which must be approved.

4. **FTP batch drops.**
   - Pros: Familiar to some established suppliers; a PRD-listed channel; simple to operate.
   - Cons: Batch-only; file format and security concerns; least modern option.

5. **Prebuilt integrations with common e-commerce/inventory platforms ("software integration").**
   - Pros: Directly matches the "software integration" channel in FR-023; lowest supplier effort if they already use such a platform; can enable real-time stock.
   - Cons: Depends on which platforms local suppliers actually use (unknown until suppliers are chosen — ties to ADR-016); build cost per integration.

(These are not mutually exclusive; the decision is which channels to support and in what order.)

## Positive consequences

- Choosing channels that match how the initial suppliers actually operate (ADR-016) reduces onboarding friction and helps supplier onboarding scale by region (NFR-016).
- Channels that support real-time stock (API / software integration) reinforce the rule never to render unavailable ready-made stock (BR-4; FR-018), improving trust.

## Negative consequences

- Supporting all four channels at once is a large build for uncertain payoff before suppliers are chosen; picking the wrong channels wastes effort and slows onboarding.
- Every channel must enforce the full required attribute set (BR-1) and exclude incomplete entries from rendering (BR-2; FR-019), or catalog quality — a documented dependency and risk (PRD §10) — will suffer.

## Date

2026-07-10.
