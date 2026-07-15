# System architecture

> **Status of this document.** This is a specification, not a description of anything built. Nothing of the **production** system is implemented yet; the exceptions on `develop` are the class-demo web app (`web-demo/`, see the [Class-demo architecture](#class-demo-architecture-web) section), the backend foundation scaffold (`backend/`, PR #21), and the operator console foundation shell + operator session auth (`operator/` + backend, PR #27). It structures how Spazio is intended to work end to end and records the platform-level choices, now decided for the one-week iOS pilot in the ADRs under `/docs_en/decisions`. **Update (ADR-024, 2026-07-14):** the production client is now the **web app** (no native iOS will be built) and the scope is class-demo scale — read the client boxes in the diagrams below as the web app. **Update (ADR-025, 2026-07-14):** the human render-review gate is removed — renders are published to the requesting user immediately upon successful generation (FR-027/FEAT-006 retired; the mandatory-operator-QA clause of ADR-002 superseded, the rest of ADR-002 stands). The removal of the review flow from the backend and web app is implemented by FEAT-016 (#38).
>
> **How to read the labels used throughout:**
>
> - **VERIFIED** — stated in the PRD (`Spazio_PRD_v0.7.md`) or the pilot (`Spazio_One_Week_iOS_Pilot.md`). Cited where useful.
> - **PRD default/example** — a value the PRD gives only as an example or default (e.g. commission "for example 10%"). For the pilot these defaults have been adopted as human decisions, each recorded in the governing ADR.
> - **Draft / Proposed** — a reasonable structuring by the author to organize the specification. Not decided.
> - **TBD / PENDING** — reserved for human decision. PRD §12 ("Human definitions") lists these; each maps to an ADR in `/docs_en/decisions`.

---

## Overview

This is a logical, technology-neutral description of how Spazio works end to end. It follows the basic flow in PRD §8 and the invariants in PRD §4. It names no concrete technology; the platform stack is decided for the pilot and recorded in ADR-001 (see [Technology stack](#technology-stack)); vendor/product picks for hosting, image generation, and payments remain open.

The core promise is that the AI never invents furniture: every rendered item must correspond to a real, purchasable SKU already loaded into the marketplace (PRD §1, BR-6, BR-14; FR-016).

End-to-end logical flow:

1. **Enter as account or guest.** The user starts a session either with an account or as a guest. Guest checkout requires validated email, phone, and shipping information (PRD §8.1, FR-001/FR-004, BR-26). *(Accounts and guest checkout are VERIFIED in the PRD but excluded from the pilot; see the pilot note below.)*
2. **Localization.** The system determines the user's location, the applicable suppliers, and the delivery zone (PRD §8.2, FR-012/FR-013, BR-11).
3. **Inputs.** The user selects a predefined style or writes a free-text description, enters approximate room dimensions and a budget range (minimum and maximum), and uploads or captures one or more room photos (PRD §8.3–8.6, FR-005/FR-007/FR-008/FR-009/FR-011).
4. **Photo quality check.** The system validates photo usability and requests a retake for unusable photos (PRD §8.8, FR-024, BR-15).
5. **Matching against real inventory.** The system matches real, currently available catalog SKUs to the style, dimensions, budget, and locality. It renders only in-stock ready-made or validly made-to-order products, excludes catalog entries with incomplete required data, keeps total cost within budget plus the agreed tolerance, and never fabricates products (FR-014/FR-016/FR-018/FR-019/FR-021, BR-2/BR-4/BR-6/BR-9/BR-11/BR-14).
6. **Render.** The system generates a photorealistic image compositing the matched SKUs into the room photo, scaled realistically using the approximate dimensions (PRD §8.9, FR-015/FR-017, BR-7).
7. **Render publication.** *(Superseded by ADR-025, 2026-07-14 — the human review gate is retired.)* The render is published to the requesting user immediately upon successful generation. *(Originally: an operator reviewed and approved each render before display — pilot "The human's role"; FR-027, retired.)*
8. **Product tags.** Every rendered product is tagged with name, price, supplier, warranty, and listing link; the user can tap a tag to see details (PRD §8.10, FR-028/FR-029).
9. **Auto cart.** The cart is auto-populated with every product shown in the render. The cart is a suggestion and must be explicitly confirmed before payment; the user can review, remove, or swap items (PRD §8.11–8.12, FR-031/FR-032/FR-033/FR-034/FR-035, BR-31).
10. **Stock hold.** Adding an item to the cart holds stock for the configured duration; expired holds return stock to availability (PRD §8.14, FR-039/FR-040, BR-22/BR-23). *(Decided (pilot): no stock hold; the PRD default of 15 minutes applies only when holds are built post-pilot — see [ADR-011](#important-decisions-accepted-for-the-pilot).)*
11. **Checkout with one payment.** The user checks out with a single in-app payment covering products from one or more suppliers (PRD §8.15, FR-042, BR-25).
12. **One purchase order per supplier.** Checkout generates one purchase order per supplier from the single order (PRD §8.16, FR-044, BR-25).
13. **Revalidate price and stock.** Price and availability are revalidated at checkout before payment is captured (PRD §8.17, FR-041, BR-24).
14. **Estimates and warranty before checkout.** Supplier-sourced production/delivery estimates and warranty terms are shown before checkout (PRD §8.18, FR-036/FR-038, BR-17/BR-18).
15. **Order tracking.** The user tracks status per purchase order (PRD §8.19, FR-047). *(In the pilot, the operator forwards each confirmed order to the supplier manually; FR-061.)*

**Pilot vs. full product (VERIFIED).** The one-week pilot deliberately narrows this flow: native iOS only, one city and one delivery zone (Bogotá), one currency (COP), a small manually curated catalog, human review before every render *(retired — ADR-025, 2026-07-14)*, and manual order handoff. It excludes accounts/guest checkout, automated split payments, automated one-PO-per-supplier settlement, automated supplier ingestion, keep-or-replace segmentation, targeted edits, render limits, and full tracking (pilot "Pilot scope" and "Scope Cuts & Triggers"). The architecture below covers the full product; module and rule entries note where the pilot applies.

---

## Technology stack

**The platform stack is decided for the pilot (ADR-001).** PRD §12 reserved the technology stack for humans; that human decision has been made for the one-week iOS pilot. Each line below shows the value adopted for the pilot and references the governing decision record. The remaining open product/tool picks are hosting, the image-generation vendor, and the payment gateway (ADR-001).

| Layer | Choice | Decision |
|---|---|---|
| Frontend | Native iOS (SwiftUI) app (see ADR-001) | [ADR-001 — Technology stack](#important-decisions-accepted-for-the-pilot) |
| Backend | One small managed backend service — Node.js 22 + TypeScript (Fastify) + Prisma, per the ADR-001 implementation note; foundation scaffold in `backend/` (PR #21) | ADR-001 |
| Database | Managed relational database — Postgres — plus object storage for photos/renders (see ADR-001) | ADR-001 |
| Authentication | No accounts or login in the pilot; minimal contact capture at checkout (see ADR-022) | ADR-001; ADR-022 |
| Hosting | Single managed environment/region (see ADR-001) | ADR-001 |
| Repository | Managed Git hosting running the `main` + `develop` PR workflow (CLAUDE.md); specific product left to implementation (see ADR-001) | ADR-001 |

The rendering/AI pipeline is decided for the pilot: a hosted generative image API (image-to-image / inpainting) that composites operator-curated product images into the user's room photo, with no custom-trained model (see ADR-002; the mandatory-operator-QA clause is superseded by ADR-025, 2026-07-14 — renders publish immediately on generation success).

> **Note on the repository.** The version-control *workflow* is already defined in `CLAUDE.md` (a `main` + `develop` model with pull requests). The hosting/tooling that implements it remains part of ADR-001 and is not asserted here as a chosen product.

### PRD-confirmed constraints (not chosen products)

These are requirements the stack must satisfy. They constrain the eventual choice; they are **not** technology selections.

- **Pilot platform.** The pilot targets a **native iOS** app (pilot "Included": "Native iOS app only"). This is a pilot scope constraint, not a decision that iOS is the platform for the full product.
- **Payment gateway capabilities.** Payment processing must be **PCI-compliant**, and the gateway must support **marketplace-style split settlement**, **multi-supplier payouts**, **multi-currency processing**, **guest checkout**, and **automatic Spazio commission retention** (PRD §7 "Security and payments"; NFR-009/NFR-010/NFR-011/NFR-012). For the pilot these are decided (ADR-003, ADR-004): a single PCI-compliant hosted checkout collects one payment in COP, with no split settlement, and the Spazio operating entity pays suppliers manually; gateway/provider selection and the split-settlement and merchant-of-record models are revisited before scale.
- **Privacy defaults.** User photos and generated renders are private by default (BR-33, NFR-007).
- **Authentication.** Authentication must protect account and order data (NFR-008).
- **Internationalization.** The architecture must support multiple countries and currencies, with taxes, payment methods, and legal requirements configurable per market (PRD §7; NFR-017/NFR-018).

---

## Logical context diagram

Technology-neutral. Boxes are logical responsibilities, not deployment units or products.

```text
                         ┌──────────────────────────────┐
        Homeowner /      │        Client app            │   (pilot: native iOS)
        renter (account  │  inputs, render view,        │
        or guest)  ──────▶  tags, cart, checkout        │
                         └───────────────┬──────────────┘
                                         │
                                         ▼
                         ┌──────────────────────────────┐
                         │        Backend services        │
                         │  ┌──────────────────────────┐ │
                         │  │ Accounts & guest          │ │
                         │  │ Localization & delivery   │ │
                         │  │ Product matching          │ │
                         │  │ Rendering pipeline ───────┼─┼──▶ AI rendering provider
                         │  │ Style taxonomy            │ │      [hosted image API — ADR-002]
                         │  │ Cart & stock holds        │ │
                         │  │ Checkout & payments ──────┼─┼──▶ PCI-compliant gateway
                         │  │ Orders & purchase orders  │ │      [hosted PCI checkout — ADR-003/004]
                         │  │ Catalog & ingestion       │ │
                         │  └──────────────────────────┘ │
                         └───────┬───────────────┬───────┘
                                 │               │
                    ┌────────────▼──┐     ┌──────▼─────────────┐
                    │ Data stores    │     │ Operator console   │◀── Operator
                    │ (catalog,      │     │ catalog curation,  │    (Spazio staff)
                    │  projects,     │     │ manual order       │
                    │  orders, …)    │     │ handoff (pilot)    │
                    │  [see ADR-001] │     │                    │
                    └────────────────┘     └────────────────────┘
                                                   ▲
                                                   │ catalog data
                                          ┌────────┴─────────┐
                                          │   Supplier        │
                                          │(ingestion: manual │
                                          │CSV/Excel; ADR-006)│
                                          └───────────────────┘
```

---

## Main modules

Logical modules and their responsibilities. Feature and requirement IDs point back to the registry. Some features span more than one module; the cross-references note where. Module boundaries are **Draft / Proposed** organization of PRD-confirmed responsibilities.

| Module | Responsibility | Primary features / requirements |
|---|---|---|
| **Accounts & guest** | Create accounts, authenticate, manage basic profile and preferences, and support guest sessions with validated email, phone, and shipping info. *(Excluded from the pilot.)* | FEAT-001; FR-001, FR-002, FR-003, FR-004 (BR-26) |
| **Catalog & supplier ingestion** | Hold real, purchasable SKUs with required attributes (photos, dimensions, price, colors, materials, stock, category, style, lead time, warranty); classify products as in-stock ready-made or made-to-order; synchronize supplier data (real time for ready-made stock); expose ingestion channels for suppliers. Operator curation lives in the Operator console. *(Pilot: catalog is small and manually curated; automated ingestion excluded.)* | FEAT-015; FR-055, FR-057, FR-058, FR-060 (BR-1–BR-5, BR-32); ADR-006, ADR-012, ADR-014 |
| **Style taxonomy** | Maintain the shared classification that maps products and user style choices to a common vocabulary; map each product to it. Feeds both style selection and matching. | FEAT-003 (style side); FR-007, FR-059 (BR-16); ADR-005 |
| **Rendering pipeline** | Accept room photo(s), dimensions, style, and budget; run photo-quality validation; generate the photorealistic render compositing matched SKUs at realistic scale; produce product tags; enforce render-time and inference-cost controls and (post-pilot) daily render metering and targeted edits. | FEAT-002, FEAT-005 (render side), FEAT-007 (tagging), FEAT-013/FEAT-014 (post-pilot); FR-005, FR-006, FR-011, FR-015, FR-016, FR-017, FR-018, FR-024, FR-028, FR-029 (BR-2, BR-6, BR-7, BR-14, BR-15); ADR-002, ADR-013 |
| **Product matching** | Match real, currently available SKUs to style, dimensions, budget, and locality; keep total cost within budget plus tolerance; disclose unmet budgets and offer the closest alternative; suggest similar products or mark items unavailable when no strong match exists. | FEAT-005 (matching side); FR-014, FR-019, FR-021, FR-022, FR-023 (BR-2, BR-9, BR-10, BR-13); ADR-008 |
| **Cart & stock holds** | Auto-populate the cart from the render; let the user review, remove, or swap items; require explicit confirmation before payment; place and expire time-boxed stock holds; surface per-item estimates and warranty for display. | FEAT-008, FEAT-009 (display); FR-030–FR-035, FR-036, FR-038, FR-039, FR-040 (BR-17, BR-18, BR-22, BR-23, BR-31); ADR-011 |
| **Checkout & payments** | Take a single in-app payment across suppliers; revalidate price and availability before capture; support guest checkout; drive split settlement, multi-supplier payouts, multi-currency, and automatic commission retention through the PCI-compliant gateway. | FEAT-010; FR-004, FR-041, FR-042, FR-043, FR-045 (BR-24, BR-28); ADR-003, ADR-004, ADR-007 |
| **Orders & purchase orders** | Generate one purchase order per supplier from the confirmed order; provide per-PO status and tracking. *(Pilot: the operator forwards each confirmed order to the supplier manually.)* | FEAT-011; FR-044, FR-047, FR-061 (BR-25) |
| **Localization & delivery zones** | Resolve the user's location to applicable suppliers and delivery zone; restrict rendering to products deliverable to the locality; display prices in local currency; offer delivery fallback (nearby regions, alternative shipping, or pickup) when local delivery is unavailable; hold per-market configuration (currency, taxes, payment methods, legal). | FEAT-004; FR-012, FR-013, FR-020, FR-046, FR-053 (BR-11, BR-12, BR-27); ADR-015, ADR-018 |
| **Operator console** | Let Spazio staff curate and approve catalog entries, map products to the style taxonomy, and (in the pilot) forward confirmed orders to suppliers manually. *(Render review retired — ADR-025, 2026-07-14.)* | FEAT-015 (curation); FR-056, FR-059, FR-061 *(FEAT-006, FR-027 — Superseded by ADR-025)* |

> **Not yet assigned a dedicated module:** keep-or-replace segmentation (FEAT-012; FR-025/FR-026), render metering and monetization (FEAT-013; FR-048–FR-050, FR-054), and targeted render refinement (FEAT-014; FR-051/FR-052) are post-pilot. They are noted above inside the Rendering pipeline and are called out here so nothing is dropped.

---

## Architecture rules

### General rules (retained)

- Separate frontend, backend, and database concerns.
- Do not mix business logic with visual components.
- Do not write direct database queries from the frontend.
- Every new feature must have minimal tests (`TC-` in `08_test_plan.md`).
- Every relevant change must be tied to an Issue and a requirement/feature document (see `CLAUDE.md` and `11_implementation_flow.md`).

### Spazio invariants (VERIFIED, from the PRD/pilot)

These are hard rules the system must not violate.

1. **Render only real, in-stock SKUs.** Every rendered item must map to a real, purchasable SKU; ready-made items are never rendered when unavailable (FR-016/FR-018, BR-4/BR-6).
2. **Never fabricate products.** The system must never invent or render a product that is not in the catalog (FR-016, BR-14; pilot "The AI's role").
3. **Exclude incomplete catalog entries** from rendering eligibility (FR-019, BR-2).
4. **Render only deliverable products.** Only products deliverable to the user's locality may be rendered (FR-020, BR-11).
5. **Scale to dimensions.** Approximate room dimensions must be used to scale rendered products realistically (FR-017, BR-7).
6. **Stay within budget + tolerance.** Total rendered product cost must stay within budget plus the agreed tolerance (FR-021, BR-9). *(Tolerance adopted for the pilot: 10%, the PRD example value — see ADR-008.)*
7. **Kept items are excluded from cart and budget.** Items marked to keep remain in the render but are excluded from the cart and from the budget calculation (FR-026, BR-8). *(Keep-or-replace is post-pilot.)*
8. **Cart is a suggestion.** The cart must be explicitly confirmed by the user before payment (FR-035, BR-31; pilot "The human's role").
9. **Revalidate price and stock at checkout** before payment is captured (FR-041, BR-24).
10. **One payment, one PO per supplier.** Checkout produces a single user payment and one purchase order per supplier (FR-042/FR-044, BR-25).
11. **Renders and photos are private by default** (NFR-007, BR-33).
12. **Sponsored placement is a tie-breaker only.** It may break ties among similarly relevant products and must never override relevance, quality, budget, locality, or availability (FR-054, BR-29/BR-30).
13. **Human-in-the-loop (pilot).** *(Amended by ADR-025, 2026-07-14: the render-review half is retired — renders are published immediately on generation success.)* An operator forwards each confirmed order manually (FR-061; pilot "The human's role"). *(Formerly also: operator reviews and approves each render before the user sees it — FR-027, superseded.)*

---

## Important decisions (accepted for the pilot)

All of the following are **Accepted** for the one-week iOS pilot (Status: Accepted, 2026-07-10); they are the human decisions that PRD §12 reserved, now recorded. Full records live in `/docs_en/decisions/`. Where the PRD gave only an example or default, the value adopted for the pilot is noted; several legal/financial items carry an explicit "revisit before scale" caveat.

| ADR | Decision | Area | Decision (accepted for the pilot) |
|---|---|---|---|
| ADR-001 | Technology stack | Architecture | Native iOS (SwiftUI) app + one small managed backend + managed Postgres + object storage; single environment/region; product/tool picks left to implementation. |
| ADR-002 | Rendering / AI pipeline | AI & Rendering | Hosted generative image API (image-to-image / inpainting) compositing operator-curated product images; no custom-trained model. *(The 'mandatory operator QA of every render' clause is superseded by ADR-025, 2026-07-14; the rest stands.)* |
| ADR-003 | Payment gateway & split-settlement model | Payments | One PCI-compliant hosted checkout, single payment in COP; no split settlement (operator pays suppliers manually). Split settlement + gateway/provider selection: revisit before scale. |
| ADR-004 | Merchant-of-record model | Payments & Legal | The Spazio operating entity collects the single payment and pays suppliers manually. Tax/legal implications (ties ADR-018): revisit before scale; confirm with an accountant. |
| ADR-005 | Style taxonomy | Catalog & AI | 1–2 predefined visual styles + free-text description; no taxonomy engine. |
| ADR-006 | Supplier catalog ingestion channels | Catalog & Integration | Operator manually loads a CSV/Excel spreadsheet of 30–60 curated SKUs; no API/FTP/self-service ingestion in the pilot. |
| ADR-007 | Commission percentage & marketplace fee model | Monetization | 10% of product price (PRD default); reconciled manually (no billing code) in the pilot. |
| ADR-008 | Budget tolerance | Product rules | 10% (PRD default). |
| ADR-009 | Daily free-render limit | Cost control & Product | No limit in the pilot; the PRD default of five/day applies only when metering is built post-pilot. *(Original rationale 'every render is operator-reviewed' superseded by ADR-025.)* |
| ADR-010 | Render-package pricing | Monetization | Not offered in the pilot (deferred); no paid packages. |
| ADR-011 | Cart-hold duration | Product rules | No stock hold in the pilot; the PRD default of 15 minutes applies only when holds are built post-pilot. |
| ADR-012 | Catalog synchronization frequency | Catalog & Integration | Manual / on-demand refresh by the operator; no automated sync in the pilot. |
| ADR-013 | Render-time target | Performance | ~2–5 minutes soft target (PRD); no hard SLA in the pilot. *(The 'operator-review time is additional' note is superseded by ADR-025 — there is no review step.)* |
| ADR-014 | Minimum catalog completeness | Catalog | A SKU is renderable only if all PRD BR-1 fields are present; the operator enforces this on load. |
| ADR-015 | Initial launch markets | Go-to-market | Bogotá, Colombia; COP only. Full-product markets: revisit before scale. |
| ADR-016 | Supplier partners & onboarding terms | Partnerships | Hand-pick 2–4 Bogotá suppliers with a one-page written agreement (commission, lead times, warranty); done manually. |
| ADR-017 | Sponsored-placement plan & pricing | Monetization | Not offered in the pilot (deferred); no sponsored placement. |
| ADR-018 | Taxes & multi-market compliance | Legal & Finance | Single market (Colombia); taxes/invoicing handled manually; no tax engine. Revisit before scale; confirm with an accountant. |
| ADR-019 | Data privacy & consumer protection | Legal & Security | Photos/renders private by default (BR-33); collect minimum data (email, phone, shipping); short privacy notice + consent at first use. Align with Colombia Ley 1581; legal review before scale. |
| ADR-020 | Warranty & dispute-resolution rules | Legal & Operations | Warranty not displayed (out of pilot); suppliers' own warranty terms apply; disputes handled manually by the operator. Revisit before scale; legal / consumer-protection review needed. |
| ADR-021 | Brand identity & visual design system | Design | Dark-green + off-white palette (PRD v0.3), a simple wordmark, system font; minimal. Full design system later. |
| ADR-022 | Pilot checkout identity model | Identity & Checkout | Minimal contact capture at checkout (email + phone + shipping, per BR-26) stored with the order; no login, no password, no account system, and not the full guest-checkout feature. |

See the `/docs_en/decisions` folder for the individual ADR records.

---

## Class-demo architecture (web)

> **Scope of this section.** This describes a **time-boxed, 2-day academic class-project demo**, not the production system. It **supersedes the production iOS + managed-backend + Postgres architecture described above FOR THE DEMO ONLY**: the production plan and every ADR (ADR-001 through ADR-022) remain unchanged, and this framing changes **nothing** about the real product decisions — it only records how the class demo is delivered. See **ADR-023** and `docs_en/13_class_demo_scope.md`.

The demo is a scoped **visual** walkthrough of the render-to-purchase happy path. It is **not** production, **not** real payments, and **not** the full pilot.

> **Update (#31, PR #32/#33 — post-ADR-024):** this section describes the demo **as originally delivered**. The app has since been wired to the real backend: the wizard runs over `/api/v1` (Next.js rewrite → `backend/`, Fastify + Prisma + Postgres), renders wait for real operator approval, the cart/checkout/order rows are real, and the catalog is seeded in Postgres (`backend/prisma/seed.ts`). Still fake: the composite image (cached asset — ADR-002 vendor open) and the payment capture (ADR-003 vendor open). **Update (ADR-025, 2026-07-14):** the operator-approval wait is retired — renders are published immediately on generation success; the code change is implemented by FEAT-016 (#38).

**Deliverable.** `web-demo/` — a **Next.js 15 (App Router) + React 19 + TypeScript + Tailwind 3.4** web app. **No database**; in-memory state only (`src/lib/store.tsx`). *(As originally delivered — see the update note above.)*

**Purpose.** A time-boxed 2-day academic class-project demo of the render-to-purchase happy path — a scoped visual demo, not production and not the full pilot.

**Supersedes for the demo scope only** (the production plan/ADRs are unchanged; this changes nothing about the real product decisions — it only records how the class demo is delivered):

- **ADR-001** — a web app instead of the native iOS app.
- **ADR-003 / ADR-004** — **MOCK** checkout: no real payment and no settlement.
- **ADR-006 / ADR-012 / ADR-015** — a seeded in-code catalog instead of operator/self-service ingestion.
- **Database** — no database at all (vs. managed Postgres).

**Render pipeline (fallback-first).** `CachedRenderProvider` is the default: offline, backed by local SVG assets, and it always works. `OpenAIRenderProvider` is an isolated stub used only if `IMAGE_API_KEY` is set (invoked server-side via `src/app/actions.ts`), with silent fallback to the cached provider. In the demo the render is **faked/cached** and there is **no operator QA**, so ADR-002 is only partially realized. *(Per ADR-025, 2026-07-14, operator QA is no longer required by ADR-002.)*

**Routes / flow.**

1. `/` (landing)
2. `/room` — pick a sample living room / bedroom, or upload to a prepared result; approximate dimensions.
3. `/style` — Modern Mediterranean / Warm Minimalist / Scandinavian + free-text, plus a COP budget slider (2,000,000–12,000,000).
4. `/render` — simulated generate, then a furnished render with tappable product hotspots and a budget indicator (10% tolerance).
5. **Product detail sheet** (`ProductSheet.tsx`).
6. `/cart` — items, per-item and total COP, budget-vs-total, remove/swap.
7. `/checkout` — minimal contact capture (email / phone / address, per ADR-022 — **no accounts**); order grouped by supplier, one PO each; a **MOCK** "Pay $ X" button (amount in COP).
8. `/confirmation` — order number, per-supplier breakdown, per-item delivery/production dates, and an operator-in-the-loop message.

**Catalog.** `src/lib/catalog.ts` — 11 SKUs across 3 Bogotá suppliers (Maderos del Norte, Textiles Bacatá, Lumina Bogotá); 2 made-to-order and 9 ready-made.

**Feature mapping (demo fidelity — exercised at the UI level only, backed by fakes).**

- **Present:** FEAT-002 (room + dimensions via sample rooms), FEAT-003 (style + budget), FEAT-005 (render — **faked/cached**), FEAT-007 (product tagging), FEAT-008 (cart), FEAT-009 (estimates display), FEAT-010 (checkout — **MOCK** payment), FEAT-011 (confirmation / order message).
- **Simplified / hardcoded:** FEAT-004 (localization fixed to Bogotá / COP).
- **Not in the demo:** FEAT-006 (operator render review — Retired, ADR-025), FEAT-015 (catalog management — replaced by the seeded catalog), FEAT-001 / FEAT-012 / FEAT-013 / FEAT-014 (accounts, keep-or-replace, metering, targeted edits).

**Run.** Node 20+; `cd web-demo`, `npm install`, optionally set `IMAGE_API_KEY` in `.env.local`, then `npm run dev` → `http://localhost:3000`. **Deploy:** Vercel (import the repo, project root = `web-demo`). The full guide is in `web-demo/README.md`.

**Status.** Built and verified in the authoring sandbox (`npm run build` ok, lint clean, runtime smoke HTTP 200 on all routes). **Not deployed; nothing is production.**

**Related recent work (on `develop`).** A `backend/` foundation scaffold (Node / TS / Fastify / Prisma) was merged via PR #21, the pilot build plan (`docs_en/12_pilot_build_plan.md`) via PR #19, and the operator console shell + operator session auth (`operator/` + backend) via PR #27.
