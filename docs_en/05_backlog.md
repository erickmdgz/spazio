# Backlog

<!-- Living list of work. Each item is linked to a requirement (FR-/NFR-) and to a GitHub Issue. -->

This backlog lists the **features** that make up Spazio, derived from the PRD (`Spazio_PRD_v0.7.md`) and the one-week pilot (`Spazio_One_Week_iOS_Pilot.md`). It is the traceability bridge `FEAT → FR/NFR → feature doc → Issue → branch → PR → TC → release notes` described in `CLAUDE.md` (section 5) and `11_implementation_flow.md`.

**Reading notes:**

- **Status.** `Pending` = specification only. `In progress (#31)` = the render-to-purchase loop work (post-ADR-024): the web app runs the real loop against the backend — pilot-included FR subsets implemented and verified end-to-end on a local stack — but the feature does **not** meet its §2.4 Definition of Done (TC automation partial, role enforcement pending, image-gen/payment vendors still fake). No feature is `Done`. `Retired — ADR-025 (2026-07-14)` = the feature is removed from the target spec by `ADR-025` (autonomous render publication); the as-built code still implements it, and its removal from code is next-iteration work (see `FEAT-016`). The class demo (see **Class-demo coverage** below) originally exercised FEAT UIs over fakes; since #31 the same UI drives the real backend. Status reflects **work progress**, not requirement validity (validity lives in `03_requirements.md`).
- **Priority.** Feature criticality (`High` / `Medium` / `Low`), carried from the requirement registry.
- **Pilot.** `Yes` = in scope for the one-week iOS pilot; `No` = out of pilot scope, later phase. The critical-path subset of pilot features is listed again in the **Core pilot backlog** subsection below. *(Per ADR-024, 2026-07-14, the client is now the web app at class-demo scale — read `Pilot = Yes` as "core render-to-purchase loop"; iOS-specific UI work is void or its web equivalent.)*
- **Related requirement.** The functional requirements (`FR-`) each feature groups. The full FR text and acceptance criteria live in `03_requirements.md`; feature documents (`/docs_en/features/`) reference the FRs, they do not rewrite them.
- **Feature documents.** The pilot features (`Pilot = Yes`) have feature documents in `/docs_en/features/`. Documents for the non-pilot features (`FEAT-001`, `FEAT-012`, `FEAT-013`, `FEAT-014`) are intentionally deferred until their work begins: per `11_implementation_flow.md` (Step 3), a feature doc is created when the feature is picked up. `FEAT-016` (next-iteration refactor, ADR-025) likewise has no feature doc yet — deferred until its work begins; its scope is spelled out in the note below the table.
- **Issues.** GitHub Issue numbers are not assigned yet; each item gets its Issue when work on it starts (per `11_implementation_flow.md`, Step 1).
- **Human decisions.** Several features depended on choices reserved for humans in PRD §12; those choices have now been **made and recorded as ADRs** in `/docs_en/decisions/` (Status: Accepted, Scope: one-week iOS pilot, 2026-07-10), each defaulted to the simplest PRD-compliant pilot implementation: technology stack (ADR-001): native iOS (SwiftUI) + one managed backend + Postgres + object storage; AI/rendering pipeline (ADR-002): hosted generative image API, no custom model *(the mandatory-operator-QA clause is superseded by ADR-025, 2026-07-14 — renders are published immediately on generation success)*; payment gateway & split settlement (ADR-003): single hosted COP checkout, no split settlement in the pilot, operator pays suppliers manually (revisit before scale); merchant-of-record (ADR-004): the Spazio operating entity collects the single payment and pays suppliers manually (revisit before scale); style taxonomy (ADR-005): 1-2 predefined styles + free-text; commission % (ADR-007): 10%, reconciled manually; cart-hold duration (ADR-011): no stock hold in the pilot; daily free-render limit (ADR-009): no limit in the pilot; render-package pricing (ADR-010): not offered in the pilot; budget tolerance (ADR-008): 10%; catalog-sync frequency (ADR-012): manual / on-demand; render-time target (ADR-013): ~2-5 min soft target, no hard SLA; launch markets (ADR-015): Bogota, COP only; supplier partners (ADR-016): 2-4 hand-picked Bogota suppliers with a one-page agreement; taxes/compliance (ADR-018): single market (Colombia), handled manually (revisit before scale); privacy (ADR-019): photos/renders private by default, minimum data + consent (revisit before scale); warranty/disputes (ADR-020): no warranty display in the pilot, disputes handled manually; brand (ADR-021): dark-green + off-white palette, simple wordmark, system font). These are **decisions Accepted for the pilot**, not open questions (values marked "revisit before scale" stay Accepted for the pilot but carry a scale caveat); the FEAT rows and FR mappings below are unchanged.

## Feature backlog

