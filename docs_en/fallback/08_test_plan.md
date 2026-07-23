# Test plan — Fallback Demo

## Strategy

Same discipline as the main plan: every FR-F acceptance criterion maps 1:1 to a TC-F. Given the 2-day window, tests are Vitest unit/integration tests with **mocked SerpApi and Ollama clients** (fixture JSON captured from real responses), plus a scripted manual demo rehearsal. Status is case validity; all start `Pending`.

> **Enforcement note (ADR-F03):** there is no deterministic post-validation layer. Footprint, budget, and cardinality adherence are prompt constraints (best-effort by the LLM); they are covered by the **manual rehearsal spot-checks** below, while the automated TCs cover the structural guarantees (snapshot resolution, snapshot construction, recomputed display figures).

## Test cases

| ID | Feature | Requirement | Case | Expected result | Status |
|---|---|---|---|---|---|
| TC-F01 | FEAT-F01 Room input | FR-F01 | Submit with a supported room type | Room type persisted on the created proposal request | Pending |
| TC-F02 | FEAT-F01 Room input | FR-F01 | Submit with missing/unsupported room type | 400 `room-type-validation`; no request created | Pending |
| TC-F03 | FEAT-F01 Room input | FR-F02 | Submit valid positive dimensions within bounds | Dimensions persisted; floor area computed | Pending |
| TC-F04 | FEAT-F01 Room input | FR-F02 | Submit non-positive/non-numeric/out-of-bounds dimension | 400 `dimension-validation`; no request created | Pending |
| TC-F05 | FEAT-F01 Room input | FR-F03 | Submit a positive numeric budget | Budget persisted on the request | Pending |
| TC-F06 | FEAT-F01 Room input | FR-F03 | Submit a negative or non-numeric budget | 400 `budget-validation`; no request created | Pending |
| TC-F07 | FEAT-F03 Composition | FR-F03 | Complete a request that has a budget | The composition prompt contains the budget constraint; every displayed total is recomputed from snapshot prices | Pending |
| TC-F08 | FEAT-F02 Catalog | FR-F04 | Fetch for a room type (mocked Search API) | Candidates collected for every furniture type in the room's allow-list | Pending |
| TC-F09 | FEAT-F02 Catalog | FR-F04 | Search API errors / returns nothing usable | Request `failed` with `catalog-unavailable`; zero fabricated products | Pending |
| TC-F10 | FEAT-F02 Catalog | FR-F05 | Enrich a shortlisted candidate (mocked Product API) | Normalized product carries API-sourced numeric width/depth and color | Pending |
| TC-F11 | FEAT-F02 Catalog | FR-F05 | Detail fetch fails / specs missing | Product flagged `incomplete`, excluded; no guessed values | Pending |
| TC-F12 | FEAT-F03 Composition | FR-F06 | Compose with a valid mocked LLM response | Request completes with 2–3 proposals, each with style fields, rationale, ≥3 items | Pending |
| TC-F13 | FEAT-F03 Composition | FR-F06 | LLM returns malformed/schema-nonconforming output N consecutive times (or is unreachable) | Rule-based composer completes the request, flagged `composer: "rules"` | Pending |
| TC-F14 | FEAT-F03 Composition | FR-F07 | View a completed proposal | Fit summary (usedFt2/availableFt2/usedPct) attached, recomputed from snapshot dimensions | Pending |
| TC-F15 | FEAT-F03 Composition | FR-F07 | Build the composition prompt for given room dimensions | The prompt contains the max-footprint constraint derived from the dimensions and the configured share | Pending |
| TC-F16 | FEAT-F03 Composition | FR-F08 | Inspect a completed request's items | Every item's id/price/image/link equals the fetched snapshot values | Pending |
| TC-F17 | FEAT-F03 Composition | FR-F08 | LLM output references an unknown product ID | The item is omitted at resolution; the proposal is dropped if < 3 items resolve | Pending |
| TC-F18 | FEAT-F02 Catalog | FR-F09 | Build a snapshot for a room type | Every eligible product's furniture type belongs to the room's allow-list (snapshot purity) | Pending |
| TC-F19 | FEAT-F02 Catalog | FR-F09 | Product missing price/dims/color/image/link | Excluded from eligibility; appears in no proposal | Pending |
| TC-F20 | FEAT-F03 Display | FR-F10 | View a completed request | Each proposal shows style/palette/rationale/fit + per-item name, brand, price, image, HD link | Pending |
| TC-F21 | FEAT-F03 Display | FR-F10 | View a failed request | Distinguishable error state with the failure reason; no partial proposals | Pending |
| TC-F22 | — | NFR-F01 | Scan the branch diff for secrets before PR | No API keys, tokens, or `.env` content in any commit | Pending |
| TC-F23 | — | NFR-F02 | Timed end-to-end run on the demo machine | Cold ≤ 90 s, warm cache ≤ 30 s; progress state within 1 s | Pending |
| TC-F24 | FEAT-F02 Catalog | NFR-F03 | Repeat an identical request within the TTL | Second run served from cache: zero SerpApi network calls | Pending |

## Manual demo rehearsal (Day 2, scripted)

1. Pre-warm the cache for the 2 room configurations to be shown live (TC-F24 doubles as the check).
2. Run the live script: living room 14.5×12 ft with $2,500 budget; bedroom 11×10 ft without budget.
3. For one proposal, open 2 Home Depot links and verify name/price/image match the cards (spot-check of TC-F16 against reality, not mocks).
4. **Prompt-constraint spot-checks (replaces the removed validator — ADR-F03):** for every proposal produced in steps 2–3, manually verify (a) the fit summary is within the footprint cap, (b) totals are within budget where one was given, and (c) no furniture type exceeds sane cardinality (e.g. one sofa). If any check fails repeatedly, tune the system prompt or lower temperature before the demo.
5. **Ollama-outage drill:** simulate an Ollama Cloud outage (invalid `OLLAMA_API_KEY` or blocked network for the LLM call) and submit once: verify the rule-based composer path completes (TC-F13 live) — this is the demo's safety net.
