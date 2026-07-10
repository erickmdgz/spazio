# FEAT-002 - Room capture & inputs

> **Status legend used in this document:** **VERIFIED** = stated in the PRD v0.7 or the one-week iOS pilot; **DRAFT / PROPOSED** = reasonable structuring by the author, not yet confirmed; **TBD / PENDING** = reserved for a human decision (PRD §12), tracked as an ADR. Nothing here is implemented; this is a specification.

## 1. Summary

Let a homeowner/renter give Spazio the raw inputs that describe their physical space so the rest of the pipeline can furnish it: **a photo of the room** and its **approximate dimensions**.

- **Pilot scope (VERIFIED):** photo **upload** from the device and **approximate room-dimension** entry (pilot "Included" list; PRD §8 steps 4 and 6).
- **Full-product scope (VERIFIED, PRD, out of pilot):** in-app **camera capture** (FR-006) and automated **photo-quality validation with a retake request** (FR-024). The pilot excludes automated photo-quality rejection; in the pilot, render fidelity is protected by human review (see FEAT-006) rather than by an automated quality gate.

## 2. Problem or need

A person cannot picture how real, purchasable furniture will look in their own space before spending money (pilot, "The problem"). To produce a believable render the system needs (a) an actual image of the user's room and (b) enough spatial information to place and **scale products realistically** — the PRD makes approximate dimensions a hard input for scaling (BR-7 / FR-017). The PRD also flags **poor user photos** as a known risk to render accuracy (PRD §10), which motivates photo-quality handling in the full product.

## 3. Affected user

- **Primary: Homeowner/renter** (the pilot persona, "Valentina") who uploads a room photo and enters rough dimensions from an iPhone, without design training (pilot, "The one user").
- **System** validates photo quality and rejects unusable photos in the full product (FR-024).
- **Operator** is affected indirectly: in the pilot, the operator's render review (FEAT-006) is the safeguard against low-quality inputs, since automated rejection is out of pilot scope.

## 4. Related requirements

Functional:

- FR-005 — Upload a room photo *(pilot)*
- FR-006 — Capture a room photo with the in-app camera *(full product, out of pilot)*
- FR-011 — Capture approximate room dimensions *(pilot)*
- FR-024 — Validate photo quality and reject unusable photos with a retake request *(full product, out of pilot)*

Non-functional:

- NFR-007 — Keep user photos and generated renders private by default
- NFR-013 — Style, dimensions, and budget entry require minimal steps

## 5. Expected flow

This feature covers the input-capture portion of the PRD §8 basic flow:

1. (PRD §8 step 4) The user enters **approximate room dimensions** (FR-011).
2. (PRD §8 step 6) The user **uploads** a room photo (FR-005); in the full product they may instead **capture** it with the in-app camera (FR-006).
3. (PRD §8 step 8, full product) The system **validates photo quality**; if the photo is unusable it is rejected with a **retake request** (FR-024). *In the pilot this automated step is not built; the operator review in FEAT-006 covers input quality instead.*
4. The captured inputs are persisted to the user's design session (Project) and passed downstream to the AI rendering engine (FEAT-005).

Adjacent steps handled by other features: account/guest entry (FEAT-001, out of pilot), localization (FEAT-004, PRD §8 step 2), style and budget entry (FEAT-003, PRD §8 steps 3 and 5), keep-or-replace marking (FEAT-012, PRD §8 step 7, out of pilot).

## 6. Acceptance criteria

Acceptance criteria **are defined in the corresponding functional requirement (FR)**, not here (see `docs_en/03_requirements.md`). This FEAT only references them:

- FR-005 → criteria in `docs_en/03_requirements.md`
- FR-006 → criteria in `docs_en/03_requirements.md`
- FR-011 → criteria in `docs_en/03_requirements.md`
- FR-024 → criteria in `docs_en/03_requirements.md`

If you detect a new criterion during implementation, first add it to the FR (with its `TC-`) and then continue.

## 7. Business rules

Business rules **live in the FR** (`docs_en/03_requirements.md`); they are not rewritten here. Reference:

