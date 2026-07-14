# Spazio Fallback Demo — documentation set

> **What this folder is.** A self-contained documentation set for the **2-day fallback demo**: a deliberately simplified version of the Spazio idea, buildable in two days, used as a safety net in case the main pilot is not demo-ready in time. It mirrors the structure of the main docs in `/docs_en` but describes only the fallback.
>
> **Status: DRAFT / PROPOSED.** Nothing in this folder is built. Everything is a specification pending human approval, following the same VERIFIED / DRAFT / TBD discipline as the main docs.

## The fallback in one paragraph

The user enters their **room type** (living room, dining room, bedroom, office), **approximate room dimensions**, and an optional **budget**, in a simple web page. The backend fetches **real, purchasable products from The Home Depot** (US market) through **SerpApi's Home Depot APIs**, and an **LLM (via the Ollama Cloud API)** composes **2–3 style proposals** — each one a coherent list of furniture that (a) belongs in that room type, (b) shares a harmonious color palette, (c) follows a recognizable design style (minimalist, comfy, modern…), and (d) **is composed to fit the user's room** (the footprint cap is given to the LLM as a prompt constraint, and every proposal shows a fit summary recomputed from real dimensions). Every proposed item links to a real Home Depot product with price and image. There is **no photo upload, no AI render, no cart, no checkout** — proposals only.

The core Spazio promise is preserved: **the AI never invents furniture.** Every item in a proposal maps to a real product returned by the Home Depot API, with its real price, image, and link.

## Why it exists

The one-week iOS pilot (photo → render → purchase, Bogotá) may not be demo-ready in 2 days. This fallback proves the heart of the idea — *AI composes coherent, purchasable furniture sets constrained by real space and real inventory* — with an order of magnitude less build risk.

## Relationship to the main docs (and merge safety)

- **This folder is additive.** No file outside `docs_en/fallback/` (and, when built, the standalone `fallback/` code folder) is modified. Merging this branch into `develop` cannot conflict with the team's ongoing work on the main pilot.
- **Separate ID namespace.** The fallback uses `FEAT-F##`, `FR-F##`, `NFR-F##`, `TC-F##`, `ADR-F##`. The main registries (`FR-001…FR-061`, `FEAT-001…FEAT-015`, `ADR-001…ADR-022`, `TC-001…TC-106`) are untouched, and the next-available main IDs (`FR-062+`, `FEAT-016+`, `ADR-023+`, `TC-107+`) stay free for the team.
- **Main invariants are inherited where they apply** (never fabricate products, honest disclosure, human approves plans) and explicitly **deviated where the fallback requires it** — each deviation is recorded in an ADR in `decisions/` (external catalog instead of operator-curated; US/USD instead of Bogotá/COP; no render/checkout).
- The repo working rules in `CLAUDE.md` (branch from `develop`, PR to `develop`, atomic commits with ID prefix, no secrets) apply to the fallback exactly as to the main product.

## Contents of this folder

| File | Mirrors | Content |
|---|---|---|
| `01_product_vision.md` | `docs_en/01_product_vision.md` | Fallback problem, user, goal, scope, success signal |
| `02_architecture.md` | `docs_en/02_architecture.md` | Stack, modules, flow, invariants of the fallback |
| `03_requirements.md` | `docs_en/03_requirements.md` | Functional requirements `FR-F01…FR-F10` |
| `04_non_functional_requirements.md` | `docs_en/04_non_functional_requirements.md` | `NFR-F01…NFR-F04` |
| `05_backlog.md` | `docs_en/05_backlog.md` | Feature backlog `FEAT-F01…FEAT-F03` |
| `06_api.md` | `docs_en/06_api.md` | Endpoints of the fallback service |
| `07_data_model.md` | `docs_en/07_data_model.md` | In-memory entities (no database) |
| `08_test_plan.md` | `docs_en/08_test_plan.md` | Test cases `TC-F01…` |
| `09_ai_usage.md` | `docs_en/09_ai_usage.md` | Runtime LLM rules + the system prompt specification |
| `12_build_plan.md` | `docs_en/12_pilot_build_plan.md` | The 2-day build plan |
| `decisions/ADR-F01…F03` | `docs_en/decisions/` | Fallback-only decisions and deviations |
| `features/FEAT-F01…F03` | `docs_en/features/` | Feature documents |

## Where the code will live

Per `ADR-F02`: in a **standalone `fallback/` folder at the repo root**, not inside `backend/`. Rationale: the team is actively changing `backend/src` (routes, `app.ts`, `types.ts`, `config.ts`, `routes.test.ts`); wiring the demo into it would create guaranteed merge conflicts and couple demo risk to pilot code. The fallback service copies the backend's proven idioms (Fastify plugins, `AppDeps` injection, Zod-validated env config, interface + fake service pattern, Vitest) without importing from it.

## Prerequisites to build/run (not committed to the repo)

- A **SerpApi API key** (`SERPAPI_API_KEY` env var — never committed; see `NFR-F01`).
- An **Ollama Cloud API key** (`OLLAMA_API_KEY` env var — never committed; see `NFR-F01`); the hosted model is chosen at build time (DRAFT — e.g. `gpt-oss:20b`; see `ADR-F03`).
