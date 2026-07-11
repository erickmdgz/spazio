# FEAT-007 - Product tagging & interaction

> **Status legend:** **VERIFIED** = stated in the PRD v0.7 or the one-week iOS pilot; **DRAFT / PROPOSED** = author's structuring, not confirmed; **TBD / PENDING** = reserved for a human decision (PRD §12), tracked as an ADR. Nothing here is implemented; this is a specification.

## 1. Summary

Turn the approved render into a **shoppable image**: every product shown is **tagged** with its real details, and the user can **tap a tag to see that product's details**. This is the bridge between "seeing" and "buying" — it links each pixel of furniture back to a real, purchasable SKU.

- **Pilot scope (VERIFIED):** *"Tappable product tags on the render"* (pilot "Included" list). Implemented as FR-028 (tagging) and FR-029 (tap to view details).

## 2. Problem or need

The product's whole value is connecting **inspiration directly to purchase** (PRD §1). For that to work the user must be able to see **which real products** are in the render and their key facts — **name, price, supplier, warranty, and listing link** — and act on them. **Delivery time and warranty strongly influence purchase decisions**, and **price, delivery, and warranty must be visible before checkout** (PRD §5; NFR-015). Tagging also makes the render auditable against the real-SKU guarantee (FR-016).

## 3. Affected user

- **Actor (tagging): System** — attaches tag data to each rendered product (FR-028).
- **Actor (interaction): Homeowner/renter** — taps a tag to view a product's details (FR-029).

## 4. Related requirements

Functional:

- FR-028 — Tag every rendered product with name, price, supplier, warranty, and listing link *(pilot)*
- FR-029 — View a tagged product's details by tapping it in the render *(pilot)*

Non-functional:

- NFR-015 — Price, delivery, and warranty are visible before checkout
- NFR-014 — Visibly distinguish purchased catalog items from existing kept items *(the "kept items" distinction depends on keep-or-replace, FEAT-012, which is out of pilot scope; in the pilot every shown item is a purchasable catalog item)*

## 5. Expected flow

This feature covers PRD §8 step 10 and the tap-to-view interaction (FR-07b):

1. (PRD §8 step 10, after the render is approved in FEAT-006) The system **tags the products shown** in the render with name, price, supplier, warranty, and listing link (FR-028).
2. The tagged, shoppable render is presented to the user.
3. The user **taps a tag** to view that product's details (FR-029 / PRD FR-07b).
4. From the tagged render the flow continues to the auto-populated cart (PRD §8 step 11, FEAT-008); adding/removing individual tagged products (FR-030 add, FR-033 remove) is handled in FEAT-008.

## 6. Acceptance criteria

Acceptance criteria **are defined in the corresponding functional requirement (FR)**, not here (see `docs_en/03_requirements.md`). This FEAT only references them:

- FR-028 → criteria in `docs_en/03_requirements.md`
- FR-029 → criteria in `docs_en/03_requirements.md`

If you detect a new criterion during implementation, first add it to the FR (with its `TC-`) and then continue.

## 7. Business rules

Business rules **live in the FR** (`docs_en/03_requirements.md`); they are not rewritten here. Reference:

- FR-028 (PRD FR-07: each tag must carry name, price, supplier, warranty, and listing link. Warranty and delivery/price transparency requirements: PRD BR-17, BR-18 are surfaced in FEAT-009; price/delivery/warranty visible before checkout — NFR-015)
- FR-029 (PRD FR-07b: tap a tagged product to view details; add/remove actions are specified with FEAT-008)
- Underlying guarantee that makes tags meaningful: PRD BR-6/BR-14 (every tagged item is a real, purchasable SKU — enforced in FEAT-005/FR-016)

## 8. Proposed technical design

*High-level only. The technology stack was decided for the pilot (a human decision, PRD §12) — see ADR-001 (native iOS + one managed backend + managed Postgres + object storage; single environment/region; no multi-platform); product/tool specifics are left to implementation.*

### Frontend

- On iOS (pilot, VERIFIED): an **interactive render view** with tappable tag hotspots overlaid on each shown product; tapping opens a **product detail** view showing name, price, supplier, warranty, and listing link (FR-028/FR-029). Broader stack **decided for the pilot — see ADR-001 (native iOS + one managed backend + managed Postgres + object storage; single environment/region; no multi-platform)**.
- Prices shown in the user's local currency (pilot: **COP**, VERIFIED; general rule FR-046 in FEAT-004).

### Backend

- Serve **tag data** for an approved render: for each shown product, its position/anchor plus name, price, supplier, warranty, and listing link. Tag data derives from the `RenderItem` link produced during rendering (FEAT-005) joined with `Product`/`Supplier` catalog data (FEAT-015).
- Detail lookups return current catalog data for the tapped product.

### Database

- Entities involved (canonical registry; fields **DRAFT / PROPOSED** until modeled in `07_data_model.md`):
  - `RenderItem` — links a `Render` to a shown `Product`, carrying tag data (position, name, price, supplier, warranty, listing link).
  - `Product` / `Supplier` — source of the displayed attributes.
- Field-level schema is **TBD**.

### Security

- Tag data is served only for renders the user is authorized to view (renders are private by default — NFR-007).
- Displayed product data is read-only to the user.

## 9. Required tests

Test cases live in `08_test_plan.md`, where **each `TC-` maps 1:1 to an acceptance criterion of an FR** (see `03_requirements.md`). The `TC-` IDs for this feature **already exist** in `08_test_plan.md` (status `Pending` — written, not yet executed; nothing here is implemented):

- **TC-054** (FR-028, pilot) — generate tags for an approved render: each rendered product carries name, price, supplier, warranty terms, and a listing link.
- **TC-055** (FR-029, pilot) — tap a product tag on an approved render: the product's details (name, price, supplier, warranty, listing link) are displayed. Covers the happy path plus a tag with missing/omitted optional data.

> **Note — TC-054 warranty vs. pilot scope (FR-028 tension):** FR-028 is **pilot-included**, but its acceptance criterion (TC-054) lists **warranty** among the tag fields, while **warranty display is out of the pilot** (it is FR-038, surfaced in FEAT-009). To reconcile without rewriting the FR: the **pilot tag subset** carries **name, price, supplier, and listing link**; the **full-product tag** additionally carries **warranty**. Accordingly, the warranty portion of TC-054 is validated **only once FR-038 ships**; the remaining fields of TC-054 (name, price, supplier, listing link) are validated within the pilot. This is a clarifying note only — the FR and its acceptance criterion live in `03_requirements.md` and are not changed here.

Cross-cutting checks referenced by this feature (not FEAT-007-specific `TC-` rows): price/delivery/warranty visible before checkout (NFR-015); tag data served only to authorized viewers (NFR-007).

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
