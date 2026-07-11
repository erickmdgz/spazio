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
documentation has been seeded from **PRD v0.7** (`Spazio_PRD_v0.7.md`) in this
documentation pass. There is **no application code** in this release: nothing has
been implemented, tested, or shipped. This entry stays under `[Unreleased]` until
the first `vX.Y.Z` tag is cut (see *First tagged release* below).

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
- **Architecture Decision Records, all Accepted (pilot).** Twenty-two ADR files
  (`ADR-001`–`ADR-022`) are authored in `docs_en/decisions/`, each carrying
  **Status: Accepted (pilot)** with its decision recorded at the simplest
  pilot-scoped value — see *Technical changes* below for the register. Recording
  a decision is not building it: nothing here is implemented or shipped.
- **Feature specifications, seeded.** Authored feature docs in
  `docs_en/features/`: `FEAT-002`, `FEAT-003`, `FEAT-004`, `FEAT-005`,
  `FEAT-006`, `FEAT-007`, `FEAT-008`, `FEAT-009`, `FEAT-010`, `FEAT-011`, and
  `FEAT-015`. They describe intended behavior; they are not built.
- **Authoring templates.** The `docs_en/templates/` set (feature, ADR,
  requirement, bug, and AI-prompt templates) for downstream authoring.

> **These are documentation artifacts, not product features.** The requirement
> and test catalog, the ADR records, and the feature specs listed above are
> *written down*, not *built*. Adding a spec to `/docs_en` is not the same as
> adding a feature to the product, so none of them is listed here as a shipped
> capability.

### Fixed

- None. There is no prior release, so there is nothing to fix.

### Technical changes

- **Architecture decisions recorded (pilot-scoped).** The decisions reserved for
  humans in **PRD §12** have been made for the pilot and are recorded as ADR
  files in `docs_en/decisions/` (`ADR-001`–`ADR-022`), each with **Status:
  Accepted (pilot)** and resolved at its simplest implementation consistent with
  the PRD and the one-week iOS pilot. These values are decided and recorded, not
  built: nothing below is implemented or shipped in this release. Values marked
  *(revisit before scale)* stay Accepted for the pilot and carry an explicit
  scale caveat. The table below registers the identifier, decision, and status of
  each record.

  | ADR | Decision (Accepted for the pilot — reserved for humans) | Status |
  |---|---|---|
  | ADR-001 | Technology stack | Accepted (pilot) |
  | ADR-002 | Rendering / AI pipeline | Accepted (pilot) |
  | ADR-003 | Payment gateway & split-settlement model | Accepted (pilot) |
  | ADR-004 | Merchant-of-record model | Accepted (pilot) |
  | ADR-005 | Style taxonomy | Accepted (pilot) |
  | ADR-006 | Supplier catalog ingestion channels | Accepted (pilot) |
  | ADR-007 | Commission percentage & marketplace fee model | Accepted (pilot) |
  | ADR-008 | Budget tolerance | Accepted (pilot) |
  | ADR-009 | Daily free-render limit | Accepted (pilot) |
  | ADR-010 | Render-package pricing | Accepted (pilot) |
  | ADR-011 | Cart-hold duration | Accepted (pilot) |
  | ADR-012 | Catalog synchronization frequency | Accepted (pilot) |
  | ADR-013 | Render-time target | Accepted (pilot) |
  | ADR-014 | Minimum catalog completeness | Accepted (pilot) |
  | ADR-015 | Initial launch markets | Accepted (pilot) |
  | ADR-016 | Supplier partners & onboarding terms | Accepted (pilot) |
  | ADR-017 | Sponsored-placement plan & pricing | Accepted (pilot) |
  | ADR-018 | Taxes & multi-market compliance | Accepted (pilot) |
  | ADR-019 | Data privacy & consumer protection | Accepted (pilot) |
  | ADR-020 | Warranty & dispute-resolution rules | Accepted (pilot) |
  | ADR-021 | Brand identity & visual design system | Accepted (pilot) |
  | ADR-022 | Pilot checkout identity model | Accepted (pilot) |

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

### Requirements covered

- **None.** No functional or non-functional requirement is implemented in this
  release. The `FR-*` / `NFR-*` catalog has been **documented only**; a
  requirement will appear here as *covered* in the first release that actually
  implements and tests it, per the traceability chain
  (`FEAT → FR/NFR → feature doc → Issue → branch → commits → PR → TC → release notes`).

---

## First tagged release

The first tagged release (`vX.Y.Z`, **SemVer**) will follow the **one-week iOS
pilot** (`Spazio_One_Week_iOS_Pilot.md`). When `develop` is ready, a
`develop → main` PR is opened and, on merge, the version is tagged and this file
gains a dated `## vX.Y.Z — YYYY-MM-DD` block. Only from that release onward will
the **Added** and **Requirements covered** sections describe capabilities that
are genuinely built and tested, rather than documented.
