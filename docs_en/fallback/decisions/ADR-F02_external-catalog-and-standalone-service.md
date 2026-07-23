# ADR-F02 — External catalog via SerpApi Home Depot APIs; standalone service in `fallback/`

**Status:** Proposed (pending human approval) · **Scope:** 2-day fallback demo only · **Date:** 2026-07-13

## Context

The pilot's catalog is operator-curated internal SKUs (ADR-006, ADR-014) — impossible to assemble for the US in 2 days. Separately, the team is actively developing `backend/` (routes, `app.ts`, `types.ts`, `config.ts`, `routes.test.ts` are all touched by ongoing pilot work), so any demo code wired into it would cause merge conflicts and couple demo risk to pilot code.

## Decision

1. **Catalog source: SerpApi.** The Home Depot **Search API** (`engine=home_depot`) fetches candidates per curated furniture-type query (supports price bounds and sorting); the Home Depot **Product API** (`engine=home_depot_product`) enriches shortlisted candidates with specifications — dimensions (width/depth/height), color, brand — plus images and links. The normalized response set is the request's **catalog snapshot**, and the never-fabricate rule is enforced against it (FR-F08).
2. **Adaptation of the completeness rule:** products missing price, dimensions, color, image, or link are ineligible (FR-F09) — the fallback analogue of ADR-014.
3. **Quota discipline:** every response is cached on disk (TTL 24 h, gitignored); enrichment calls are capped per request; the live demo runs on a pre-warmed cache (NFR-F03).
4. **Code location: standalone `fallback/` folder at the repo root.** Node 22 + TypeScript + Fastify 5, copying the pilot backend's idioms (Fastify plugins, `AppDeps` injection, Zod env config, interface + fake per external service, Vitest) **without importing from `backend/`**. No database — in-memory request store + the disk cache.
5. **Web UI**: one static HTML page + vanilla JS served by the same service (no framework, no build step), replacing the pilot's native iOS client for this demo.

## Alternatives considered

- **Scrape homedepot.com directly**: rejected — brittle, likely ToS-problematic, and slower to build than a stable JSON API.
- **Other product APIs** (Amazon via SerpApi, Wayfair scrapers): rejected for the demo — Home Depot's Product API exposes structured dimension/color specifications, which the fit constraint needs; user chose it explicitly.
- **Integrate into `backend/` as `/api/v1/demo/*`**: rejected — guaranteed merge conflicts with active pilot work; pollutes the pilot's route-inventory tests and config with demo-only concerns.
- **Reuse `backend/` via imports (shared package)**: rejected — creates a coupling that outlives a disposable demo; copying ~100 lines of idiom is cheaper.

## Positive consequences

- Real, current, purchasable products with the exact fields the constraints need — on day one.
- Merges into `develop` are conflict-free by construction (new files only).
- The cache makes the live demo immune to network/quota failures.

## Negative consequences

- SerpApi is a paid dependency with per-search quotas; the free tier bounds rehearsal volume (mitigated by the cache). New dependency must be justified in the PR per `CLAUDE.md` §6 — this ADR is that justification.
- Specification coverage varies by product; some furniture types may have thin dimension data, forcing query tuning (flagged as the plan's #1 risk in `12_build_plan.md`).
- Duplicated idioms between `fallback/` and `backend/` will drift; acceptable because the fallback is disposable (ADR-F01).
