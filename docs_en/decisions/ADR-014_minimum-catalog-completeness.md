# ADR-014 - Minimum catalog completeness

## Status

Accepted. **Scoped by ADR-027 (2026-07-15):** the BR-1 per-SKU completeness gate here is **unchanged for the supplier track**. For the `source=public` bootstrap track (Amazon Berkeley Objects, CC BY 4.0), the **preferred path keeps this gate** by seeding only **complete** ABO records (all BR-1 fields present) so it holds **with no waiver**; only if complete records cannot be assembled is a **documented relaxed completeness profile for `source=public` products** acceptable, and even then those products stay display-only and clearly labeled. See `decisions/ADR-027_public-catalog-bootstrap-fallback.md`.

## Context

The PRD reserves minimum catalog completeness as a human decision (PRD §12, "Human definitions": "Minimum catalog completeness"). Nothing is built yet (point-in-time context as of this decision, 2026-07-10; 2026-07-15: a working web app + backend are now built and verified locally — see ADR-024+ and the current-system summary — so this reads as historical, not a present-tense claim).

Two related meanings are in play, both grounded in the PRD:

- **Per-SKU completeness:** catalog entries must include the full required attribute set — photos, dimensions, price, colors, materials, stock, category, style attributes, lead time, warranty (BR-1; FR-057) — and incomplete entries are excluded from rendering (BR-2; FR-019). Products must be classified as in-stock ready-made or made-to-order with the right stock/lead-time data (BR-3, BR-4, BR-5; FR-058) and mapped to the style taxonomy (BR-16; FR-059).
- **Market/catalog breadth:** enough coverage across styles, budgets, and localities for the render to succeed. Two-sided cold start is a documented risk: insufficient supplier coverage may produce poor results for specific styles, budgets, or locations (PRD §10). The assumption "initial launch markets have enough local catalog coverage" (PRD §11) is exactly what this decision must make concrete.

Pilot context: the pilot manually loads approximately **30–60 clean SKUs** with photo, price, dimensions, stock, and style tag (Pilot, "One-week plan," Day 1), curated and approved by an operator (FR-056). This gives a concrete pilot-level bar, though the general minimum-completeness policy is human-reserved.

## Decision

Adopted for the pilot: a SKU is renderable only if ALL PRD BR-1 fields are present (photos, dimensions, price, colors, materials, stock, category, style attributes, production/delivery lead time, warranty). The operator enforces this on load.

Scope: one-week iOS pilot.

## Alternatives considered

1. **Per-SKU required-field gate (a SKU is render-eligible only if all required BR-1 fields are present and valid).**
   - Pros: Directly enforces BR-1/BR-2 (FR-019); ensures every rendered/tagged product has price, supplier, warranty, dimensions, stock; protects render scale and trust (BR-7, FR-028).
   - Cons: Strict gating may exclude many SKUs early, worsening breadth and cold start (PRD §10); needs clear validation rules per field.

2. **Market-level breadth threshold (minimum number of SKUs per category / price band / style / delivery zone before a market goes live).**
   - Pros: Attacks cold-start risk directly (PRD §10); makes the "enough coverage" assumption (PRD §11) measurable per market (ties to ADR-015).
   - Cons: Harder to define and measure; may delay launches; depends on supplier partners (ADR-016) and taxonomy (ADR-005).

3. **Phased thresholds (a low bar for pilot, e.g., 30–60 SKUs; a higher bar for general availability).**
   - Pros: Matches the pilot's stated 30–60 SKUs while allowing a stricter GA bar; pragmatic.
   - Cons: Two standards to maintain and communicate; risk of the "pilot" bar leaking into GA.

4. **Quality-score gate (weighted score over completeness + image quality + data freshness) rather than a hard field checklist.**
   - Pros: Flexible; can admit strong-but-imperfect SKUs and rank matching (FR-014); tolerant of minor gaps.
   - Cons: More complex; risks admitting SKUs that violate BR-1's hard requirements; needs human-approved scoring.

(Per-SKU and market-breadth thresholds are complementary and can both be adopted.)

## Positive consequences

- A resolved per-SKU bar guarantees every rendered/tagged item carries the data users rely on — price, delivery, warranty, scale (FR-028, NFR-015, BR-7) — protecting trust and the render-to-purchase metric.
- A resolved breadth bar per market makes the cold-start risk (PRD §10) and the coverage assumption (PRD §11) measurable before launch.

## Negative consequences

- Too strict a bar starves the catalog and worsens cold start (PRD §10) and unsatisfied budgets (FR-022; BR-10); too loose a bar lets incomplete SKUs degrade renders and violate BR-1/BR-2.
- Breadth thresholds depend on supplier partners (ADR-016), taxonomy (ADR-005), and target markets (ADR-015); this decision should be coordinated with those.

## Date

2026-07-10.
