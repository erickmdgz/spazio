# System architecture — Fallback Demo

> **Status.** Specification, nothing built. Decisions specific to the fallback are recorded in `decisions/ADR-F01…F03`. Where this document deviates from the main architecture (`docs_en/02_architecture.md`), the deviation is explicit and ADR-backed.

## Overview

A single small service, buildable in 2 days, that turns *(room type, dimensions, budget?)* into 2–3 style-coherent proposals of **real Home Depot products**.

End-to-end logical flow:

1. **Inputs.** The user opens the web page and submits room type, approximate dimensions (feet), and optional budget (USD) (FR-F01, FR-F02, FR-F03).
2. **Catalog fetch.** The service queries **SerpApi — The Home Depot Search API** once per furniture type allowed for that room type (curated query map), then enriches shortlisted candidates through **The Home Depot Product API** to obtain specifications: dimensions (width/depth/height in inches), color, material, price, image, link (FR-F04, FR-F05). Responses are cached (`NFR-F03`).
3. **Normalization.** Raw API products are normalized into `CatalogProduct` records (see `07_data_model.md`). Products missing required data (no price, no dimensions, no image) are **excluded** — the fallback's version of the "incomplete entries never render" rule (FR-F09; inherits the spirit of main FR-019/BR-2).
4. **Composition (LLM).** The normalized product list plus room context goes to a hosted model via the **Ollama Cloud API** with the system prompt specified in `09_ai_usage.md`. The model returns strict JSON: 2–3 proposals, each a named style with a product-ID list and a short rationale (FR-F06).
5. **Resolution & fit computation.** There is **no deterministic validation layer** (stakeholder decision, `ADR-F03`). The backend resolves each proposed product ID against the request's catalog snapshot to build the display payload — an ID not present in the snapshot has no data and is **omitted** (a proposal left with fewer than 3 resolvable items is dropped). Totals and the fit summary are recomputed from API data for display. Footprint cap, budget, and cardinality are conveyed to the model as prompt constraints (best-effort). Malformed or unparseable LLM output triggers a bounded retry; if the model stays unusable (or Ollama is down), a **rule-based composer** builds the proposals deterministically so the demo never dies (`ADR-F03`).
6. **Display.** The web page renders each proposal: style name, palette description, rationale, fit summary (footprint used / available), item cards with image, name, brand, price, and an outbound link to the Home Depot product page (FR-F10).

## Technology stack (DECIDED for the fallback — ADR-F02, ADR-F03)

| Layer | Choice | Decision |
|---|---|---|
| Frontend | One static HTML page + vanilla JS (form, polling, result cards), served by the same service. No framework, no build step. | ADR-F02 |
| Backend | Node 22 + TypeScript + Fastify 5, copying the pilot backend's idioms (Fastify plugins, `AppDeps` injection, Zod env config, interface + fake per external service) **without importing from `backend/`** | ADR-F02 |
| Catalog source | SerpApi — The Home Depot Search API + The Home Depot Product API (US) | ADR-F02 |
| LLM | Ollama Cloud API (`OLLAMA_API_KEY`), hosted model chosen at build time (DRAFT — e.g. `gpt-oss:20b`), JSON-schema-constrained output (`format`), temperature low | ADR-F03 |
| Storage | None. In-memory request store + on-disk JSON cache for SerpApi responses. No Postgres, no Prisma, no object storage. | ADR-F02 |
| Code location | Standalone `fallback/` folder at the repo root; zero edits to `backend/` or shared files | ADR-F02 |

## Logical diagram

```text
 User ──▶ Web page (form) ──▶ POST /api/fallback/proposal-requests
                                   │ 202 { id }           (async submit → poll,
                                   ▼                       same idiom as the pilot render flow)
                        ┌───────────────────────────┐
                        │  Fallback service (Node)  │
                        │  ┌─────────────────────┐  │      ┌────────────────────┐
                        │  │ Catalog fetcher ────┼──┼─────▶│ SerpApi            │
                        │  │  (query map/room,   │  │      │  Home Depot Search │
                        │  │   normalize, cache) │  │      │  + Product APIs    │
                        │  ├─────────────────────┤  │      └────────────────────┘
                        │  │ Proposal composer ──┼──┼─────▶ Ollama Cloud API (LLM)
                        │  │  (system prompt,    │  │
                        │  │   JSON schema out)  │  │
                        │  ├─────────────────────┤  │
                        │  │ Snapshot resolver   │  │  display join: only fetched
                        │  │  + fit computation  │  │  data can render; fit/totals
                        │  ├─────────────────────┤  │  recomputed from API data
                        │  │ Rule-based fallback │  │  used if LLM output is
                        │  │ composer            │  │  malformed/unreachable
                        │  └─────────────────────┘  │  after N retries
                        └───────────────────────────┘
 User ◀── proposals ◀── GET /api/fallback/proposal-requests/:id
```

