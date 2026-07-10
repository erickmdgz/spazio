# ADR-005 - Style taxonomy

## Status

Proposed.

## Context

The PRD reserves the style taxonomy as a human decision (PRD §12, "Human definitions": "Style taxonomy"). Nothing is built yet.

The taxonomy is central to matching and rendering:

- Products must be mapped to a shared style taxonomy (BR-16; FR-059), and users select a predefined visual style (FR-007) or describe one in free text (FR-008). The system matches SKUs to style, dimensions, budget, and locality (FR-014) before rendering.
- The canonical data model includes a `StyleTaxonomy` entity described as "the shared classification mapping products and user style choices to a common vocabulary (BR-16); values TBD by humans," plus a `Style` entity for user-selectable styles.
- Most users lack formal design vocabulary and style selection should be visual (PRD §5, "User context"); usability requires minimal-step style entry (NFR-013).
- The AI interprets visual styles and natural-language descriptions (PRD §12, "AI role"), so the taxonomy must be something both the matching logic and suppliers can apply consistently.
- Pilot scope uses **one or two predefined visual styles** plus optional free text (Pilot, "Included"), so the pilot needs only a minimal seed, not the full taxonomy.

The actual taxonomy values (the specific styles and how they are organized) are reserved for humans and must not be invented here.

## Decision

PENDING - to be decided by the team.

## Alternatives considered

1. **Small curated flat list of named styles (e.g., a fixed set of visual styles).**
   - Pros: Simple for users to pick visually (NFR-013) and for operators to map products (FR-059); enough for the one-or-two-style pilot.
   - Cons: Limited expressiveness; may not capture combinations or nuances users describe in free text (FR-008); harder to extend cleanly later.

2. **Hierarchical / faceted taxonomy (style families with sub-styles, plus facets like color, material, era).**
   - Pros: Richer matching to SKU attributes (colors, materials — BR-1); scales as the catalog grows; supports more precise budget/style matching (FR-014).
   - Cons: More effort to define and to map every product (BR-16); risk of over-engineering before the core loop is proven.

3. **Tag-based / free-form vocabulary backed by embeddings or synonyms.**
   - Pros: Handles natural-language descriptions (FR-008) flexibly; can grow organically.
   - Cons: Harder to keep consistent across suppliers and operators; "shared taxonomy" (BR-16) becomes fuzzier; quality control burden.

4. **Adopt/adapt an existing industry style taxonomy.**
   - Pros: Saves definition work; may align with supplier catalogs; battle-tested vocabulary.
   - Cons: May not fit local markets or Spazio's rendering needs; licensing/fit unknown; still needs human approval.

## Positive consequences

- A resolved taxonomy gives suppliers, operators, and the matching/render logic one shared vocabulary, improving match quality (FR-014) and the render-to-purchase metric.
- A well-structured taxonomy keeps style selection simple for users (NFR-013) while remaining extensible as catalog and markets grow.

## Negative consequences

- Too coarse a taxonomy weakens matching and free-text interpretation; too fine a taxonomy raises the mapping burden on suppliers/operators (BR-16, FR-059) and may stall catalog onboarding.
- Because products are mapped to it (BR-16), later restructuring means re-tagging the catalog — costly once suppliers are onboarded.

## Date

TBD.
