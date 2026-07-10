# Functional requirements

This document catalogs what the system must do. Each functional requirement (FR) is an **atomic and verifiable** capability. To add one, copy the block from `docs_en/templates/template_requirement.md` and paste it below the index.

> **Distinction:** the FR defines **what** the system must do; the **how** (design, screens, data schema, steps) lives in the feature document (`docs_en/templates/template_feature.md`). Work progress, estimation and ownership live in `05_backlog.md`.

## How to write an FR

1. **Atomic:** one FR = one capability. If you join two functions with "and", split it into two FRs.
2. **Data ≠ functions:** fields are grouped inside the function that uses them, not one FR per field.
3. **Fixed pattern:** "The system shall, when [trigger/actor], [observable result]". Design (technology, screens, data schema) and vagueness ("fast", "friendly", "easy") are forbidden.
4. **Observable result (channel-neutral):** persisted state, record created/modified, value or code returned, event emitted or on-screen output. It does not require a graphical interface.
5. **Discriminator always:** every result (happy or error) must be distinguishable: resulting state, flagged field or code. Never just "shows an error".
6. **Error path:** mandatory if the FR accepts user input, depends on preconditions or requires permissions/state. It goes as a criterion with its TC-.
7. **Verifiable:** each acceptance criterion maps 1:1 to a TC- in `08_test_plan.md` (the assertion lives in the TC's "Expected result"). Coverage: every described path has ≥1 criterion; no criterion without a described behavior.
8. **Priority = requirement criticality** (see scale), not work urgency (that is managed by `05_backlog.md`).
9. **Do not invent:** anything unconfirmed is marked `[PENDING: ask client]`.
10. **FR ↔ FEAT boundary:** criteria and rules are written in the FR; the feature document (FEAT) **references** them ("Criteria: see FR-XXX"), it does not rewrite them.

**Priority scale:**

| Priority | Meaning |
|---|---|
| High | Without this requirement the system does not fulfill its purpose. |
| Medium | Adds value; its absence degrades the system but can be deferred. |
| Low | Desirable; no impact on core value. |

**Status (requirement validity):** `Proposed` / `Approved` / `Obsolete`. Implementation progress is not recorded here; it is read in `05_backlog.md`.

## Requirements index

<!-- Catalog at a glance; the detail lives in each FR-XXX block below. -->

| ID | Requirement | Priority |
|---|---|---|
| FR-XXX | … | High / Medium / Low |

<!-- Paste each FR here using docs_en/templates/template_requirement.md -->

---

## Identifier convention

| Type | Prefix | Example |
|---|---|---|
| Functional requirement | FR | FR-001 |
| Non-functional requirement | NFR | NFR-001 |
| User story | US | US-001 |
| Technical decision | ADR | ADR-001 |
| Test | TC | TC-001 |
| Feature | FEAT | FEAT-001 |
| Bug | BUG | BUG-001 |
