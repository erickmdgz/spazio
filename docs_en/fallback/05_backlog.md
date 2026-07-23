# Backlog — Fallback Demo

This backlog lists the features of the **2-day fallback demo**. Same traceability bridge as the main backlog (`FEAT → FR → feature doc → Issue → branch → PR → TC → release notes`), in the fallback namespace. Status reflects work progress; everything starts `Pending`.

GitHub Issues are created when work starts (one Issue per FEAT-F, per `11_implementation_flow.md` Step 1). Branch naming: `feature/FEAT-F0X-<description>` from `develop`, PR back to `develop`.

## Feature backlog

| ID | Type | Name | Priority | Status | Related requirements |
|---|---|---|---|---|---|
| FEAT-F01 | Feature | Room input & proposal request flow | High | Pending | FR-F01, FR-F02, FR-F03 |
| FEAT-F02 | Technical | Home Depot catalog retrieval (SerpApi) | High | Pending | FR-F04, FR-F05; NFR-F01, NFR-F03 |
| FEAT-F03 | Feature | LLM proposal composition & display | High | Pending | FR-F06, FR-F07, FR-F08, FR-F09, FR-F10; NFR-F02, NFR-F04 |

## Critical path (2-day demo)

All three features are on the critical path; the build order and day split live in `12_build_plan.md`:

1. **FEAT-F02** first (Day 1 morning) — without real products nothing else is testable; its cache also de-risks the live demo.
2. **FEAT-F03** composer (Day 1 afternoon) — the core of the idea; the rule-based fallback composer makes the demo failure-proof.
3. **FEAT-F01** + web display side of FEAT-F03 (Day 2) — thin input/output shell, then rehearsal on a warm cache.

## Allowed types

Same as the main backlog: `Feature`, `Bug`, `Technical`, `Enhancement`, `Documentation`, `Security`.
