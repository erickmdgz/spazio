# Spazio

> AI-generated space design & shoppable furniture marketplace.

## Description

Spazio lets someone furnishing a room upload a photo of their space, choose a product **source** and a **style** (with a COP budget), **browse the real catalog and pick up to 3 products**, and render exactly those pieces into their own room photo — using **only real, purchasable products**. Supplier items then go to an in-app cart and checkout.

> **Flow note (ADR-028, 2026-07-15):** the current flow is **user-curated browse-and-select** (pick up to 3 items, then render), which **inverts** the original PRD §8 auto-furnish flow (where the AI chose the furniture and the tagged products auto-populated the cart). Auto-match (FR-014/FR-015) survives as an **optional fallback** used only when a render request carries no user selection. The original auto-furnish flow is preserved as PRD/pilot history.

Core principle: **the AI never invents furniture.** Every rendered item maps to a real SKU. The success metric is *render-to-purchase* — a user buying, in the same session, a product shown in their render. *(Scoped by **ADR-027**, 2026-07-15: this guarantee governs the purchasable **supplier** track; a clearly-labeled, display-only **public/brand** track — Amazon Berkeley Objects, CC BY 4.0 — is real, attributed inventory shown "not sold by Spazio" with a "View at retailer" link, never carted, and excluded from the metric.)

## Current system (as built, 2026-07-15)

This is what is **built and verified on a local stack** (Node 22 / Fastify / Prisma / Postgres backend + `web-demo/` Next.js web app). **Nothing is deployed or released** (no `vX.Y.Z` tag yet); the render host must be Apple Silicon.

**Full overview** (architecture + infrastructure diagrams, main features, and app flow): [`docs_en/00_overview.md`](./docs_en/00_overview.md). Three known gaps — placeholder local-supplier images (generic renders), mock payments, and no deployment — are **accepted demo-scope limitations**, not pending work, recorded in [`ADR-029`](./docs_en/decisions/ADR-029_demo-scope-accepted-limitations.md).

- **Platform:** a **web app** (`web-demo/`), not a native iOS app (ADR-024). It runs against the real backend over `/api/v1`.
- **Flow (ADR-028):** landing → upload your room photo (real image bytes; large phone photos are downscaled + EXIF-oriented, BUG-001) + approximate dimensions → choose **SOURCE** (Local suppliers | Brand suppliers) → choose **STYLE** + COP budget → **browse the real catalog & select up to 3 products** → **render** the selection → "like it?": *Love it → cart* (Local) / per-item *View at retailer* (Brand) / *Try other furniture* (iterate, keeping photo/source/style) → cart → mock checkout → confirmation.
- **Sources (ADR-027):** **Local suppliers** = `source=supplier` (seeded Bogotá SKUs) — purchasable; their images are currently placeholder SVGs, so their render is generic (known gap). **Brand suppliers** = `source=public` (Amazon Berkeley Objects, CC BY 4.0) — real product photos, composited for real, but **display-only**.
- **Render engine (ADR-026):** self-hosted **FLUX.2 Klein 4B via the mflux CLI** on an Apple-Silicon render worker. `RENDER_ENGINE` defaults to **`fake`** (a placeholder/cached visual that keeps CI hermetic); set `RENDER_ENGINE=mflux` for the real engine. Renders are **published immediately on generation success** — no operator render-review (ADR-025 / FEAT-016).
- **Checkout:** single COP capture on a **mock/fake gateway** (real payment vendor still unchosen — ADR-003), a per-supplier `PurchaseOrder`, and **manual** operator forwarding.
- **Operator console** (`/operator/console`): catalog curation (`catalog_curator`) and order forwarding (`order_handler`) only — there is **no** render-review role.
- **Not done:** not deployed anywhere; real payments unchosen (checkout is mock); Local-supplier real product images (still placeholder).

- Full product spec: [`Spazio_PRD_v0.7.md`](./Spazio_PRD_v0.7.md)
- First-milestone source doc (one-week iOS pilot in Bogotá, **historical**): [`Spazio_One_Week_iOS_Pilot.md`](./Spazio_One_Week_iOS_Pilot.md) — the platform decision has since changed: per [`ADR-024`](./docs_en/decisions/ADR-024_web-app-platform-pivot.md) (2026-07-14) the product continues on the **web app**, and no native iOS app will be built.

## Web app (the product platform)

The [`web-demo/`](./web-demo/) folder is the **web app** — the product platform (ADR-024), a Next.js 15 (App Router) + React 19 + TypeScript + Tailwind 3.4 app **wired to the real backend** over `/api/v1`. It is **built and verified on a local stack, not deployed and not released** (no `vX.Y.Z` tag; not production, not real payments). The wizard persists to Postgres, renders are real rows, and checkout creates real orders on a **mock/fake gateway**. The current flow (ADR-028) is: landing → upload room photo + dimensions → choose **source** (Local suppliers | Brand suppliers) → **style** + COP budget → **browse the real catalog & select up to 3 products** → **render** the selection → "like it?" (*Love it → cart* for Local / *View at retailer* for Brand / *Try other furniture* to iterate) → cart → mock checkout → confirmation. Scope, feature mapping, and what is deliberately left out are in [`docs_en/13_class_demo_scope.md`](./docs_en/13_class_demo_scope.md); the run guide is in [`web-demo/README.md`](./web-demo/README.md).

