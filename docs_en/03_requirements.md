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

**Status (requirement validity):** `Proposed` / `Approved` / `Deprecated`. Implementation progress is not recorded here; it is read in `05_backlog.md`.

> **Governance note (read before treating any value as final).** PRD v0.7 §12 reserves a set of decisions for humans. Where an FR below references a numeric value or a mechanism that the PRD gives only as an **example or default** — commission "for example 10%", daily render limit "defaulting to five", cart hold "15 minutes", budget tolerance "such as 10%", render time "~2–5 min" — the value has been **adopted for the one-week pilot** as a human decision recorded in its `ADR-XXX` (the simplest option consistent with the PRD and the pilot), and is linked to that ADR. Structural proposals that go beyond what the PRD states (status codes, field names, response shapes) are marked **Draft / Proposed**. *(Correction, 2026-07-15: the former blanket "Nothing in this document is implemented; every block is a specification" is no longer accurate. A substantial part of the current flow is **built and verified on a local stack (not deployed, no `vX.Y.Z` release)** — see the "Current system (as built)" note below and the per-FR "As built" markers on FR-005, FR-015, FR-066–FR-069, and the pilot-loop FRs. Many other FRs remain specification only; each block states which.)* Traceability tags used below: **VERIFIED** = stated in PRD v0.7 or the one-week pilot; **DRAFT/PROPOSED** = reasonable structuring by the author; **TBD/PENDING** = a human decision (see `docs_en/decisions/`).

> **Update (ADR-025, 2026-07-14):** the human render-review gate is retired. FR-027 is Deprecated (superseded by ADR-025); renders are published to the requesting user immediately upon successful generation. Review-gate preconditions in FR-015, FR-028, FR-029, and FR-031 are updated accordingly; TC-051/TC-052/TC-053 are retired with FR-027 (see `08_test_plan.md`).

