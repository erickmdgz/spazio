# Functional requirements — Fallback Demo

This catalogs what the **fallback demo** must do, following the same rules as the main registry (`docs_en/03_requirements.md`): atomic FRs, fixed pattern, observable results, error paths, 1:1 criterion↔TC mapping. The fallback uses its own namespace `FR-F##` (see `README.md`); the main `FR-0##` registry is untouched.

**Status of every FR below: Proposed** (pending human approval). Priority reflects criticality to the 2-day demo.

## Requirements index

| ID | Requirement | Priority |
|---|---|---|
| FR-F01 | Capture the room type | High |
| FR-F02 | Capture approximate room dimensions | High |
| FR-F03 | Capture an optional budget and convey it to the composer as a constraint | Medium |
| FR-F04 | Fetch real products from The Home Depot per allowed furniture type | High |
| FR-F05 | Enrich shortlisted products with real specifications (dimensions, color) | High |
| FR-F06 | Compose 2–3 style-coherent proposals with an LLM (Ollama Cloud) | High |
| FR-F07 | Compute and display a fit summary; convey the footprint cap to the composer | High |
| FR-F08 | Resolve every displayed item against the fetched snapshot and never fabricate | High |
| FR-F09 | Constrain the catalog snapshot to room-appropriate, complete products | High |
| FR-F10 | Present proposals with per-item product data and a fit summary | High |

---

## FR-F01 — Capture the room type

**Actor:** Demo user · **Priority:** High · **Status:** Proposed
**Origin:** Fallback vision (`fallback/01_product_vision.md`); mirrors main FR-011's input pattern

### Description

The system shall, when a user submits a proposal request, capture one room type from the supported set (`living_room`, `dining_room`, `bedroom`, `office`) and persist it on the request.

### Acceptance criteria

- [ ] Given a supported room type, when the user submits, then the room type is persisted on the proposal request. → TC-F01
- [ ] Given a missing or unsupported room type, when the user submits, then the request is rejected with a `room-type-validation` error and no request is created. → TC-F02

### Business rules

- The supported set is the curated room-type map (see FR-F09); adding a room type is a human curation act, not an AI decision.

## FR-F02 — Capture approximate room dimensions

**Actor:** Demo user · **Priority:** High · **Status:** Proposed
**Origin:** Mirrors main FR-011 (PRD BR-7 spirit: dimensions drive fit), adapted to US units

### Description

The system shall, when a user submits a proposal request, validate approximate room width and length (feet, decimals allowed) and persist them on the request for footprint computation.

### Acceptance criteria

- [ ] Given positive width and length within sane bounds (each 4–60 ft, DRAFT), when the user submits, then the dimensions are persisted on the proposal request. → TC-F03
- [ ] Given a non-positive, non-numeric, or out-of-bounds dimension, when the user submits, then the request is rejected with a `dimension-validation` error and no request is created. → TC-F04

### Business rules

- Dimensions are approximate; they are used for the footprint constraint (FR-F07), not for rendering.
- Internal unit is inches (Home Depot specs are in inches); the UI accepts feet.

## FR-F03 — Capture an optional budget and convey it to the composer as a constraint

**Actor:** Demo user · **Priority:** Medium · **Status:** Proposed
**Origin:** Mirrors main FR-009 (budget input), simplified to a single maximum; enforcement model changed by stakeholder decision (ADR-F03: no post-validation layer)

### Description

The system shall, when a user optionally provides a maximum budget in USD, validate and persist it, include it as a constraint in the composition prompt, and display each proposal's total (recomputed from snapshot prices) alongside the budget.

### Acceptance criteria

- [ ] Given a positive numeric budget, when the user submits, then the budget is persisted on the proposal request. → TC-F05
- [ ] Given a negative or non-numeric budget, when the user submits, then the request is rejected with a `budget-validation` error and no request is created. → TC-F06
- [ ] Given a persisted budget, when proposals are produced, then the composition prompt contains the budget constraint and every displayed total is recomputed from snapshot prices (never taken from LLM output). → TC-F07

### Business rules

- Budget adherence is **best-effort by the LLM** (prompt rule 5): there is no post-validation gate (stakeholder decision, ADR-F03). The recomputed total displayed next to the budget makes any overrun visible to the user.
- If no budget is given, price does not constrain composition but is always displayed (FR-F10).

