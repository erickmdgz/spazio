# FEAT-017 - Public-catalog bootstrap fallback

> **Status legend:** **VERIFIED** = stated in the PRD v0.7 or a prior accepted decision; **DRAFT / PROPOSED** = author's structuring, not yet implemented; **TBD / PENDING** = reserved for a human decision. **As built (2026-07-15):** the `source=public` track (Amazon Berkeley Objects, CC BY 4.0) is implemented and **verified on a local stack (not deployed)** — public products are seeded, display-only, labeled "not sold by Spazio" with a "View at retailer" link, and surfaced as the user-selectable **Brand suppliers** source (ADR-028/FEAT-018), not only the auto-match fallback this document originally described. The no-supplier gating (supplier track queried first, public drawn only when it comes up empty — `backend/src/services/matching.ts`, TC-110/TC-111) and the CC BY 4.0 attribution propagation onto render items (`renderWorker.ts` → `RenderItem`, TC-116/TC-117) are **built and verified on the local stack** (not deployed). This feature is governed by **ADR-027** (2026-07-15).

## 1. Summary

A clearly-labeled, temporary **public-catalog bootstrap fallback**: when there is **no supplier catalog**, Spazio presents products sourced from the **Amazon Berkeley Objects (ABO)** public dataset (CC BY 4.0) so the app has real products — with real dimensions, materials, and images — to match, render, and display for the demo.

These public products carry a distinct **`source=public`** provenance and are **display-only**: they are shown with a labeled **"View at retailer" outbound link**, marked **"not sold by Spazio"**, and are **never** added to cart, checkout, orders, commission, merchant-of-record, or the render-to-purchase metric. This is a **quarantined, additive** track that runs **alongside** the fully-built local-supplier marketplace; it does not replace or weaken it (ADR-027).

## 2. Problem or need

Spazio has **no onboarded suppliers yet** (supplier self-service ingestion is not built — ADR-006), so there are zero real supplier SKUs to match, render, or display. The web app (ADR-024) needs real products to demonstrate the matching → render → display loop credibly for the class demo (ADR-023), and fabricating placeholder furniture would produce unrealistic renders (the PRD §10 highest risk) and violate the spirit of BR-14. The fallback closes the cold-start gap (PRD §10) with real, legally-sourced product data **without** scraping retailers and **without** eroding the founding purchasable-SKU guarantee for the supplier track.

## 3. Affected user

- **Actor: System / operator** — imports and seeds the `source=public` subset; the render/match pipeline consumes it when no supplier catalog is available.
- **Beneficiary: Homeowner/renter (demo user)** — sees real products in matches and renders during the bootstrap period, with a clear "not sold by Spazio" label and a "View at retailer" outbound link for public items.
- **Supplier track: unaffected** — local-supplier products keep full in-app checkout, commission, and MoR (BR-6, BR-14, FR-016).

## 4. Related requirements

Functional (new — defined in `docs_en/03_requirements.md`):

- **FR-062** — Present public-dataset (ABO) products as a fallback when no supplier catalog is available *(bootstrap/demo)*
- **FR-063** — Tag every product with its source and distinguish public products ("not sold by Spazio") across matching, render tags, and cart
- **FR-064** — Keep public products display-only with a labeled "View at retailer" outbound link *(not a monetized affiliate program)*; exclude them from cart/checkout/orders/commission/MoR
- **FR-065** — Record and display required CC BY 4.0 attribution for public products, and propagate image provenance/attribution into any render that composites a public product image *(derivative work)*

Non-functional (new):

- **NFR-019** — Legal/compliance: CC BY 4.0 attribution is required for public products and their derived renders; external egress (public-dataset import + outbound retailer links) is controlled and recorded.

Scoped deviation (governed by ADR-027):

- **FR-016 / BR-6 / BR-14** — the real-purchasable-SKU-only invariant is **qualified, not deleted**: it governs the **supplier track**; `source=public` products are the explicit, labeled, non-purchasable exception.

Related decisions:

- **ADR-027** — this feature's governing decision (public-catalog bootstrap fallback).
- **ADR-026** — render engine; a render compositing a public image is a derivative work carrying attribution (FR-065, NFR-019).
- **ADR-004 / ADR-006 / ADR-007 / ADR-014** — scoped by ADR-027 (MoR, ingestion channel, commission, completeness).

## 5. Expected flow

1. A user runs the matching/render loop (FEAT-005). The system checks for an available **supplier catalog**.
2. **If a supplier catalog exists**, the loop proceeds unchanged on supplier SKUs (in-app checkout, commission, MoR — no change).
3. **If no supplier catalog is available**, the system draws candidates from the seeded **`source=public`** ABO subset (FR-062), matching on style/dimensions/budget as usual and compositing the real ABO product image into the room photo (ADR-026).
4. Public products render and display **labeled "not sold by Spazio"** with required **CC BY 4.0 attribution** shown (FR-063, FR-065); the stored render carries the propagated image provenance/attribution (FR-065, NFR-019).
5. For a public product the user sees a **"View at retailer" outbound link** (FR-064). Public products are **not** addable to cart/checkout and are **excluded** from orders, commission, MoR, and the render-to-purchase metric (FR-064; NFR-006 segmented).

## 6. Acceptance criteria

Acceptance criteria **are defined in the corresponding functional requirement (FR)**, not here (see `docs_en/03_requirements.md`). This FEAT only references them:

- FR-062 → criteria in `docs_en/03_requirements.md`
- FR-063 → criteria in `docs_en/03_requirements.md`
- FR-064 → criteria in `docs_en/03_requirements.md`
- FR-065 → criteria in `docs_en/03_requirements.md`

