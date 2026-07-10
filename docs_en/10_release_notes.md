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
- **Architecture Decision Records, all Proposed.** Twenty-one ADR files
  (`ADR-001`–`ADR-021`) are authored in `docs_en/decisions/`, each carrying
  **Status: Proposed** with its decision still **pending** — see *Technical
  changes* below for the register.
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

- **Architecture decisions remain open.** The decisions reserved for humans in
  **PRD §12** are recorded as ADR files in `docs_en/decisions/`
  (`ADR-001`–`ADR-021`), each with **Status: Proposed** and its decision still
  **pending**. None is decided, and no value below should be read as final. The
  table below registers the identifier, title, and status of each record.

  | ADR | Decision (Proposed — reserved for humans) | Status |
  |---|---|---|
  | ADR-001 | Technology stack | Proposed |
  | ADR-002 | Rendering / AI pipeline | Proposed |
  | ADR-003 | Payment gateway & split-settlement model | Proposed |
  | ADR-004 | Merchant-of-record model | Proposed |
  | ADR-005 | Style taxonomy | Proposed |
  | ADR-006 | Supplier catalog ingestion channels | Proposed |
  | ADR-007 | Commission percentage & marketplace fee model | Proposed |
  | ADR-008 | Budget tolerance | Proposed |
  | ADR-009 | Daily free-render limit | Proposed |
  | ADR-010 | Render-package pricing | Proposed |
  | ADR-011 | Cart-hold duration | Proposed |
  | ADR-012 | Catalog synchronization frequency | Proposed |
  | ADR-013 | Render-time target | Proposed |
  | ADR-014 | Minimum catalog completeness | Proposed |
  | ADR-015 | Initial launch markets | Proposed |
  | ADR-016 | Supplier partners & onboarding terms | Proposed |
  | ADR-017 | Sponsored-placement plan & pricing | Proposed |
  | ADR-018 | Taxes & multi-market compliance | Proposed |
  | ADR-019 | Data privacy & consumer protection | Proposed |
  | ADR-020 | Warranty & dispute-resolution rules | Proposed |
  | ADR-021 | Brand identity & visual design system | Proposed |

- Where the PRD offers a working value only as an example or default — commission
  (PRD example ~10%), daily free-render limit (PRD default ~5), cart-hold duration
  (PRD default 15 minutes), budget tolerance (PRD example ~10%), render-time
  target (PRD target ~2–5 min) — it is carried in the relevant ADR record as a
  **PRD-stated default to be confirmed by humans**, not as a chosen setting.

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
