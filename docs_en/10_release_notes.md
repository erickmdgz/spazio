# Release notes

This file records what changes in each release of Spazio. It follows the
project's versioning rules in `CLAUDE.md` §7: **SemVer** (`MAJOR.MINOR.PATCH`),
one tagged `vX.Y.Z` per merge to `main`, entries in reverse-chronological order.
Each release block keeps the same four sections: **Added**, **Fixed**,
**Technical changes**, and **Requirements covered**.

> **Read this first (updated 2026-07-15) — built & verified locally, not yet
> released.** A working **web app** (`web-demo/`, Next.js 15 + React 19 + TS +
> Tailwind) wired to a **Node 22 / Fastify / Prisma / Postgres** backend with
> local object storage is now **built and verified end-to-end on a local dev
> stack** — see *Current system (as built)* under `[Unreleased]` for the delivered
> pieces. What remains true: **nothing is deployed or released to production** (no
> `vX.Y.Z` tag yet), checkout is a **mock** gateway (`ADR-003` vendor still
> unchosen), the real render engine runs only with `RENDER_ENGINE=mflux` on an
> Apple-Silicon host, and Local-supplier product images are **placeholders**.
> Historical entries below that describe an earlier docs-only or scaffold state
> are kept as dated history (this repo's additive convention); the current reality
> is the *Current system (as built)* summary. **Decision (ADR-029, 2026-07-15):** the three known gaps — placeholder local-supplier images, mock payments (`ADR-003`), and no deployment — are **accepted demo-scope limitations**, not pending work. A full system overview (with architecture, infrastructure, and flow diagrams) is now at `docs_en/00_overview.md`.

---

## [Unreleased]

**Current state (as built, updated 2026-07-15).** A working **web app**
(`web-demo/`, Next.js 15 + React 19 + TypeScript + Tailwind) wired to a **Node 22
/ Fastify / Prisma / Postgres** backend with **local object storage** is **built
and verified end-to-end on a local dev stack**. This is the CURRENT platform — per
**ADR-024** (2026-07-14) there is **no native iOS app**; the web app is the
product. **Nothing is deployed or released to production** (no `vX.Y.Z` tag), so
this entry stays under `[Unreleased]` until the first tag is cut (see *First
tagged release* below). The repository was originally bootstrapped and seeded from
**PRD v0.7** (`Spazio_PRD_v0.7.md`); the earlier docs-only, scaffold, and
standalone-demo states are preserved as dated history in *Added* and *Technical
changes* below.

**Current system (as built) — delivered and verified on the local stack since the
documentation pass:**

- **Browse-and-select furnishing (FEAT-018 / ADR-028).** The flow is **inverted**
  from the PRD §8 auto-furnish flow: the user uploads their room photo +
  approximate dimensions, chooses a **source** and a **style** (+ COP budget),
  **browses the real catalog and selects up to 3 products** (cap enforced
  server-side, matching the render engine's ~2–3 reference-image limit), and
  renders **exactly** that selection; "try other furniture" iterates (same
  photo/source/style), "love it" proceeds to cart. Auto-match (FR-014/FR-015) is
  now an **optional fallback**, run only when a render request carries no
  selection.
- **Self-hosted render engine (FEAT-005 / ADR-026).** Renders are produced by
  **FLUX.2 Klein 4B via the mflux CLI** as a child process on an Apple-Silicon
  render worker. `RENDER_ENGINE` defaults to **`fake`** (a placeholder/cached
  visual that keeps CI hermetic); **`mflux`** runs the real engine.
- **Autonomous render publication (FEAT-016 / ADR-025).** The operator
  render-review gate is **removed entirely**; renders publish to the requesting
  user **immediately on generation success**. No render-review role or review
  states remain.
- **Real photo upload + render display (FEAT-002).** `POST /projects/:id/photos`
  ingests raw image **bytes** into object storage; a new device-scoped
  `GET /renders/:id/image` streams the real backend render to the web app
  (NFR-007 device scoping preserved).
- **Large-photo downscale + EXIF orientation (BUG-001).** Inputs are downscaled to
  `MFLUX_MAX_IMAGE_EDGE` (1280 px) with EXIF orientation baked in before mflux
  runs, so ~24 MP phone photos no longer OOM the GPU.
- **Public-catalog bootstrap fallback (FEAT-017 / ADR-027) — two product
  sources.** **Local suppliers** (`source=supplier`, seeded Bogotá SKUs) are
  **purchasable** (cart/checkout) — **known gap: their images are placeholder
  vector SVGs, so their render is generic**. **Brand suppliers** (`source=public`,
  Amazon Berkeley Objects, CC BY 4.0) carry **real product photos** and are
  **display-only**: "not sold by Spazio" + a "View at retailer" outbound link + CC
  BY 4.0 attribution, never carted/checked-out/commissioned, and excluded from the
  render-to-purchase metric.
- **Earlier local-stack loop (#31, PR #32/#33) + hardening (#34).** Device-scoped
  client routes, cart, **mock** checkout with a single COP capture, per-supplier
  `PurchaseOrder` and a recorded 10% commission, an operator console for **catalog
  curation** and **order forwarding** (no render-review role), and the NFR-006
  render-to-purchase event trail.

**Not done / open (stated honestly):** not deployed anywhere (**local dev only**;
the render host must be **Apple Silicon**); **real payments not chosen** — checkout
is a **mock** gateway (`ADR-003` open); **Local-supplier real product images** are
still placeholders (generic renders). The earlier standalone `web-demo/` (PR #22),
the backend foundation scaffold (PR #21), and the operator console shell (PR #27)
are recorded as dated history in *Technical changes* below.

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

- **BUG-005 — the render queue could run concurrent mflux jobs, and a
  timed-out render was undiagnosable and lost the user's selection
  (2026-07-16).** Three gaps found while root-causing BUG-004:
  - **Queue serialization.** `InMemoryQueue.drain` had no in-flight guard: an
    `enqueue()` landing while a job was awaited started a second concurrent
    drain, so two mflux children (~20 GB MLX peak each) could run at once and
    exhaust the render host. Jobs now run strictly serialized (TC-142);
    NFR-004. Serialization makes `queued` a long-lived state, so the worker
    now also **skips a job whose request is already terminal at dequeue**
    (cancelled while it waited) instead of resurrecting it to `processing`
    and rendering for nobody (TC-145; keeps TC-137's terminal-stays-terminal
    contract).
  - **Timeout diagnosability.** The hard-timeout rejection discarded the
    child's collected stderr — the BUG-004 incident's only log line was a bare
    "render timed out after 360s". The timeout error now carries the stderr
    tail (TC-143), the worker logs job start (renderId + selection size), and
    the pipeline logs the spawned mflux command, so a killed render records
    how far it got and can be reproduced by hand.
  - **Selection snapshot.** The user's requested productIds lived only on the
    volatile queue payload and `RenderItem` rows exist only on success, so a
    failed render lost which products were attempted. The selection is now
    persisted as `RenderRequest.requestedProductIds` (additive column +
    migration; empty = auto-match fallback) at request creation (TC-144).
- **BUG-004 — the 6-minute render hard cap killed healthy real renders
  (2026-07-16).** The first real-user mflux render was SIGKILLed by the BUG-002
  hard timeout at exactly 360 s and marked `failed` while progressing normally.
  A timed reproduction with the same room photo and 3 reference products
  completed in **617 s** (~75 s per diffusion step × 8; peak 19.75 GB MLX
  memory): per-step cost grows steeply with reference-image count and
  resolution, so a worst-case (3-product) render **cannot** fit the original
  6-min budget on the M2 render host — the cap was killing real work, not
  hangs. The budget is now **`RENDER_TIMEOUT_MS` default `900000` = 15 min**
  (config.ts / .env.example) with the web client backstop raised to
  **`CLIENT_TIMEOUT_MS = 930_000`**, kept above the backend cap so the backend
  normally fails first **once the job is running** (TC-141 pins the backend
  default; the client constant lives in the web app and is kept above it by
  inspection). Caveat: the backend cap is armed at mflux spawn while the
  client's timer runs from enqueue, so queue wait behind another job is
  uncovered — a long-queued render can still hit the client backstop first
  (cancelled-while-queued handling is part of BUG-005). The ~2–5 min render
  figure remains a **soft target with no hard SLA** (ADR-013; NFR-001 carries
  the new measurement as a re-note); the timeout mechanism itself (BUG-002,
  TC-136/TC-137) is value-agnostic and unchanged. Related diagnosability and
  queue-serialization gaps found in the same incident are tracked as BUG-005.
- **BUG-003 — the render page deadlocked on the spinner in dev and any reload
  lost the whole wizard (2026-07-15).** Two independent web-app defects hid
  completed renders from the user:
  - **Strict Mode kickoff deadlock.** The `/render` kickoff effect started its
    async submit inside the effect and gated the resulting state updates on a
    per-run `cancelled` flag, while a ref (`startedKey`) blocked re-submission.
    Under React Strict Mode's dev remount (`reactStrictMode: true`), the first
    run's cleanup cancelled the only run — so `setPhase("generating")` was
    silently discarded, **no poll ever started, and the page spun on the loading
    screen forever while the backend render completed unseen** (the BUG-002
    client protections are keyed to the `generating` phase, so none engaged).
    The kickoff promise now lives in a ref, started at most once per
    photo+style+selection key, and **every effect run re-attaches to it**, so the
    phase transition always lands. A 60 s backstop now also covers the `loading`
    phase — no phase can spin silently.
  - **No wizard persistence.** All wizard state (room, style, selection,
    `projectId`, `renderId`) lived in memory only; any reload wiped it, the page
    guards bounced the user to `/room`, and an already-submitted render became
    unreachable. The wizard slices now persist to **sessionStorage** (never the
    photo `File` — its bytes are already uploaded; never server-derived data) and
    rehydrate on mount; guards wait for rehydration. A reload on `/render`
    **resumes polling the same render** (`renderKey` matches the submitted
    room:style:selection — no duplicate job), and "Try other furniture" / a
    failed render **reset** the stored render so retrying submits fresh instead
    of resuming a dead job. Verified end-to-end with a scripted browser
    click-through on the dev stack (TC-138/TC-139/TC-140): full flow to a
    displayed render, reload-resume with the same `renderId`, and fresh-render
    iteration, with no hydration mismatches. Web-only change — no backend, API,
    schema, or dependency change.
- **BUG-002 — a stuck render spun forever and orphaned a memory-thrashing child
  (2026-07-15).** When the mflux render child hung (e.g. the render host ran out of
  RAM and the model never finished loading) the child never exited, so the render
  worker's promise never settled: the `RenderRequest` stayed `processing` forever
  and the `/render` page polled endlessly showing "Generating your render" with no
  end. If the user then closed the tab, the mflux child kept running as an
  **orphan**, thrashing memory. There was no timeout and no cancellation anywhere.
  Two backend safeguards now make a stuck/failed render fail **gracefully** and
  **stop the work** (a browser cannot kill a server process, so this is enforced on
  the backend):
  - **Hard render timeout + SIGKILL.** The render pipeline enforces a hard cap on a
    single mflux run (`RENDER_TIMEOUT_MS`, default `360000` = 6 min at the time —
    raised to `900000` = 15 min by BUG-004, 2026-07-16). On timeout the
    child is **SIGKILLed** and the render is marked **`failed`**. This self-heals
    even when the browser is gone — a request never stays `processing` past the cap
    and no orphan child survives it.
  - **Cancel endpoint.** `POST /renders/:id/cancel` (device-scoped, NFR-007) lets
    the client stop an in-flight render **now** — on its own backstop timeout and
    when leaving the `/render` page — SIGKILLing any live child via an in-process
    render registry and marking a still-running request `failed` (idempotent).
  No schema/migration change (cancellation reuses the existing `failed` status) and
  no new dependency. Realizes **NFR-004** (graceful degradation); no new ADR. Tests:
  **TC-136** (timeout kills the child and fails the render), **TC-137** (cancel
  kills + marks failed, 404 for a foreign device, idempotent when terminal). See
  `features/FEAT-005`.

- **BUG-001 — large room photos crashed the render engine (GPU OOM).** Real phone
  photos (~24 MP; e.g. an iPhone 5712×4284 JPEG) were passed to the mflux engine at
  full resolution and exhausted GPU memory (`[METAL] … Insufficient Memory`),
  failing every render. The pipeline now **downscales each input image to a
  configurable max longest edge (`MFLUX_MAX_IMAGE_EDGE`, default 1280 px) and bakes
  EXIF orientation** before invoking mflux, using Pillow from the mflux venv (**no
  new dependency**). Renders now complete for real photos and are correctly
  oriented. Verified end-to-end on the reporting photo. Test: **TC-126**.

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
  payments are fake drivers (at #31, ADR-002/003 vendors open — the render
  engine has since been decided as self-hosted Klein via mflux, ADR-026,
  2026-07-14; see the engine-swap entry below), per-action role
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
  operator flows. Recording a decision is not building it: at decision time the
  code on `develop` still implemented the review flow; the removal is the
  FEAT-016 work item (`05_backlog.md`, issue #38 — see the next entry).

- **Render review flow removed from code (FEAT-016, #38).** The ADR-025
  implementation: the operator render approve/reject endpoints and the
  `pending_review` queue read, the `RenderReviewStatus` review states with
  `reviewed_by`/`reviewed_at` stamping on renders (dropped via one schema
  migration), the `render_reviewer` operator role, the `render_approved` event,
  the console's render-review tab, and the web app's waiting-for-approval /
  rejected screens are **deleted**. Renders are published to the requesting
  user immediately on generation success (generation states only:
  `queued`/`processing`/`completed`/`failed`), and the FR-031 cart
  auto-populate fires on the same generation-success path — no operator action
  between render generation and cart. Catalog curation (curator) and order
  forwarding (handler) are untouched; NFR-007 device scoping stands.
  TC-051–TC-053 and TC-108 retire with the gate and the automated suites are
  re-pointed at the surviving flows (`08_test_plan.md`); feature doc:
  `docs_en/features/FEAT-016_autonomous-render-publication.md`. Still nothing
  is deployed and no requirement is listed as covered.

- **Render engine decided — self-hosted FLUX.2 Klein 4B via mflux (`ADR-026`).**
  The product owner's 2026-07-14 decision: the render engine is **self-hosted
  FLUX.2 Klein 4B (Apache-2.0), run locally via the mflux CLI as a child
  process** (`mflux-generate-flux2-edit --model flux2-klein-4b`, quantized),
  replacing the placeholder `FakeRenderPipeline` as the real implementation via a
  new `MfluxRenderPipeline`. This **supersedes only** `ADR-002`'s
  hosted-generative-image-API engine clause; `ADR-002`'s **no-custom-trained-model**
  rule still stands (Klein is pretrained open weights), and the **real-SKU-only**
  invariant (`BR-6`/`BR-14`/`FR-016`) is unchanged. New deployment constraint:
  mflux depends on Apple MLX, so the render host **must be Apple Silicon** — the
  engine runs on a **separate Apple-Silicon render worker** consuming the existing
  async render-job queue (the owner's M2 for the class demo), while the API
  backend stays as decided (`ADR-001`). No API contract or data-model structural
  change (the `POST /renders` → `202` + poll model already fits a slow local
  child process). Privacy upside: room photos and renders no longer egress to a
  third-party image vendor (strengthens `BR-33`/`NFR-007`/`ADR-019`), and
  per-render cost becomes near-zero marginal local compute rather than a metered
  vendor call. `FakeRenderPipeline` stays the default/test/CI driver so tests and
  CI remain hermetic; `MfluxRenderPipeline` is selected only when configured.
  Recording a decision is not building it: no `MfluxRenderPipeline` code has
  shipped, nothing is deployed, and no requirement is listed as covered. Feature
  doc: `docs_en/features/FEAT-005_ai-rendering-engine.md`; decision:
  `docs_en/decisions/ADR-026_self-hosted-render-engine.md`.

- **Furnishing flow inverted to user-curated selection — specified
  (`ADR-028`, `FEAT-018`).** The product owner's 2026-07-15 decision replaces the
  PRD §8 auto-furnish flow with **browse-and-pick**: the user chooses a **source**
  (Local suppliers = `source=supplier` | Brand suppliers = `source=public`) and a
  **style**, **browses the real catalog, selects up to 3 products**, and renders
  **exactly those** into the room photo; "try other furniture" iterates with the
  same photo/source/style, and "love it" proceeds to the cart. The **3-item cap**
  is the hard product rule (owner decision), enforced **server-side**, and matches
  the FLUX.2 Klein engine's **~2–3 reference-image limit** (**ADR-026**). Auto-match
  (**FR-014 / FR-015**) is **scoped to an optional fallback** — run only when a
  render request carries no `productIds` (backward compatible) — **not deleted**.
  Product provenance (**ADR-027**) is unchanged: a **Local** (`source=supplier`)
  selection populates the cart (FR-031), a **Brand** (`source=public`) selection is
  display-only ("not sold by Spazio" + "View at retailer" link) and yields an
  **empty cart** by design (FR-064). This pass adds **FR-066..FR-069**
  (`03_requirements.md`) and test cases **TC-127..TC-135** (`08_test_plan.md`,
  Status Pending), and specifies the API contract in `06_api.md`: two **public**
  (not device-scoped) client browse endpoints — `GET /api/v1/catalog?source&styleId&budgetMaxCop`
  and `GET /api/v1/catalog/products/:id/image` — and an optional `productIds` field
  on `POST /api/v1/renders` (`400 too_many_products` when more than 3). **No schema
  change and no new npm dependency** (`source`, attribution, and styles already
  exist — ADR-027). NFR-007 device scoping on the project/render routes is
  preserved; the catalog GETs are intentionally unauthenticated. Recording a
  decision is not building it: **no application code is listed as shipped here**,
  nothing is deployed, and no requirement is listed as covered. Feature doc:
  `docs_en/features/FEAT-018_browse-select-furniture.md`; decision:
  `docs_en/decisions/ADR-028_user-curated-furniture-selection.md`.
  *(Clarifier, 2026-07-15: this is the decision/spec entry. The code has since
  landed and is **built and verified on the local dev stack** — see the
  "Current system (as built)" summary above — `POST /renders` `productIds` with
  `400 too_many_products`, `GET /catalog` + `/catalog/products/:id/image`, the
  selection-first render worker, and the web app's source toggle + `/select`
  route, covered by `backend/test/browse-select.test.ts`. Still not
  deployed/released.)*

- **Public-catalog bootstrap fallback decided and specified — docs only
  (`ADR-027`, `FEAT-017`, Issue #43).** The product owner's 2026-07-15 decision:
  because Spazio has **no onboarded suppliers yet**, a clearly-labeled, temporary
  **`source=public`** product track sourced from the **Amazon Berkeley Objects
  (ABO)** dataset (**CC BY 4.0**, attribution required) is added so the app has
  real products — real dimensions/materials/images — to match, render, and
  display for the demo. Public products are **display-only**: labeled **"not sold
  by Spazio"** with a **"View at retailer" outbound link**, and are **never**
  added to cart, checkout, orders, commission, or merchant-of-record, and are
  **excluded from the render-to-purchase metric** (NFR-006). This is **quarantine,
  not dilution**: the founding real-purchasable-SKU guarantee (**BR-6 / BR-14 /
  FR-016**) stays fully in force for the **supplier track** (built and demoed with
  seeded fake-supplier data); FR-016 and the CLAUDE.md §1 / vision thesis are
  **qualified with a narrow dated caveat, not rewritten or deleted** (same
  dated-marker precedent as ADR-024/025/026). ABO images are CC BY and legal to
  composite **with attribution**, so image provenance/attribution propagates into
  any render that composites a public product image (a derivative work, tied to
  ADR-026). This pass adds **FR-062..FR-065** (`03_requirements.md`), **NFR-019**
  (legal/compliance + attribution, `04_non_functional_requirements.md`), and test
  cases from **TC-110** (`08_test_plan.md`), records the dual-track catalog in the
  build/demo docs, and adds dated scope markers to **ADR-004** (MoR excludes public
  products), **ADR-006** (a public-dataset fetch is a new ingestion channel),
  **ADR-007** (no commission on public products), **ADR-014** (completeness gate
  kept via complete ABO records, or a documented relaxed `source=public`
  profile), and **ADR-023** (the demo's seeded catalog gains a seeded ABO subset).
  This is the **docs-first** half (the owner chose docs before code); recording a
  decision is not building it: **no application code has shipped**, nothing is
  deployed, and no requirement is listed as covered — the code lands in a later PR
  after these docs are approved. Feature doc:
  `docs_en/features/FEAT-017_public-catalog-fallback.md`; decision:
  `docs_en/decisions/ADR-027_public-catalog-bootstrap-fallback.md`.
  *(Clarifier, 2026-07-15: this is the docs-first decision entry. The code has
  since landed and is **built and verified on the local dev stack** — see the
  "Current system (as built)" summary above — the `source`/attribution schema
  fields, the `GET /catalog` + `/catalog/products/:id/image` routes, ~12 seeded
  `source=public` ABO products, cart/metric exclusion of public, and the web
  app's Brand-suppliers track, covered by `backend/test/public-catalog.test.ts`.
  Still not deployed/released; Local-supplier images remain placeholders.)*

- **Real photo upload + render display wired end-to-end (FEAT-002, 2026-07-15).**
  The image pipeline is connected to the UI at both ends, closing two gaps the
  render loop (#31) left open: the room photo was not actually uploaded (the web
  app substituted a preset sample and sent a preset **key string**; the backend
  photos route only recorded a `storageKey`, with no byte-ingest endpoint) and the
  real render was not shown (the web page displayed a cached preset visual and no
  route served the stored `Render.imageKey`). As built: `POST
  /api/v1/projects/:id/photos` now ingests the **raw image bytes**
  (`image/jpeg|image/png|image/webp`, parsed via a Fastify `addContentTypeParser`
  buffer — **no new dependency**, no `@fastify/multipart`; ~20 MB route limit),
  stores them in object storage under `rooms/<projectId>/<uuid>.<ext>`, creates the
  `RoomPhoto` and returns `201 { id, storageKey }` (**FR-005**); a **new**
  device-scoped `GET /api/v1/renders/:id/image` streams the stored render so the
  web app displays the **real backend render** (`MfluxRenderPipeline`, ADR-026)
  instead of a cached preset (**FR-015**; FEAT-005 / FEAT-007), keeping the cached
  visual only as the while-generating placeholder / fetch-failure fallback. Both
  new paths preserve device scoping — a foreign/unknown device answers **404**, and
  a render with no `imageKey` yet answers **404** so the client keeps polling
  (**NFR-007**). New test cases **TC-120..TC-125** (`08_test_plan.md`, Status
  Pending); `FakeRenderPipeline` stays the hermetic test default. No new ADR — this
  implements existing FRs (FR-005 / FR-015) with no new decision. Docs updated:
  `06_api.md`, `03_requirements.md`, `08_test_plan.md`, `05_backlog.md`,
  `features/FEAT-002_room-capture-inputs.md`, `features/FEAT-005_ai-rendering-engine.md`,
  `features/FEAT-007_product-tagging-interaction.md`. Still on a feature branch:
  **nothing is deployed or released and no requirement is listed as covered.**

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

- **None in a tagged release.** No `vX.Y.Z` release has been cut, so nothing is
  listed here as *covered by a shipped build*. This is a release-gating statement,
  **not** a claim that nothing is implemented (updated 2026-07-15): as recorded
  under *Current state* above, a large slice of the `FR-*`/`NFR-*` catalog is
  **built and verified on a local dev stack** — the browse-and-select flow
  (FR-066..069), photo byte upload + render display (FR-005/FR-015), the render
  loop and cart/checkout FRs, the public-catalog fallback (FR-062..065), device
  scoping (NFR-007), and the NFR-006 render-to-purchase event trail. A requirement
  moves into this section as *covered* in the first release that actually **ships**
  it, per the traceability chain
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

The first tagged release (`vX.Y.Z`, **SemVer**) will cut from the **web app +
backend** now built on `develop` (per **ADR-024**, 2026-07-14, the product is the
web app — the one-week iOS pilot *program* is superseded; `Spazio_One_Week_iOS_Pilot.md`
is retained as historical). When `develop` is ready, a `develop → main` PR is
opened and, on merge, the version is tagged and this file gains a dated
`## vX.Y.Z — YYYY-MM-DD` block. From that release onward, the **Added** and
**Requirements covered** sections describe capabilities that are **shipped**,
rather than built-and-verified-locally (the current state) or only documented.
