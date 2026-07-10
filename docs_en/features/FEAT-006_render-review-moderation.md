# FEAT-006 - Render review & moderation

> **Status legend:** **VERIFIED** = stated in the PRD v0.7 or the one-week iOS pilot; **DRAFT / PROPOSED** = author's structuring, not confirmed; **TBD / PENDING** = reserved for a human decision (PRD §12), tracked as an ADR. Nothing here is implemented; this is a specification.

## 1. Summary

A **human-in-the-loop gate**: an Operator reviews and approves each AI-generated render **before it is shown to the user**. This keeps a person accountable for render fidelity while the AI is still unproven.

- **Pilot scope (VERIFIED):** *"Operator reviews each render before it reaches the user"* and *"Human review before the render is shown"* (pilot, "The human's role" and pilot "Included" list). Implemented as FR-027.

## 2. Problem or need

The PRD names **render fidelity** — compositing a real SKU into the user's room at the correct size and appearance — as the **highest risk**, since a poor match could increase returns and disputes (PRD §10). The pilot's stated rationale: humans stay in the loop because it is *"faster to build and protects the customer while the AI is still unproven,"* and a human *"checks that the image matches the real products and looks believable"* (pilot, "The human's role"). Operators are responsible for **render-quality monitoring** and **order-flow supervision** (PRD §5).

## 3. Affected user

- **Actor: Operator** (Spazio staff) — reviews and approves (or rejects) each render.
- **Beneficiary: Homeowner/renter** — only sees renders an operator has approved.
- **Upstream: System** — produces the render to be reviewed (FEAT-005).

## 4. Related requirements

Functional:

- FR-027 — Operator reviews and approves each render before it is shown to the user *(pilot)*

Non-functional:

- NFR-007 — Keep user photos and generated renders private by default (operator access to private renders must respect this)
- NFR-006 — Track render-to-purchase conversion from day one (review is part of the render lifecycle that this metric measures)

## 5. Expected flow

The PRD §8 numbered basic flow does not list a separate operator-review step; this gate is introduced by the **pilot** ("Human review before the render is shown") and by the Operator responsibilities in **PRD §5**. It sits **between render generation and presentation**:

1. (After PRD §8 step 9) FEAT-005 generates a render; it is created in a **pending** state (`Render` "pending or approved by an operator", per the entity registry).
2. An **Operator reviews** the render, confirming it matches the real products and looks believable (FR-027).
3. On **approval**, the render is released to the user and the flow continues to product tagging (PRD §8 step 10, FEAT-007) and cart auto-population (step 11, FEAT-008).
4. On **rejection** (DRAFT / PROPOSED handling — exact rejection paths TBD in FR-027 criteria), the render is not shown; the request may be re-rendered or corrected. *Targeted edit-by-question refinement is out of pilot scope (FEAT-014).*

## 6. Acceptance criteria

Acceptance criteria **are defined in the corresponding functional requirement (FR)**, not here (see `docs_en/03_requirements.md`). This FEAT only references them:

- FR-027 → criteria in `docs_en/03_requirements.md`

If you detect a new criterion during implementation, first add it to the FR (with its `TC-`) and then continue.

## 7. Business rules

Business rules **live in the FR** (`docs_en/03_requirements.md`); they are not rewritten here. Reference:

- FR-027 (derived from the pilot's human-in-the-loop model and PRD §5 operator responsibilities: no render is shown to a user until an operator approves it. This is a **pilot operating rule**, not a numbered PRD business rule.)
- Related privacy rule the review must honor: PRD BR-33 (renders private by default — see NFR-007).

## 8. Proposed technical design

*High-level only. Technology choices are reserved for humans (PRD §12) and marked PENDING.*

### Frontend

- An **operator review surface** (DRAFT / PROPOSED — internal tool/console) listing pending renders with the source photo, matched products, and the generated image, plus **approve / reject** actions. Client/tooling technology **[PENDING — see ADR-001]**.
- On the user's iOS client: a **waiting/hold state** until the render is approved (the render is not displayed while pending).

### Backend

- A **render state machine** (DRAFT / PROPOSED): `pending → approved` (or `rejected`) on `Render`. Only **approved** renders are served to users and passed to tagging/cart.
- Records the reviewing operator and outcome for traceability (fields **TBD**).

### Database

- Entities involved (canonical registry; fields **DRAFT / PROPOSED** until modeled in `07_data_model.md`):
  - `Render` — carries the pending/approved state set by this feature.
  - `Operator` — Spazio staff who review renders.
- Field-level schema is **TBD**.

### Security

- Only authorized **Operators** may review/approve renders; approval authority is a privileged action (NFR-008).
- Operator access to user photos and renders must respect **privacy by default** (NFR-007 / PRD BR-33) and be limited to what review requires.

## 9. Required tests

Test cases live in `08_test_plan.md`, where **each `TC-` maps 1:1 to an acceptance criterion of an FR** (see `03_requirements.md`). The `TC-` rows for this feature (FR-027) **already exist** in `08_test_plan.md` (all with `Status: Pending`, since nothing is implemented):

- **TC-051** (FR-027) — Operator approves a `pending-review` render → its status becomes `approved` and it is released to the user. *(Happy path.)*
- **TC-052** (FR-027) — Operator rejects a `pending-review` render → its status becomes `rejected` and it is not shown to the user. *(Rejection path.)*
- **TC-053** (FR-027) — A user attempts to view a render not yet reviewed → it is not displayed (blocked by the `pending-review` gate). *(Gate.)*

Not yet covered by a `TC-` in `08_test_plan.md`: **Security** — a non-operator cannot approve a render (NFR-008). Add a `TC-` against FR-027 when that criterion is written.

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
