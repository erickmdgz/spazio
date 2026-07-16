# ADR-001 - Technology stack

## Status

Accepted. **Client choice superseded by ADR-024 (2026-07-14):** the product client is the web app (`web-demo/`); no native iOS app will be built. The backend + Postgres + object-storage decision and the Node/TS implementation note below stand.

## Context

The PRD reserves the technology stack as a human decision (PRD §12, "Human definitions"). Nothing is built yet (point-in-time context as of this decision, 2026-07-10; 2026-07-15: a working web app + backend are now built and verified locally — see ADR-024+ and the current-system summary — so this reads as historical, not a present-tense claim); this ADR records the stack decision now made for the one-week pilot.

Several documented constraints shape it:

- The AI coding agent is expected to build client, backend, database, APIs, and the rendering pipeline (PRD §12, "AI role"). The stack must be one the team can build and maintain.
- The first milestone is a **native iOS app only, one city, in one week** (Pilot, "Included"; "One-week plan"). Android and web are explicitly excluded from the pilot and sit in the PRD "Could have" / future scope.
- Non-functional requirements call for scalability and internationalization: supplier onboarding that scales by region, architecture supporting multiple countries and currencies, and per-market configuration of taxes, payment methods, and legal requirements (PRD §7; NFR-016, NFR-017, NFR-018).
- The stack must support the render pipeline (FR-015), catalog matching (FR-014), payments/split settlement (FR-042–FR-044), and localization (FR-012, FR-013, FR-046).

There is a real tension between "smallest thing shippable to iOS in a week" and "architecture that later scales to multiple countries, currencies, and platforms." This ADR makes that trade-off explicit; the decision below resolves it for the one-week pilot.

## Decision

Native iOS (SwiftUI) app + one small managed backend service + a managed relational (Postgres) DB + object storage for photos/renders; single environment/region. Product/tool choices are left to implementation; no multi-platform.

Scope: one-week iOS pilot.

**Implementation note (2026-07-13):** the backend language/framework left open above is now fixed for the pilot as **Node.js 22 + TypeScript (Fastify)** with **Prisma** over **Postgres** and a queue abstraction for async render jobs. The COP payment vendor remains unselected and is built behind an interface (ADR-003); the render engine is now decided as self-hosted FLUX.2 Klein 4B via mflux (ADR-026, 2026-07-14), no longer an open vendor pick. Recorded here as the concrete language choice; the foundation scaffold implements it (`backend/`).

## Alternatives considered

1. **Native iOS (Swift / SwiftUI) client + cloud backend.**
   - Pros: Best fit for the one-week iOS pilot; native camera/photo access for room capture (FR-005, FR-006); highest UI quality on a single platform.
   - Cons: Android and web later require a second client codebase; more platform-specific work as the product broadens.

2. **Cross-platform client (React Native or Flutter) + cloud backend.**
   - Pros: One codebase can later serve iOS, Android, and (with effort) web, matching the multi-platform future scope; potentially faster path to Android.
   - Cons: Extra abstraction may slow the one-week iOS pilot; some native camera/rendering integrations need bridging; risks over-building for platforms the pilot does not need.

3. **Managed backend / BaaS (e.g., a hosted auth + database + functions platform) vs. custom backend (e.g., a general-purpose server + relational DB).**
   - Pros (BaaS): Fastest to stand up auth, storage for private photos/renders (BR-33, NFR-007), and APIs for a one-week timeline.
   - Cons (BaaS): Possible limits on multi-market configuration, split-settlement integration, and cost control at scale; vendor lock-in.
   - Pros (custom): Full control over data model, i18n, and payment/settlement integration for the long term.
   - Cons (custom): Slower initial build; more to maintain for the pilot.

4. **Serverless vs. long-running services for the backend and render orchestration.**
   - Pros (serverless): Scales with demand; pairs well with a global inference-cost threshold and graceful degradation (PRD §7; NFR-003, NFR-004).
   - Cons (serverless): Long render jobs (PRD target ~2–5 min soft; NFR-001, ADR-013) and cost tracking per render (NFR-005) may need queueing/async patterns that add complexity.

(Client and backend choices are related but separable; the team may combine options above.)

## Positive consequences

- Resolving this unblocks all technical features and gives every later ADR (rendering, payments, catalog sync) a concrete platform to target.
- A stack chosen against the pilot-vs-scale tension avoids either over-building for the one-week iOS pilot or painting the product into a corner for multi-country expansion.

## Negative consequences

- Whatever is chosen is hard to reverse once code exists; a pilot-optimized choice may need rework to reach the multi-country, multi-platform scope, and a scale-optimized choice may slow the pilot.
- This decision unblocks the start of the pilot build; it is a prerequisite for almost every other decision here.

## Date

2026-07-10.