## FR-F04 — Fetch real products from The Home Depot per allowed furniture type

**Actor:** System · **Priority:** High · **Status:** Proposed
**Origin:** Fallback deviation ADR-F02 (external catalog); inherits the spirit of main FR-014

### Description

The system shall, when a proposal request is accepted, query the SerpApi Home Depot Search API once per furniture type allowed for the request's room type (curated query map), collecting real candidate products with title, brand, price, thumbnail, and link.

### Acceptance criteria

- [ ] Given an accepted request for a room type, when the catalog fetch runs, then candidate products are collected for each furniture type in that room type's allow-list. → TC-F08
- [ ] Given the Search API fails or returns no usable products for the request, when the fetch concludes, then the request is marked `failed` with a `catalog-unavailable` error and no fabricated or placeholder products are introduced. → TC-F09

### Business rules

- Queries come from the curated per-room-type query map (human-maintained; see FR-F09).
- Cached responses within the cache TTL are valid sources (NFR-F03).

## FR-F05 — Enrich shortlisted products with real specifications

**Actor:** System · **Priority:** High · **Status:** Proposed
**Origin:** ADR-F02; SerpApi Home Depot Product API provides the Specifications data (dimensions, color)

### Description

The system shall, when candidate products are shortlisted, retrieve each one's specifications (width, depth, height, color) via the SerpApi Home Depot Product API and persist the normalized product on the request's catalog snapshot.

### Acceptance criteria

- [ ] Given a shortlisted candidate, when enrichment runs, then the normalized product carries real numeric width/depth (inches) and a color value sourced from the API response. → TC-F10
- [ ] Given a candidate whose detail fetch fails or lacks required specifications, when enrichment concludes, then that product is excluded from eligibility (flagged `incomplete`) and its data is never guessed or defaulted. → TC-F11

### Business rules

- Missing dimensions or color make a product ineligible (FR-F09); the system discloses fewer options rather than inventing specs.
- Enrichment calls are bounded per request to respect the SerpApi quota (NFR-F03).

## FR-F06 — Compose 2–3 style-coherent proposals with an LLM (Ollama Cloud)

**Actor:** System (LLM runtime) · **Priority:** High · **Status:** Proposed
**Origin:** Fallback vision; LLM decision ADR-F03; system prompt spec in `fallback/09_ai_usage.md`

### Description

The system shall, when a request has an eligible catalog snapshot, obtain from the LLM (via the Ollama Cloud API) two to three proposals, each containing a style name, a design direction, a palette description, a rationale, and a list of product IDs drawn only from the snapshot.

### Acceptance criteria

- [ ] Given an eligible catalog snapshot, when composition succeeds, then the request completes with 2–3 proposals each carrying style name, design direction, palette description, rationale, and ≥ 3 items. → TC-F12
- [ ] Given the LLM returns malformed or schema-nonconforming output for N consecutive attempts (N=2, DRAFT), or is unreachable, when retries are exhausted, then the rule-based composer produces the proposals and the request still completes, flagged `composer: "rules"`. → TC-F13

### Business rules

- The LLM selects and groups; it never authors product fields (hard rule, `fallback/09_ai_usage.md`).
- Color harmony, design direction, footprint, cardinality, and budget adherence are all the LLM's responsibility via the prompt rules; there is no post-validation layer (stakeholder decision, ADR-F03). The structural guarantees that remain are the snapshot resolution (FR-F08) and the snapshot's construction (FR-F09).

## FR-F07 — Compute and display a fit summary; convey the footprint cap to the composer

**Actor:** System · **Priority:** High · **Status:** Proposed
**Origin:** Fallback vision ("must fit"); inherits the spirit of main FR-017/FR-021; enforcement model changed by stakeholder decision (ADR-F03: no post-validation layer)

### Description

The system shall, when composing and presenting proposals, include the maximum-footprint constraint (default 40% of floor area, configurable — DRAFT) in the composition prompt, and shall attach to every displayed proposal a fit summary (used ft², available ft², percentage) computed from API-sourced item dimensions.

### Acceptance criteria

