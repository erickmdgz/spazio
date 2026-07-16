# FEAT-016 - Autonomous render publication (remove the operator render-review gate)

> **Type: Refactor** (see `05_backlog.md`) · **Issue: #38** · **Decision: ADR-025** (`docs_en/decisions/ADR-025_autonomous-render-publication.md`, 2026-07-14). This feature implements in code a decision already recorded and already reflected in the target-state docs (PRs #37/#39): where code and spec disagree, code moves to the spec.
>
> **As built (2026-07-15) — done and verified on a local stack (not deployed).** The removal is complete in the code: the schema carries **no** `RenderReviewStatus` enum and **no** `Render.reviewStatus` / `reviewedAt` / `reviewedById` fields; `OperatorRole` has only `catalog_curator` and `order_handler` (no `render_reviewer`); there is **no** `backend/src/routes/operator/renders.ts` and no render approve/reject/queue registration in `app.ts`; the client render routes expose generation status only (`queued`/`processing`/`completed`/`failed`) and a completed render is immediately visible to its owner; and the FR-031 cart auto-populate fires on the render worker's generation-success path. The section 12 "before closing" checklist below is left as the original template state and does not reflect this verified status.

## 1. Summary

Remove the as-built operator render-review flow from the code so that **renders are published to the requesting user immediately on generation success** (ADR-025). The render lifecycle keeps only the generation states (`queued` / `processing` / `completed` / `failed`); a render that completes is immediately visible to its requesting user, and the cart auto-populate (FR-031) fires on the same generation-success path. This is a **pure removal**: no automated QA, ML moderation, or confidence-threshold gating replaces the operator (ADR-025, Decision 3).

## 2. Problem or need

