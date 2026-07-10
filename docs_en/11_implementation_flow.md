# Implementation flow with Claude

## Purpose

This document defines **how Claude (Claude Code) must work when the team asks it to implement something**. The goal is that it first **plans**, then **identifies which documentation the change affects**, and only then **develops**, maintaining the traceability the project requires (Need → Requirement → Design → Implementation → Test → Release).

It adds two mandatory steps to the standard feature flow: **plan with human approval** and **identify the documentation impact before coding**.

Golden rule: **no code change begins without a plan approved by a person.**

This repo's branching model is **`main` + `develop`** (defined in `CLAUDE.md`, section 4): daily work branches off `develop` and returns to `develop`; `main` is reserved for releases.

---

## Step 0 — Understand and plan (plan mode)

Before writing a single line of code:

1. Enter **plan mode**: in a Claude Code session press `Shift+Tab` to toggle plan mode (or start with `claude --permission-mode plan`). In this mode Claude reads files and proposes a plan without editing anything until you approve.
2. Produce a plan that answers:
   - What will be built and what problem it solves.
   - Which requirement(s) it connects to (`FR-`/`NFR-`) or which one needs to be created.
   - Which files and modules will be touched.
   - Which documentation will be affected (see Step 2).
   - Which tests (`TC-`) will validate it.
   - Risks and what is out of scope.
3. **Wait for explicit approval from a person.** Do not exit plan mode into execution without that sign-off.

## Step 1 — Record the need

- Open a **GitHub Issue** with the corresponding template (`feature` or `bug`) and assign it an ID (`FEAT-XXX` / `BUG-XXX`).
- Add it to `/docs_en/05_backlog.md` with its type, priority, status, and related requirement.

## Step 2 — Identify the impacted documentation (before coding)

Review this list and mark which files in `/docs_en` you will have to **create or update** for this change. This step is mandatory and must be reflected in the plan and in the PR.

- [ ] `01_product_vision.md` — does the scope, objective, or "out of scope" change?
- [ ] `02_architecture.md` — new module, stack, or architecture rule?
- [ ] `03_requirements.md` — new functional requirement or change to acceptance criteria?
- [ ] `04_non_functional_requirements.md` — impact on security, performance, usability, etc.?
- [ ] `05_backlog.md` — almost always yes (item added/status).
- [ ] `06_api.md` — new endpoints or contract changes?
- [ ] `07_data_model.md` — new entities, fields, or relationships?
- [ ] `08_test_plan.md` — almost always yes (new `TC-`).
- [ ] `09_ai_usage.md` — only if the AI usage rules change.
- [ ] `/docs_en/decisions/ADR-XXX_*.md` — is there an important technical decision to record?
- [ ] `10_release_notes.md` — always, when closing.
- [ ] `/docs_en/features/FEAT-XXX_*.md` — the feature document (Step 3).

## Step 3 — Create the feature document

- Copy `/docs_en/templates/template_feature.md` to `/docs_en/features/FEAT-XXX_name.md` and complete it.
- If there is a relevant technical decision, create an ADR from `/docs_en/templates/template_adr.md` in `/docs_en/decisions/`.

## Step 4 — Branch and development

- Create the branch **starting from `develop`**: `feature/FEAT-XXX-description` (or `fix/BUG-XXX-...`).
- Develop in atomic commits with the ID up front: `FEAT-XXX: <description in imperative>`.
- Follow the Git rules in `CLAUDE.md` (nothing direct to `main` or `develop`, no secrets, no unjustified dependencies).
- Explain your approach before generating code and do not deliver anything you do not understand.

## Step 5 — Test

- Add the test cases in `/docs_en/08_test_plan.md` (happy path, common errors, and basic security).
- Run the tests before considering the feature finished.

## Step 6 — Update the impacted documentation

- Update **all** the files you marked in Step 2.
- Verify that the feature ends up connected to its requirement, test, and doc.

## Step 7 — Pull Request

- Open the PR **targeting `develop`** using `.github/PULL_REQUEST_TEMPLATE.md`.
- Link and close the Issue with `Closes #<number>` (it closes upon integration into `develop`, which is the default branch).
- On a PR to `develop`, review is recommended, not mandatory; on a PR to `main` (release/hotfix) **at least 1 approval** is required.

## Step 8 — Merge, release, and closure

- Integrate the PR into `develop` with a **merge commit** (the strategy defined for this repo).
- After merging, **delete the branch** of the feature/fix (working branches are short-lived and are removed once integrated).
- **Release:** when `develop` accumulates changes that are ready, open a PR `develop → main`; when merging it (with 1 review), create the SemVer tag `vX.Y.Z` and update `/docs_en/10_release_notes.md`.
- **Hotfix:** for production emergencies, create `hotfix/...` from `main`, PR to `main`, and then integrate that same fix into `develop`.
- A feature is only closed if: it is implemented, tested, meets the acceptance criteria, has a reviewed PR, the documentation was updated, and it appears in the release notes.

---

## Mandatory minimal traceability

```txt
FEAT-XXX
  ├── FR-XXX / NFR-XXX
  ├── Feature document (/docs_en/features/)
  ├── GitHub Issue
  ├── Branch from develop (feature/FEAT-XXX-...)
  ├── Commits (FEAT-XXX: ...)
  ├── Pull Request (with review)
  ├── Test cases (TC-XXX)
  └── Release notes (vX.Y.Z)
```

## Reminder for the Claude that implements

- Plan and **wait for approval** before coding.
- Identify the documentation impact **beforehand**, not afterward.
- You do not decide product or architecture: you propose; the person decides.
- Do not accept code you do not understand, and always flag your assumptions.
