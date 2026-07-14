# FEAT-F01 — Room input & proposal request flow

## 1. Summary

The demo's entry point: a single web form where the user picks a room type, enters approximate dimensions (feet), and optionally a budget (USD); submission creates an asynchronous proposal request that the page polls until results or a distinguishable failure appear.

## 2. Problem or need

The fallback thesis needs real user constraints (space, room type, money) as input; this feature captures and validates them so every downstream guarantee (fit, coherence, budget) has trustworthy data.

## 3. Affected user

The demo user/viewer (persona "Sarah", `fallback/01_product_vision.md`).

## 4. Related requirements

- FR-F01, FR-F02, FR-F03
- NFR-F02 (progress state within 1 s)

## 5. Expected flow

1. The user opens `/` and sees the form (room type select, width/length in feet, optional budget).
2. The user submits; the client POSTs `/api/fallback/proposal-requests`.
3. The system validates (room type in supported set; dimensions positive within 4–60 ft; budget positive if present) and responds `202 {id, status: "pending"}`, or `400` with the specific validation error code.
4. The page shows a progress state and polls `GET /api/fallback/proposal-requests/:id` until `completed` or `failed`.

## 6. Acceptance criteria

Defined in the FRs (see `fallback/03_requirements.md`): FR-F01 → TC-F01/F02 · FR-F02 → TC-F03/F04 · FR-F03 → TC-F05/F06 (the budget prompt-constraint criterion, TC-F07, is exercised inside FEAT-F03).

## 7. Business rules

See FR-F01 (curated room-type set), FR-F02 (feet in, inches internal), FR-F03 (hard budget ceiling, no tolerance — DRAFT deviation from main ADR-008).

## 8. Proposed technical design

### Frontend
One static HTML page + vanilla JS (no framework): form, fetch + poll, progress/error states. Served by the Fastify service.

### Backend
Fastify route plugin `fallback/src/routes/proposalRequests.ts`: POST (inline JSON-schema validation, creates the request in the in-memory store, enqueues composition) and GET by id. Mirrors the pilot backend's plugin + `AppDeps` idioms.

### Database
None — in-memory `ProposalRequest` store (`fallback/07_data_model.md`).

### Security
No auth (ADR-F01: no personal data, local demo). Strict input validation; unknown ids → 404.

## 9. Required tests

| ID | Test | Type |
|---|---|---|
| TC-F01–TC-F06 | Input validation happy/error paths | Validation |
| TC-F20, TC-F21 | Completed and failed result display | Functional |

## 10. Documentation impact

- [x] `fallback/03_requirements.md`, `fallback/06_api.md`, `fallback/08_test_plan.md` (this set)
- [ ] `fallback/` code README when built

## 11. Checklist before implementing

- [x] Clear objective · [x] Linked to requirements · [x] Acceptance criteria (in FRs) · [x] Tests defined · [x] Technical impact understood · [x] User impact understood

## 12. Checklist before closing

- [ ] Code implemented · [ ] Tests executed · [ ] Acceptance criteria met · [ ] PR reviewed · [ ] Documentation updated · [ ] Release notes updated
