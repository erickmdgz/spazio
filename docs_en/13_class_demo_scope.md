# Class demo scope (2-day academic demo)

## 1. What this is — and what it is NOT

This document describes **`web-demo/`**, a time-boxed **2-day academic class-project demo** of the Spazio **render-to-purchase happy path**. It is a **scoped visual demo**, built to look real and run flawlessly along one click path (room → style & budget → render → tagged products → cart → checkout → confirmation).

**What it is:**

- A **Next.js 15 (App Router) + React 19 + TypeScript + Tailwind 3.4** web app.
- **No database.** All wizard and cart state is in-memory (`src/lib/store.tsx`) and resets on refresh.
- A faithful-in-spirit walkthrough of the core product loop, suitable for showing on any laptop or projector, offline, in a single `npm run dev`.
- Built and verified in the authoring sandbox: `npm run build` succeeds, lint is clean, and a runtime smoke test returns HTTP 200 on all routes.

**What it is NOT:**

- **Not production software.** No accounts, no real payments, no settlement, no error hardening beyond the demo flow.
- **Not the pilot.** It does not replace or reopen the one-week iOS pilot build plan (`12_pilot_build_plan.md`) or any Accepted ADR.
- **Not deployed.** Nothing here is running in production; nothing here is production-ready.

> **Framing that applies to this whole document:** the choices below change **nothing** about the real product decisions. They only record **how the class demo is delivered**. The production plan and the ADRs remain unchanged and authoritative.
>
> **Update (ADR-024, 2026-07-14):** the product direction has since changed — the web app recorded here **is now the product platform** (no native iOS will be built), to be wired to the real backend in small increments. This document stays as the accurate record of the 2-day demo as delivered; ADR-024 records the pivot.
>
> **Update (#31, PR #32/#33):** the wiring happened. The app now runs the REAL loop against `backend/` (`/api/v1` via a Next.js rewrite): project + photo + inputs persist in Postgres, renders wait for real operator approval (no more fake instant render), the cart auto-populates from the approved render, and checkout captures on the fake gateway with a real `Order`/`PurchaseOrder`/commission trail. Still demo-scoped: the composite image remains a cached local asset (ADR-002 vendor open) and no real money moves (ADR-003 vendor open). The "no database / in-memory state" description below records the demo **as originally delivered**.
>
> **Update (ADR-025, 2026-07-14):** the mandatory operator render-review gate (`FEAT-006` / `FR-027`, the *mandatory operator QA* clause of `ADR-002`) is **retired entirely** — renders are published to the user immediately on generation success. The review-wait behaviour the #31 note above describes has since been removed from the code, implemented by FEAT-016 (#38; see `05_backlog.md`). Read the "no operator QA" notes below accordingly: they recorded a demo-scope *gap* versus the real product, and per ADR-025 that gap no longer exists because the gate itself is gone. Catalog curation (FEAT-015) and manual order forwarding (FEAT-011) are unchanged; the rest of ADR-002 (hosted image API, no custom model) stands.
>
> **Update (ADR-027, 2026-07-15) — public-catalog bootstrap fallback:** because **Spazio has no onboarded suppliers yet**, the demo's catalog is a **dual-track** one. The supplier track keeps its **seeded fake-supplier data** (the 11-SKU seeded catalog below), and a **seeded Amazon Berkeley Objects (ABO) subset** (CC BY 4.0, attributed) is added as a temporary **`source=public`** track so the app has real products — real dimensions/materials/images — to match, render, and display for the demo. Public products are **display-only**: clearly labeled **"not sold by Spazio"** with a **"View at retailer" outbound link**, and **never** added to cart/checkout/orders (nor to commission/merchant-of-record or the render-to-purchase metric). The founding real-purchasable-SKU guarantee (BR-6/BR-14/FR-016) stays fully in force for the supplier track — this is **quarantine, not dilution**. This is a **docs-first** decision (FEAT-017, Issue #43); no `web-demo/` code for the ABO track has shipped yet, so the "seeded in-code catalog" described below records the demo **as originally delivered** (supplier track only). See `decisions/ADR-027_public-catalog-bootstrap-fallback.md` and `features/FEAT-017_public-catalog-fallback.md`.

---

## 2. Relationship to the real plan (demo-scope supersessions)

For the demo scope **only**, a handful of Accepted decisions are intentionally set aside so the whole loop fits a 2-day build and runs offline. Each supersession is local to this demo; the underlying ADR is **not reopened**.

| Real decision (unchanged) | Demo delivers instead | Scope |
|---|---|---|
| **ADR-001** — native iOS (SwiftUI) + managed backend + object storage | A single-process **web app** (Next.js + React + TypeScript + Tailwind) | Demo scope only |
| **ADR-003 / ADR-004** — hosted PCI checkout in COP; merchant-of-record / manual supplier settlement | **Mock checkout** — a mock "Pay $ X" button (amount in COP) with a spinner; no real payment, no settlement | Demo scope only |
| **ADR-006 / ADR-012 / ADR-015** — operator/self-service catalog ingestion, sync cadence, launch-market setup | A **seeded in-code catalog** (`src/lib/catalog.ts`) | Demo scope only |
| **Managed Postgres** (per the pilot foundation) | **No database** — in-memory state (`src/lib/store.tsx`) | Demo scope only |

Two further notes on fidelity:

- **ADR-002 (rendering pipeline)** is only **partially realized**: the render is faked/cached and there is **no operator QA** in the demo (see §5). *(Per ADR-025, 2026-07-14, the operator-QA clause of ADR-002 has since been retired product-wide; the missing QA is no longer a demo-scope gap. The faked/cached render still is.)*
- **FEAT-004 (localization & delivery coverage)** is **simplified/hardcoded** to Bogotá / COP.

---

## 3. The happy-path flow (routes)

The demo is an 8-step flow across 7 routes (the product detail sheet, step 5, is a modal overlay rather than a route):

1. `/` — landing (value prop + Start).
2. `/room` — **upload a photo of your room** (primary; real image bytes are sent to the backend and composited by the engine — ADR-026), or, with no photo handy, pick the **single real sample photo** ("No photo handy? Try a sample"); approximate dimensions. *(As built 2026-07-15: the two prior illustration samples were replaced by one real sample photo; upload is no longer routed to a preset — see FEAT-002.)*
3. `/style` — pick a style (**Modern Mediterranean**, **Warm Minimalist**, **Scandinavian**), optional free-text note, and a **COP budget slider** (2,000,000 – 12,000,000).
4. `/render` — a simulated "generating…" state, then the furnished render with **tappable product hotspots** and a budget indicator (**10% tolerance**).
5. **Product detail sheet** (`ProductSheet.tsx`) — image, name, price (COP), supplier, category, lead time, add/remove.
6. `/cart` — items with per-item and total COP, budget-vs-total indicator, remove/swap.
7. `/checkout` — minimal contact (email / phone / address per **ADR-022** — no accounts); order **grouped by supplier, one PO each**; a **mock** "Pay $ X" button (amount in COP).
8. `/confirmation` — order number, per-supplier breakdown, per-item delivery/production dates, and an operator-in-the-loop message.

---

## 4. Feature mapping

Demo status legend: **Exercised at demo fidelity** = present in the UI along the happy path, backed by fakes; **Simplified/hardcoded** = present but reduced to a fixed case; **Not in demo** = out of scope for this class project.

| FEAT id | Name | Demo status |
|---|---|---|
| FEAT-001 | Accounts & identity | Not in demo |
| FEAT-002 | Room capture & inputs | Exercised at demo fidelity (via sample rooms + approximate dimensions) |
| FEAT-003 | Style & budget selection | Exercised at demo fidelity |
| FEAT-004 | Localization & delivery coverage | Simplified/hardcoded (fixed to Bogotá / COP) |
| FEAT-005 | AI rendering engine | Exercised at demo fidelity (render is **faked/cached** — see §5) |
| FEAT-006 | Render review & moderation | Not in demo (no operator QA) — *feature since retired product-wide, ADR-025 (2026-07-14)* |
| FEAT-007 | Product tagging & interaction | Exercised at demo fidelity |
| FEAT-008 | Shopping cart & stock holds | Exercised at demo fidelity (cart; no real stock holds) |
| FEAT-009 | Estimates & warranty display | Exercised at demo fidelity (estimates display) |
| FEAT-010 | Checkout & payments | Exercised at demo fidelity (**mock payment** — see §5) |
| FEAT-011 | Order fulfillment & tracking | Exercised at demo fidelity (confirmation / order message) |
| FEAT-012 | Keep-or-replace segmentation | Not in demo |
| FEAT-013 | Render metering & monetization | Not in demo |
| FEAT-014 | Targeted render refinement | Not in demo |
| FEAT-015 | Supplier catalog management | Not in demo (replaced by the seeded catalog) |

Note: the "exercised at demo fidelity" features are shown **at the UI level only, backed by fakes** — they demonstrate the intended user experience, not the production implementation.

---

## 5. What is faked

Three things are deliberately simulated so the demo always works and never depends on external services:

- **Render is fallback-first (cached/offline).** `CachedRenderProvider` is the default: it serves prepared, local SVG assets for every room+style scenario, works offline, and always succeeds. `OpenAIRenderProvider` is an **isolated stub**, used only if `IMAGE_API_KEY` is set (server-side via `src/app/actions.ts`), with **silent fallback to the cached provider** on any error. In the demo the render is faked/cached.
- **No operator QA.** Because the render is cached, there is no render-review / moderation step. This is why **ADR-002** is only **partially realized** (FEAT-006 is not in the demo). *(Superseded framing — ADR-025, 2026-07-14: the operator render-review gate is retired product-wide, so its absence is no longer a fidelity gap; ADR-002's hosted-image-API decision stands.)*
- **Payment is mocked.** `/checkout` shows a mock "Pay $ X" button (amount in COP) with a brief processing spinner; there is **no real payment and no settlement** (superseding ADR-003/ADR-004 for the demo scope only).

The catalog is also fixed rather than ingested: **`src/lib/catalog.ts`** seeds **11 SKUs** across **3 Bogotá suppliers** (**Maderos del Norte**, **Textiles Bacatá**, **Lumina Bogotá**) — **2 made-to-order** and **9 ready-made** — standing in for FEAT-015 / ADR-006 / ADR-012 / ADR-015. This seeded catalog is the **supplier track** (fake-supplier data). *(Per **ADR-027**, 2026-07-15, because Spazio has no onboarded suppliers yet, a temporary **`source=public`** track — a seeded **Amazon Berkeley Objects** subset, CC BY 4.0, attributed — is specified to supply real demo products for matching/render/display; those public products are **display-only**, labeled **"not sold by Spazio"** with a **"View at retailer" outbound link**, and never enter cart/checkout. This is **docs-first** (FEAT-017, Issue #43) — not yet built in `web-demo/`. See `decisions/ADR-027_public-catalog-bootstrap-fallback.md`.)*

---

## 6. How to run and deploy

Concise version below; the **full guide lives in `web-demo/README.md`** (including the demo click-path script and how to swap in real cached renders).

**Run locally:**

```bash
cd web-demo
npm install
# optional, to try the render stub:
#   set IMAGE_API_KEY in .env.local
npm run dev
# open http://localhost:3000
```

- **Prerequisites:** Node.js 20+ and npm.
- The demo works fully **without** any key (cached provider). Setting `IMAGE_API_KEY` (server-side) enables the stub, which silently falls back to cached on any error.

**Deploy (Vercel):** import the repository, set the **project root to `web-demo`**, accept the auto-detected Next.js preset, and deploy. Env vars are optional — skip them to use the offline demo. (Not currently deployed.)

---

## 7. How it maps back to the pilot and the PRD

- **Pilot build plan (`12_pilot_build_plan.md`).** The pilot proves the same core loop — *render-to-purchase*, operator-in-the-loop, manual fulfilment — but as the real system: native iOS + a managed backend + managed Postgres + object storage, a self-hosted FLUX.2 Klein 4B render (run locally via the mflux CLI) — ADR-026 ~~gated by **mandatory operator QA** (ADR-002)~~ *(QA gate since retired — ADR-025; renders publish on generation success)*, a real COP capture via hosted PCI checkout, and an operator-loaded catalog (30–60 SKUs). This class demo shows the **user-facing experience** of that loop at UI fidelity, with the render, payment, and catalog **faked** as described above. Everything the demo simplifies (§2) is fully specified in the pilot plan and its ADRs.
- **PRD (`Spazio_PRD_v0.7.md`).** The demo honors the product's central promise — a room furnished **only with real, purchasable SKUs**, each rendered item mapping to a real catalog entry, ending in in-session purchase. It intentionally omits the product areas outside the happy path (accounts, keep-or-replace, render metering, targeted edits, full catalog management), which remain in the PRD and pilot scope.
- **Recent related work on `develop`.** The `backend/` foundation scaffold (Node/TS/Fastify/Prisma, PR #21) and the pilot build plan (`docs_en/12_pilot_build_plan.md`, PR #19) belong to the **real pilot track**. This class demo is a separate, self-contained teaching artifact and does not depend on them.

> **Bottom line:** the demo is a faithful, scoped illustration of the render-to-purchase experience for a 2-day academic exercise. It does not deliver production capabilities, does not process real payments, and does not change any real product decision.