- FR-011 (PRD BR-7: approximate dimensions must be used to scale products — the rule is enforced downstream in FEAT-005/FR-017)
- FR-024 (PRD BR-15: unusable photos must be rejected with a request to retake)
- FR-005 / FR-006 (PRD BR-33: user photos are private by default — see NFR-007)

## 8. Proposed technical design

*High-level only. Technology choices are reserved for humans (PRD §12) and marked PENDING.*

### Frontend

- **Client platform:** native **iOS** for the pilot (VERIFIED — pilot "Included": "Native iOS app only"). The broader technology stack is **[PENDING — see ADR-001]**.
- Screens/components (DRAFT / PROPOSED): a **photo-upload** step (device photo-library picker) for FR-005; an **approximate-dimensions** input step for FR-011 (e.g., simple numeric fields or a guided estimate) designed for minimal steps (NFR-013). In-app **camera capture** UI (FR-006) is a full-product addition, out of pilot.
- On rejected photos (full product), surface a clear **retake** prompt (FR-024).

### Backend

- A service to **receive and store** the uploaded room photo as a private `RoomPhoto` and to persist the dimension inputs on the user's `Project` (DRAFT / PROPOSED entities — see below). Storage/back-end technology **[PENDING — see ADR-001]**.
- **Photo-quality validation** (FR-024, full product): the detection/validation approach depends on the rendering/AI pipeline and is **[PENDING — see ADR-002]**. Not built in the pilot.

### Database

- Entities involved (from the canonical registry; treat concrete fields as **DRAFT / PROPOSED** until modeled in `07_data_model.md`):
  - `RoomPhoto` — an uploaded or captured room image, private by default, subject to quality validation.
  - `Project` — the user's room-design session bundling room photo, dimensions, budget, style, and locality inputs.
- Both entities are modeled in `07_data_model.md` (see **Entity: Project** and **Entity: RoomPhoto**); their field-level schemas are already captured there with the still-undecided fields, values, and units tagged **(proposed)** / **TBD**.

### Security

- **Room photos are private by default** (NFR-007 / PRD BR-33): access restricted to the owning user and authorized operators.
- Account/order data protected by authentication (NFR-008). *Open question — the pilot's user-identity / checkout model is unresolved: accounts (FEAT-001) are out of the pilot per `05_backlog.md` and NFR-008, the pilot excludes guest checkout, and the pilot spec does not state how a pilot user is identified. This must be decided by the team; do not assume pilot users act under an account.*
- Input validation on dimensions (accept only sane approximate values) — criteria to be written into FR-011.

## 9. Required tests

Test cases live in `08_test_plan.md`, where **each `TC-` maps 1:1 to an acceptance criterion of an FR** (see `03_requirements.md`). The `TC-` rows for this feature's FRs already exist in `08_test_plan.md`:

- FR-005 (pilot) — **TC-011** successful supported-image upload (stored, associated with the project, private by default); **TC-012** unsupported / oversized file rejected with a `file-format`/`file-size` error and no photo stored.
- FR-011 (pilot) — **TC-020** valid positive room dimensions persisted on the project; **TC-021** non-positive or non-numeric value rejected with a `dimension-validation` error and nothing persisted.
- FR-006 (full product, out of pilot) — **TC-013** capture with camera permission granted (image stored and associated with the project); **TC-014** capture with permission denied blocked with a `permission-required` status and no image stored.
- FR-024 (full product, out of pilot) — **TC-046** a photo that passes the quality checks is accepted for rendering; **TC-047** an unusable photo is rejected with a `quality-failed` status and a retake request.

## 10. Documentation impact

- [ ] Update README.
- [ ] Update requirements.
- [ ] Update API spec.
- [ ] Update user guide.
- [ ] Not applicable.

## 11. Checklist before implementing

- [ ] The feature has a clear objective.
- [ ] It is linked to requirements.
- [ ] It has acceptance criteria.
- [ ] It has defined tests.
- [ ] The technical impact is understood.
- [ ] The user impact is understood.

## 12. Checklist before closing

- [ ] Code implemented.
- [ ] Tests executed.
- [ ] Acceptance criteria met.
- [ ] Pull request reviewed.
- [ ] Documentation updated.
- [ ] Release notes updated.
