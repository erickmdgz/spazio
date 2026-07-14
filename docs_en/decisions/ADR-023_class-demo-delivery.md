# ADR-023 - Class-demo delivery

## Status

Accepted (demo scope).

## Context

A **time-boxed, 2-day academic class-project demo** of the render-to-purchase happy path is needed. The goal is to demonstrate, at the UI level, the flow from picking a room through style/budget, a furnished render with tappable products, cart, checkout, and a confirmation/order message.

The documented production decisions are heavier than a 2-day timebox allows, and none of them is necessary to *show* render-to-purchase:

- **ADR-001** fixes a native iOS (SwiftUI) client plus a managed backend and Postgres. Building and running that on iOS in two days is impractical for a class demo.
- **ADR-003 / ADR-004** cover real COP payments and split settlement. Standing up real (even sandbox) payments and settlement is out of reach and unnecessary to demonstrate the flow.
- **ADR-006 / ADR-012 / ADR-015** cover operator/self-service catalog ingestion and management. A demo does not need real ingestion; a small seeded catalog is enough to show product tagging, cart, and estimates.
- A managed Postgres database adds setup and state-management overhead that a scoped visual demo does not need.

This ADR records **how the class demo is delivered**. It is a scoped visual demo, **not production**, **not the full pilot**, and it **changes nothing about the real product decisions**: the production plan and the ADRs above remain in force for the real product.

## Decision

Deliver the demo as **`web-demo/`** — a **Next.js 15 (App Router) + React 19 + TypeScript + Tailwind 3.4** web app with **no database** and in-memory state (`src/lib/store.tsx`). The demo is **fallback-first** on rendering, uses **mock checkout**, and ships with a **seeded in-code catalog**.

Concretely, for the demo scope only:

- **Client:** a Next.js web app instead of native iOS.
- **Render:** fallback-first. `CachedRenderProvider` is the default — offline, using local SVG assets, and always works. `OpenAIRenderProvider` is an isolated stub used only if `IMAGE_API_KEY` is set (server-side via `src/app/actions.ts`), with silent fallback to cached. In the demo the render is **faked/cached** and there is **no operator QA**, so ADR-002 is only partially realized.
- **Checkout:** mock only. No real payment and no settlement; checkout groups the order by supplier (one PO each) and shows a mock "Pay COP $X". Per **ADR-022**, checkout collects minimal contact details (email/phone/address) with **no accounts**.
- **Catalog:** a seeded in-code catalog (`src/lib/catalog.ts`) with 11 SKUs across 3 Bogota suppliers (Maderos del Norte, Textiles Bacata, Lumina Bogota) — 2 made-to-order and 9 ready-made — instead of operator/self-service ingestion.
- **Persistence:** in-memory state, no database.

**Routes/flow:** `/` (landing) → `/room` (pick a sample living/bedroom or upload → prepared result; approximate dimensions) → `/style` (Modern Mediterranean / Warm Minimalist / Scandinavian + free text + COP budget slider 2,000,000–12,000,000) → `/render` (simulated generate, then a furnished render with tappable product hotspots + budget indicator, 10% tolerance) → product detail sheet (`ProductSheet.tsx`) → `/cart` (items, per-item + total COP, budget-vs-total, remove/swap) → `/checkout` (minimal contact per ADR-022, order grouped by supplier, one PO each, mock pay) → `/confirmation` (order number, per-supplier breakdown, per-item delivery/production dates, operator-in-the-loop message).

**Feature mapping (demo fidelity — exercised at the UI level only, backed by fakes):** FEAT-002 (room + dimensions via sample rooms), FEAT-003 (style + budget), FEAT-005 (render — faked/cached), FEAT-007 (product tagging), FEAT-008 (cart), FEAT-009 (estimates display), FEAT-010 (checkout — mock payment), FEAT-011 (confirmation/order message). **Simplified/hardcoded:** FEAT-004 (localization fixed to Bogota/COP). **Not in the demo:** FEAT-006 (operator render review), FEAT-015 (catalog management — replaced by the seeded catalog), and FEAT-001/FEAT-012/FEAT-013/FEAT-014 (accounts, keep-or-replace, metering, targeted edits).

This **supersedes ADR-001, ADR-003, ADR-004, ADR-006, ADR-012, and ADR-015 for the demo scope only**. Those ADRs remain in force for the real product; this ADR does not modify them.

**Scope:** 2-day academic class-project demo of the render-to-purchase happy path.

**Run/deploy note:** Node 20+, `cd web-demo`, `npm install`, optionally set `IMAGE_API_KEY` in `.env.local`, then `npm run dev` → http://localhost:3000. Deploy via Vercel (import the repo, project root = `web-demo`). The full guide is in `web-demo/README.md`. The demo is built and verified in the authoring sandbox (`npm run build` ok, lint clean, runtime smoke HTTP 200 on all routes); it is **not deployed** and nothing is production.

## Alternatives considered

1. **Native iOS demo (per ADR-001).**
   - Pros: matches the documented production client; native camera/photo capture; highest single-platform UI quality.
   - Cons: building, provisioning, and running a SwiftUI app plus its backend inside a 2-day timebox is impractical; contributes nothing extra to demonstrating render-to-purchase at the UI level. Rejected for the timebox.

2. **Fully live render (real hosted image generation for every render).**
   - Pros: closest to the intended rendering experience; would exercise a real provider end to end.
   - Cons: depends on external latency, cost, keys, and availability during a live class demo; a failed or slow call would break the presentation. A fallback-first cached render is robust and offline. Rejected in favor of faked/cached rendering (real provider left as an optional isolated stub).

3. **Real sandbox payments (per ADR-003/ADR-004).**
   - Pros: would demonstrate an actual payment integration and settlement grouping.
   - Cons: sandbox setup, keys, and network dependence add time and fragility with no gain for showing the purchase flow; settlement is not observable in a demo. Rejected in favor of mock checkout.

(These are demo-delivery trade-offs only; they do not reopen the production decisions in ADR-001/003/004/006/012/015.)

## Positive consequences

- A **fast, robust, offline-capable** demo that reliably shows the full render-to-purchase happy path within the 2-day timebox.
- Fallback-first rendering means the demo **always works** even without any API key or network; the optional stub allows a live render if desired.
- Being a self-contained web app makes it trivial to run locally or deploy to Vercel for the class, with no database or payment setup.
- The production decisions stay intact: the real ADRs and the pilot build plan are unchanged, so the demo does not create product-direction debt.

## Negative consequences

- The demo is **not production**: no real payments, no settlement, no operator QA, no accounts, no persistence, and a seeded catalog rather than real ingestion.
- It **diverges from the documented production stack** (web instead of native iOS; in-memory state instead of Postgres; mock instead of real payments). Mitigated by keeping the `backend/` foundation scaffold and all production ADRs intact, and by scoping this decision explicitly to the demo only.
- Several features are only realized at the UI level backed by fakes (see the feature mapping), so the demo must not be read as evidence of production readiness for those features.

## Date

2026-07-13.
