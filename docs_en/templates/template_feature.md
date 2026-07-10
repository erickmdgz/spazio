# FEAT-XXX - Feature name

## 1. Summary

What do we want to build?

## 2. Problem or need

What problem does it solve?

## 3. Affected user

Who will use this feature?

## 4. Related requirements

- FR-XXX
- NFR-XXX

## 5. Expected flow

1. The user does...
2. The system responds...
3. The user confirms...
4. The system saves...

## 6. Acceptance criteria

Acceptance criteria **are defined in the corresponding functional requirement (FR)**, not here (see `docs_en/03_requirements.md`). This FEAT only references them:

- FR-XXX → criteria in `docs_en/03_requirements.md`

If you detect a new criterion during implementation, first add it to the FR (with its `TC-`) and then continue.

## 7. Business rules

Business rules **live in the FR** (`docs_en/03_requirements.md`); they are not rewritten here. Reference:

- FR-XXX

## 8. Proposed technical design

### Frontend

What screens, components or forms are needed?

### Backend

What endpoints, services or logic are needed?

### Database

What tables, fields or schema changes are needed?

### Security

What permissions, validations or restrictions apply?

## 9. Required tests

| ID | Test | Type |
|---|---|---|
| TC-XXX | User can complete the main flow | Functional |
| TC-XXX | Unauthorized user cannot access | Security |
| TC-XXX | Required fields are validated | Validation |

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
