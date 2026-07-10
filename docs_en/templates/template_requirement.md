# Functional requirement template (FR)

Copy the block below into `docs_en/03_requirements.md` for each new requirement.
The **writing rules** and the **priority scale** are at the top of `03_requirements.md` (they are not repeated here to avoid duplicating the guide).

---

## FR-XXX — <short capability title>

**Actor:** <role, or "System (trigger)"> · **Priority:** High | Medium | Low · **Status:** Proposed | Approved | Deprecated
**Origin:** US-XXX / 01_product_vision.md   <!-- why it exists; use [PENDING: ask client] if missing -->

### Description

The system shall, when <trigger or actor action>, <capability with observable result>.

### Acceptance criteria

<!-- Normative source. Each criterion is observable, unambiguous, and maps 1:1 to a TC- in 08_test_plan.md. Cover the happy path and every applicable error path. -->

- [ ] Given <context>, when <action>, then <observable result with discriminator: status / field / code>. → TC-XXX
- [ ] Given <unmet precondition>, when <action>, then <rejection with the field/status flagged>. → TC-XXX

### Business rules

<!-- OPTIONAL: delete this section if it does not apply. Only non-executable domain invariants/definitions; if a rule is testable behavior, it goes as a criterion with its TC-. -->

- <domain invariant>

<!-- Optional: link an NFR only if it specifically constrains this FR -> NFR-XXX -->
