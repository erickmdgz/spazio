# Non-functional requirements — Fallback Demo

> Namespace `NFR-F##`; the main `NFR-0##` registry is untouched. Status of all: **Proposed**.

| ID | Requirement | Priority |
|---|---|---|
| NFR-F01 | Secrets stay out of the repo | High |
| NFR-F02 | Demo-grade response time | Medium |
| NFR-F03 | SerpApi quota discipline (caching) | High |
| NFR-F04 | LLM output is schema-constrained; display renders snapshot data only | High |

## NFR-F01 — Secrets stay out of the repo

`SERPAPI_API_KEY` and `OLLAMA_API_KEY` (and any future key) are provided via environment variables only; `.env` files are gitignored; no key ever appears in code, docs, fixtures, or committed cache files. Inherits `CLAUDE.md` rule 4 verbatim. **Verification:** TC-F22 (secret scan of the branch diff before PR).

## NFR-F02 — Demo-grade response time

A proposal request completes end-to-end (fetch + enrich + compose + resolve) in **≤ 90 seconds** on the demo machine, and the UI shows a progress state within 1 second of submission (submit → poll keeps the page responsive). Warm-cache runs (the live-demo path) should complete in ≤ 30 seconds. (DRAFT targets — tune on real hardware during Day 2.) **Verification:** TC-F23.

## NFR-F03 — SerpApi quota discipline (caching)

Every SerpApi response is cached on disk (JSON, keyed by engine + normalized query, TTL 24h — DRAFT) and cache hits are served without a network call, so that: (a) a full demo rehearsal consumes a bounded, predictable number of API credits (≤ ~15 searches + ~30 product lookups per cold room type — DRAFT estimate); and (b) the live demo can run entirely on a pre-warmed cache, immune to network flakiness. Enrichment (Product API) calls are capped per request. **Verification:** TC-F24.

## NFR-F04 — LLM output is schema-constrained; display renders snapshot data only

The Ollama call uses structured output (JSON schema via the `format` parameter), so the model can only return product-ID lists plus the four style text fields. All displayed product data comes from resolving those IDs against the catalog snapshot (FR-F08) — there is no post-validation layer (stakeholder decision, ADR-F03), and no LLM text is ever parsed leniently or "fixed up" into products. **Verification:** covered by TC-F13, TC-F16, TC-F17, TC-F19.