| ID | Type | Name | Priority | Status | Pilot | Related requirement |
|---|---|---|---|---|---|---|
| FEAT-001 | Feature | Accounts & identity | Medium | Pending | No | FR-001, FR-002, FR-003 |
| FEAT-002 | Feature | Room capture & inputs | High | In progress (#31) | Yes | FR-005, FR-006, FR-011, FR-024 |
| FEAT-003 | Feature | Style & budget selection | High | In progress (#31) | Yes | FR-007, FR-008, FR-009, FR-010 |
| FEAT-004 | Technical | Localization & delivery coverage | High | Pending | Yes | FR-012, FR-013, FR-020, FR-046, FR-053 |
| FEAT-005 | Technical | AI rendering engine | High | In progress (#31) | Yes | FR-014, FR-015, FR-016, FR-017, FR-018, FR-019, FR-021, FR-022, FR-023 |
| FEAT-006 | Feature | Render review & moderation | High | Retired — ADR-025 (2026-07-14) | Yes | FR-027 (retired — ADR-025) |
| FEAT-007 | Feature | Product tagging & interaction | High | In progress (#31) | Yes | FR-028, FR-029 |
| FEAT-008 | Feature | Shopping cart & stock holds | High | In progress (#31) | Yes | FR-030, FR-031, FR-032, FR-033, FR-034, FR-035, FR-039, FR-040 |
| FEAT-009 | Feature | Estimates & warranty display | Medium | In progress (#31) | Yes | FR-036, FR-037, FR-038 |
| FEAT-010 | Feature | Checkout & payments | High | In progress (#31) | Yes | FR-004, FR-041, FR-042, FR-043, FR-044, FR-045 |
| FEAT-011 | Feature | Order fulfillment & tracking | Medium | Pending | Yes | FR-047, FR-061 |
| FEAT-012 | Feature | Keep-or-replace segmentation | Medium | Pending | No | FR-025, FR-026 |
| FEAT-013 | Feature | Render metering & monetization | Medium | Pending | No | FR-048, FR-049, FR-050, FR-054 |
| FEAT-014 | Feature | Targeted render refinement | Medium | Pending | No | FR-051, FR-052 |
| FEAT-015 | Technical | Supplier catalog management | High | In progress (#31) | Yes | FR-055, FR-056, FR-057, FR-058, FR-059, FR-060 |
| FEAT-016 | Refactor | Remove operator render-review gate (implement ADR-025 in code) | High | Pending | Yes | ADR-025 (retires FR-027 / FEAT-006) |

> **FEAT-016 scope (next development iteration; Issue #38):** remove the as-built render-review flow so renders are published to the requesting user immediately on generation success (`ADR-025`). Code touchpoints: **backend** — delete the operator render approve/reject endpoints and the `pending_review` queue read (`backend/src/routes/operator/renders.ts` + its registration in `backend/src/app.ts`; the operator catalog/order/session/console routes stay); drop the `RenderReviewStatus` enum, the `reviewStatus`/`reviewedAt`/`reviewedById` fields (and their index/FK/relation) and the `render_reviewer` value of `OperatorRole` from `backend/prisma/schema.prisma` via a **new** migration (`catalog_curator` and `order_handler` stay); move the FR-031 cart auto-populate trigger from approval to the render worker's generation-success path (`backend/src/jobs/renderWorker.ts`, caller of `backend/src/services/cart.ts`) and align the NFR-006 funnel event emission with the updated spec; return generation status (`queued`/`processing`/`completed`/`failed`) from the client render routes (`backend/src/routes/client/renders.ts`) with a completed render immediately visible (device-scoped 404 behavior, NFR-007, stays); remove `render_reviewer` from `backend/scripts/create-operator.ts`; **operator console** — remove the renders tab/queue (`operator/public/index.html`, `operator/public/app.js`); the console itself stays for catalog curation and order forwarding; **web-demo** — retype the render contract to generation status and drop the waiting-for-approval / rejected screens (`web-demo/src/lib/api.ts`, `web-demo/src/lib/store.tsx`, `web-demo/src/app/render/page.tsx`, reword `web-demo/src/app/cart/page.tsx`); **tests** — retire the approve/reject and render-review suites per `08_test_plan.md` (TC-051–TC-053, TC-108) and re-point role-gating / end-to-end tests at surviving flows and the generation-state response shape (`backend/test/routes.test.ts`, `backend/test/operator-auth.test.ts`, `backend/test/hardening.test.ts`, `backend/test/loop.test.ts`). Catalog curation and order forwarding are untouched. Data note: the migration needs no preservation rule for rows sitting in the retired review states (`pending_review`/`approved`/`rejected`) — nothing is deployed and only local seeded stacks exist (see the `12_pilot_build_plan.md` status note), so the review fields are dropped without a data mapping.

### Core pilot backlog (one-week iOS pilot)

These are the **critical-path** features that must work end-to-end for the pilot's happy-path demo (photo → inputs → render → tagged products → cart → checkout), with manual order forwarding *(the operator render-review step was retired by ADR-025, 2026-07-14 — renders are published immediately on generation success)*. They are a subset of the `Pilot = Yes` rows above; the other pilot rows (`FEAT-004`, `FEAT-009`, `FEAT-011`, `FEAT-015`) support this path but are not on its critical line.

| ID | Type | Name | Priority | Status | Related requirement |
|---|---|---|---|---|---|
| FEAT-002 | Feature | Room capture & inputs | High | In progress (#31) | FR-005, FR-006, FR-011, FR-024 |
| FEAT-003 | Feature | Style & budget selection | High | In progress (#31) | FR-007, FR-008, FR-009, FR-010 |
| FEAT-005 | Technical | AI rendering engine | High | In progress (#31) | FR-014, FR-015, FR-016, FR-017, FR-018, FR-019, FR-021, FR-022, FR-023 |
| FEAT-006 | Feature | Render review & moderation | High | Retired — ADR-025 (2026-07-14) | FR-027 (retired — ADR-025) |
| FEAT-007 | Feature | Product tagging & interaction | High | In progress (#31) | FR-028, FR-029 |
| FEAT-008 | Feature | Shopping cart & stock holds | High | In progress (#31) | FR-030, FR-031, FR-032, FR-033, FR-034, FR-035, FR-039, FR-040 |
| FEAT-010 | Feature | Checkout & payments | High | In progress (#31) | FR-004, FR-041, FR-042, FR-043, FR-044, FR-045 |

> Note: within these features, only the pilot-included FRs are exercised in the one-week pilot (see the `pilotIncluded` flag per FR in the requirement registry / `03_requirements.md`). Non-pilot FRs grouped under the same feature (for example stock holds `FR-039`/`FR-040` in `FEAT-008`, or split settlement `FR-043` and per-supplier POs `FR-044` in `FEAT-010`) are part of the feature's full spec but out of the pilot's scope. `FEAT-006` stays listed here for history but is no longer on the critical path (retired — ADR-025, 2026-07-14).

## Class-demo coverage

> **Scope of this subsection.** This records how a **time-boxed, 2-day academic class-project demo** (`web-demo/` — a Next.js 15 / React 19 / TypeScript / Tailwind 3.4 web app, **no database**, in-memory state in `src/lib/store.tsx`) exercises the FEATs above. The demo walks the render-to-purchase happy path (`/` → `/room` → `/style` → `/render` → product sheet → `/cart` → `/checkout` → `/confirmation`) as a scoped visual demo. It is **not production**, **not** the full one-week pilot, and it **does not change any FEAT row, priority, or FR mapping above, nor any real product decision**. For the demo scope only (the production plan and ADRs are unchanged), it supersedes: `ADR-001` (a web app instead of native iOS); `ADR-003`/`ADR-004` (a mock checkout — no real payment or settlement); `ADR-006`/`ADR-012`/`ADR-015` (a seeded in-code catalog instead of operator/self-service ingestion); and it uses no database (vs managed Postgres). The render is fallback-first and **faked/cached** (offline SVG assets) with no operator QA, so `ADR-002` is only partially realized. *(Per ADR-025, 2026-07-14, ADR-002's operator-QA clause is superseded — the "no operator QA" gap noted here no longer applies to the target spec.)*

Coverage legend: **Demo fidelity** = exercised at the UI level, backed by fakes; **Simplified** = present but hardcoded; **Not in demo** = out of the demo's scope.

| FEAT | Name | Demo coverage | Note |
|---|---|---|---|
| FEAT-002 | Room capture & inputs | Demo fidelity | Sample living/bedroom or upload → prepared result; approximate dimensions |
| FEAT-003 | Style & budget selection | Demo fidelity | 3 styles + free-text + COP budget slider (2,000,000–12,000,000) |
| FEAT-005 | AI rendering engine | Demo fidelity | Render is faked/cached; `OpenAIRenderProvider` stub used only if `IMAGE_API_KEY` is set, with silent fallback |
| FEAT-007 | Product tagging & interaction | Demo fidelity | Tappable product hotspots on the render → product detail sheet |
| FEAT-008 | Shopping cart & stock holds | Demo fidelity | Cart items, per-item + total COP, budget-vs-total, remove/swap (no stock holds) |
| FEAT-009 | Estimates & warranty display | Demo fidelity | Per-item delivery/production dates shown (no warranty display) |
| FEAT-010 | Checkout & payments | Demo fidelity | Contact-only checkout; a **mock** "Pay $ X" button (amount in COP); order grouped by supplier, one PO each |
| FEAT-011 | Order fulfillment & tracking | Demo fidelity | Confirmation with order number, per-supplier breakdown, operator-in-the-loop message |
| FEAT-004 | Localization & delivery coverage | Simplified | Hardcoded to Bogota / COP |
| FEAT-006 | Render review & moderation | Not in demo | No operator render review (render is faked/cached). *(FEAT-006 retired — ADR-025, 2026-07-14.)* |
| FEAT-015 | Supplier catalog management | Not in demo | Replaced by a seeded in-code catalog (11 SKUs, 3 Bogota suppliers) |
| FEAT-001 | Accounts & identity | Not in demo | No accounts (contact-only checkout per `ADR-022`) |
| FEAT-012 | Keep-or-replace segmentation | Not in demo | — |
| FEAT-013 | Render metering & monetization | Not in demo | — |
| FEAT-014 | Targeted render refinement | Not in demo | — |

For how to run and deploy the class demo, see `web-demo/README.md`.

## Allowed types

- `Feature`
- `Bug`
- `Technical`
- `Enhancement`
- `Documentation`
- `Security`
- `Refactor`
