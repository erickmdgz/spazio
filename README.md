# Spazio

> AI-generated space design & shoppable furniture marketplace.

## Description

Spazio lets someone furnishing a room upload or capture a photo of their space, choose a style (from a catalog or in free text) and a budget, and receive a photorealistic AI render of the room fully furnished — using **only real, purchasable products** from local suppliers already in the marketplace. The tagged products auto-populate a cart for in-app checkout.

Core principle: **the AI never invents furniture.** Every rendered item maps to a real, in-stock SKU. The success metric is *render-to-purchase* — a user buying, in the same session, a product shown in their render.

- Full product spec: [`Spazio_PRD_v0.7.md`](./Spazio_PRD_v0.7.md)
- First milestone (one-week iOS pilot in Bogotá): [`Spazio_One_Week_iOS_Pilot.md`](./Spazio_One_Week_iOS_Pilot.md)

## Class demo (web)

The [`web-demo/`](./web-demo/) folder holds a **time-boxed, 2-day academic class-project demo** of the render-to-purchase happy path: a Next.js 15 (App Router) + React 19 + TypeScript + Tailwind 3.4 web app with **no database** (in-memory state), a seeded in-code catalog (11 SKUs, 3 Bogotá suppliers), a fallback-first cached render, and a **mock** checkout — it is a scoped visual demo, **not** production, not real payments, and not the full pilot. It walks landing → room → style + budget (COP) → simulated render with tappable product hotspots → cart → mock checkout → confirmation. Scope, feature mapping, and what is deliberately left out are documented in [`docs_en/13_class_demo_scope.md`](./docs_en/13_class_demo_scope.md); the full run/deploy guide is in [`web-demo/README.md`](./web-demo/README.md). Quick run: **Node 20+**, then `cd web-demo`, `npm install`, `npm run dev` → http://localhost:3000. For the **demo scope only** this supersedes the native-iOS decision by delivering on the web ([`ADR-023`](./docs_en/decisions/)); it changes nothing about the real product decisions or the production plan — it only records how the class demo is delivered.

## Status

Early stage. The immediate goal is the one-week iOS pilot: prove the render-to-purchase loop in one city, with a small hand-curated catalog and a human in the loop. See the pilot doc.

## Stack

Not yet decided. The pilot targets **native iOS**; backend, database, rendering pipeline, and payment gateway are open architecture decisions to be recorded in [`docs_en/02_architecture.md`](./docs_en/02_architecture.md) and as ADRs under [`docs_en/decisions/`](./docs_en/decisions/).

| Layer | Choice |
|---|---|
| Frontend | iOS (pilot) — TBD |
| Backend | TBD |
| Database | TBD |
| Rendering / AI | TBD |
| Payments | PCI-compliant gateway with split settlement — TBD |
| Hosting | TBD |

_This table and the sections below are filled in as decisions are made and recorded in the docs._

## How we work (team rules)

This repo enforces a documented, traceable workflow. **Read [`CLAUDE.md`](./CLAUDE.md) before contributing.** In short:

- **Branch model:** `develop` (default branch, daily work) and `main` (releases only). **Never commit or push directly to either** — always branch + Pull Request. Both branches are protected on GitHub.
- Branch from `develop`: `feature/FEAT-XXX-…` or `fix/BUG-XXX-…`; PR back into `develop`.
- Every change is tied to a GitHub **Issue** and an ID (`FEAT-`/`BUG-`/`FR-`…); commits carry the ID up front, e.g. `FEAT-004: add CSV export endpoint`.
- **Plan before coding** and wait for human sign-off.
- **Zero secrets** in commits (`.env`, keys, tokens).
- Integration strategy: **merge commit** (no squash, no rebase). Releases are tagged `vX.Y.Z` (SemVer) and recorded in `docs_en/10_release_notes.md`.

Full flow: [`docs_en/11_implementation_flow.md`](./docs_en/11_implementation_flow.md).

## Documentation

All living documentation is under [`docs_en/`](./docs_en/):

| Doc | Purpose |
|---|---|
| `01_product_vision.md` | Vision, target user, scope |
| `02_architecture.md` | Architecture & stack |
| `03_requirements.md` | Functional requirements (`FR-`) |
| `04_non_functional_requirements.md` | Non-functional requirements (`NFR-`) |
| `05_backlog.md` | Backlog with IDs |
| `06_api.md` | API contracts |
| `07_data_model.md` | Data model |
| `08_test_plan.md` | Test cases (`TC-`) |
| `09_ai_usage.md` | AI usage rules |
| `10_release_notes.md` | Release notes per version |
| `11_implementation_flow.md` | Mandatory implementation flow |
| `templates/` | Feature / bug / ADR / requirement / prompt templates |

## Contributing

1. Open an Issue using a template in [`.github/ISSUE_TEMPLATE/`](./.github/ISSUE_TEMPLATE/).
2. Branch from `develop`.
3. Follow the flow in [`docs_en/11_implementation_flow.md`](./docs_en/11_implementation_flow.md).
4. Open a Pull Request into `develop` using the PR template.
