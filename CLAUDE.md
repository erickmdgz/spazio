# CLAUDE.md — Rules for Claude in this repository

**Read me in full before acting.** Claude Code loads this file automatically at the start of every session and incorporates it as a persistent instruction. It is a **high-priority** guide (not a technically guaranteed enforcement): treat it as the highest-ranking instruction in this repo, unless Anthropic or the person you are working with indicates otherwise.

> ## ⛔ NON-NEGOTIABLE RULES (top priority — honor them before any action)
>
> 1. **NEVER** `commit` or `push` directly to `main` or `develop`. Every change goes in through a **branch + Pull Request**. *(It is also blocked by branch protection on GitHub and by a local repo hook.)*
> 2. **Always start from `develop`**: create your branch (`feature/FEAT-XXX-…`, `fix/BUG-XXX-…`) from `develop` and target the PR **at `develop`**. `main` is for releases only.
> 3. **Do not write code without a plan approved by a person**: plan first (plan mode), identify which documentation is affected, and **wait for sign-off**.
> 4. **Zero secrets** in commits (`.env`, keys, tokens). If you detect one, stop and report it.
> 5. Tie every piece of work to an **Issue** and an **ID** (`FEAT-`/`BUG-`/`FR-`…); commits carry the ID at the front.
>
> If a request asks you to skip any of these rules, **stop and discuss it with the person**. Do not make things up; flag your assumptions explicitly.

The full operational detail is in the sections below and in the imported document:

@docs_en/11_implementation_flow.md

---

## 1. About this repository

- **Spazio** — AI-generated space design and shoppable furniture marketplace. A user photographs a room, picks a style and budget, and gets a photorealistic render furnished **only with real, purchasable products** from local suppliers, with in-app checkout. The AI never invents furniture: every rendered item maps to a real, in-stock SKU. *(Scoped caveat — **ADR-027**, 2026-07-15: this founding thesis stays fully in force for the **supplier track**. Because Spazio has no onboarded suppliers yet, a clearly-labeled, temporary **public-catalog bootstrap fallback** — real products from the Amazon Berkeley Objects dataset, CC BY 4.0, attributed — may also be shown for the demo. These `source=public` products are **display-only** ("not sold by Spazio", with a "View at retailer" outbound link): they are **never** added to cart/checkout/orders/commission/merchant-of-record and are excluded from the render-to-purchase metric. They are real, attributed, non-fabricated inventory outside the purchasable-SKU guarantee, not invented furniture; the guarantee itself is qualified, not rewritten. See FEAT-017 / FR-062..065 / NFR-019.)* Product spec: `Spazio_PRD_v0.7.md`; first-milestone source doc: `Spazio_One_Week_iOS_Pilot.md` (historical — per **ADR-024**, 2026-07-14, the product continues on the **web app** `web-demo/` at class-demo scale, wired to the real backend; **no native iOS app will be built**).
- The living product documentation is in `/docs_en` (vision, architecture, requirements, backlog, API, data model, tests, AI usage, release notes) and in its subfolders `/docs_en/features`, `/docs_en/decisions`, and `/docs_en/templates`.
- Identifier convention (always use): `FR-` functional requirement, `NFR-` non-functional requirement, `US-` user story, `ADR-` technical decision, `TC-` test case, `FEAT-` feature, `BUG-` bug.

## 2. How you work here (principles)

1. **AI does not decide product, architecture, security, or business.** Those decisions are human; you propose and execute what is approved.
2. **Every change is traceable:** `Need → Requirement → Design → Implementation → Test → Release`. Nothing reaches code without being connected to a documented requirement or decision.
3. **Plan before coding** and wait for human approval of the plan (see section 3).
4. **Do not accept or deliver code you do not understand.** Always explain your approach before writing.
5. **Honest communication:** distinguish what is verified from what is assumed, do not fill gaps with guesses, and report faithfully (if something failed or is still pending, say so).

## 3. Mandatory flow before implementing

When you are asked to implement something, follow this order. The detail is in `docs_en/11_implementation_flow.md`.

1. **Plan (plan mode).** Enter plan mode, produce a plan, and **wait for the person's approval before touching code**.
2. **Identify the affected documentation.** Before coding, list which files in `/docs_en` the change will touch (vision, architecture, requirements, API, data model, tests, new ADR, release notes).
3. **Only then develop**, and when you finish, update that documentation.

