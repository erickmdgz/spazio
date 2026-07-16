# FEAT-003 - Style & budget selection

> **Status legend:** **VERIFIED** = stated in the PRD v0.7 or the one-week iOS pilot; **DRAFT / PROPOSED** = author's structuring, not confirmed; **TBD / PENDING** = reserved for a human decision (PRD §12), tracked as an ADR. **As built (2026-07-15):** the style + COP-budget selection step is implemented in the web app wired to the backend and **verified on a local stack (not deployed)**; a product **SOURCE** toggle (Local | Brand) was added alongside it by ADR-028/FEAT-018. Remaining items stay specification.

## 1. Summary

Let a homeowner/renter tell Spazio **how they want the room to look** and **how much they can spend**, so the AI can match real products to their taste and budget.

- **Pilot scope (VERIFIED):** selection of **one or two predefined visual styles** (FR-007), an **optional free-text style description** (FR-008), and a **budget range** input (FR-009) (pilot "Included" list; PRD §8 steps 3 and 5).
- **Full-product scope (VERIFIED, PRD, out of pilot):** a **free-text description of the intended room change** (FR-010), beyond the style description itself.

## 2. Problem or need

Most users **lack formal design vocabulary** and want a **fast, visual** way to express taste; budget must stay **visible throughout** the experience (PRD §5, "User context"). Interior design is confusing and users may overspend (PRD §2). Capturing style and a budget range up front lets the system match real, in-stock products to both preference and spending limit, and is the basis for keeping cost within budget downstream (FEAT-005 / FR-021).

## 3. Affected user

- **Primary: Homeowner/renter** — selects a style, optionally describes it in words, and sets a budget min/max (pilot persona "Valentina", who "has a rough budget in mind").
- The style vocabulary itself is curated by **Operators** via the shared style taxonomy (see FEAT-015 and ADR-005); this feature consumes that taxonomy, it does not define it.

## 4. Related requirements

Functional:

- FR-007 — Select a predefined visual style *(pilot)*
- FR-008 — Provide a free-text style description *(pilot)*
- FR-009 — Enter a budget range (minimum and maximum) *(pilot)*
- FR-010 — Provide a free-text description of the intended room change *(full product, out of pilot)*

Non-functional:

- NFR-013 — Style, dimensions, and budget entry require minimal steps
- NFR-015 — Price, delivery, and warranty are visible before checkout (budget context feeds the price transparency users see later)

## 5. Expected flow

This feature covers the style/budget portion of the PRD §8 basic flow:

1. (PRD §8 step 3) The user **selects a style** from the predefined visual catalog (FR-007), and may **add a free-text style description** to refine it (FR-008). The PRD example description: *"A modern living room, Mediterranean style, light colors, natural wood, beige sofa, minimalist decor."* (PRD §1).
2. (PRD §8 step 5) The user **enters a budget** as a minimum and maximum (FR-009), and in the full product may add a **free-text description of the intended change** (FR-010).
3. The selections are persisted to the user's design session (Project) and passed to the AI rendering engine (FEAT-005), which uses style and budget as matching constraints.

Adjacent steps handled by other features: photo and dimensions (FEAT-002, PRD §8 steps 4 and 6), localization (FEAT-004, PRD §8 step 2).

## 6. Acceptance criteria

Acceptance criteria **are defined in the corresponding functional requirement (FR)**, not here (see `docs_en/03_requirements.md`). This FEAT only references them:

- FR-007 → criteria in `docs_en/03_requirements.md`
- FR-008 → criteria in `docs_en/03_requirements.md`
- FR-009 → criteria in `docs_en/03_requirements.md`
- FR-010 → criteria in `docs_en/03_requirements.md`

If you detect a new criterion during implementation, first add it to the FR (with its `TC-`) and then continue.

## 7. Business rules

Business rules **live in the FR** (`docs_en/03_requirements.md`); they are not rewritten here. Reference:

