# Release notes

This file records what changes in each release of Spazio. It follows the
project's versioning rules in `CLAUDE.md` §7: **SemVer** (`MAJOR.MINOR.PATCH`),
one tagged `vX.Y.Z` per merge to `main`, entries in reverse-chronological order.
Each release block keeps the same four sections: **Added**, **Fixed**,
**Technical changes**, and **Requirements covered**.

> **Read this first — documented is not built.** Everything in `/docs_en` is a
> *specification*, not running software. No application code has been released.
> No feature is available to users and no requirement is satisfied in a shipped
> build. The sections below describe only the documentation pass, and they say
> so explicitly wherever a section would otherwise imply delivery.

---

## [Unreleased]

**Current state.** The repository has been bootstrapped and the product
documentation has been seeded from **PRD v0.7** (`Spazio_PRD_v0.7.md`). Since that
documentation pass, some code has begun landing on `develop`: a **class-project
demo web app** (`web-demo/`), a **backend foundation scaffold** (`backend/`), and
the **operator console shell + operator session auth** (`operator/` + backend,
PR #27), all described under *Added* and *Technical changes* below. Even so,
**nothing has been released, deployed, or run in production, and no requirement is
satisfied in a shipped build**: the demo was only built and smoke-verified in an
authoring sandbox, the backend is a foundation scaffold (typed route stubs and
pilot schema; minimal business logic), and the operator console is a foundation
shell (sign-in + three queue views; no feature UX; role enforcement arrived later — #34). This entry stays under
`[Unreleased]` until the first `vX.Y.Z` tag is cut (see *First tagged release*
below).

### Added

- **Repository governance scaffold.** `main` + `develop` branching model,
  contribution rules and non-negotiable guardrails (`CLAUDE.md`), and the
  implementation flow (`docs_en/11_implementation_flow.md`).
- **Seeded numbered docs, from PRD v0.7** in `/docs_en`: product vision (`01`),
  architecture (`02`), functional requirements (`03`), non-functional
  requirements (`04`), backlog (`05`), API (`06`), data model (`07`), test plan
  (`08`), AI-usage rules (`09`), and this release-notes file (`10`).
- **Requirement and test catalog, documented.** The functional requirements
  (`FR-001`–`FR-061`, in `03_requirements.md`), non-functional requirements
  (`NFR-001`–`NFR-018`, in `04_non_functional_requirements.md`), and test cases
  (`TC-001`–`TC-106`, in `08_test_plan.md`) are **authored as specifications** —
  not implemented and not executed.
- **Architecture Decision Records, all Accepted, scoped to the one-week iOS pilot.** Twenty-two ADR files
  (`ADR-001`–`ADR-022`) are authored in `docs_en/decisions/`, each carrying
  **Status: Accepted, explicitly scoped to the one-week iOS pilot**, with its
  decision recorded at the simplest
  pilot-scoped value — see *Technical changes* below for the register. Recording
  a decision is not building it: nothing here is implemented or shipped.
- **Feature specifications, seeded.** Authored feature docs in
  `docs_en/features/`: `FEAT-002`, `FEAT-003`, `FEAT-004`, `FEAT-005`,
  `FEAT-006`, `FEAT-007`, `FEAT-008`, `FEAT-009`, `FEAT-010`, `FEAT-011`, and
  `FEAT-015`. They describe intended behavior; they are not built.
- **Authoring templates.** The `docs_en/templates/` set (feature, ADR,
  requirement, bug, and AI-prompt templates) for downstream authoring.
- **New numbered docs, seeded.** The **pilot build plan**
  (`docs_en/12_pilot_build_plan.md`, landed via **PR #19**) sequencing the
  one-week iOS pilot, and the **class-demo scope** (`docs_en/13_class_demo_scope.md`)
  bounding the class-project demo below and how it relates to the pilot. These
  describe planned and scoped work; the pilot itself is not built.

> **These are documentation artifacts, not product features.** The requirement
> and test catalog, the ADR records, and the feature specs listed above are
> *written down*, not *built*. Adding a spec to `/docs_en` is not the same as
> adding a feature to the product, so none of them is listed here as a shipped
> capability.

- **Class-project demo web app, built (`web-demo/`).** A **time-boxed, 2-day
  academic class-project demo** of the render-to-purchase happy path — a
  **Next.js 15 (App Router) + React 19 + TypeScript + Tailwind 3.4** web app with
  **no database** and in-memory state (`src/lib/store.tsx`). It is a **scoped
  visual demo, not production and not the full pilot**. Render is
  **fallback-first**: a `CachedRenderProvider` (default, offline, local SVG
  assets, always works) with an isolated `OpenAIRenderProvider` stub used only if
  `IMAGE_API_KEY` is set (server-side via `src/app/actions.ts`) and silently
  falling back to cached — so the render is **faked/cached** and there is **no
  operator QA** (`ADR-002` only partially realized). Flow: `/` (landing) →
  `/room` (sample or uploaded room, approximate dimensions) → `/style` (style +
  free-text + COP budget slider) → `/render` (simulated generate, then a furnished
  render with tappable product hotspots and a budget indicator, 10% tolerance) →
  product detail sheet (`ProductSheet.tsx`) → `/cart` (per-item and total COP,
  budget-vs-total, remove/swap) → `/checkout` (**mock** payment; minimal contact
  per `ADR-022`, no accounts; order grouped by supplier, one PO each) →
  `/confirmation` (order number, per-supplier breakdown, per-item dates,
  operator-in-the-loop message). Catalog is a seeded in-code file
  (`src/lib/catalog.ts`): 11 SKUs across 3 Bogotá suppliers (Maderos del Norte,
  Textiles Bacatá, Lumina Bogotá), 2 made-to-order and 9 ready-made. Scope and
  framing are recorded in **`ADR-023`** and **`docs_en/13_class_demo_scope.md`**;
  a run/deploy guide lives in `web-demo/README.md`.

> **The demo is built but not shipped, and it changes no product decision.** The
> app above is real code that was built and smoke-verified in an authoring sandbox
> (`npm run build` ok, lint clean, runtime smoke HTTP 200 on all routes), but it is
> **not deployed and nothing is in production**. It exercises features at the UI
> level over fakes (see *Requirements covered*), which is **not** the same as
> implementing and testing them, so it is **not** listed as a shipped capability
> and it satisfies **no** requirement. Its demo-scope substitutions (`ADR-023`)
> **change nothing about the real product decisions** — the pilot ADRs stay
> **Accepted**, with their one-week iOS pilot scope, exactly as recorded below.

### Fixed

- None. There is no prior release, so there is nothing to fix.

### Technical changes

- **Architecture decisions recorded (pilot-scoped).** The decisions reserved for
  humans in **PRD §12** have been made for the pilot and are recorded as ADR
  files in `docs_en/decisions/` (`ADR-001`–`ADR-022`), each with **Status:
  Accepted, explicitly scoped to the one-week iOS pilot**, and resolved at its
  simplest implementation consistent with
  the PRD and the one-week iOS pilot. These values are decided and recorded, not
  built: nothing below is implemented or shipped in this release. Values marked
  *(revisit before scale)* stay Accepted for the pilot and carry an explicit
  scale caveat. The table below registers the identifier, decision, and status of
  each record.

  | ADR | Decision (Accepted for the pilot — reserved for humans) | Status |
  |---|---|---|
  | ADR-001 | Technology stack | Accepted — pilot scope |
  | ADR-002 | Rendering / AI pipeline | Accepted — pilot scope |
  | ADR-003 | Payment gateway & split-settlement model | Accepted — pilot scope |
  | ADR-004 | Merchant-of-record model | Accepted — pilot scope |
  | ADR-005 | Style taxonomy | Accepted — pilot scope |
  | ADR-006 | Supplier catalog ingestion channels | Accepted — pilot scope |
  | ADR-007 | Commission percentage & marketplace fee model | Accepted — pilot scope |
  | ADR-008 | Budget tolerance | Accepted — pilot scope |
  | ADR-009 | Daily free-render limit | Accepted — pilot scope |
  | ADR-010 | Render-package pricing | Accepted — pilot scope |
  | ADR-011 | Cart-hold duration | Accepted — pilot scope |
  | ADR-012 | Catalog synchronization frequency | Accepted — pilot scope |
  | ADR-013 | Render-time target | Accepted — pilot scope |
  | ADR-014 | Minimum catalog completeness | Accepted — pilot scope |
  | ADR-015 | Initial launch markets | Accepted — pilot scope |
  | ADR-016 | Supplier partners & onboarding terms | Accepted — pilot scope |
  | ADR-017 | Sponsored-placement plan & pricing | Accepted — pilot scope |
  | ADR-018 | Taxes & multi-market compliance | Accepted — pilot scope |
  | ADR-019 | Data privacy & consumer protection | Accepted — pilot scope |
  | ADR-020 | Warranty & dispute-resolution rules | Accepted — pilot scope |
  | ADR-021 | Brand identity & visual design system | Accepted — pilot scope |
  | ADR-022 | Pilot checkout identity model | Accepted — pilot scope |

- Where the PRD offered a working value only as an example or default, the
  relevant ADR now records the decided pilot setting: commission is **10%,
  adopted for the pilot (ADR-007)**, budget tolerance is **10%, adopted for the
  pilot (ADR-008)**, and the render-time target is **~2–5 min as a soft target,
  with no hard SLA in the pilot (ADR-013)**. The PRD's daily free-render limit
  (~5/day) and cart-hold duration (15 minutes) are **out of the pilot**: the
  pilot sets **no render limit (ADR-009)** and **no stock hold (ADR-011)**, so
  those PRD defaults apply only if metering/holds are built post-pilot. Each is a
  decided pilot setting recorded in its ADR, not a value implemented in this
  release.

- **Backend foundation scaffold landed (`backend/`).** A minimal **Node /
  TypeScript / Fastify / Prisma** scaffold merged to `develop` via **PR #21**,
  refining the `ADR-001` technology stack for server-side work. The scaffold
  registers the **25 pilot routes as typed stubs** (unimplemented handlers
  return `501`), defines the **15-model pilot Prisma schema**, vendor-neutral
  service interfaces, the **6-point `NFR-006` event trail**, and a **10-test
  DB-free suite** — business logic is intentionally minimal/stubbed, there is
  no seed data, and nothing is deployed, so it still covers no requirement.

- **Operator console shell + operator auth landed (`operator/` + `backend/`).**
  The build plan §1.7 foundation remainder, merged to `develop` via **PR #27**:
  an `Operator` Prisma model (scrypt-hashed credentials, optional single role),
  cookie-session sign-in (`POST /api/v1/operator/session`) guarding every
  `/operator/*` route (replacing PR #21's interim shared-secret header),
  `reviewed_by` / `forwarded_by` stamping on approve/reject/forward, and a
  static three-queue console shell served by the backend at `/operator/console`.
  Foundation only — no feature UX, no per-action role enforcement, nothing
  deployed; it satisfies the *intent* of NFR-008 but covers no requirement.

- **Web-platform pivot recorded (`ADR-024`).** The product owner's 2026-07-14
  decision: no native iOS app will be built (the opportunity cost versus a
  working platform is too high); the product continues on the **web app**
  (`web-demo/`), to be wired to the real backend at **class-demo scale**.
  Supersedes the client choice in `ADR-001` and the one-week pilot *program*
  framing; the backend/Postgres stack decision and the build plan's loop design
  stand. Recording a decision is not building it: the wiring work follows the
  normal plan-approval flow.

- **Render-to-purchase loop wired end-to-end (#31, PR #32/#33).** The web app
  now drives the real backend over `/api/v1` (Next.js rewrite): project
  bootstrap + photo + inputs (§0.1#3, FR-005/007–009/011), render submit →
  poll gated by real operator approval (FR-015/027), minimal SKU matching
  within budget +10% with a fabrication guard (FR-014/016/018/021), cart
  auto-populate/review/confirm (FR-031/032/035), per-item estimates (FR-036),
  single COP capture with recorded 10% commission plus one PO per supplier
  (FR-042, §0.1#1), and operator forwarding (FR-061). Catalog seeded: 3 styles,
  3 Bogotá suppliers, 11 BR-1-complete SKUs (`prisma/seed.ts`); initial Prisma
  migration committed; `.env` now loads natively. Verified by a 22-step
  end-to-end run on a local Postgres stack with the full NFR-006 event trail
  (`render-to-purchase` queryable). **Still not a release:** image-gen and
  payments are fake drivers (ADR-002/003 vendors open), per-action role
  enforcement and most TC automation are pending, and nothing is deployed.

- **Loop hardened (#34).** The §2.4 DoD security carve-outs closed: per-action
  operator role enforcement (curator / reviewer / handler; role-less staff are
  all-purpose), status-machine preconditions (approve/reject only from
  `pending_review` with no duplicate `render_approved` events, forward only
  from `paid_unforwarded`, catalog approval requires BR-1 completeness, PATCH
  recomputes completeness — FR-057), and NFR-007 device scoping on every
  client read/write (`x-device-token`; foreign resources answer 404).
  Automated as **TC-107..109** (`08_test_plan.md`).

- **Render human-approval gate retired (`ADR-025`).** The product owner's
  2026-07-14 decision: the operator render-review gate is removed **entirely** —
  AI-generated renders are published to the requesting user immediately upon
  successful generation; no operator reviews, approves, or rejects renders.
  `FR-027` and `FEAT-006` are retired; the *mandatory operator QA* clause of
  `ADR-002` is superseded (the hosted-image-API / no-custom-model decision
  stands); the render review states (`pending_review`/`approved`/`rejected`),
  `reviewed_by` stamping on renders, and the render-reviewer role are removed
  from the target spec; TC-051–TC-053 and the render-review state-machine
  preconditions among TC-107..109 are retired. Catalog curation
  (FEAT-015/curator) and order forwarding (FEAT-011/handler) keep their
  operator flows. Recording a decision is not building it: the code on
  `develop` still implements the review flow; the docs are now the target spec
  for the next development iteration (work item in `05_backlog.md`, issue #38).

- **Class-demo scope recorded, and what it supersedes *for the demo only*.** New
  **`ADR-023`** (with `docs_en/13_class_demo_scope.md`) records how the
  class-project demo is delivered. **For the demo scope only** it supersedes
  `ADR-001` (a web app instead of native iOS), `ADR-003` / `ADR-004` (a **mock**
  checkout — no real payment, no settlement, no merchant-of-record flow), and
  `ADR-006` / `ADR-012` / `ADR-015` (a seeded in-code catalog instead of
  operator/self-service ingestion), and it uses **no database** (vs the pilot's
  managed Postgres). This **changes nothing about the real product decisions**:
  the pilot ADRs above remain **Accepted** with their one-week iOS pilot scope exactly as recorded, and
  `ADR-023` only documents how the time-boxed class demo is built.

### Requirements covered

- **None.** No functional or non-functional requirement is implemented in this
  release. The `FR-*` / `NFR-*` catalog has been **documented only**; a
  requirement will appear here as *covered* in the first release that actually
  implements and tests it, per the traceability chain
  (`FEAT → FR/NFR → feature doc → Issue → branch → commits → PR → TC → release notes`).
- **The class demo maps to features at the UI level only, over fakes — this is
  not requirement coverage.** As *demo fidelity*, `web-demo/` exercises the
  interface of **FEAT-002** (room + dimensions via sample rooms), **FEAT-003**
  (style + budget), **FEAT-005** (render — **faked/cached**), **FEAT-007**
  (product tagging), **FEAT-008** (cart), **FEAT-009** (estimate display),
  **FEAT-010** (checkout — **mock** payment), and **FEAT-011** (confirmation),
  with **FEAT-004** simplified/hardcoded to Bogotá/COP. It does **not** include
  **FEAT-006** (operator render review), **FEAT-015** (catalog management, replaced
  by the seeded catalog), or **FEAT-001** / **FEAT-012** / **FEAT-013** /
  **FEAT-014** (accounts, keep-or-replace, metering, targeted edits). Driving a
  feature's UI over fakes is **not** implementing and testing an `FR-` / `NFR-`,
  so **no requirement is listed as covered**; a requirement appears above only in
  the first release that genuinely implements and tests it.

---

## First tagged release

The first tagged release (`vX.Y.Z`, **SemVer**) will follow the **one-week iOS
pilot** (`Spazio_One_Week_iOS_Pilot.md`). When `develop` is ready, a
`develop → main` PR is opened and, on merge, the version is tagged and this file
gains a dated `## vX.Y.Z — YYYY-MM-DD` block. Only from that release onward will
the **Added** and **Requirements covered** sections describe capabilities that
are genuinely built and tested, rather than documented.
