# ADR-012 - Catalog synchronization frequency

## Status

Accepted.

## Context

The PRD reserves catalog synchronization frequency as a human decision (PRD §12, "Human definitions": "Catalog synchronization frequency"). Nothing is built yet.

What the PRD states:

- Supplier data must synchronize regularly, or in real time for ready-made stock (BR-32; FR-060). The exact cadence is TBD.
- Ready-made items require current stock data and must never be rendered when unavailable (BR-4; FR-018); made-to-order items rely on supplier-declared lead times (BR-5).
- Price and stock must be revalidated at checkout (FR-041; BR-24), which is a safety net that depends on how fresh the synced data is.
- Accurate supplier catalog data is a documented dependency, and supplier data reliability is a documented risk (PRD §10).
- Synchronization is closely tied to ingestion channels (ADR-006): real-time sync is easier over API/software integration than Excel/FTP batch.

Pilot context: the pilot's catalog is manually curated with real, in-stock items (Pilot, "The human's role"; FR-056), and automated sync (FR-060) is not in the pilot's included set, so freshness is operator-managed. This is a full-product decision.

## Decision

Adopted for the pilot: manual / on-demand refresh by the operator. No automated sync in the pilot.

Scope: one-week iOS pilot.

## Alternatives considered

1. **Real-time (event/webhook-driven) sync for ready-made stock + periodic batch for the rest.**
   - Pros: Directly satisfies BR-32 ("real time for ready-made stock"); minimizes rendering/selling unavailable items (BR-4); strongest trust.
   - Cons: Requires suppliers/channels that can push events (ties to ADR-006); more infrastructure; not all suppliers can support it.

2. **Scheduled polling at a fixed interval (e.g., every few minutes/hours) for all data.**
   - Pros: Simple and uniform; works with API and file-based channels; predictable load.
   - Cons: Stock can be stale between polls, increasing checkout revalidation failures (BR-24); "real time for ready-made" (BR-32) not truly met.

3. **Near-real-time for all data (frequent polling or streaming for everything).**
   - Pros: Freshest overall; simplest mental model (everything current).
   - Cons: Highest cost and load; overkill for slow-changing fields like dimensions or warranty (BR-1).

4. **Manual / operator-managed sync (pilot approach) as interim.**
   - Pros: Guarantees accuracy for a small curated catalog; no infrastructure; matches the pilot.
   - Cons: Does not scale (NFR-016); not a synchronization mechanism (FR-060); interim only.

(The right answer likely differs by field: stock needs the freshest cadence; slow-changing attributes tolerate batch. Cadence choice depends on ingestion channels — ADR-006.)

## Positive consequences

- A resolved cadence keeps availability accurate, upholding "never render unavailable ready-made stock" (BR-4; FR-018) and reducing checkout revalidation failures (BR-24).
- Matching cadence to field volatility (fast for stock, slower for static attributes) controls cost while protecting trust.

## Negative consequences

- Too infrequent sync causes stale stock/prices, leading to disappointed buyers and revalidation failures (BR-24) — feeding the supplier-data-reliability risk (PRD §10).
- Too aggressive sync raises infrastructure cost and load for little benefit on slow-changing data; feasible cadence is constrained by the ingestion channels chosen in ADR-006.

## Date

2026-07-10.