On 2026-07-14 the product owner decided that the rendering process must run without a human approval role (**ADR-025**, superseding the mandatory-operator-QA clause of ADR-002 and retiring FR-027 / FEAT-006). The documentation was rewritten to that target state in the same iteration (merged PRs #37/#39), but at the start of this work the backend, operator console, and web app still implemented the review flow — the running system enforced a gate the spec had removed (ADR-025, Negative consequences). This feature closes that code-vs-spec gap.

## 3. Affected user

- **Homeowner/renter** — waits only on generation: the render appears as soon as it completes, with no operator-approval hold and no "rejected" outcome.
- **Operator** — no longer reviews renders; the `render_reviewer` role is retired. The console remains for the two surviving human gates: catalog curation (`catalog_curator`, FEAT-015) and order forwarding (`order_handler`, FEAT-011), which behave exactly as before.
- **System** — the render worker publishes the render and triggers cart auto-population on generation success.

## 4. Related requirements

Retired by this work (the gate being removed):

- FR-027 — Operator reviews and approves each render *(Deprecated — superseded by ADR-025; its code paths are what this feature deletes)*
- FEAT-006 — Render review & moderation *(Retired — ADR-025)*

Functional (reworded per ADR-025 in `03_requirements.md`; this feature makes the code match):

- FR-015 — Generate a photorealistic render; **published to the requesting user immediately upon successful generation**
- FR-028 — Tag every rendered product; tags are generated **when a render is published (immediately upon successful generation)**
- FR-029 — View a tagged product's details by tapping it **on a published render**
- FR-031 — Auto-populate the cart with every product shown in the render; **trigger moves from operator approval to generation success**

Non-functional (preserved — behavior must not regress):

- NFR-006 — Render-to-purchase tracking from day one; the funnel/event naming is aligned with the updated spec (the `render_approved` emission is removed with the gate)
- NFR-007 — Photos and renders private by default; device scoping stays (a foreign device token gets 404 on renders/carts); the former operator-review access carve-out is gone
- NFR-008 — Operator authentication and per-action role gating stand for the surviving roles (`catalog_curator`, `order_handler`); TC-108, which gated the retired render approve/reject actions, is retired with the endpoints

## 5. Expected flow

1. The user submits a render request (`POST /api/v1/renders`); the system answers with a pending render to poll (`queued`).
2. The render worker matches real, available SKUs and generates the composite; the request moves `queued → processing → completed | failed` (generation states only — there is no review state).
3. On generation success, the render is **published immediately**: `GET /api/v1/renders/{renderId}` returns `completed` with the image and its tagged items, with no operator action in between.
4. On the same generation-success path, the system auto-populates the cart from the render's tagged products (FR-031) and emits the NFR-006 funnel events per the updated spec.
5. On generation failure, the request ends `failed` and nothing is shown to the user (FR-015 / TC-029).

## 6. Acceptance criteria

Acceptance criteria **are defined in the corresponding functional requirement (FR)**, not here (see `docs_en/03_requirements.md`). This FEAT only references them:

- FR-015 → criteria in `docs_en/03_requirements.md` (completed render published to the user → TC-028; failure recorded, nothing shown → TC-029)
- FR-028 → criteria in `docs_en/03_requirements.md` (→ TC-054)
- FR-029 → criteria in `docs_en/03_requirements.md` (→ TC-055)
- FR-031 → criteria in `docs_en/03_requirements.md` (→ TC-058)
- FR-027 is Deprecated (ADR-025) — its criteria (TC-051/052/053) are retired, not to be satisfied.

If you detect a new criterion during implementation, first add it to the FR (with its `TC-`) and then continue.

## 7. Business rules

Business rules **live in the FR** (`docs_en/03_requirements.md`); they are not rewritten here. Reference:

- FR-015 (renders private by default → NFR-007; the former "must be operator-approved before being shown" rule is superseded by ADR-025)
- FR-031 (PRD BR-31: the auto-populated cart is a suggestion and must be explicitly confirmed before payment → FR-035)
- Unaffected gates (guardrail): catalog curation (BR-1 completeness, FEAT-015) and manual order forwarding (FEAT-011) keep their rules and their operators exactly as before.

## 8. Proposed technical design

*Removal-only refactor; the touchpoint list below matches the FEAT-016 scope note in `05_backlog.md`. No new features, no new dependencies.*

### Frontend

- **Web app (`web-demo/`):** retype the render contract to generation status only (`src/lib/api.ts`, `src/lib/store.tsx`); remove the waiting-for-approval and rejected screens from `src/app/render/page.tsx` (the client waits only on generation); reword `src/app/cart/page.tsx` accordingly.
- **Operator console (`operator/`):** remove the renders tab/queue from `operator/public/index.html` and `operator/public/app.js`. The console itself stays, serving catalog curation and order forwarding.

### Backend

- Delete the operator render approve/reject/queue routes (`backend/src/routes/operator/renders.ts`) and their registration in `backend/src/app.ts`. The operator catalog, order, session, and console routes stay.
- Client render responses (`backend/src/routes/client/renders.ts`) expose **generation status only** (`queued`/`processing`/`completed`/`failed`); a completed render is immediately visible to its owner.
- Move the FR-031 cart auto-populate trigger from the approval handler to the render worker's generation-success path (`backend/src/jobs/renderWorker.ts` → `backend/src/services/cart.ts`).
- Remove the `RENDER_APPROVED` event and align the NFR-006 event/funnel naming with the updated spec.
- Remove `render_reviewer` from `backend/scripts/create-operator.ts`.

### Database

- One new Prisma migration (`feat-016-remove-render-review`) on `backend/prisma/schema.prisma` dropping: the `RenderReviewStatus` enum; `Render.reviewStatus`, `Render.reviewedAt`, `Render.reviewedById` (with their index, FK, and relation, including `Operator.reviewedRenders`); and the `render_reviewer` value of `OperatorRole`. `catalog_curator` and `order_handler` stay.
- No data-preservation rule is needed for rows in the retired review states: nothing is deployed and only local seeded stacks exist (see the data note in `05_backlog.md`).

### Security

- **NFR-007 device scoping is unchanged:** a foreign device token still gets 404 on renders and carts.
- **Operator session auth and per-action role gating stand** for the surviving actions (`catalog_curator` on catalog create/edit/approve/reject; `order_handler` on forwarding); a role-less operator remains all-purpose.
- **Guardrail:** catalog curation (BR-1 completeness gate, operator catalog routes) and order forwarding (`forwarded_by`, `paid_unforwarded` state machine) must behave exactly as before — their code paths are not touched.

## 9. Required tests

Test cases live in `08_test_plan.md`, where **each `TC-` maps 1:1 to an acceptance criterion of an FR**. For this refactor the plan re-points existing rows rather than adding new ones:

| ID | Test | Type |
|---|---|---|
| TC-028 | Render from matched SKUs completes and is **published to the user** (review state removed — ADR-025) | Functional |
| TC-029 | Render generation fails → `render-failed` recorded, nothing shown | Functional |
| TC-054 | Tags generated for a completed (published) render carry name, price, supplier, warranty, listing link | Functional |
| TC-055 | Tapping a tag on a completed (published) render shows product details | Functional |
| TC-058 | Completed render with N tagged products → cart auto-populated with all N (trigger: generation success) | Functional |
| TC-051 / TC-052 / TC-053 | Operator approve / reject / pending-review gate | **Retired — ADR-025** (suites removed with the gate) |
| TC-108 | Role gating of render approve/reject | **Retired — ADR-025** (was Automated #34; its tests are removed with the endpoint) |
| TC-107 / TC-109 | Role gating of catalog curation / order forwarding + foreign-device 404 | Security — **must stay green, unchanged** |

Automated suites re-pointed at the surviving flows and the generation-state response shape: `backend/test/routes.test.ts`, `backend/test/operator-auth.test.ts`, `backend/test/hardening.test.ts`, `backend/test/loop.test.ts` (the end-to-end loop runs with **no operator action between render generation and cart**).

## 10. Documentation impact

- [x] Update README (root `README.md`, `backend/README.md`, `web-demo/README.md` — review-flow interim notes and flow descriptions).
- [x] Update requirements — already at target state (PRs #37/#39): `03_requirements.md`, `04_non_functional_requirements.md`; no further change in this iteration.
- [x] Update API spec — already at target state (PRs #37/#39): `06_api.md`, `07_data_model.md`, `08_test_plan.md`; no further change in this iteration.
- [ ] Update user guide.
- [x] Also: `05_backlog.md` (status), `10_release_notes.md` (unreleased entry), interim-note banners in `02_architecture.md`, `12_pilot_build_plan.md`, `13_class_demo_scope.md`. ADRs are a historical record and are not edited.

## 11. Checklist before implementing

- [x] The feature has a clear objective.
- [x] It is linked to requirements.
- [x] It has acceptance criteria.
- [x] It has defined tests.
- [x] The technical impact is understood.
- [x] The user impact is understood.

## 12. Checklist before closing

- [ ] Code implemented.
- [ ] Tests executed.
- [ ] Acceptance criteria met.
- [ ] Pull request reviewed.
- [ ] Documentation updated.
- [ ] Release notes updated.