> **History:** `web-demo/` began as a **time-boxed, 2-day academic class demo** — a single-process web app with **no database** (in-memory state), a seeded in-code catalog, a fallback-first **cached** render, tappable product hotspots on an auto-furnished render, and a mock checkout, delivered for the **demo scope only** ([`ADR-023`](./docs_en/decisions/)). **Update ([`ADR-024`](./docs_en/decisions/ADR-024_web-app-platform-pivot.md), 2026-07-14 + #31):** it graduated to the product platform, wired to the real backend. **Notes:** [`ADR-025`](./docs_en/decisions/ADR-025_autonomous-render-publication.md) (2026-07-14) removed the operator render-review gate (renders publish immediately on generation success; code removal by **FEAT-016 (#38)**); [`ADR-026`](./docs_en/decisions/ADR-026_self-hosted-render-engine.md) set the render engine to self-hosted FLUX.2 Klein 4B via mflux; [`ADR-027`](./docs_en/decisions/ADR-027_public-catalog-bootstrap-fallback.md) added the display-only public/brand catalog track; [`ADR-028`](./docs_en/decisions/ADR-028_user-curated-furniture-selection.md) inverted the flow to browse-and-select. The commands below reflect the current flow. Full-stack quick run (Node 22+, Docker):

```bash
cd backend && docker compose up -d db && cp .env.example .env   # set PORT=3001
npm install && npm run db:generate && npx prisma migrate dev && npm run db:seed
npm run operator:create -- --email you@example.com --name "You"   # all-purpose (catalog curation + order forwarding)
npm run dev &                    # backend on :3001 (+ console at /operator/console)
cd ../web-demo && npm install && npm run dev                    # web on :3000
```

This quick run uses the default `RENDER_ENGINE=fake` (a placeholder/cached visual, no GPU needed). For **real** renders set `RENDER_ENGINE=mflux` in `backend/.env` — this needs the **mflux** CLI installed on an **Apple-Silicon** host (ADR-026); Local-supplier renders are still generic because their catalog images are placeholder SVGs.

## Status

Early stage. The immediate goal is to prove the render-to-purchase loop in one city on the **web app**, wired to the real backend, at class-demo scale (ADR-024) — with a small hand-curated catalog and a human in the loop for catalog curation and order handling (the render-review gate is removed per ADR-025; renders are published immediately on generation success).

## Stack

The stack is decided and recorded as Accepted ADRs ([ADR-001..ADR-028](./docs_en/decisions/)). Architecture detail lives in [`docs_en/02_architecture.md`](./docs_en/02_architecture.md).

| Layer | Choice |
|---|---|
| Frontend | Web app (Next.js, [`web-demo/`](./web-demo/)) — ADR-024 (originally native iOS per ADR-001; class demo per ADR-023) |
| Backend | Node.js 22 + TypeScript (Fastify) + Prisma — ADR-001 implementation note; scaffold in [`backend/`](./backend/) (PR #21) |
| Database | Managed Postgres + object storage — ADR-001 |
| Rendering / AI | Self-hosted **FLUX.2 Klein 4B via the mflux CLI** on an Apple-Silicon render worker — **ADR-026** (2026-07-14), superseding ADR-002's hosted-generative-image-API clause. `RENDER_ENGINE=mflux` runs the real engine; the default `fake` provider keeps CI hermetic. Renders publish immediately on generation success — no operator QA (ADR-025). |
| Payments | Single hosted PCI-compliant COP capture, no split settlement in the pilot (manual payout); vendor still unchosen, checkout is a **mock/fake gateway** — ADR-003/ADR-004 |
| Hosting | Not deployed (local dev only). The render worker **must be Apple Silicon** for the real engine (ADR-026); the API backend is otherwise a single managed environment — ADR-001 |

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
| `12_pilot_build_plan.md` | Approved pilot build plan (iOS program superseded by ADR-024; loop design still authoritative except the render-review step, superseded by ADR-025) |
| `13_class_demo_scope.md` | Class-demo scope and feature mapping |
| `decisions/` | ADR-001..ADR-028 |
| `features/` | FEAT specifications |
| `templates/` | Feature / bug / ADR / requirement / prompt templates |

## Contributing

1. Open an Issue using a template in [`.github/ISSUE_TEMPLATE/`](./.github/ISSUE_TEMPLATE/).
2. Branch from `develop`.
3. Follow the flow in [`docs_en/11_implementation_flow.md`](./docs_en/11_implementation_flow.md).
4. Open a Pull Request into `develop` using the PR template.