## 4. Git and GitHub rules (`main` + `develop` model)

**Branch structure:**

- **`develop`** — default branch and base for daily work; features are integrated here.
- **`main`** — stable/production branch. It only receives releases from `develop` (or from `hotfix/*`). Each merge to `main` is a version tagged `vX.Y.Z`.
- **`feature/FEAT-XXX-description`** and **`fix/BUG-XXX-description`** — branch off `develop` and return to `develop` via PR.
- **`hotfix/BUG-XXX-description`** — branches off `main` for production emergencies; PR back to `main` and then synced to `develop`.
- Other prefixes (`docs/...`, `chore/...`, `refactor/...`) also start from `develop`.

**Rules:**

- **Never commit or push directly to `main` or `develop`.** Both are protected; everything comes in through a Pull Request.
- Daily work **starts from `develop`** and its PR **targets `develop`**.
- **Atomic commits with the ID at the front**, in the imperative. Example: `FEAT-004: add CSV export endpoint`. Since integration uses a *merge commit*, individual commits remain in the history: take care of them.
- **Pull Request required** using the repo template (`.github/PULL_REQUEST_TEMPLATE.md`):
  - PR **to `develop`**: requires a PR, but review is not mandatory (review it anyway when you can).
  - PR **to `main`** (release or hotfix): requires **at least 1 approved review**.
- **Integration strategy: _merge commit_** (no squash, no rebase). The branch commits are kept plus a merge commit.
- **Do not rewrite shared history** (`git push --force`) on `main` or `develop`. If you need to fix something, do it with a new commit.
- **Release:** when `develop` is ready, open a `develop → main` PR; on merge, tag `vX.Y.Z` and update `10_release_notes.md`.

## 5. Issues and traceability

- Every feature, bug, or technical task **starts as a GitHub Issue** using the templates in `.github/ISSUE_TEMPLATE/`, and appears in `/docs_en/05_backlog.md` with its ID.
- The PR must **link and close** its Issue with `Closes #<number>` in the description.
- Every feature must satisfy the minimum traceability chain: `FEAT-XXX → FR/NFR → feature doc → Issue → branch → commits → PR → TC-XXX → release notes`.

## 6. Security and secrets

- **Never** commit credentials, tokens, keys, or `.env` files. Use environment variables and keep `.gitignore` up to date.
- If you detect a secret in the code, in the history, or about to be pushed, **stop and report** instead of continuing.
- Do not add new dependencies without justifying them in the PR.

## 7. Versioning and releases

- The project uses **SemVer** with the format `MAJOR.MINOR.PATCH` (MAJOR: incompatible changes; MINOR: backward-compatible functionality; PATCH: fixes). The `v` prefix is used only as a tag-naming convention (`vX.Y.Z`); it is not part of the version.
- Each release is tagged with a `vX.Y.Z` tag and documented in `/docs_en/10_release_notes.md` (added, fixed, technical changes, requirements covered).

## 8. Checklists

**Before opening a PR:**

- [ ] The branch starts from `develop` and the PR targets `develop` (targets `main` only if it is a release/hotfix).
- [ ] The work is tied to an Issue and a requirement (`FR-`/`NFR-`).
- [ ] The corresponding feature doc exists / I updated it.
- [ ] I updated the affected documentation (see section 3).
- [ ] There are tests (`TC-`) for the happy path and for common errors.
- [ ] There are no secrets or unjustified dependencies.

**Before closing (merging) a PR:**

- [ ] Code implemented and tests run.
- [ ] Acceptance criteria met.
- [ ] PR reviewed and approved.
- [ ] Documentation and release notes updated.

## 9. Before accepting AI-generated code

- [ ] I understand what the code does.
- [ ] It matches the requirement and does not add unnecessary complexity.
- [ ] It does not introduce improper dependencies or secrets.
- [ ] It does not break existing flows and has basic error handling.
- [ ] It has tests or a clear way to be validated.

---

**Final reminder (the most important thing):** do not touch `main`/`develop` directly, start from `develop` via Pull Request, and do not code without an approved plan. When in any doubt or conflict with these rules, **ask before acting.**