If you detect a new criterion during implementation, first add it to the FR (with its `TC-`) and then continue.

## 7. Business rules

Business rules **live in the FR** (`docs_en/03_requirements.md`); they are not rewritten here. Reference:

- FR-062, FR-063, FR-064, FR-065 (public-catalog fallback behavior; governed by **ADR-027**).
- FR-016 (BR-6, BR-14) — **qualified** by ADR-027: the purchasable-SKU-only invariant governs the supplier track; `source=public` products are the labeled, non-purchasable exception.

## 8. Proposed technical design

*High-level only; governed by ADR-027 (2026-07-15). Sourcing, licensing, and the display-only / quarantine posture are decided by that ADR.*

### Frontend

- Product cards/detail for `source=public` items show a **"not sold by Spazio"** label, the required **attribution** (source name/link, image license), and a **"View at retailer" outbound link** instead of an add-to-cart affordance (FR-063, FR-064, FR-065).
- Renders that include public products display the propagated attribution (FR-065).

### Backend

- A **public-catalog / bootstrap ingestion adapter**, distinct from supplier ingestion (ADR-006 carve-out), imports the ABO subset and stores `source=public` products with attribution fields (data-model spec in `07_data_model.md`).
- Match/render selection falls back to `source=public` candidates only when no supplier catalog is available (FR-062).
- Cart/checkout/order/commission/MoR paths **exclude** `source=public` products (FR-064); the render-to-purchase metric (NFR-006) is **segmented** to exclude non-purchasable public renders.
- Image provenance/attribution propagates from the source into the stored render (FR-065, NFR-019, ADR-026).

### Database

- `Product` gains a `source` enum (`supplier` | `public`); `supplier_id` becomes conditional (present for `supplier`, absent for `public`); attribution fields added: `source_name`, `source_url`, `source_image_url`, `image_license`. **As built** — implemented in `backend/prisma/schema.prisma` + migration `20260715175858_feat_017_public_catalog_fallback` (verified locally, not deployed); modeled in `docs_en/07_data_model.md`.

### Security / compliance

- CC BY 4.0 **attribution is required** and recorded for every public product and derived render (NFR-019).
- External egress (public-dataset import + outbound retailer links) is controlled and recorded (NFR-019).
- No public product may enter cart/checkout/commission/MoR (FR-064).

## 9. Required tests

Test cases live in `docs_en/08_test_plan.md`, where **each `TC-` maps 1:1 to an acceptance criterion of an FR/NFR**. The rows for this feature are **TC-110..TC-119**, all **automated** (`backend/test/public-catalog.test.ts`, PR #45); the authoritative definitions and requirement mapping are in `08_test_plan.md`:

| ID | Test | Type |
|---|---|---|
| TC-110 | With no supplier catalog, the system draws `source=public` ABO candidates and produces a match/render (FR-062) | Functional |
| TC-111 | With a supplier catalog available, the public fallback stays inactive and the supplier track is unchanged (FR-062) | Functional |
| TC-112 | A public product carries `source=public`, is labeled "not sold by Spazio", and is distinguishable from a supplier SKU in every context (FR-063) | Functional |
| TC-113 | A public product is excluded from cart, checkout, orders, commission, and merchant-of-record (FR-064) | Functional / Security |
| TC-114 | A public product shows a labeled "View at retailer" outbound link and no add-to-cart affordance (FR-064) | Functional |
| TC-115 | An attempt to add a `source=public` product to cart/checkout is refused with a display-only status (FR-064) | Functional / Security |
| TC-116 | The required CC BY 4.0 attribution is recorded and surfaced on the public product (FR-065) | Validation / Compliance |
| TC-117 | Attribution is propagated into a render compositing a public image (a derivative work) (FR-065) | Validation / Compliance |
| TC-118 | A public product missing required attribution is excluded/blocked and neither displayed nor composited (FR-065) | Validation / Compliance |
| TC-119 | The render-to-purchase metric and commission exclude non-purchasable public renders (NFR-006 segmented / NFR-019) | Functional |

## 10. Documentation impact

- [x] Update requirements (FR-062..065; qualify FR-016; carve-out FR-018 if applicable).
- [x] Update architecture (public-catalog/bootstrap ingestion adapter; external egress; image provenance).
- [x] Update API spec (source/attribution/includeFallback flags; display-only cart exclusion).
- [x] Update data model (Product provenance spec).
- [x] Update non-functional requirements (NFR-019; NFR-006 segmentation).
- [x] Update AI usage (compositing attributed third-party images).
- [ ] Not applicable.

Related decision: **ADR-027**. GitHub Issue: **#43**.

## 11. Checklist before implementing

- [x] The feature has a clear objective.
- [x] It is linked to requirements (FR-062..065, NFR-019, ADR-027).
- [x] It has acceptance criteria. *(FR-062..065 in `03_requirements.md`)*
- [x] It has defined tests. *(TC-110..119 defined in `08_test_plan.md` and automated in `backend/test/public-catalog.test.ts`, PR #45.)*
- [x] The technical impact is understood.
- [x] The user impact is understood.

## 12. Checklist before closing

- [x] Code implemented. *(PR #45, merged 2026-07-15.)*
- [x] Tests executed. *(TC-110..119 automated — `backend/test/public-catalog.test.ts`.)*
- [x] Acceptance criteria met. *(Verified live: supplier-empty → ABO fallback → composite; public absent from cart.)*
- [x] Pull request reviewed. *(Merged by the owner.)*
- [x] Documentation updated. *(PRs #44/#50/#51.)*
- [x] Release notes updated. *(`10_release_notes.md` [Unreleased].)*
