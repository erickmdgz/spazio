# Spazio

> AI-generated space design & shoppable furniture marketplace.

## Description

Spazio lets someone furnishing a room upload or capture a photo of their space, choose a style (from a catalog or in free text) and a budget, and receive a photorealistic AI render of the room fully furnished — using **only real, purchasable products** from local suppliers already in the marketplace. The tagged products auto-populate a cart for in-app checkout.

Core principle: **the AI never invents furniture.** Every rendered item maps to a real, in-stock SKU. The success metric is *render-to-purchase* — a user buying, in the same session, a product shown in their render.

- Full product spec: [`Spazio_PRD_v0.7.md`](./Spazio_PRD_v0.7.md)
- First-milestone source doc (one-week iOS pilot in Bogotá, **historical**): [`Spazio_One_Week_iOS_Pilot.md`](./Spazio_One_Week_iOS_Pilot.md) — the platform decision has since changed: per [`ADR-024`](./docs_en/decisions/ADR-024_web-app-platform-pivot.md) (2026-07-14) the product continues on the **web app**, and no native iOS app will be built.

## Class demo (web)

The [`web-demo/`](./web-demo/) folder holds a **time-boxed, 2-day academic class-project demo** of the render-to-purchase happy path: a Next.js 15 (App Router) + React 19 + TypeScript + Tailwind 3.4 web app with **no database** (in-memory state), a seeded in-code catalog (11 SKUs, 3 Bogotá suppliers), a fallback-first cached render, and a **mock** checkout — it is a scoped visual demo, **not** production, not real payments, and not the full pilot. It walks landing → room → style + budget (COP) → simulated render with tappable product hotspots → cart → mock checkout → confirmation. Scope, feature mapping, and what is deliberately left out are documented in [`docs_en/13_class_demo_scope.md`](./docs_en/13_class_demo_scope.md); the full run/deploy guide is in [`web-demo/README.md`](./web-demo/README.md). For the **demo scope only** this superseded the native-iOS decision by delivering on the web ([`ADR-023`](./docs_en/decisions/)). **Update ([`ADR-024`](./docs_en/decisions/ADR-024_web-app-platform-pivot.md), 2026-07-14 + #31):** the web app is now the **product platform**, wired to the real backend — the wizard persists to Postgres, renders wait for operator approval, and checkout creates real orders on a fake gateway. Full-stack quick run (Node 22+, Docker):

```bash
cd backend && docker compose up -d db && cp .env.example .env   # set PORT=3001
npm install && npm run db:generate && npx prisma migrate dev && npm run db:seed
npm run operator:create -- --email you@example.com --name "You" --role render_reviewer
npm run dev &                    # backend on :3001 (+ console at /operator/console)
cd ../web-demo && npm install && npm run dev                    # web on :3000
```

## Status

Early stage. The immediate goal is to prove the render-to-purchase loop in one city on the **web app**, wired to the real backend, at class-demo scale (ADR-024) — with a small hand-curated catalog and a human in the loop.

## Stack

The stack is decided and recorded as Accepted ADRs ([ADR-001..ADR-024](./docs_en/decisions/)). Architecture detail lives in [`docs_en/02_architecture.md`](./docs_en/02_architecture.md).

| Layer | Choice |
|---|---|
| Frontend | Web app (Next.js, [`web-demo/`](./web-demo/)) — ADR-024 (originally native iOS per ADR-001; class demo per ADR-023) |
| Backend | Node.js 22 + TypeScript (Fastify) + Prisma — ADR-001 implementation note; scaffold in [`backend/`](./backend/) (PR #21) |
| Database | Managed Postgres + object storage — ADR-001 |
| Rendering / AI | Hosted generative image API behind an interface, mandatory operator QA; vendor an implementation task — ADR-002 |
| Payments | Single hosted PCI-compliant COP capture, no split settlement in the pilot (manual payout); vendor TBD — ADR-003/ADR-004 |
| Hosting | TBD, single managed environment — ADR-001 |

_Decisions are recorded as ADRs under [`docs_en/decisions/`](./docs_en/decisions/); this table reflects them._

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
| `12_pilot_build_plan.md` | Approved pilot build plan (iOS program superseded by ADR-024; loop design still authoritative) |
| `13_class_demo_scope.md` | Class-demo scope and feature mapping |
| `decisions/` | ADR-001..ADR-024 |
| `features/` | FEAT specifications |
| `templates/` | Feature / bug / ADR / requirement / prompt templates |

## Contributing

1. Open an Issue using a template in [`.github/ISSUE_TEMPLATE/`](./.github/ISSUE_TEMPLATE/).
2. Branch from `develop`.
3. Follow the flow in [`docs_en/11_implementation_flow.md`](./docs_en/11_implementation_flow.md).
4. Open a Pull Request into `develop` using the PR template.