> **Update (ADR-027, 2026-07-15):** a temporary, additive **public-catalog bootstrap fallback** is introduced (FEAT-017, issue #43). While Spazio has no onboarded suppliers, when no supplier catalog satisfies the matching constraints the system may present products from the **Amazon Berkeley Objects** public dataset (CC BY 4.0) as a clearly-labeled, **non-purchasable, display-only** `source=public` track (new FR-062–FR-065). This **qualifies — does not delete** — the founding real-purchasable-SKU-only invariant: **FR-016** is scoped to the **supplier track** (a public product is real and attributed but not purchasable), and **FR-018**'s current-availability gate is carved out for the non-purchasable public track. The supplier track (BR-6/BR-14/FR-016, in-app checkout, commission, MoR) stays fully in force and unchanged. Same dated-marker precedent as ADR-024/ADR-025/ADR-026. See `docs_en/decisions/ADR-027_public-catalog-bootstrap-fallback.md` and `docs_en/features/FEAT-017_public-catalog-fallback.md`.

> **Update (ADR-028, 2026-07-15):** the furnishing flow is **inverted** to **user-curated selection** (FEAT-018). Instead of the AI auto-selecting furniture and rendering a whole room (PRD §8), the user chooses a **source** (Local suppliers = `source=supplier` | Brand suppliers = `source=public`) and **style**, **browses the real catalog, selects up to 3 products**, and renders **exactly those** into the room photo; "try other furniture" iterates with the same photo/source/style. New **FR-066–FR-069** (browse / select ≤3 / render the selection / iterate). This **scopes — does not delete** — the auto-match requirements: **FR-014** and **FR-015** are now **optional (ADR-028)**, used only when a render request carries no user selection (backward compatible). The **3-item cap** is the hard product rule (owner decision), enforced server-side, and matches the FLUX.2 Klein engine's ~2–3 reference-image limit (**ADR-026**). Provenance (ADR-027) is unchanged: a Local selection populates the cart; a Brand selection is display-only and yields an empty cart. Same dated-marker precedent as ADR-024/ADR-025/ADR-026/ADR-027. See `docs_en/decisions/ADR-028_user-curated-furniture-selection.md` and `docs_en/features/FEAT-018_browse-select-furniture.md`.

> **Current system (as built) — 2026-07-15.** So a reader sees today's reality at a glance. The product is a **web app** (`web-demo/`, Next.js) wired to a Node/Fastify/Prisma/Postgres backend with local object storage — **there is no native iOS app** (ADR-024). The **current primary flow is user-curated selection** (ADR-028 / FEAT-018): landing → upload the user's real room photo (bytes; large phone photos downscaled + EXIF-oriented, BUG-001) + approximate dimensions → choose a **source** (Local suppliers = `source=supplier` | Brand suppliers = `source=public`) → choose a **style** (+ COP budget) → **browse the real catalog and select up to 3 products** (FR-066/FR-067) → **render exactly that selection** into the room photo (FR-068) → iterate ("try other furniture", FR-069) → cart → mock checkout → confirmation. Auto-match (FR-014/FR-015) is now the **optional fallback** used only when a render request carries no selection. The render engine is self-hosted **FLUX.2 Klein 4B via the mflux CLI** on an Apple-Silicon worker (ADR-026); `RENDER_ENGINE` defaults to `fake` (a placeholder/cached visual that keeps CI hermetic), and `mflux` runs the real engine. Renders are **published immediately on generation success** — there is **no operator render-review** (ADR-025 / FEAT-016 retired FR-027). This is **built and verified locally only**: nothing is deployed, real payments (ADR-003) are not chosen so checkout is **mock**, and Local-supplier product images are still **placeholder SVGs** (their render is generic). Per-FR "As built" markers below state precisely what is built vs. still specification.

## Requirements index

<!-- Catalog at a glance; the detail lives in each FR-XXX block below. -->

| ID | Requirement | Priority |
|---|---|---|
| FR-001 | Create a user account | Medium |
| FR-002 | Authenticate and sign in to an existing account | Medium |
| FR-003 | Manage a basic profile and preferences | Low |
| FR-004 | Complete guest checkout with validated email, phone, and shipping info | Medium |
| FR-005 | Upload a room photo | High |
| FR-006 | Capture a room photo with the in-app camera | Medium |
| FR-007 | Select a predefined visual style | High |
| FR-008 | Provide a free-text style description | Medium |
| FR-009 | Enter a budget range (minimum and maximum) | High |
| FR-010 | Provide a free-text description of the intended room change | Medium |
| FR-011 | Capture approximate room dimensions | High |
| FR-012 | Determine applicable suppliers from the user's location | High |
| FR-013 | Determine the user's delivery zone from location | High |
| FR-014 | Match real, available catalog SKUs to style, dimensions, budget, and locality | High |
| FR-015 | Generate a photorealistic render compositing matched SKUs into the room photo | High |
| FR-016 | Restrict every rendered item to a real, purchasable SKU and never fabricate products | High |
| FR-017 | Use approximate room dimensions to scale rendered products realistically | High |
| FR-018 | Restrict rendering to currently available products (never render unavailable ready-made stock) | High |
| FR-019 | Exclude catalog entries with incomplete required data from rendering eligibility | High |
| FR-020 | Restrict rendering to products deliverable to the user's locality | High |
| FR-021 | Keep total rendered product cost within budget plus the agreed tolerance | High |
| FR-022 | On unmet budget, disclose it and offer the closest available alternative | Medium |
| FR-023 | On no strong match, suggest similar available products or mark the item unavailable | Medium |
| FR-024 | Validate photo quality and reject unusable photos with a retake request | Medium |
| FR-025 | Let users mark existing items to keep or replace | Medium |
| FR-026 | Retain kept items in the render and exclude them from cart and budget | Medium |
| FR-027 | Operator reviews and approves each render before it is shown to the user *(Deprecated — superseded by ADR-025, 2026-07-14)* | High |
| FR-028 | Tag every rendered product with name, price, supplier, warranty, and listing link | High |
| FR-029 | View a tagged product's details by tapping it in the render | High |
| FR-030 | Add a rendered/tagged product to the cart | High |
| FR-031 | Auto-populate the cart with every product shown in the render | High |
| FR-032 | Review the cart contents | High |
| FR-033 | Remove a product from the cart | High |
| FR-034 | Swap a cart item for an alternative product | Medium |
| FR-035 | Require explicit cart confirmation before payment | High |
| FR-036 | Display supplier-sourced production and delivery estimates per item before checkout | High |
| FR-037 | Display aggregated production and delivery estimates for the full order before checkout | Medium |
| FR-038 | Display supplier-declared warranty terms per item before checkout | Medium |
| FR-039 | Place a stock hold when a product is added to the cart, for the configured duration | Medium |
| FR-040 | Release held stock back to availability when the hold expires | Medium |
| FR-041 | Revalidate price and availability at checkout before payment | High |
| FR-042 | Process a single in-app payment for the order | High |
| FR-043 | Settle funds to multiple suppliers via split settlement | High |
| FR-044 | Generate one purchase order per supplier at checkout | High |
| FR-045 | Apply and retain the marketplace commission on every completed purchase | Medium |
| FR-046 | Display prices in the user's local currency | High |
| FR-047 | Provide per-purchase-order status and tracking | Medium |
| FR-048 | Enforce a configurable daily free-render limit per user | Medium |
| FR-049 | Count every render generation or edit as one render attempt | Medium |
| FR-050 | On limit reached, offer return-next-day or a paid render package | Low |
| FR-051 | Ask targeted refinement questions when the user re-renders the same scene | Medium |
| FR-052 | Apply a targeted edit affecting only the requested element | Medium |
| FR-053 | Offer delivery fallback (nearby regions, alternative shipping, or pickup) when local delivery is unavailable | Medium |
| FR-054 | Apply sponsored placement only as a tie-breaker, never overriding relevance/quality/budget/locality/availability | Low |
| FR-055 | Let suppliers self-ingest catalog data through supported channels | Medium |
| FR-056 | Operator curates and approves catalog entries | High |
| FR-057 | Store required catalog attributes per SKU | High |
| FR-058 | Classify products as in-stock ready-made or made-to-order with required stock/lead-time data | High |
| FR-059 | Map each product to the shared style taxonomy | High |
| FR-060 | Synchronize supplier catalog data regularly, and in real time for ready-made stock | High |
| FR-061 | Operator manually forwards each confirmed order to the supplier | High |
| FR-062 | Present public-dataset (ABO) products as a fallback when no supplier catalog satisfies the constraints *(ADR-027, bootstrap/demo)* | Medium |
| FR-063 | Tag every product with its source and distinguish public products across matching, render tags, and cart *(ADR-027)* | Medium |
| FR-064 | Keep public products display-only with a "View at retailer" link; exclude them from cart, checkout, orders, commission, and MoR *(ADR-027)* | Medium |
| FR-065 | Record and surface required CC BY 4.0 attribution for public products and propagate provenance into composited renders *(ADR-027)* | Medium |
| FR-066 | Browse the catalog by source and style, returning approved renderable products with an image URL (optional budget filter) *(ADR-028)* | High |
| FR-067 | Let the user select up to 3 products; reject a render request carrying more than 3 *(ADR-028)* | High |
| FR-068 | Render exactly the user's selected products (composite the validated selection instead of auto-match) *(ADR-028)* | High |
| FR-069 | Iterate: re-render on the same project with a different selection, keeping the photo, source, and style *(ADR-028)* | Medium |

> **Deferred / not yet catalogued (PRD Must-have coverage gap).** Two PRD §3 "Must have" items are **deliberately not yet written as FRs**. They are recorded here so the gap is visible instead of lost; no FR is invented for them yet.
>
> - **Saved designs** — no FR currently catalogues saving, listing, or revisiting a design. The `Project` entity exists in `07_data_model.md` but has no corresponding FR. The PRD's own overlap is resolved as **Could have** ("Saved designs" appears under **Must have** while "Save, revisit, and share designs" appears under **Could have**): saved designs are **excluded from the one-week pilot** and no FR is catalogued yet.
> - **Order history** — no dedicated FR. Resolved for the pilot: the pilot shows only the single active order's status via FR-047 (per-purchase-order status and tracking) / the operator; there is no history list, and a distinct "list past orders" FR is deferred (not catalogued yet).
>
> When the scope is confirmed, add the FR(s) via `docs_en/templates/template_requirement.md` and link each to its PRD origin.

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

---

## Requirements detail

<!-- One FR block per requirement, using docs_en/templates/template_requirement.md. Each acceptance criterion maps 1:1 to a TC- in 08_test_plan.md. -->

## FR-001 — Create a user account

**Actor:** Homeowner/renter · **Priority:** Medium · **Status:** Proposed
**Origin:** PRD FR-01 (§6); PRD §3 "Must have"; 01_product_vision.md

### Description

The system shall, when a visitor submits valid registration data, create a user account and establish it in an active state.

### Acceptance criteria

- [ ] Given valid registration data (a unique email and a password), when the visitor submits, then a user account is created with status `active`. → TC-001
- [ ] Given an email already registered, when the visitor submits, then registration is rejected with a `duplicate-email` error and no account is created. → TC-002
- [ ] Given a missing or malformed required field, when the visitor submits, then registration is rejected with a validation error naming the offending field. → TC-003

### Business rules

- Status codes and the exact required fields are **DRAFT/PROPOSED**; final account model and privacy handling follow the pilot data-privacy decision (minimum data captured; private by default; consent at first use; align with Colombia Ley 1581, legal review before scale) → ADR-019.

## FR-002 — Authenticate and sign in to an existing account

**Actor:** Homeowner/renter · **Priority:** Medium · **Status:** Proposed
**Origin:** PRD FR-01 (§6); PRD §7 "Authentication protects account and order data"; 01_product_vision.md

### Description

The system shall, when a registered user submits credentials, verify them and establish an authenticated session on success.

### Acceptance criteria

- [ ] Given valid credentials for an active account, when the user signs in, then an authenticated session is established (session/token issued). → TC-004
- [ ] Given invalid credentials, when the user signs in, then the attempt is rejected with an `authentication-failed` status and no session is established. → TC-005

### Business rules

- Authentication must protect account and order data (VERIFIED, PRD §7 → NFR-008). Session/token mechanism is **DRAFT/PROPOSED**; the technology stack is decided for the pilot (one managed backend service + a managed Postgres DB) → ADR-001. *(Correction, 2026-07-15: the client is the **web app** (`web-demo/`), not a native iOS/SwiftUI app — the iOS client of ADR-001 was superseded by ADR-024, 2026-07-14. End-user accounts are not built in the current system — the web client is device-scoped with no login, ADR-022; the only authenticated surface as built is the operator console.)*

## FR-003 — Manage a basic profile and preferences

**Actor:** Homeowner/renter · **Priority:** Low · **Status:** Proposed
**Origin:** PRD FR-01 (§6); PRD §3 "Must have"; 01_product_vision.md

### Description

The system shall, when an authenticated user edits their profile or preferences with valid data, persist the changes to their account.

### Acceptance criteria

- [ ] Given an authenticated user, when they submit valid profile/preference changes, then the changes are persisted and reflected on the account. → TC-006
- [ ] Given an unauthenticated request, when it attempts to change a profile, then it is rejected with an `unauthorized` status and nothing is persisted. → TC-007

## FR-004 — Complete guest checkout with validated email, phone, and shipping info

**Actor:** Homeowner/renter · **Priority:** Medium · **Status:** Proposed
**Origin:** PRD FR-01, FR-11 (§6); PRD §4 BR-26; 01_product_vision.md — Note: guest checkout is **excluded from the one-week pilot**.

### Description

The system shall, when a guest provides a validated email, a phone number, and shipping information, accept guest checkout and capture that contact and delivery data for the order.

### Acceptance criteria

- [ ] Given a guest supplies a validated email, a phone number, and complete shipping information, when they proceed, then guest checkout is accepted and the contact/shipping data is captured for the order. → TC-008
- [ ] Given an email that fails validation, when the guest proceeds, then checkout is rejected with an `email-validation` error and the order is not created. → TC-009
- [ ] Given a missing phone number or missing shipping information, when the guest proceeds, then checkout is rejected with the missing field flagged. → TC-010

### Business rules

- Guest checkout requires email validation, phone number, and shipping information (VERIFIED, PRD §4 BR-26). The gateway must support guest checkout (VERIFIED, PRD §7 → NFR-012); the gateway model is decided for the pilot (a single PCI-compliant hosted checkout collecting one payment in COP; provider selection revisit before scale) → ADR-003.

## FR-005 — Upload a room photo

**Actor:** Homeowner/renter · **Priority:** High · **Status:** Proposed · *(As built as a byte upload — FEAT-002, 2026-07-15)*
**Origin:** PRD FR-02 (§6); PRD §4 BR-33; Spazio_One_Week_iOS_Pilot.md (Included); 01_product_vision.md

> **As built — FEAT-002 (2026-07-15).** FR-005 is now implemented as a **real image-byte upload**. `POST /api/v1/projects/:id/photos` accepts the raw file bytes (`Content-Type: image/jpeg|image/png|image/webp`, not JSON, parsed via a Fastify `addContentTypeParser` buffer — no new dependency; route `bodyLimit` ~20 MB), stores them in object storage under `rooms/<projectId>/<uuid>.<ext>`, creates the `RoomPhoto` (`qualityStatus` `pending`) and returns `201 { id, storageKey }`. The upload is **device-scoped** (foreign/unknown device or unowned project → 404, NFR-007); a non-image content-type or an empty body → 400; a body over ~20 MB → 413. Room dimensions are not part of this body (they stay on `PATCH /projects/:id`, FR-011). The web app now sends the user's real chosen file instead of substituting a preset room key, so the render engine (ADR-026) composites the actual uploaded photo. See `06_api.md` (§2) and `features/FEAT-002_room-capture-inputs.md`; validated by **TC-120 / TC-121** and the 400/empty-body case **TC-125** (`08_test_plan.md`).

### Description

The system shall, when a user uploads a supported image file, store it, associate it with the current project, and mark it private by default.

### Acceptance criteria

- [ ] Given a supported image file, when the user uploads it, then the photo is stored, associated with the project, and marked private by default. → TC-011
- [ ] Given an unsupported file type or an oversized file, when the user uploads it, then the upload is rejected with a `file-format`/`file-size` error and no photo is stored. → TC-012

### Business rules

- User photos are private by default (VERIFIED, PRD §4 BR-33 → NFR-007). Supported formats/size limits are **DRAFT/PROPOSED**. *(As built — FEAT-002, 2026-07-15: accepted image types are `image/jpeg`, `image/png`, `image/webp`; the per-request size limit is ~20 MB at the route level. The upload is device-scoped — NFR-007.)*

## FR-006 — Capture a room photo with the in-app camera

**Actor:** Homeowner/renter · **Priority:** Medium · **Status:** Proposed
**Origin:** PRD FR-02 (§6); PRD §3 "Must have"; 01_product_vision.md

### Description

The system shall, when a user captures a photo with the in-app camera and camera permission is granted, store the captured image and associate it with the current project.

### Acceptance criteria

- [ ] Given camera permission is granted, when the user captures a photo, then the captured image is stored and associated with the project. → TC-013
- [ ] Given camera permission is denied, when the user attempts to capture, then capture is blocked with a `permission-required` status and no image is stored. → TC-014

## FR-007 — Select a predefined visual style

**Actor:** Homeowner/renter · **Priority:** High · **Status:** Proposed
**Origin:** PRD FR-03 (§6); Spazio_One_Week_iOS_Pilot.md (Included, one or two styles); 01_product_vision.md

### Description

The system shall, when a user selects a predefined visual style from the style catalog, persist the selection on the current project.

### Acceptance criteria

- [ ] Given the style catalog, when the user selects a predefined style, then the selection is persisted on the project. → TC-015

### Business rules

- The set of predefined styles derives from the shared style taxonomy, whose values are decided for the pilot (1–2 predefined styles + free-text description; no taxonomy engine) → ADR-005. The pilot ships with only one or two predefined styles (VERIFIED, pilot scope).

## FR-008 — Provide a free-text style description

**Actor:** Homeowner/renter · **Priority:** Medium · **Status:** Proposed
**Origin:** PRD FR-03 (§6); Spazio_One_Week_iOS_Pilot.md (Included, optional); 01_product_vision.md

### Description

The system shall, when a user enters a free-text style description, persist that text on the current project as an input to matching.

### Acceptance criteria

- [ ] Given a user enters a free-text style description, when they submit it, then the text is persisted on the project. → TC-016

### Business rules

- The free-text style description is optional (VERIFIED, pilot scope). It is interpreted by the rendering/matching pipeline, whose engine is self-hosted FLUX.2 Klein 4B run locally via the mflux CLI; no custom-trained model *(Updated by ADR-026, 2026-07-14 — self-hosted Klein via mflux supersedes only ADR-002's hosted-image-API clause; the "no custom-trained model" rule stands; the mandatory-operator-QA clause was superseded by ADR-025, 2026-07-14)* → ADR-002, ADR-026.

## FR-009 — Enter a budget range (minimum and maximum)

**Actor:** Homeowner/renter · **Priority:** High · **Status:** Proposed
**Origin:** PRD FR-04 (§6); PRD §3 "Must have"; Spazio_One_Week_iOS_Pilot.md (Included); 01_product_vision.md

### Description

The system shall, when a user enters a budget minimum and maximum, validate the range and persist it on the current project.

### Acceptance criteria

- [ ] Given valid numeric minimum and maximum where minimum ≤ maximum, when the user submits, then the budget range is persisted on the project. → TC-017
- [ ] Given a minimum greater than the maximum, or a negative/non-numeric value, when the user submits, then the input is rejected with a `budget-range` validation error and nothing is persisted. → TC-018

## FR-010 — Provide a free-text description of the intended room change

**Actor:** Homeowner/renter · **Priority:** Medium · **Status:** Proposed
**Origin:** PRD FR-04 (§6); PRD §8 step 5; 01_product_vision.md

### Description

The system shall, when a user enters a free-text description of the intended room change, persist that text on the current project as an input to matching.

### Acceptance criteria

- [ ] Given a user enters a free-text description of the intended change, when they submit it, then the text is persisted on the project. → TC-019

## FR-011 — Capture approximate room dimensions

**Actor:** Homeowner/renter · **Priority:** High · **Status:** Proposed
**Origin:** PRD FR-15 (§6); PRD §4 BR-7; Spazio_One_Week_iOS_Pilot.md (Included); 01_product_vision.md

### Description

The system shall, when a user enters approximate room dimensions, validate them and persist them on the current project for later scaling.

### Acceptance criteria

- [ ] Given valid positive dimension values, when the user submits, then the dimensions are persisted on the project. → TC-020
- [ ] Given a non-positive or non-numeric dimension value, when the user submits, then the input is rejected with a `dimension-validation` error and nothing is persisted. → TC-021

### Business rules

- Approximate dimensions must later be used to scale products realistically (VERIFIED, PRD §4 BR-7 → FR-017).

## FR-012 — Determine applicable suppliers from the user's location

**Actor:** System · **Priority:** High · **Status:** Proposed
**Origin:** PRD FR-05 (§6); PRD §4 BR-11; 01_product_vision.md

### Description

The system shall, when a user's location is available, determine the set of suppliers whose coverage serves that locality.

### Acceptance criteria

- [ ] Given a resolvable user location, when the system evaluates suppliers, then it returns the set of suppliers serving that locality. → TC-022
- [ ] Given a location that cannot be resolved, when the system evaluates suppliers, then it returns an `unresolved-location` status with an empty supplier set. → TC-023

### Business rules

- Only products deliverable to the user's locality may ultimately be rendered (VERIFIED, PRD §4 BR-11 → FR-020). The supplier partner set is decided for the pilot (2–4 hand-picked Bogotá suppliers under a one-page written agreement) → ADR-016.

## FR-013 — Determine the user's delivery zone from location

**Actor:** System · **Priority:** High · **Status:** Proposed
**Origin:** PRD FR-05 (§6); PRD §3 "Must have"; 01_product_vision.md

### Description

The system shall, when a user's location is available, determine the applicable delivery zone and assign it to the current project.

### Acceptance criteria

- [ ] Given a resolvable location, when the system evaluates the delivery zone, then the matching delivery zone is assigned to the project. → TC-024
- [ ] Given a location outside all defined delivery zones, when the system evaluates, then a `no-coverage` status is returned (triggering delivery fallback per FR-053). → TC-025

### Business rules

- The pilot operates a single delivery zone (Bogotá) (VERIFIED, pilot scope). The launch market is decided for the pilot (Bogotá, Colombia; COP only); additional zones/markets are out of the pilot (revisit before scale) → ADR-015.

## FR-014 — Match real, available catalog SKUs to style, dimensions, budget, and locality

**Actor:** System · **Priority:** High · **Status:** Proposed · *(Optional fallback — ADR-028, 2026-07-15)*
**Origin:** PRD FR-06 (§6); Spazio_One_Week_iOS_Pilot.md (Included); 01_product_vision.md

> **Scoped by ADR-028 (2026-07-15) — optional, not deleted.** The flow is inverted to **user-curated selection** (FEAT-018): the user browses the catalog and picks up to 3 products, which are rendered exactly (FR-066–FR-069). Auto-match is now an **optional fallback**, run only when a render request carries **no** user selection (`productIds` omitted — backward compatible). The description, criteria, and rule below are unchanged and remain fully in force for that fallback path.

### Description

The system shall, when a project has style, dimensions, budget, and locality inputs, match real and available catalog SKUs that satisfy those constraints.

### Acceptance criteria

- [ ] Given catalog products that match style, fit dimensions, stay within budget, and are deliverable to the locality, when matching runs, then a set of real, available SKUs is selected. → TC-026
- [ ] Given no product satisfies the constraints, when matching runs, then an `empty-match` status is returned (triggering the no-match fallback per FR-023). → TC-027

### Business rules

- Every matched item must be a real, purchasable SKU (VERIFIED, PRD §4 BR-6 → FR-016). The rendering engine is self-hosted FLUX.2 Klein 4B run locally via the mflux CLI; no custom-trained model *(Updated by ADR-026, 2026-07-14 — self-hosted Klein via mflux supersedes only ADR-002's hosted-image-API clause; the "no custom-trained model" rule stands; the mandatory-operator-QA clause was superseded by ADR-025, 2026-07-14)* → ADR-002, ADR-026. The real-SKU-only invariant is unchanged by the engine swap.

## FR-015 — Generate a photorealistic render compositing matched SKUs into the room photo

**Actor:** System · **Priority:** High · **Status:** Proposed · *(Real render now displayed — FEAT-002, 2026-07-15)*
**Origin:** PRD FR-06 (§6); PRD §1; Spazio_One_Week_iOS_Pilot.md ("the one core thing"); 01_product_vision.md

> **As built — render display (FEAT-002, 2026-07-15).** The render *output* is now served to and displayed by the client. A new device-scoped `GET /api/v1/renders/:id/image` streams the stored render (`Render.imageKey`) from object storage with an image content-type; once `GET /renders/:id` reports `completed`, the web app fetches this route with `x-device-token` and shows the **real backend render** (the cached preset visual is kept only as the while-generating placeholder / fetch-failure fallback; supplier + public product tags per ADR-027 still overlay). A foreign/unknown device → 404, and a render with no `imageKey` yet → 404 (client keeps polling), so no other device's render is leaked (NFR-007). See `06_api.md` (§5), `features/FEAT-005_ai-rendering-engine.md`, `features/FEAT-007_product-tagging-interaction.md`; validated by **TC-122 / TC-123 / TC-124** (`08_test_plan.md`).

> **Scoped by ADR-028 (2026-07-15) — the composited set may be user-curated.** Under user-curated selection (FEAT-018, FR-066–FR-069), when a render request carries `productIds` the composite is built from **exactly** those validated products (up to 3) instead of the auto-matched set (FR-068). This FR's observable result — a completed photorealistic composite of the chosen SKUs into the room photo — is unchanged; only the *source of the set* (user selection vs. auto-match fallback per FR-014) changes. The real-SKU-only invariant (FR-016) and the criteria/TCs below are unchanged.

### Description

The system shall, when matched SKUs and a valid room photo are available, generate a photorealistic render that composites those SKUs into the photo, in a completed state, published to the requesting user immediately upon successful generation (ADR-025).

### Acceptance criteria

- [ ] Given a set of matched SKUs and a valid room photo, when render generation runs, then a render image compositing those SKUs into the photo is produced with status `completed` and is published to the user (ADR-025). → TC-028
- [ ] Given render generation fails, when the attempt completes, then a `render-failed` status is recorded and no render is shown to the user. → TC-029

### Business rules

- Renders are private by default (VERIFIED, PRD §4 BR-33 → NFR-007). *(The former rule 'must be operator-approved before being shown' (FR-027) is superseded by ADR-025, 2026-07-14 — renders are published immediately on generation success.)* The rendering engine is self-hosted FLUX.2 Klein 4B run locally via the mflux CLI on a separate Apple-Silicon render worker; no custom-trained model *(Updated by ADR-026, 2026-07-14 — self-hosted Klein via mflux supersedes only ADR-002's hosted-image-API clause; the "no custom-trained model" rule stands; the mandatory-operator-QA clause was superseded by ADR-025)* → ADR-002, ADR-026; the render-time target (~2–5 min) is adopted for the pilot as a soft target with no hard SLA → ADR-013 / NFR-001. The observable results and acceptance criteria (and their TCs) are unchanged by the engine swap.

## FR-016 — Restrict every rendered item to a real, purchasable SKU and never fabricate products

**Actor:** System · **Priority:** High · **Status:** Proposed · *(Scoped by ADR-027, 2026-07-15 — qualified, not deleted)*
**Origin:** PRD FR-06 (§6); PRD §1; PRD §4 BR-6, BR-14; Spazio_One_Week_iOS_Pilot.md; 01_product_vision.md

> **Scoped by ADR-027 (2026-07-15) — qualified, not deleted.** This invariant governs the **supplier track**. During the bootstrap/demo period, when no supplier catalog satisfies the constraints, a clearly-labeled, **non-purchasable, display-only** `source=public` track (Amazon Berkeley Objects, CC BY 4.0) may present real, attributed products that are **not** purchasable SKUs (FR-062–FR-065). Public products are real and attributed — never fabricated — so **BR-14's no-fabrication rule still holds for them**; they are the explicit, labeled exception to **BR-6's purchasable-SKU rule** and are quarantined from cart/checkout/commission/MoR (FR-064). The description, criteria, and rule below are unchanged and remain fully in force for `source=supplier` products.

### Description

The system shall, when a render is produced, ensure every rendered item references a real, purchasable catalog SKU and never present a fabricated product.

### Acceptance criteria

- [ ] Given a generated render, when its items are validated, then every rendered item references an existing, purchasable catalog SKU. → TC-030
- [ ] Given a render contains an item with no matching catalog SKU, when it is validated, then the render is blocked with a `fabricated-item` flag and is not shown to the user. → TC-031

### Business rules

- Every rendered item must correspond to a real, purchasable SKU (VERIFIED, PRD §4 BR-6); the system must never fabricate unavailable products (VERIFIED, PRD §4 BR-14). This is the central product invariant (PRD §1). *(Scoped by ADR-027, 2026-07-15: this rule applies to the supplier track; `source=public` bootstrap products are a labeled, non-purchasable, real-and-attributed exception to the purchasable-SKU clause — see FR-062–FR-065. Not deleted.)*

## FR-017 — Use approximate room dimensions to scale rendered products realistically

**Actor:** System · **Priority:** High · **Status:** Proposed
**Origin:** PRD FR-15 (§6); PRD §4 BR-7; Spazio_One_Week_iOS_Pilot.md (Included); 01_product_vision.md

### Description

The system shall, when generating a render, use the project's approximate room dimensions and each product's dimensions to scale rendered products realistically.

### Acceptance criteria

- [ ] Given room dimensions and product dimensions, when the render is generated, then products are scaled proportionally to the captured room dimensions. → TC-032
- [ ] Given room dimensions are missing, when a render is requested, then render generation is blocked with a `missing-dimensions` status. → TC-033

### Business rules

- Approximate room dimensions must be used to scale products realistically (VERIFIED, PRD §4 BR-7). Render fidelity/scale is the highest product risk (VERIFIED, PRD §10).

## FR-018 — Restrict rendering to currently available products (never render unavailable ready-made stock)

**Actor:** System · **Priority:** High · **Status:** Proposed · *(Carve-out by ADR-027, 2026-07-15 for the non-purchasable public track)*
**Origin:** PRD FR-06 (§6); PRD §4 BR-4; Spazio_One_Week_iOS_Pilot.md (Included, in-stock only); 01_product_vision.md

> **Carve-out — ADR-027 (2026-07-15).** The current-availability (in-stock) gate governs the **supplier track**. `source=public` bootstrap products are **display-only and non-purchasable** (FR-064), carry no live supplier stock feed, and are therefore **outside** this in-stock availability gate; they remain real and attributed (FR-062, FR-065) and are excluded from cart/checkout so no unavailable purchasable item is ever sold. The description, criteria, and rule below are unchanged and remain fully in force for `source=supplier` products.

### Description

The system shall, when matching and rendering, restrict ready-made products to those with current available stock and never render ready-made items that are unavailable.

### Acceptance criteria

- [ ] Given ready-made products with current stock greater than zero, when matching/rendering runs, then only in-stock ready-made items are rendered. → TC-034
- [ ] Given a ready-made product with zero or no current stock, when matching runs, then it is excluded from the render with an `out-of-stock` exclusion. → TC-035

### Business rules

- Ready-made items require current stock data and must never be rendered when unavailable (VERIFIED, PRD §4 BR-4). Made-to-order items are handled via lead-time data (PRD §4 BR-5 → FR-058). *(Carve-out by ADR-027, 2026-07-15: `source=public` bootstrap products are display-only/non-purchasable and are not subject to this live-stock availability gate — see FR-062, FR-064.)*

## FR-019 — Exclude catalog entries with incomplete required data from rendering eligibility

**Actor:** System · **Priority:** High · **Status:** Proposed
**Origin:** PRD FR-06 (§6); PRD §4 BR-2, BR-1; 01_product_vision.md

### Description

The system shall, when evaluating a catalog entry's rendering eligibility, exclude any entry that is missing a required attribute.

### Acceptance criteria

- [ ] Given a catalog entry with all required attributes present, when eligibility is evaluated, then the entry is marked eligible for rendering. → TC-036
- [ ] Given a catalog entry missing any required attribute, when eligibility is evaluated, then it is excluded with an `incomplete-data` flag. → TC-037

### Business rules

- Incomplete catalog entries are excluded from rendering (VERIFIED, PRD §4 BR-2). Required attributes are defined in FR-057 (PRD §4 BR-1). Minimum catalog completeness threshold is decided for the pilot (a SKU is renderable only if all PRD BR-1 fields are present) → ADR-014.

## FR-020 — Restrict rendering to products deliverable to the user's locality

**Actor:** System · **Priority:** High · **Status:** Proposed
**Origin:** PRD FR-21 (§6); PRD §4 BR-11; 01_product_vision.md

### Description

The system shall, when matching and rendering, restrict candidate products to those deliverable to the user's locality.

### Acceptance criteria

- [ ] Given products whose delivery coverage includes the user's locality, when matching runs, then only locally-deliverable products are rendered. → TC-038
- [ ] Given a product not deliverable to the user's locality, when matching runs, then it is excluded with a `locality` exclusion. → TC-039

### Business rules

- Only products deliverable to the user's locality may be rendered (VERIFIED, PRD §4 BR-11). When local delivery is unavailable, fallback options apply (PRD §4 BR-12 → FR-053).

## FR-021 — Keep total rendered product cost within budget plus the agreed tolerance

**Actor:** System · **Priority:** High · **Status:** Proposed
**Origin:** PRD FR-14 (§6); PRD §4 BR-9; Spazio_One_Week_iOS_Pilot.md (Included, budget range); 01_product_vision.md

### Description

The system shall, when finalizing a render, keep the total cost of rendered products within the user's budget plus the agreed tolerance.

### Acceptance criteria

- [ ] Given matched products, when the render is finalized, then the total product cost is within the budget maximum plus the agreed tolerance. → TC-040
- [ ] Given the only available combination exceeds budget plus tolerance, when the render is finalized, then a `budget-exceeded` status is raised (triggering FR-022). → TC-041

### Business rules

- Total product cost should not exceed the budget beyond an agreed tolerance; the 10% value is adopted for the pilot → ADR-008. Kept items are excluded from the budget calculation (PRD §4 BR-8 → FR-026).

## FR-022 — On unmet budget, disclose it and offer the closest available alternative

**Actor:** System · **Priority:** Medium · **Status:** Proposed
**Origin:** PRD FR-14 (§6); PRD §4 BR-10; 01_product_vision.md

### Description

The system shall, when the budget cannot be met, disclose that fact to the user and offer the closest available alternative.

### Acceptance criteria

- [ ] Given the budget cannot be met, when results are returned, then the system discloses the budget shortfall and presents the closest available alternative. → TC-042
- [ ] Given the budget cannot be met and no alternative exists, when results are returned, then a `no-alternative` disclosure is shown and the item is marked unavailable. → TC-043

### Business rules

- When the budget cannot be met, the system must disclose this and offer the closest available alternative (VERIFIED, PRD §4 BR-10).

## FR-023 — On no strong match, suggest similar available products or mark the item unavailable

**Actor:** System · **Priority:** Medium · **Status:** Proposed
**Origin:** PRD FR-22 (§6); PRD §4 BR-13; 01_product_vision.md

### Description

The system shall, when no strong product match exists for a requested item, suggest similar available products or mark the item as unavailable.

### Acceptance criteria

- [ ] Given no strong match for a requested item but similar available products exist, when matching completes, then similar alternatives are suggested. → TC-044
- [ ] Given no strong match and no similar available products, when matching completes, then the item is marked `unavailable`. → TC-045

### Business rules

- When no strong product match exists, the system must suggest similar available products or mark the item as unavailable (VERIFIED, PRD §4 BR-13).

## FR-024 — Validate photo quality and reject unusable photos with a retake request

**Actor:** System · **Priority:** Medium · **Status:** Proposed
**Origin:** PRD FR-13 (§6); PRD §4 BR-15; PRD §8 step 8; 01_product_vision.md

### Description

The system shall, when a room photo is submitted, validate its quality and reject unusable photos with a request to retake.

### Acceptance criteria

- [ ] Given a photo that passes the quality checks, when validation runs, then the photo is accepted for rendering. → TC-046
- [ ] Given an unusable photo, when validation runs, then it is rejected with a `quality-failed` status and a retake request. → TC-047

### Business rules

- Unusable photos must be rejected with a request to retake them (VERIFIED, PRD §4 BR-15). Poor user photos are a known risk (PRD §10). Quality thresholds are **DRAFT/PROPOSED**.

## FR-025 — Let users mark existing items to keep or replace

**Actor:** Homeowner/renter · **Priority:** Medium · **Status:** Proposed
**Origin:** PRD FR-16 (§6); PRD §4 BR-8; 01_product_vision.md — Note: keep-or-replace segmentation is **excluded from the one-week pilot**.

### Description

The system shall, when the user marks an existing item as keep or replace, persist that decision on the current project.

### Acceptance criteria

- [ ] Given existing items identified in the room, when the user marks an item as keep or replace, then the mark is persisted on the project. → TC-048

### Business rules

- Keep-or-replace relies on object detection/segmentation, a known risk (PRD §10) and cut from the pilot. Effects of a "keep" mark are specified in FR-026 (PRD §4 BR-8).

## FR-026 — Retain kept items in the render and exclude them from cart and budget

**Actor:** System · **Priority:** Medium · **Status:** Proposed
**Origin:** PRD FR-16 (§6); PRD §4 BR-8; 01_product_vision.md — Note: **excluded from the one-week pilot**.

### Description

The system shall, when items are marked to keep, retain them in the render and exclude them from both the cart and the budget calculation.

### Acceptance criteria

- [ ] Given an item marked keep, when the render is generated, then the kept item remains visible in the render. → TC-049
- [ ] Given an item marked keep, when the cart and budget are computed, then the kept item is excluded from both the cart and the budget total. → TC-050

### Business rules

- Existing items marked to keep must remain in the render, be excluded from the cart, and be excluded from the budget calculation (VERIFIED, PRD §4 BR-8). Kept items must be visibly distinguished from purchased catalog items (PRD §7 → NFR-014).

## FR-027 — Operator reviews and approves each render before it is shown to the user

**Actor:** Operator · **Priority:** High · **Status:** Deprecated — Superseded by ADR-025 (2026-07-14)
**Origin:** Spazio_One_Week_iOS_Pilot.md ("Operator reviews each render before it reaches the user"); PRD §5 (operator render-quality monitoring); 01_product_vision.md

> **Retired — ADR-025 (2026-07-14).** The human render-review gate is removed; renders are published to the requesting user immediately upon successful generation. No operator reviews, approves, or rejects renders. TC-051, TC-052, and TC-053 are retired with this requirement (see `08_test_plan.md`). The block below is retained for history.

### Description

The system shall, when a render is in pending-review state, require an operator decision before the render can be shown to the user.

### Acceptance criteria

- [ ] Given a render with status `pending-review`, when the operator approves it, then its status becomes `approved` and it is released to the user. → TC-051
- [ ] Given a render with status `pending-review`, when the operator rejects it, then its status becomes `rejected` and it is not shown to the user. → TC-052
- [ ] Given a render not yet reviewed, when the user attempts to view it, then it is not displayed (blocked by the `pending-review` gate). → TC-053

### Business rules

- Human review before display protects the customer while the AI is unproven and mitigates the top render-fidelity risk (VERIFIED, pilot; PRD §10).

## FR-028 — Tag every rendered product with name, price, supplier, warranty, and listing link

**Actor:** System · **Priority:** High · **Status:** Proposed
**Origin:** PRD FR-07 (§6); Spazio_One_Week_iOS_Pilot.md (tappable product tags); 01_product_vision.md — Note: the pilot shows tags with price and supplier; warranty display is not part of the pilot scope.

### Description

The system shall, when a render is published (immediately upon successful generation — ADR-025), tag every rendered product with its name, price, supplier, warranty terms, and listing link.

### Acceptance criteria

- [ ] Given a published render, when tags are generated, then each rendered product carries name, price, supplier, warranty terms, and a listing link. → TC-054

### Business rules

- Tagged data is drawn from catalog attributes, which are guaranteed complete for renderable products (PRD §4 BR-1, BR-2 → FR-019). Warranty terms must be supplier-declared (PRD §4 BR-18 → FR-038).

## FR-029 — View a tagged product's details by tapping it in the render

**Actor:** Homeowner/renter · **Priority:** High · **Status:** Proposed
**Origin:** PRD FR-07b (§6); Spazio_One_Week_iOS_Pilot.md (tappable product tags); 01_product_vision.md

### Description

The system shall, when a user taps a product tag on a published render (ADR-025), display that product's details.

### Acceptance criteria

- [ ] Given a published render with tagged products, when the user taps a tag, then the product's details (name, price, supplier, warranty, listing link) are displayed. → TC-055

## FR-030 — Add a rendered/tagged product to the cart

**Actor:** Homeowner/renter · **Priority:** High · **Status:** Proposed
**Origin:** PRD FR-07b, FR-08 (§6); 01_product_vision.md

### Description

The system shall, when a user adds a tagged product, create a corresponding cart item for that product.

### Acceptance criteria

- [ ] Given a tagged, available product, when the user adds it to the cart, then a cart item is created for that product. → TC-056
- [ ] Given a product that is now unavailable, when the user adds it, then the add is rejected with an `unavailable` status and no cart item is created. → TC-057

### Business rules

- Adding an item to the cart places a stock hold (PRD §4 BR-22 → FR-039).

## FR-031 — Auto-populate the cart with every product shown in the render

**Actor:** System · **Priority:** High · **Status:** Proposed
**Origin:** PRD FR-08 (§6); Spazio_One_Week_iOS_Pilot.md (automatically populated cart); 01_product_vision.md

### Description

The system shall, when a published render is shown (renders publish immediately on generation success — ADR-025), auto-populate the cart with every product displayed in that render.

### Acceptance criteria

- [ ] Given a published render with N tagged products, when the render is shown, then the cart is auto-populated with all N products. → TC-058

### Business rules

- The cart is a suggestion and must be explicitly confirmed before payment (PRD §4 BR-31 → FR-035).

## FR-032 — Review the cart contents

**Actor:** Homeowner/renter · **Priority:** High · **Status:** Proposed
**Origin:** PRD FR-09 (§6); Spazio_One_Week_iOS_Pilot.md (cart review); 01_product_vision.md

### Description

The system shall, when a user opens the cart, display all cart items with their product, quantity, and price.

### Acceptance criteria

- [ ] Given a populated cart, when the user opens it, then all cart items with product, quantity, and price are displayed. → TC-059

## FR-033 — Remove a product from the cart

**Actor:** Homeowner/renter · **Priority:** High · **Status:** Proposed
**Origin:** PRD FR-07b, FR-09 (§6); Spazio_One_Week_iOS_Pilot.md (item removal); 01_product_vision.md

### Description

The system shall, when a user removes a cart item, delete it from the cart and recalculate the cart total.

### Acceptance criteria

- [ ] Given a cart containing an item, when the user removes it, then the item is removed and the cart total is recalculated. → TC-060

## FR-034 — Swap a cart item for an alternative product

**Actor:** Homeowner/renter · **Priority:** Medium · **Status:** Proposed
**Origin:** PRD FR-09 (§6); 01_product_vision.md

### Description

The system shall, when a user swaps a cart item, replace it with the chosen alternative product and recalculate the cart total.

### Acceptance criteria

- [ ] Given a cart item with available alternatives, when the user swaps it, then the original item is replaced by the chosen alternative and the total is recalculated. → TC-061
- [ ] Given a cart item with no available alternative, when the user requests a swap, then the swap is unavailable with a `no-alternative` status. → TC-062

## FR-035 — Require explicit cart confirmation before payment

**Actor:** System · **Priority:** High · **Status:** Proposed
**Origin:** PRD FR-11 (§6); PRD §4 BR-31; Spazio_One_Week_iOS_Pilot.md ("User confirms the cart before paying"); 01_product_vision.md

### Description

The system shall, when a user attempts payment, require that the cart has been explicitly confirmed first.

### Acceptance criteria

- [ ] Given a cart, when the user confirms it, then the cart is marked `confirmed` and payment is enabled. → TC-063
- [ ] Given an unconfirmed cart, when the user attempts payment, then payment is blocked with a `confirmation-required` status. → TC-064

### Business rules

- The cart is a suggestion and must be explicitly confirmed before payment (VERIFIED, PRD §4 BR-31; pilot).

## FR-036 — Display supplier-sourced production and delivery estimates per item before checkout

**Actor:** System · **Priority:** High · **Status:** Proposed
**Origin:** PRD FR-10 (§6); PRD §4 BR-17; Spazio_One_Week_iOS_Pilot.md (price and estimated delivery/production time per item); 01_product_vision.md

### Description

The system shall, when the cart or checkout is shown, display each item's supplier-sourced production and delivery estimate before checkout.

### Acceptance criteria

- [ ] Given cart items with supplier lead-time data, when the cart/checkout is shown, then each item displays its supplier-sourced production and delivery estimate before checkout. → TC-065
- [ ] Given a cart item lacking supplier estimate data, when the cart is shown, then the item is flagged with a `missing-estimate` status. → TC-066

### Business rules

- Delivery and production estimates must come from supplier data and be shown before checkout (VERIFIED, PRD §4 BR-17). Price, delivery, and warranty must be visible before checkout (PRD §7 → NFR-015).

## FR-037 — Display aggregated production and delivery estimates for the full order before checkout

**Actor:** System · **Priority:** Medium · **Status:** Proposed
**Origin:** PRD FR-10 (§6); 01_product_vision.md

### Description

The system shall, when the order summary is shown, display an aggregated production and delivery estimate for the full order before checkout.

### Acceptance criteria

- [ ] Given multiple items with estimates, when the order summary is shown, then an aggregated production/delivery estimate for the full order is displayed before checkout. → TC-067

## FR-038 — Display supplier-declared warranty terms per item before checkout

**Actor:** System · **Priority:** Medium · **Status:** Proposed
**Origin:** PRD FR-10 (§6); PRD §4 BR-18; 01_product_vision.md — Note: warranty display is **excluded from the one-week pilot**.

### Description

The system shall, when the cart or checkout is shown, display each item's supplier-declared warranty terms before checkout.

### Acceptance criteria

- [ ] Given cart items with supplier-declared warranty terms, when the cart/checkout is shown, then each item displays its warranty terms before checkout. → TC-068

### Business rules

- Warranty terms must be supplier-declared and displayed before checkout (VERIFIED, PRD §4 BR-18). Warranty and dispute-resolution rules are decided for the pilot (warranty display is out of the pilot; suppliers' own warranty terms apply; disputes are handled manually by the operator) → ADR-020.

## FR-039 — Place a stock hold when a product is added to the cart, for the configured duration

**Actor:** System · **Priority:** Medium · **Status:** Proposed
**Origin:** PRD FR-19 (§6); PRD §4 BR-22; 01_product_vision.md

### Description

The system shall, when a product is added to the cart, place a stock hold on it for the configured hold duration.

### Acceptance criteria

- [ ] Given a product is added to the cart, when the add succeeds, then a stock hold is created for the configured hold duration. → TC-069
- [ ] Given insufficient stock to place a hold, when the product is added, then the hold fails with an `insufficient-stock` status. → TC-070

### Business rules

- Adding an item to the cart holds stock; the PRD states 15 minutes. Decided for the pilot: no stock hold in the pilot; the 15-minute value applies only when holds are built post-pilot → ADR-011.

## FR-040 — Release held stock back to availability when the hold expires

**Actor:** System · **Priority:** Medium · **Status:** Proposed
**Origin:** PRD FR-19 (§6); PRD §4 BR-23; 01_product_vision.md

### Description

The system shall, when a stock hold's duration elapses without checkout, release the hold and return the stock to availability.

### Acceptance criteria

- [ ] Given an active stock hold, when its duration elapses without checkout, then the hold is released and the stock returns to availability. → TC-071

### Business rules

- Expired holds return stock to availability (VERIFIED, PRD §4 BR-23). Hold duration is decided for the pilot: no stock holds in the pilot; the 15-minute value applies only when holds are built post-pilot → ADR-011.

## FR-041 — Revalidate price and availability at checkout before payment

**Actor:** System · **Priority:** High · **Status:** Proposed
**Origin:** PRD FR-19 (§6); PRD §4 BR-24; 01_product_vision.md

### Description

The system shall, when checkout begins, revalidate the price and availability of every cart item before processing payment.

### Acceptance criteria

- [ ] Given a confirmed cart at checkout, when revalidation runs and price/availability are unchanged, then checkout proceeds to payment. → TC-072
- [ ] Given a cart item whose price or availability changed, when revalidation runs at checkout, then checkout is halted and the changed item is flagged. → TC-073

### Business rules

- Price and stock must be validated again at checkout (VERIFIED, PRD §4 BR-24).

## FR-042 — Process a single in-app payment for the order

**Actor:** System · **Priority:** High · **Status:** Proposed
**Origin:** PRD FR-11 (§6); PRD §4 BR-25; Spazio_One_Week_iOS_Pilot.md (one simple in-app checkout); 01_product_vision.md

### Description

The system shall, when a confirmed and revalidated cart is paid, process a single in-app payment and create the corresponding order.

### Acceptance criteria

- [ ] Given a confirmed, revalidated cart, when the user pays, then a single payment is processed and an order is created with status `paid`. → TC-074
- [ ] Given payment authorization fails, when the user pays, then no order is created and a `payment-failed` status is returned. → TC-075

### Business rules

- Checkout produces one user payment (VERIFIED, PRD §4 BR-25). Payment processing must be PCI-compliant (PRD §7 → NFR-009). Payment gateway and merchant-of-record model are decided for the pilot (a single PCI-compliant hosted checkout collecting one COP payment; the Spazio operating entity is merchant of record and pays suppliers manually; provider and tax/legal choices revisit before scale) → ADR-003, ADR-004. The pilot uses one simple in-app checkout (VERIFIED, pilot scope).

## FR-043 — Settle funds to multiple suppliers via split settlement

**Actor:** System · **Priority:** High · **Status:** Proposed
**Origin:** PRD FR-11 (§6); PRD §7 (marketplace split settlement, multi-supplier payouts); 01_product_vision.md — Note: automated split payments are **excluded from the one-week pilot** (operator handles fulfillment manually).

### Description

The system shall, when a paid order spans multiple suppliers, split and settle the funds to each supplier per the split-settlement model.

### Acceptance criteria

- [ ] Given a paid order spanning multiple suppliers, when settlement runs, then funds are split and settled to each supplier. → TC-076
- [ ] Given split settlement to a supplier fails, when settlement runs, then that supplier's settlement is flagged `failed` for reconciliation. → TC-077

### Business rules

- The gateway must support marketplace-style split settlement and multi-supplier payouts (PRD §7 → NFR-010). Split-settlement model and merchant-of-record model are decided for the pilot: no split settlement in the pilot (the operator pays suppliers manually); split settlement and provider selection revisit before scale → ADR-003, ADR-004. Split settlement may not be available in every country (known risk, PRD §10).

## FR-044 — Generate one purchase order per supplier at checkout

**Actor:** System · **Priority:** High · **Status:** Proposed
**Origin:** PRD FR-11 (§6); PRD §4 BR-25; 01_product_vision.md — Note: automation of one PO per supplier is **excluded from the one-week pilot**.

### Description

The system shall, when an order is created, generate exactly one purchase order per distinct supplier in that order.

### Acceptance criteria

- [ ] Given a paid order with items from M distinct suppliers, when the order is created, then exactly one purchase order per supplier (M purchase orders) is generated. → TC-078

### Business rules

- Checkout produces one purchase order per supplier (VERIFIED, PRD §4 BR-25).

## FR-045 — Apply and retain the marketplace commission on every completed purchase

**Actor:** System · **Priority:** Medium · **Status:** Proposed
**Origin:** PRD §9 (commission per sale); PRD §4 BR-28; 01_product_vision.md

### Description

The system shall, when a purchase is completed, apply and retain the marketplace commission on that purchase.

### Acceptance criteria

- [ ] Given a completed purchase, when the order is finalized, then the marketplace commission is applied and retained by Spazio. → TC-079

### Business rules

- Spazio applies a marketplace commission to every completed purchase (VERIFIED, PRD §4 BR-28). The percentage is 10%, adopted for the pilot (reconciled manually; no billing code) → ADR-007. The gateway must support automatic commission retention (PRD §7 → NFR-012).

## FR-046 — Display prices in the user's local currency

**Actor:** System · **Priority:** High · **Status:** Proposed
**Origin:** PRD FR-20 (§6); PRD §4 BR-27; Spazio_One_Week_iOS_Pilot.md (one currency: COP); 01_product_vision.md

### Description

The system shall, when displaying prices, show them in the user's local currency.

### Acceptance criteria

- [ ] Given the user's market/currency, when prices are shown, then all prices are displayed in that local currency. → TC-080

### Business rules

- Prices are shown in the local currency (VERIFIED, PRD §4 BR-27). The pilot uses a single currency (COP) in one market (VERIFIED, pilot scope). Initial launch markets and per-market taxes/payment methods are decided for the pilot (single market Bogotá/COP; taxes/invoicing handled manually; revisit before scale) → ADR-015, ADR-018.

## FR-047 — Provide per-purchase-order status and tracking

**Actor:** System · **Priority:** Medium · **Status:** Proposed
**Origin:** PRD FR-12 (§6); PRD §3 "Must have" (basic order tracking); 01_product_vision.md — Note: full order tracking is **excluded from the one-week pilot**.

### Description

The system shall, when a user views order tracking, display the current status and tracking information for each purchase order.

### Acceptance criteria

- [ ] Given a purchase order, when the user views order tracking, then the current status and tracking information for that purchase order are displayed. → TC-081
- [ ] Given a purchase order with no tracking data yet, when the user views tracking, then a `no-tracking-yet` status is shown. → TC-082

## FR-048 — Enforce a configurable daily free-render limit per user

**Actor:** System · **Priority:** Medium · **Status:** Proposed
**Origin:** PRD FR-17 (§6); PRD §4 BR-19; 01_product_vision.md — Note: daily render limits are **excluded from the one-week pilot**.

### Description

The system shall, when a user requests a render, enforce the configurable daily free-render limit for that user.

### Acceptance criteria

- [ ] Given a user below the daily free-render limit, when they request a render, then the render proceeds and the user's daily render count increments. → TC-083
- [ ] Given a user who has reached the daily free-render limit, when they request a render, then the render is blocked with a `limit-reached` status. → TC-084

### Business rules

- Free render usage is configurable; the PRD states a default of five attempts per user per day. Decided for the pilot: no daily free-render limit; the five/day default applies only when metering is built post-pilot → ADR-009. *(The original rationale 'every render is operator-reviewed' is superseded by ADR-025, 2026-07-14.)*

## FR-049 — Count every render generation or edit as one render attempt

**Actor:** System · **Priority:** Medium · **Status:** Proposed
**Origin:** PRD FR-17 (§6); PRD §4 BR-20; 01_product_vision.md — Note: **excluded from the one-week pilot**.

### Description

The system shall, when a render is generated or an edit is applied, count it as one render attempt against the daily counter.

### Acceptance criteria

- [ ] Given the daily render counter, when a render is generated or an edit is applied, then the counter increments by one for each generation or edit. → TC-085

### Business rules

- Every generation or edit counts as one attempt (VERIFIED, PRD §4 BR-20). Cost per render is tracked (PRD §7 → NFR-005).

## FR-050 — On limit reached, offer return-next-day or a paid render package

**Actor:** System · **Priority:** Low · **Status:** Proposed
**Origin:** PRD FR-17 (§6); PRD §4 BR-21; PRD §9 (render packages); 01_product_vision.md — Note: paid render packages are **excluded from the one-week pilot**.

### Description

The system shall, when a user has reached the daily render limit, offer the options to return the next day or to buy a paid render package.

### Acceptance criteria

- [ ] Given a user at the daily render limit, when they attempt another render, then they are offered the choice to return the next day or to buy a paid render package. → TC-086

### Business rules

- After reaching the limit, the user may return the next day or buy a render package (VERIFIED, PRD §4 BR-21). Render-package pricing is decided for the pilot: paid render packages are not offered (deferred) → ADR-010.

## FR-051 — Ask targeted refinement questions when the user re-renders the same scene

**Actor:** System · **Priority:** Medium · **Status:** Proposed
**Origin:** PRD FR-18 (§6); 01_product_vision.md — Note: targeted edit-by-question refinement is **excluded from the one-week pilot**.

### Description

The system shall, when a user re-renders the same scene, ask targeted refinement questions before regenerating.

### Acceptance criteria

- [ ] Given a user re-rendering the same scene, when they request a re-render, then the system asks targeted refinement questions before regenerating. → TC-087

## FR-052 — Apply a targeted edit affecting only the requested element

**Actor:** System · **Priority:** Medium · **Status:** Proposed
**Origin:** PRD FR-18 (§6); 01_product_vision.md — Note: **excluded from the one-week pilot**.

### Description

The system shall, when a user requests a targeted edit of a single element, apply a change that affects only the requested element.

### Acceptance criteria

- [ ] Given a targeted edit request for one element, when the edit runs, then only the requested element changes and the rest of the render is preserved. → TC-088

### Business rules

- Targeted edits should complete faster than full renders (PRD §7 → NFR-002).

## FR-053 — Offer delivery fallback (nearby regions, alternative shipping, or pickup) when local delivery is unavailable

**Actor:** System · **Priority:** Medium · **Status:** Proposed
**Origin:** PRD FR-21 (§6); PRD §4 BR-12; 01_product_vision.md

### Description

The system shall, when local delivery is unavailable, offer a delivery fallback such as nearby regions, alternative shipping, or pickup.

### Acceptance criteria

- [ ] Given local delivery is unavailable, when results are returned, then the system offers a fallback (nearby regions, alternative shipping, or pickup). → TC-089
- [ ] Given local delivery is unavailable and no fallback option exists, when results are returned, then a `no-delivery-available` status is shown. → TC-090

### Business rules

- When local delivery is unavailable, the system may offer nearby regions, alternative shipping, or pickup (VERIFIED, PRD §4 BR-12).

## FR-054 — Apply sponsored placement only as a tie-breaker, never overriding relevance/quality/budget/locality/availability

**Actor:** System · **Priority:** Low · **Status:** Proposed
**Origin:** PRD §9 (sponsored supplier visibility); PRD §4 BR-29, BR-30; 01_product_vision.md — Note: monetization mechanisms are **excluded from the one-week pilot**.

### Description

The system shall, when ordering similarly ranked products, apply sponsored placement only to break ties and never let it override relevance, quality, budget, locality, or availability.

### Acceptance criteria

- [ ] Given two products of equal relevance, quality, budget fit, locality, and availability where one is sponsored, when ordering is computed, then the sponsored product is placed ahead only as a tie-breaker. → TC-091
- [ ] Given a sponsored product of lower relevance or quality than a non-sponsored product, when ordering is computed, then sponsorship does not override the more relevant/higher-quality product. → TC-092

### Business rules

- Sponsored placement may only break ties among similarly relevant, high-quality products and must never override relevance, quality, budget, locality, or availability (VERIFIED, PRD §4 BR-29, BR-30; §9). Sponsored-plan pricing is decided for the pilot: sponsored placement is not offered (deferred) → ADR-017.

## FR-055 — Let suppliers self-ingest catalog data through supported channels

**Actor:** Supplier · **Priority:** Medium · **Status:** Proposed
**Origin:** PRD FR-23 (§6); PRD §3 "Must have"; 01_product_vision.md — Note: supplier self-service ingestion is **excluded from the one-week pilot** (catalog is manually loaded).

### Description

The system shall, when a supplier submits catalog data through a supported ingestion channel, import the submitted entries for operator curation.

### Acceptance criteria

- [ ] Given a supplier submits catalog data via a supported channel, when ingestion runs, then the catalog entries are imported for curation. → TC-093
- [ ] Given a submission in an unsupported format or channel, when ingestion runs, then it is rejected with an `unsupported-format` status. → TC-094

### Business rules

- The PRD lists software integration, Excel, API, and FTP as candidate channels; the supported set is decided for the pilot: the operator manually loads a CSV/Excel spreadsheet of 30–60 curated SKUs (no API/FTP/self-service ingestion) → ADR-006. Imported entries still pass operator curation (FR-056) and completeness checks (FR-019, FR-057).

## FR-056 — Operator curates and approves catalog entries

**Actor:** Operator · **Priority:** High · **Status:** Proposed
**Origin:** Spazio_One_Week_iOS_Pilot.md ("Operator curates the catalog by hand"); PRD §5 (catalog curation); 01_product_vision.md

### Description

The system shall, when an operator reviews a catalog entry, allow them to approve it into the active, renderable catalog or reject it.

### Acceptance criteria

- [ ] Given an ingested or manually loaded catalog entry, when the operator approves it, then it becomes an active, renderable catalog product. → TC-095
- [ ] Given a catalog entry the operator rejects, when it is reviewed, then it is marked `not-approved` and excluded from rendering. → TC-096

### Business rules

- A small, clean, manually curated catalog ensures every rendered product is real, priced, and in stock (VERIFIED, pilot). Catalog quality is a human responsibility (PRD §12).

## FR-057 — Store required catalog attributes per SKU

**Actor:** Supplier · **Priority:** High · **Status:** Proposed
**Origin:** PRD §4 BR-1; PRD §6 (supplier catalog attributes); Spazio_One_Week_iOS_Pilot.md (SKUs with photo, price, dimensions, stock, style tag); 01_product_vision.md

### Description

The system shall, when a catalog SKU is saved, store its required attributes: photos, dimensions, price, available colors, materials, stock, category, style attributes, production/delivery lead time, and warranty terms.

### Acceptance criteria

- [ ] Given a SKU with all required attributes present, when it is saved, then it is stored as complete. → TC-097
- [ ] Given a SKU missing any required attribute, when it is saved, then it is stored `incomplete` and flagged (and is excluded from rendering per FR-019). → TC-098

### Business rules

- Supplier catalog entries must include photos, dimensions, price, available colors, materials, stock, category, style attributes, production/delivery lead time, and warranty terms (VERIFIED, PRD §4 BR-1). Minimum catalog completeness threshold is decided for the pilot (a SKU is renderable only if all PRD BR-1 fields are present) → ADR-014.

## FR-058 — Classify products as in-stock ready-made or made-to-order with required stock/lead-time data

**Actor:** Supplier · **Priority:** High · **Status:** Proposed
**Origin:** PRD §4 BR-3, BR-4, BR-5; PRD §6; Spazio_One_Week_iOS_Pilot.md (in-stock catalog); 01_product_vision.md

### Description

The system shall, when a product is classified, record whether it is in-stock ready-made or made-to-order, requiring current stock data for ready-made and supplier-declared production and delivery times for made-to-order.

### Acceptance criteria

- [ ] Given a ready-made product, when it is classified, then it carries current stock data. → TC-099
- [ ] Given a made-to-order product, when it is classified, then it carries supplier-declared production and delivery times. → TC-100
- [ ] Given a product classified without its required stock (ready-made) or lead-time (made-to-order) data, when it is saved, then it is flagged with an `invalid-classification` status. → TC-101

### Business rules

- Products are classified as in-stock ready-made or made-to-order/manufacturable (VERIFIED, PRD §4 BR-3). Ready-made items require current stock data (BR-4); made-to-order items must include supplier-declared production and delivery times (BR-5).

## FR-059 — Map each product to the shared style taxonomy

**Actor:** Operator · **Priority:** High · **Status:** Proposed
**Origin:** PRD §4 BR-16; PRD §5 (style taxonomy); Spazio_One_Week_iOS_Pilot.md (style tag per SKU); 01_product_vision.md

### Description

The system shall, when a product is prepared for the catalog, map it to the shared style taxonomy.

### Acceptance criteria

- [ ] Given a product and the shared style taxonomy, when it is mapped, then the product carries its style-taxonomy classification. → TC-102
- [ ] Given a product with no style-taxonomy mapping, when eligibility is evaluated, then it is flagged `unmapped` and excluded from style matching. → TC-103

### Business rules

- Products must be mapped to a shared style taxonomy (VERIFIED, PRD §4 BR-16). The taxonomy values are decided for the pilot (1–2 predefined styles + free-text description; no taxonomy engine) → ADR-005.

## FR-060 — Synchronize supplier catalog data regularly, and in real time for ready-made stock

**Actor:** System · **Priority:** High · **Status:** Proposed
**Origin:** PRD §4 BR-32; 01_product_vision.md — Note: automated synchronization is **excluded from the one-week pilot** (catalog is manually loaded).

### Description

The system shall, when the synchronization schedule runs, update supplier catalog data regularly and synchronize ready-made stock in real time.

### Acceptance criteria

- [ ] Given supplier catalog updates, when synchronization runs on the configured schedule, then catalog data is updated and ready-made stock is synchronized in real time. → TC-104
- [ ] Given a synchronization failure for a supplier feed, when synchronization runs, then a `sync-failed` status is recorded for that supplier. → TC-105

### Business rules

- Supplier data must synchronize regularly, or in real time for ready-made stock (VERIFIED, PRD §4 BR-32). Synchronization frequency is decided for the pilot: manual/on-demand refresh by the operator (no automated sync) → ADR-012.

## FR-061 — Operator manually forwards each confirmed order to the supplier

**Actor:** Operator · **Priority:** High · **Status:** Proposed
**Origin:** Spazio_One_Week_iOS_Pilot.md ("Operator places the purchase order with the supplier"); 01_product_vision.md

### Description

The system shall, when an operator forwards a confirmed (paid) order, transmit it to the supplier and mark it as forwarded.

### Acceptance criteria

- [ ] Given a confirmed, paid order, when the operator forwards it, then the order is transmitted to the supplier and marked `forwarded`. → TC-106

### Business rules

- In the pilot the operator forwards the confirmed order manually because no automated split payment or supplier integration is built in week one (VERIFIED, pilot). This is a pilot bridge for FR-043/FR-044.

## FR-062 — Present public-dataset (ABO) products as a fallback when no supplier catalog satisfies the constraints

**Actor:** System · **Priority:** Medium · **Status:** Proposed
**Origin:** ADR-027 (2026-07-15); FEAT-017 (issue #43); PRD §10 (two-sided cold-start risk); ADR-024 (web app), ADR-023 (class demo)

### Description

The system shall, when no supplier catalog satisfies the project's matching constraints (style, dimensions, budget, locality), draw candidate products from the seeded public-dataset (Amazon Berkeley Objects, `source=public`) fallback so that matching and rendering can proceed during the bootstrap/demo period.

### Acceptance criteria

- [ ] Given no supplier product satisfies the constraints (empty supplier match — e.g. no supplier is onboarded), when matching runs, then the system draws candidates from the `source=public` ABO subset and returns a match set of public products. → TC-110
- [ ] Given a supplier catalog that does satisfy the constraints, when matching runs, then the public fallback stays inactive and no `source=public` product is presented (the supplier track is unchanged). → TC-111

### Business rules

- The public fallback is a temporary, additive bootstrap/demo track governed by **ADR-027** (2026-07-15); it activates only when no supplier catalog satisfies the constraints and it does not weaken the supplier track (quarantine, not dilute). The source is the Amazon Berkeley Objects dataset, licensed CC BY 4.0; attribution is required (FR-065, NFR-019). Public products are non-purchasable and clearly labeled (FR-063, FR-064). Scraping named retailers is forbidden (NFR-019).

## FR-063 — Tag every product with its source and distinguish public products across matching, render tags, and cart

**Actor:** System · **Priority:** Medium · **Status:** Proposed · *(As built — FEAT-017, 2026-07-15)*
**Origin:** ADR-027 (2026-07-15); FEAT-017; data-model spec `07_data_model.md` (`Product.source`)

> **As built — FEAT-017 (2026-07-15).** Implemented and verified on the local stack (not deployed). Every product carries a `source` of `supplier` or `public`; `source=public` products (Amazon Berkeley Objects) are seeded and surfaced as the user-selectable **Brand suppliers** source (ADR-028/FEAT-018), kept distinguishable from supplier products and labeled "not sold by Spazio". Supplier products retain the full purchasable-SKU treatment (FR-016 unchanged). The `source=public` fallback-activation gating of FR-062 (activate only when no supplier catalog exists) remains partly specification. See `features/FEAT-017_public-catalog-fallback.md`.

### Description

The system shall, for every catalog product, carry a `source` of `supplier` or `public`, and shall keep `source=public` products distinguishable from supplier products through matching, the render tag, and the cart, labeling every public product "not sold by Spazio".

### Acceptance criteria

- [ ] Given products of both provenances, when they are matched and rendered, then each carries its `source` (`supplier`|`public`) and every `source=public` item is visibly labeled "not sold by Spazio" in its render tag and detail. → TC-112
- [ ] Given a `source=supplier` product, when it is matched/rendered, then it is not labeled as public and retains the full purchasable-SKU treatment (BR-6/BR-14/FR-016 unchanged for it). → TC-112

### Business rules

- Provenance is a first-class product attribute (`Product.source`, spec in `07_data_model.md`) introduced by **ADR-027**. The supplier-track invariant (FR-016/BR-6/BR-14) is unchanged; public products are the labeled exception. The exclusion of public products from cart/checkout/orders/commission/MoR is specified in FR-064; attribution in FR-065.

## FR-064 — Keep public products display-only with a labeled "View at retailer" outbound link, excluded from cart, checkout, orders, commission, and merchant-of-record

**Actor:** System · **Priority:** Medium · **Status:** Proposed · *(As built — FEAT-017, 2026-07-15)*
**Origin:** ADR-027 (2026-07-15); FEAT-017; scopes ADR-004 (MoR), ADR-007 (commission)

> **As built — FEAT-017 (2026-07-15).** Implemented and verified on the local stack (not deployed). `source=public` (Brand suppliers) products are display-only: shown with a "not sold by Spazio" label and a "View at retailer" outbound link, never added to cart/checkout, and excluded from orders/commission/merchant-of-record — a Brand-only render yields an empty cart by design. The CC BY 4.0 attribution propagation of FR-065 remains partly specification. See `features/FEAT-017_public-catalog-fallback.md`.

### Description

The system shall, for a `source=public` product, present it as display-only with a labeled "View at retailer" outbound link instead of an add-to-cart affordance, and shall exclude it from cart, checkout, orders, commission, and the merchant-of-record path.

### Acceptance criteria

- [ ] Given a `source=public` product shown in a render or in its detail, when the user views it, then a labeled "View at retailer" outbound link is presented and no add-to-cart affordance is offered. → TC-114
- [ ] Given an attempt to add a `source=public` product to the cart or checkout, when it is processed, then it is rejected with a `not-purchasable` status and the product is absent from any order, commission, and merchant-of-record record. → TC-115 (add refused); TC-113 (cart/checkout/order/commission/MoR exclusion)

### Business rules

- Public products are **display-only** and **never** purchasable in-app (**ADR-027**, quarantine-not-dilute). This is **not** a monetized affiliate program — the outbound link is informational. Merchant-of-record (ADR-004) does not cover public products and no commission (ADR-007) applies, because they are never purchased through Spazio. Public renders are excluded from the render-to-purchase metric (NFR-006, segmented — see `04_non_functional_requirements.md`).

## FR-065 — Record and surface required CC BY 4.0 attribution for public products and propagate image provenance into composited renders

**Actor:** System · **Priority:** Medium · **Status:** Proposed
**Origin:** ADR-027 (2026-07-15); FEAT-017; NFR-019; ADR-026 (render engine — derivative work)

### Description

The system shall, for a `source=public` product, record and display its required attribution (source name, source URL, source image URL, image license), and shall propagate that image provenance and attribution into any render that composites the public product image (a derivative work).

### Acceptance criteria

- [ ] Given a `source=public` product with complete attribution, when it is displayed and when its image is composited into a render, then the required CC BY 4.0 attribution (source name, source URL, image license) is displayed with the product and is propagated onto the stored render. → TC-116 (recorded/surfaced); TC-117 (propagated into the derivative render)
- [ ] Given a `source=public` product missing required attribution, when rendering eligibility is evaluated, then it is excluded with a `missing-attribution` flag and is neither displayed nor composited. → TC-118

### Business rules

- CC BY 4.0 requires attribution both for use and for derivative works (**ADR-027**, **NFR-019**). A render compositing a public image is a derivative work (**ADR-026**); the attribution must flow from the source into the stored render and its display. Attribution fields (`source_name`, `source_url`, `source_image_url`, `image_license`) are specified on `Product` in `07_data_model.md`. Failure to carry attribution is a license violation (NFR-019).

## FR-066 — Browse the catalog by source and style, returning approved renderable products with an image URL

**Actor:** System · **Priority:** High · **Status:** Proposed · *(As built — FEAT-018, 2026-07-15)*
**Origin:** ADR-028 (2026-07-15); FEAT-018; ADR-027 (`Product.source`); reuses the style-matching helper of FR-014

> **As built — FEAT-018 (2026-07-15).** Implemented and verified on the local stack (not deployed). The public browse surface `GET /api/v1/catalog?source=&styleId=&budgetMaxCop=` returns the approved, renderable products of the requested source/style, each with an `imageUrl`, and `GET /api/v1/catalog/products/:id/image` streams a product's stored image bytes (404 when absent/unknown). It is not device-scoped (public data, like `GET /styles`) and reuses the FR-014 style-matching helper. See `features/FEAT-018_browse-select-furniture.md`; validated by **TC-127 / TC-128 / TC-129** (`08_test_plan.md`).

### Description

The system shall, given a `source` (`supplier` | `public`) and a `styleId` (and an optional maximum budget), return the approved, renderable products of that source whose style attributes include the requested style — each product carrying an image URL — and shall stream a product's stored image on request.

### Acceptance criteria

- [ ] Given approved, renderable products of a source that match the requested style, when the browse endpoint is called with that `source` and `styleId`, then those products are returned, each with an `imageUrl` (a `source=public` product's image URL resolves to the product-image endpoint; a `source=supplier` product's to its web-asset `photos[0]`). → TC-127
- [ ] Given products that are unapproved, not renderable, of a different source, of a different style, or over an optional `budgetMaxCop`, when the browse endpoint is called, then those products are excluded, and when none match, an empty product list is returned. → TC-128
- [ ] Given a `source=public` product with a stored image, when its product-image endpoint is called, then the stored image bytes are streamed with the correct content-type; given a product with no stored image or that does not exist, then `404` is returned. → TC-129

### Business rules

- The browse surface is **public data** (like `GET /styles`) and is **not** device-scoped (**ADR-028**). It reuses the `styleId → style` matching logic used by matching (FR-014) — do not duplicate it — and the existing product-summary shape, adding only `imageUrl`. Only approved, renderable products are returned (the FR-019 completeness / FR-018 availability gates apply as written; public products follow the ADR-027 completeness stance). Provenance and labeling for `source=public` products follow FR-063/FR-064/FR-065.

## FR-067 — Let the user select up to 3 products; reject a render request carrying more than 3

**Actor:** System · **Priority:** High · **Status:** Proposed · *(As built — FEAT-018, 2026-07-15)*
**Origin:** ADR-028 (2026-07-15); FEAT-018; ADR-026 (Klein ~2–3 reference-image limit)

> **As built — FEAT-018 (2026-07-15).** Implemented and verified on the local stack (not deployed). `POST /api/v1/renders` accepts an optional `productIds` selection; a selection of more than 3 is rejected server-side with `400 too_many_products` and no render is created, and a selection of ≤3 is accepted with the worker validating each id and silently dropping any that is missing/unapproved/not-renderable/out-of-stock. The 3-item cap is enforced server-side, not client-only. See `features/FEAT-018_browse-select-furniture.md`; validated by **TC-130 / TC-131** (`08_test_plan.md`).

### Description

The system shall accept an optional user selection of product ids on a render request and, when the selection carries more than 3 products, reject the request server-side; when 3 or fewer are provided, the render worker validates each id and composites only those that reference an existing, approved, renderable product (in-stock if ready-made), silently dropping the rest. *(The render request carries no `source` field — source scoping is a browse-time UI concern only; a selection is validated per id and the ADR-027 cart-exclusion is applied per item, so a mixed-source selection is accepted with public items kept display-only.)*

### Acceptance criteria

- [ ] Given a render request whose `productIds` contains more than 3 entries, when it is submitted, then it is rejected server-side with a `400 too_many_products` status and no render is created. → TC-130
- [ ] Given a render request whose `productIds` (3 or fewer) include a product that does not exist, is not approved, is not renderable, or is an out-of-stock ready-made item, when it is submitted, then the render is still created (no 400) and the worker's selection validation silently drops the invalid id(s), compositing only the valid selected products. → TC-131

### Business rules

- The **3-item cap is the hard product rule** (owner decision, **ADR-028**) and is enforced **server-side** — a client-only limit is insufficient. The cap matches the FLUX.2 Klein engine's ~2–3 reference-image limit (**ADR-026**). Every selected id must be a real, approved, renderable SKU (the FR-016 real-SKU-only invariant holds); a `source=public` selection is permitted for rendering but stays display-only (FR-064).

## FR-068 — Render exactly the user's selected products

**Actor:** System · **Priority:** High · **Status:** Proposed · *(As built — FEAT-018, 2026-07-15)*
**Origin:** ADR-028 (2026-07-15); FEAT-018; scopes FR-014/FR-015 (auto-match now optional)

> **As built — FEAT-018 (2026-07-15).** Implemented and verified on the local stack (not deployed). When a render request carries a valid `productIds` selection the composite is built from exactly those validated products and auto-match (FR-014) is not run; when no selection is provided, auto-match (FR-014/FR-015) runs as the optional fallback (backward compatible — ADR-028). The cart auto-populates from the render's items with `source=public` items excluded (FR-064): a Local selection populates the cart, a Brand selection yields an empty cart. See `features/FEAT-018_browse-select-furniture.md`; validated by **TC-132 / TC-133** (`08_test_plan.md`).

### Description

The system shall, when a render request carries a valid user selection (`productIds`), composite **exactly** those validated products into the room photo instead of running auto-match; and when no selection is provided, shall fall back to auto-match (FR-014/FR-015).

### Acceptance criteria

- [ ] Given a render request with a valid `productIds` selection, when the render is generated, then the composite contains exactly the selected products (validated) and auto-match (FR-014) is not run. → TC-132
- [ ] Given a render request with no `productIds`, when the render is generated, then auto-match (FR-014/FR-015) runs as the fallback and the behavior is unchanged (backward compatible). → TC-133

### Business rules

- User-curated selection is the default flow (**ADR-028**); auto-match (FR-014/FR-015) is the **optional fallback** used only when no selection is provided. The fabrication guard is unchanged — only real, matched SKUs may be composited (FR-016). The cart is auto-populated from the render's items (FR-031) with `source=public` items excluded (FR-064): a Local (`source=supplier`) selection populates the cart, a Brand (`source=public`) selection yields an empty cart by design.

## FR-069 — Iterate: re-render on the same project with a different selection, keeping the photo, source, and style

**Actor:** System · **Priority:** Medium · **Status:** Proposed · *(As built — FEAT-018, 2026-07-15)*
**Origin:** ADR-028 (2026-07-15); FEAT-018

> **As built — FEAT-018 (2026-07-15).** Implemented and verified on the local stack (not deployed). "Try other furniture" returns the user to `/select` keeping the same room photo, source, and style and clearing only the selection; picking a new set (≤3) and re-rendering issues an ordinary render request (FR-068) on the same project and produces a new render of the new selection. See `features/FEAT-018_browse-select-furniture.md`; validated by **TC-134** (`08_test_plan.md`).

### Description

The system shall allow a user who is not satisfied with a render to select a different set of products and re-render on the same project, reusing the same room photo, source, and style, and producing a new render of the new selection.

### Acceptance criteria

- [ ] Given a completed render on a project, when the user selects a different set of products (≤3) and re-renders, then a new render compositing the new selection is produced for the same project, reusing the same photo, source, and style. → TC-134

### Business rules

- Iteration ("try other furniture") keeps the room photo, source, and style and clears only the product selection (**ADR-028**). Each re-render is an ordinary render request (FR-068) on the same project; the ≤3 cap (FR-067) and the real-SKU-only invariant (FR-016) apply to every iteration.
