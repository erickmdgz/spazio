# FEAT-F03 — LLM proposal composition & display

## 1. Summary

The heart of the fallback: an LLM (via the Ollama Cloud API) composes 2–3 style-coherent proposals from the request's catalog snapshot under prompt constraints (footprint cap, budget, cardinality); the backend resolves every proposed item against the snapshot (only fetched data can render — the never-fabricate guarantee) and recomputes totals and a fit summary for display; a rule-based composer guarantees completion if the LLM fails. There is no post-validation layer (stakeholder decision, ADR-F03).

## 2. Problem or need

This is the thesis being demoed: AI taste (color harmony, design direction) over verified data (real products, arithmetic fit) — never the other way around.

## 3. Affected user

The demo user/viewer.

## 4. Related requirements

- FR-F06, FR-F07, FR-F08, FR-F10, FR-F03 (prompt-constraint half)
- NFR-F02 (timing), NFR-F04 (schema-constrained output, snapshot-only display)

## 5. Expected flow

1. The catalog snapshot is ready (FEAT-F02).
2. The composer builds the prompt (system prompt v0.1, `fallback/09_ai_usage.md`) with room context, constraints, and the eligible product list, and calls Ollama with JSON-schema `format`.
3. The backend builds the display payload by resolving each proposed ID against the snapshot: unknown IDs are omitted, proposals with < 3 resolvable items are dropped, and totals plus the fit summary are recomputed from API data. Footprint/budget/cardinality adherence is the LLM's responsibility via the prompt (best-effort — ADR-F03).
4. Malformed or schema-nonconforming output (or Ollama unreachable) → up to 2 retries; still failing → rule-based composer, request flagged `composer: "rules"`.
5. The request completes; the page renders proposal cards (style, palette, rationale, fit bar, items with image/name/brand/price/Home Depot link) or the failure state.

## 6. Acceptance criteria

In the FRs: FR-F06 → TC-F12/F13 · FR-F07 → TC-F14/F15 · FR-F08 → TC-F16/F17 · FR-F10 → TC-F20/F21 · FR-F03 (prompt constraint) → TC-F07. (TC-F18 moved to FEAT-F02: snapshot purity is a fetcher property.)

## 7. Business rules

See FR-F06–FR-F10 and the fallback hard rule in `fallback/09_ai_usage.md` (never fabricate; disclose gaps; fewer proposals over invented items; numeric constraints best-effort via prompt — ADR-F03).

## 8. Proposed technical design

### Frontend
Proposal cards + fit summary + `composer` badge on the same static page (FEAT-F01's shell).

### Backend
`fallback/src/composer/` — `LLMComposer` interface with `OllamaComposer` and `RuleBasedComposer` implementations plus a `ScriptedComposer` fake for tests; `fallback/src/composer/resolve.ts` (snapshot resolution + recomputed totals/fit, pure functions) and `promptBuilder.ts` (constraint construction); orchestration in the request processor (in-memory queue, mirroring the pilot's `renderWorker` idiom).

### Database
None.

### Security
Composition calls go to the Ollama Cloud API (`OLLAMA_URL` env, default `https://ollama.com`) authenticated with `OLLAMA_API_KEY` (env only — NFR-F01). Only room parameters and public catalog data are sent — no personal data exists in the demo. LLM text fields are rendered as text (no HTML injection from model output).

## 9. Required tests

| ID | Test | Type |
|---|---|---|
| TC-F12, TC-F14, TC-F16, TC-F20 | Composition end-to-end (scripted LLM), fit summary, snapshot-sourced display | Functional |
| TC-F13, TC-F17, TC-F21 | Malformed LLM output → rules path, unknown-ID omission, failure display | Functional |
| TC-F07, TC-F15 | Budget and footprint constraints present in the composition prompt | Functional |
| TC-F23 | Timed cold/warm runs | Performance |
| Rehearsal spot-checks | Manual footprint/budget/cardinality adherence review (`08_test_plan.md`) | Manual |

## 10. Documentation impact

- [x] `fallback/02_architecture.md`, `03_requirements.md`, `06_api.md`, `07_data_model.md`, `08_test_plan.md`, `09_ai_usage.md`, `decisions/ADR-F03` (this set)

## 11. Checklist before implementing

- [x] Clear objective · [x] Linked to requirements · [x] Acceptance criteria (in FRs) · [x] Tests defined · [x] Technical impact understood · [x] User impact understood
- [ ] Ollama Cloud API key available in the local environment; hosted model + structured-output support confirmed (prerequisite)

## 12. Checklist before closing

- [ ] Code implemented · [ ] Tests executed · [ ] Acceptance criteria met · [ ] PR reviewed · [ ] Documentation updated · [ ] Release notes updated