- FR-007 / FR-008 (PRD BR-16: products must be mapped to a shared **style taxonomy** — Decided (pilot): **one or two predefined visual styles + free-text description; no taxonomy engine**, see ADR-005; the selected style must resolve against it in FEAT-005)
- FR-009 (the budget range feeds the budget-tolerance rule enforced downstream — PRD BR-9, **tolerance 10% adopted for the pilot**, see ADR-008 and FEAT-005/FR-021)

## 8. Proposed technical design

*High-level only. Technology choices are reserved for humans (PRD §12); for the pilot they are Decided in the ADRs (see ADR-001).*

### Frontend

- **Client platform:** native **iOS** for the pilot (VERIFIED). Broader stack **Decided (pilot): one small managed backend service + a managed relational (Postgres) DB + object storage for photos/renders; single environment/region; no multi-platform — see ADR-001**.
- Screens/components (DRAFT / PROPOSED): a **visual style picker** showing the predefined styles (PRD §5 wants style selection to be visual), designed for minimal steps (NFR-013); an **optional free-text field** for the style description (FR-008); a **budget range** control capturing minimum and maximum (FR-009). Pilot shows **one or two** predefined styles (VERIFIED, pilot).
- Budget must remain visible throughout later steps (PRD §5) — a persistent budget indicator is a DRAFT / PROPOSED UI treatment.

### Backend

- Persist the user's style choice, style description, and budget range on the `Project`. Resolve the selected style/description against the shared **style taxonomy** for downstream matching — taxonomy definition is **Decided (pilot): one or two predefined visual styles + free-text description; no taxonomy engine — see ADR-005**.
- Interpretation of the free-text style description into matching signals is performed by the rendering/AI pipeline (FEAT-005) and is **Decided (pilot): a hosted generative image API (image-to-image / inpainting); no custom-trained model — see ADR-002** *(its hosted-image-API engine clause superseded by ADR-026, 2026-07-14 — self-hosted FLUX.2 Klein 4B via mflux; the "no custom-trained model" rule stands; its mandatory-operator-QA clause superseded by ADR-025, 2026-07-14)*.

### Database

- Entities involved (canonical registry; concrete fields **DRAFT / PROPOSED** until modeled in `07_data_model.md`):
  - `Style` — a predefined visual style a user can select, mapped to product style attributes.
  - `StyleTaxonomy` — the shared classification mapping products and user style choices to a common vocabulary (BR-16); **Decided (pilot): one or two predefined visual styles + free-text description; no taxonomy engine** (ADR-005).
  - `Project` — stores the chosen style, free-text description(s), and budget min/max for the session.
- Field-level schema is **TBD**.

### Security

- Selections are part of the user's private design session; access follows the same privacy/auth posture as the rest of the Project (NFR-007, NFR-008).
- Input validation on the budget range (e.g., min ≤ max, non-negative) — criteria to be written into FR-009.

## 9. Required tests

Test cases live in `08_test_plan.md`, where **each `TC-` maps 1:1 to an acceptance criterion of an FR** (see `03_requirements.md`). The `TC-` IDs for this feature **already exist in `08_test_plan.md`** (the rows tagged `FEAT-003 Style & budget selection`), all with status `Pending` — that status reflects the validity of the case, not an execution result; nothing here is implemented.

The tests for this feature are the following `TC-` rows in `08_test_plan.md`, mapped to its related FRs:

- **TC-015** → FR-007 (pilot) — select a predefined style from the catalog; the selection is persisted on the project.
- **TC-016** → FR-008 (pilot) — enter a free-text style description; the text is persisted on the project.
- **TC-017** → FR-009 (pilot) — enter a valid budget range (minimum ≤ maximum); the range is persisted on the project.
- **TC-018** → FR-009 (pilot) — enter minimum greater than maximum, or a negative/non-numeric value; rejected with a `budget-range` validation error and nothing is persisted.
- **TC-019** → FR-010 (full product) — free-text description of the intended room change; the text is persisted on the project.

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