- [ ] Given a completed request, when the user views a proposal, then it carries a fit summary whose figures are recomputed from snapshot dimensions (never taken from LLM output). → TC-F14
- [ ] Given a request's room dimensions, when the composition prompt is built, then it contains the max-footprint constraint derived from those dimensions and the configured share. → TC-F15

### Business rules

- Footprint figures use real API dimensions only; an item without dimensions cannot be in the snapshot (FR-F05/F09).
- Footprint adherence is **best-effort by the LLM** (prompt rule 4); the displayed fit summary makes any overrun visible. Adherence is spot-checked manually in the demo rehearsal (`08_test_plan.md`).
- The 40% default is a space-planning guideline adopted as the demo default (DRAFT — human confirmation pending, see ADR-F01).

## FR-F08 — Resolve every displayed item against the fetched snapshot and never fabricate

**Actor:** System · **Priority:** High · **Status:** Proposed
**Origin:** Inherits the Spazio hard rule (main FR-016, BR-6/BR-14) adapted to the external catalog (ADR-F02); enforcement is structural (display join), per ADR-F03

### Description

The system shall, when building a proposal's display payload, resolve every item ID against the request's fetched catalog snapshot, source all displayed product data exclusively from the snapshot, omit any item whose ID is not present, and drop any proposal left with fewer than 3 resolvable items.

### Acceptance criteria

- [ ] Given a completed request, when its proposals are inspected, then every displayed item's ID, price, image, and link equal the values fetched from the Home Depot APIs for this request. → TC-F16
- [ ] Given LLM output containing a product ID not present in the snapshot, when the display payload is built, then that item is omitted, and the proposal is dropped entirely if fewer than 3 items resolve. → TC-F17

### Business rules

- This is the fallback's non-negotiable rule; it holds for the LLM composer and the rule-based composer alike, and it is structural: unresolvable IDs have no data to display.
- When the catalog cannot support a coherent proposal, the system returns fewer proposals or discloses the gap in the rationale — it never fills gaps with invented items (inherits main BR-10/BR-13 spirit).

## FR-F09 — Constrain the catalog snapshot to room-appropriate, complete products

**Actor:** System (fetcher) · **Priority:** High · **Status:** Proposed
**Origin:** Fallback vision ("furniture normal for the room type"); inherits main FR-019 (completeness) spirit

### Description

The system shall, when building a request's catalog snapshot, fetch candidates only through the room type's curated allow-list queries — so the snapshot contains only room-appropriate furniture types — and shall exclude products missing price, dimensions, color, image, or link.

### Acceptance criteria

- [ ] Given a request for a room type, when the snapshot is built, then every eligible product's furniture type belongs to that room type's allow-list (the LLM is never given an out-of-room product to pick). → TC-F18
- [ ] Given a fetched product missing any required field, when eligibility is built, then the product is excluded and flagged `incomplete`, and it can appear in no proposal. → TC-F19

### Business rules

- The per-room-type furniture allow-list and cardinality map is curated by a human and versioned in the repo (the fallback's catalog-curation surface).
- Room-type coherence is guaranteed at the source (queries), not by filtering afterward. Per-type **cardinality** (e.g. 1 sofa max) is a prompt constraint only — best-effort by the LLM, spot-checked in rehearsal (stakeholder decision, ADR-F03).

## FR-F10 — Present proposals with per-item product data and a fit summary

**Actor:** Demo user · **Priority:** High · **Status:** Proposed
**Origin:** Fallback vision; mirrors main FR-028/FR-029 (tags with real data) without a render

### Description

The system shall, when a request completes, present each proposal with its style name, palette description, rationale, fit summary, and item cards showing real name, brand, price (USD), image, and an outbound link to the Home Depot product page; and shall present failed requests with a distinguishable error state.

### Acceptance criteria

- [ ] Given a completed request, when the user views results, then every proposal shows style name, palette description, rationale, fit summary, and per-item name, brand, price, image, and Home Depot link. → TC-F20
- [ ] Given a failed request (`catalog-unavailable`, `composition-failed`, or `no-eligible-products`), when the user views results, then a distinguishable error state with the failure reason is shown instead of partial or fabricated proposals. → TC-F21

### Business rules

- Prices are display-only (no checkout); currency is USD (ADR-F01).
- Outbound links open the real product page; the demo never mimics a purchase flow.
