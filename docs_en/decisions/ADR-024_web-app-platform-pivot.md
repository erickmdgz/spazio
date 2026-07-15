# ADR-024 - Web app as the product platform (no native iOS); class-demo-scale scope

## Status

Accepted.

Scope: product direction from 2026-07-14 onward. Supersedes the **client choice** in ADR-001 and the **one-week pilot program framing**; everything else in ADR-001 (backend, Postgres, object storage, Node/TS implementation note) stands.

**Update (ADR-025, 2026-07-14):** the operator "QA" step in the loop sequence cited in Decision (3) is retired; the loop design reference is now matching → render → checkout, with renders published immediately on generation success (ADR-025).

## Context

ADR-001 fixed the pilot client as a native iOS (SwiftUI) app, and the approved one-week pilot build plan (`12_pilot_build_plan.md`) sequenced the work iOS-first. Since approval, the platform-neutral foundation began landing on `develop` (backend scaffold PR #21; operator console shell + operator auth PR #27), while separately a **2-day class demo** was delivered as a web app (`web-demo/`, ADR-023) with the explicit framing that it changed no product decision.

On 2026-07-14 the product owner decided the trade-off differently: **the opportunity cost of building the iOS app and making a working platform is too high.** A working web platform, built in small increments on the code that already exists, beats an unfinished native pilot.

## Decision

1. **No native iOS app will be built.** The product client is the existing web app (`web-demo/`, Next.js), which graduates from class-demo artifact to product platform.
2. **The web app will be wired to the real backend** (`backend/` — Fastify/Prisma per the ADR-001 implementation note) and to the operator console loop (build plan §1.7), replacing the demo's in-memory state, mock checkout, faked render, and seeded catalog as work proceeds. The wiring itself follows the normal plan-approval flow before any code.
3. **Scope is class-demo scale.** Work proceeds in small, demo-sized increments. The one-week pilot *program* (Day 1–7 schedule, TestFlight cohort, Apple Developer enrollment) no longer governs; the pilot plan document remains the reference for the loop's design (data model, API, matching → render → QA → checkout sequence, scope boundaries §0.1).
4. ADR-023's web-delivery choices, recorded "for the demo scope only," are **adopted as product direction for the client**. Its mock substitutions remain demo artifacts slated for replacement, per (2).

## Alternatives considered

1. **Continue the approved one-week iOS pilot (ADR-001).** Rejected by the product owner: opportunity cost too high relative to reaching a working platform.
2. **Cross-platform client (React Native / Flutter).** Already rejected in ADR-001; still rejected — heavier than the web codebase the team already has.
3. **Keep the web app demo-only and pause product work.** Rejected: the goal is a working platform, and the demo is the closest artifact to one.

## Positive consequences

- A working client codebase already exists and runs anywhere a browser runs; no Apple enrollment / TestFlight external lead times (two of the plan's §2.6 critical-path risks disappear).
- The foundation already merged or in review (backend, operator console) is platform-neutral and is reused as-is.
- Increment size matches the team's real capacity.

## Negative consequences

- Native camera capture (FR-006) and the iOS-specific UX assumptions in the pilot plan are out; FEAT-002/003/007 client work must be re-read as web work.
- Several docs are written iOS-first (`01`, `02`, `05`, `12`, the pilot source doc); this ADR plus minimal status notes redirect the reader, but a deeper doc pass is deferred until the wiring work makes the web shapes concrete.
- "Class-demo scale" is an effort envelope, not a schedule: the full render-to-purchase loop on the real backend still spans multiple increments, and no date is promised by this ADR.
