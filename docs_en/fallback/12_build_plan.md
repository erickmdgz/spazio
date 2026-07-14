# 2-Day Build Plan — Fallback Demo

> Mirrors `docs_en/12_pilot_build_plan.md` in spirit. Assumes the docs in this folder are approved and the prerequisites are ready **before Day 1 starts**: SerpApi and Ollama Cloud API keys in the local env (`SERPAPI_API_KEY`, `OLLAMA_API_KEY`), Node 22.

Workflow per `CLAUDE.md`: one Issue per FEAT-F, branches `feature/FEAT-F0X-…` from `develop`, atomic commits `FEAT-F0X: …`, PRs to `develop`. Given the 2-day window, the three features may share one branch/PR if the team prefers — decide at kickoff (flagged, not assumed).

## Day 1 — the risky halves first

**Morning — FEAT-F02: catalog retrieval (the external dependency).**

1. Scaffold `fallback/` (copy idioms from `backend/`: tsconfig, eslint, vitest, Fastify skeleton, Zod env config with `SERPAPI_API_KEY`, `OLLAMA_API_KEY`, `OLLAMA_URL`, `OLLAMA_MODEL`).
2. `RoomTypeMap` config file (living room first, then the other three).
3. SerpApi client: Search per furniture type → shortlist → Product API enrichment → `CatalogProduct` normalization → `eligible` flagging. Disk cache from the first call (it saves quota during development itself).
4. Capture real responses as test fixtures; unit tests TC-F08–TC-F11, TC-F19, TC-F24.
   - **Checkpoint (midday):** a script prints ≥ 40 eligible, normalized living-room products from cache. If Product-API dimension coverage turns out poor for some furniture types, adjust queries/shortlists in `RoomTypeMap` now (this is the plan's #1 risk).

**Afternoon — FEAT-F03 (composer, the core).**

5. Snapshot resolution + display arithmetic (pure functions): ID lookup with omission/drop behavior, recomputed totals and fit summary, prompt-constraint construction. Tests TC-F14–TC-F17, TC-F07 (TC-F18 lands with the fetcher).
6. Ollama Cloud client with JSON-schema output (confirm hosted model + structured-output support — ADR-F03); system prompt v0.1; retry on malformed/schema-nonconforming output only (no content validation — ADR-F03).
7. Rule-based fallback composer (group eligible products by color family, pick per type by price fit).  Tests TC-F12, TC-F13.
   - **Checkpoint (end of Day 1):** CLI script: room params in → 2–3 proposals out (JSON) with fit summaries, on warm cache, LLM path and rules path both working. Eyeball the outputs against the footprint/budget/cardinality prompt rules — if the model ignores them often, tune the prompt now (this replaces the validator as the quality lever).

## Day 2 — shell, polish, rehearsal

**Morning — FEAT-F01 + HTTP surface.**

8. Routes: `POST/GET /api/fallback/proposal-requests` (submit → poll, in-memory store), `GET /health`. Input validation errors per `06_api.md`. Tests TC-F01–TC-F06, TC-F20, TC-F21.
9. Web page: form, polling with progress state, proposal cards (image, name, brand, price, HD link), fit summary bar, error states. No framework.

**Afternoon — hardening + demo prep.**

10. Timed runs (TC-F23); tune shortlist sizes / `num_ctx` if slow.
11. Secret scan of the diff (TC-F22); README for `fallback/` (run instructions).
12. **Demo rehearsal** per the script in `08_test_plan.md`: pre-warm cache for the two live configurations, spot-check real Home Depot links, and run the Ollama-outage drill once.
13. Open the PR(s) to `develop`; update this folder's docs with anything that changed during the build (Step 6 of `11_implementation_flow.md`).

## Scope-cut ladder (pre-agreed, cut top-down if behind)

1. Cut `office` and `dining_room` room types (demo needs living room + bedroom).
2. Cut budget input (FR-F03 → show prices only).
3. Cut LLM retries → jump straight to rule-based composer when the first attempt fails.
4. Cut the web page → demo the CLI/JSON output with the browser showing product links. (Last resort; the page is cheap, cut it only in a catastrophe.)

**Never cut:** snapshot resolution with recomputed display figures (FR-F08 — the never-fabricate guarantee), the cache, the rule-based composer, the rehearsal spot-checks (the manual stand-in for the removed validator). Those are what make the demo safe.

## Definition of demo-ready

- The rehearsal script passes twice in a row on the demo machine, on warm cache.
- The Ollama-outage drill completes with `composer: "rules"`.
- Zero secrets in the branch; tests green; PR open with docs updated.