## Main modules

| Module | Responsibility | Requirements |
|---|---|---|
| **Web UI** | Form (room type, dimensions, budget), submit, poll, render proposal cards, error states | FR-F01, FR-F02, FR-F03, FR-F10 |
| **Catalog fetcher** | Per-room-type curated query map → SerpApi Search; shortlist → SerpApi Product for specs; normalize; exclude incomplete; cache | FR-F04, FR-F05, FR-F09; NFR-F03 |
| **Proposal composer** | Build the LLM prompt from normalized products + room context; call Ollama with JSON-schema output; bounded retries | FR-F06; ADR-F03 |
| **Snapshot resolver & fit computation** | Display join against the catalog snapshot (unknown IDs omitted; <3 resolvable items ⇒ proposal dropped); recompute totals and fit summary from API data | FR-F07, FR-F08 |
| **Rule-based composer (fallback of the fallback)** | If the LLM cannot produce schema-conforming JSON in N attempts (or is unreachable), compose proposals by rules (pick per furniture type by color-family grouping and price fit) | ADR-F03 |
| **Request store** | In-memory `pending → processing → completed/failed` lifecycle for submit→poll | FR-F10 (status surface) |

## Architecture rules

### Inherited from the main architecture (unchanged)

- Separate frontend, backend, and (absent) database concerns; no business logic in the page script beyond display.
- Every feature has minimal tests (`TC-F` in `08_test_plan.md`).
- Every change ties to an Issue and a requirement/feature doc (`CLAUDE.md`, `11_implementation_flow.md`).
- No secrets in the repo; `SERPAPI_API_KEY` via environment only (`NFR-F01`).

### Fallback invariants (the hard rules of this demo)

1. **Only real products.** Every displayed item maps to a product returned by the Home Depot APIs in this request's fetch (or its valid cache), carrying its real price, image, and link (FR-F08). This is structural: the display payload is built by resolving IDs against the snapshot — unresolvable IDs render nothing. The LLM selects; it never authors product data.
2. **Never fabricate.** If the catalog fetch cannot support a coherent proposal (e.g. no in-budget sofa), the correct behavior is to disclose the gap in the proposal rationale or return fewer proposals — never to invent an item (inherits the main hard rule; see `09_ai_usage.md`).
3. **Fit is always shown, arithmetically.** Every proposal carries a fit summary (used ft² / available ft² / %) recomputed from API dimensions. The footprint cap — **40%** of floor area (DRAFT default, configurable, see `ADR-F01`) — travels to the model as a prompt constraint; adherence is best-effort (no post-validation layer — stakeholder decision, `ADR-F03`) (FR-F07).
4. **Room-type coherence is fetched, not filtered.** The curated map drives the Search queries, so the catalog snapshot only ever contains furniture types allowed for the room — the LLM cannot pick a type it was never given (FR-F09). Per-type cardinality is a prompt constraint (best-effort).
5. **Only snapshot data can render.** No LLM-authored product field ever reaches the display payload; the model's free text is limited to the four style fields (NFR-F04).
6. **Incomplete products are ineligible.** No price, no dimensions, or no image ⇒ excluded at normalization, before the LLM sees the catalog (FR-F09).

## Deviations from the main architecture (each ADR-backed)

| Deviation | Main product / pilot | Fallback | ADR |
|---|---|---|---|
| Market & currency | Bogotá, COP (ADR-015) | US, USD | ADR-F01 |
| Catalog | Operator-curated internal SKUs (ADR-006/014) | External, on-demand via SerpApi Home Depot | ADR-F02 |
| Output | Photorealistic render of the user's photo (ADR-002) | Structured proposals (lists), no image generation | ADR-F01 |
| Purchase | In-app checkout (ADR-003/004) | Outbound links to Home Depot; no transaction | ADR-F01 |
| Client | Native iOS (ADR-001) | Single web page | ADR-F02 |
| Human review | Operator approves every render (FR-027) | No per-output review layer at all (stakeholder decision); curation moves upstream (query/type maps) and constraints travel in the prompt | ADR-F01, ADR-F03 |
| Persistence | Postgres + object storage (ADR-001) | In-memory + JSON file cache | ADR-F02 |
