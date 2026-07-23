# Data model — Fallback Demo

> **DRAFT.** The fallback has **no database** (ADR-F02): entities live in memory for the process lifetime, plus an on-disk JSON cache for SerpApi responses. Types below are TypeScript-flavored but technology-neutral in spirit. Field labels: **(api)** = sourced verbatim from a SerpApi Home Depot response; **(computed)** = derived deterministically; **(proposed)** = structuring choice.

## Relationships overview

```text
ProposalRequest ──1 CatalogSnapshot ──< CatalogProduct
        │
        └──< Proposal ──< ProposalItem >── CatalogProduct
RoomTypeMap (static, versioned in repo) ── drives fetch queries & prompt constraints
SerpApiCache (disk) ── feeds CatalogSnapshot
```

- A **ProposalRequest** owns exactly one **CatalogSnapshot** (the products fetched for it) and 0–3 **Proposals**.
- A **ProposalItem** references exactly one **CatalogProduct** *from the same request's snapshot* — the referential form of the never-fabricate rule (FR-F08).
- **RoomTypeMap** is static configuration (a versioned TS/JSON file), not runtime data: the human-curated surface.

## Entity: ProposalRequest

One user submission and its lifecycle (submit → poll).

| Field | Type | Required | Description |
|---|---|---|---|
| id | String | yes | `pr_` + random suffix (proposed) |
| roomType | Enum | yes | `living_room \| dining_room \| bedroom \| office` (FR-F01) |
| widthFt / lengthFt | Number | yes | Validated 4–60 ft (FR-F02) |
| floorAreaFt2 | Number | yes | (computed) width × length |
| budgetUsd | Number | no | Hard ceiling when present (FR-F03) |
| status | Enum | yes | `pending \| processing \| completed \| failed` |
| composer | Enum | when completed | `llm \| rules` (FR-F06) |
| error / errorMessage | String | when failed | `catalog-unavailable \| composition-failed \| no-eligible-products` |
| createdAt / completedAt | DateTime | yes / when done | audit (proposed) |

## Entity: CatalogProduct

A normalized, real Home Depot product. Only complete products are `eligible` (FR-F09).

| Field | Type | Required | Description |
|---|---|---|---|
| productId | String | yes | (api) Home Depot `product_id` — the identity items are resolved against at display time (FR-F08) |
| furnitureType | Enum | yes | (computed) the allow-list type whose query fetched it (e.g. `sofa`, `coffee_table`) |
| name / brand | String | yes | (api) `title`, `brand` |
| priceUsd | Number | yes | (api) `price` |
| color | String | yes | (api) from Product API specifications / variants |
| widthIn / depthIn / heightIn | Number | yes (w,d) | (api) from Product API "Dimensions" specifications |
| footprintFt2 | Number | yes | (computed) `widthIn × depthIn / 144` |
| imageUrl | URL | yes | (api) first thumbnail |
| homeDepotUrl | URL | yes | (api) `link` |
| eligible | Boolean | yes | (computed) false ⇒ excluded from composition; reason in `incompleteReason` |
| incompleteReason | String | no | e.g. `missing-dimensions`, `missing-price` |

## Entity: Proposal

| Field | Type | Required | Description |
|---|---|---|---|
| styleName | String | yes | LLM-authored label ("Warm Minimal") — the only creative text besides `rationale`/`paletteDescription` |
| designDirection | Enum | yes | `minimalist \| comfy \| modern \| rustic \| …` (final set depends on catalog data — DRAFT) |
| paletteDescription | String | yes | LLM description of the color logic |
| rationale | String | yes | LLM one-paragraph justification; also where catalog gaps are disclosed (FR-F08 BR) |
| items | ProposalItem[] | yes | ≥ 3 items (FR-F06) |
| totalUsd | Number | yes | (computed) Σ snapshot item prices — recomputed for display, never taken from LLM output |
| fit | Object | yes | (computed) `{ usedFt2, availableFt2, usedPct }` (FR-F07) |

## Entity: ProposalItem

| Field | Type | Required | Description |
|---|---|---|---|
| productId | String | yes | FK into the request's CatalogSnapshot — must exist (FR-F08) |
| (denormalized display fields) | — | yes | name, brand, priceUsd, color, dims, imageUrl, homeDepotUrl copied from CatalogProduct for the response payload (proposed) |

## Static config: RoomTypeMap (human-curated)

Versioned file `fallback/src/config/roomTypes.ts` (DRAFT location). Per room type: the furniture-type allow-list, per-type max cardinality, per-type Search API query, and per-type shortlist size. Illustrative extract:

```ts
living_room: {
  sofa:          { max: 1, query: "sofa",            shortlist: 6 },
  coffee_table:  { max: 1, query: "coffee table",    shortlist: 6 },
  tv_stand:      { max: 1, query: "tv stand",        shortlist: 4 },
  accent_chair:  { max: 2, query: "accent chair",    shortlist: 4 },
  side_table:    { max: 2, query: "side table",      shortlist: 4 },
  bookshelf:     { max: 1, query: "bookshelf",       shortlist: 4 },
  floor_lamp:    { max: 2, query: "floor lamp",      shortlist: 4 },
  area_rug:      { max: 1, query: "area rug",        shortlist: 4 },
}
// dining_room: dining_table, dining_chair(max 8), sideboard, bar_cart, area_rug, pendant_light …
// bedroom: bed_frame, nightstand(max 2), dresser, wardrobe, bench, table_lamp(max 2), area_rug …
// office: desk, office_chair, bookshelf(max 2), filing_cabinet, desk_lamp, area_rug …
```

Rugs and lamps are excluded from the footprint sum (they don't consume standalone floor area / rugs lie under other pieces) — (DRAFT rule, confirm with a human; FR-F07).

## SerpApiCache (disk)

Keyed `engine + normalized query/product_id` → raw JSON response + `fetchedAt`; TTL 24h (NFR-F03). Lives under `fallback/.cache/` (gitignored — cached responses may embed quota metadata and must not be committed; DRAFT).

## Rules (cross-entity invariants)

> Enforcement note (stakeholder decision, ADR-F03): there is **no deterministic post-validation layer**. Rules 1, 2a, and 4 below are structural (they hold by construction of the snapshot and the display join); rules 2b, 3, and 5 are prompt constraints, best-effort by the LLM and spot-checked manually in rehearsal.

1. **(structural)** `ProposalItem.productId` ∈ its request's snapshot — unresolvable IDs are omitted at display time; a proposal with < 3 resolvable items is dropped (FR-F08).
2. **(2a, structural)** Item furniture types ∈ `RoomTypeMap[roomType]`, because the snapshot is only ever built from the room's allow-list queries (FR-F09). **(2b, prompt)** Per-type cardinality ≤ `max` — best-effort.
3. **(prompt)** Σ footprint of footprint-counting items ≤ 40% (config) of `floorAreaFt2` — best-effort; the fit summary always displays the recomputed figures (FR-F07).
4. **(structural)** `totalUsd` and `fit` are recomputed from snapshot data for display, never taken from LLM output (FR-F03/F07).
5. **(prompt)** `totalUsd` ≤ `budgetUsd` when budget present — best-effort; the displayed total makes overruns visible (FR-F03).
6. **(structural)** `eligible = false` products are excluded from the snapshot the LLM sees, so they can appear in no proposal (FR-F09).
7. **(structural)** All money/dimension display values come from API-sourced fields; LLM text fields are limited to `styleName`, `designDirection`, `paletteDescription`, `rationale`, and item selection (NFR-F04).
