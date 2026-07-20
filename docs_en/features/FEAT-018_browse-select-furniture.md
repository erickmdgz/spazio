# FEAT-018 - Browse & select furniture (user-curated render)

> **Status legend:** **VERIFIED** = stated in the PRD v0.7 or a prior accepted decision; **DRAFT / PROPOSED** = author's structuring, not yet implemented; **TBD / PENDING** = reserved for a human decision. This feature is governed by **ADR-028** (2026-07-15), which inverts the PRD §8 auto-furnish flow into a user-curated selection. **As built (2026-07-15):** this flow is implemented and **verified on a local stack (not deployed)** — the SOURCE toggle, the `/select` browse-and-pick surface (≤3, enforced server-side with `400 too_many_products`), render-exactly-the-selection (FR-068), and the "try other furniture" iterate loop (FR-069) all run against the backend (`GET /catalog`, `GET /catalog/products/:id/image`, `POST /renders` with `productIds`); the auto-match path is preserved as the selection-less fallback. Since **BUG-005 (2026-07-16)** the requested selection is also **snapshotted on `RenderRequest.requestedProductIds`** at request creation (additive migration), so a failed render keeps the attempted products — the queue payload alone is volatile (see `07_data_model.md`). §8 below is retained as the original **proposed** design and reads in future tense; the built reality is as summarized here (and in the per-FR "As built" notes on FR-066–FR-069 in `03_requirements.md`).

## 1. Summary

Invert the furnishing flow: instead of the AI auto-selecting furniture and rendering a whole room, the user **browses the real catalog, picks up to 3 real products, and renders exactly those** into their room photo. The approved flow is:

> upload photo → choose **SOURCE** (Local suppliers | Brand suppliers) → choose **STYLE** → **browse & select up to 3 products** → **render** the selection → "like it?" → **(no)** back to browse (same photo/source/style, different pick, re-render) → **(yes)** cart → checkout.

The **3-item cap** is the hard product rule (owner decision), enforced server-side; it matches the FLUX.2 Klein engine's ~2–3 reference-image limit (**ADR-026**). Product provenance is unchanged from **ADR-027**: **"Local suppliers" = `source=supplier`** (purchasable, real cart) and **"Brand suppliers" = `source=public`** (display-only, "not sold by Spazio" + "View at retailer" link, empty cart by design).

## 2. Problem or need

The founding loop (PRD §8, FR-014/FR-015) auto-furnishes: the AI decides which SKUs to render, giving the user no control over the individual pieces, and it can select more items than the Klein engine composites well (ADR-026). Letting the user browse the real catalog and pick the pieces they want makes the "every item is a real SKU you can buy" promise tangible and matches the engine's real capability (ADR-028).

## 3. Affected user

- **Beneficiary: Homeowner/renter (demo user)** — chooses a source and style, browses real products, selects up to 3, renders them into their room, and iterates until satisfied before adding the purchasable (supplier) items to the cart.
- **Actor: System** — serves the public catalog browse + product-image endpoints, validates the ≤3 selection, and composites exactly the selected products.
- **Auto-match path: preserved** — a render request with no user selection still auto-matches (FR-014/FR-015 as an optional fallback, ADR-028).

## 4. Related requirements

Functional (new — defined in `docs_en/03_requirements.md`):

- **FR-066** — Browse the catalog by source and style (approved, renderable products; optional budget filter; each with an image URL) *(ADR-028)*
- **FR-067** — Select up to 3 products; a render request with more than 3 is rejected server-side *(ADR-028)*
- **FR-068** — Render exactly the user's selected products (composite the validated `productIds`, not auto-match) *(ADR-028)*
- **FR-069** — Iterate: re-render on the same project with a different selection, keeping the photo, source, and style *(ADR-028)*

Scoped (governed by ADR-028):

- **FR-014 / FR-015** — auto-match + composite are now **optional (ADR-028)**: used only when a render request carries no user selection. Not deleted.

Preserved (governed by ADR-027):

- **FR-063 / FR-064 / FR-065** — provenance, display-only public products, and attribution: a Brand (`source=public`) selection is display-only and excluded from cart/checkout; a Local (`source=supplier`) selection populates the cart.
- **FR-031** — cart auto-populate from the render's items, with `source=public` excluded.

Related decisions:

- **ADR-028** — this feature's governing decision (flow inversion + 3-item cap).
- **ADR-026** — render engine; the 3-item cap matches its ~2–3 reference-image limit.
- **ADR-027** — dual-track catalog provenance (supplier vs. public) and the cart/label rules reused here.

## 5. Expected flow

1. The user uploads a room photo (FEAT-002).
2. The user chooses a **SOURCE** — Local suppliers (`source=supplier`) or Brand suppliers (`source=public`) — and a **STYLE** (FEAT-003).
3. The system returns the approved, renderable products of that source and style (optionally price-filtered), each with an image URL (**FR-066**). Brand/public products show a "not sold by Spazio" chip, a "View at retailer" outbound link, and CC BY 4.0 attribution (FR-064/FR-065).
4. The user **selects up to 3** products (a clear selected state + `N/3` counter; further selection disabled at 3, deselect allowed). A budget meter tracks the running total for Local-supplier selections (**FR-067**).
5. The user renders the selection (**FR-068**): the render worker composites **exactly** those validated products into the room photo (not auto-match), and serves the render back (FEAT-002 `GET /renders/:id/image`).
6. On "like it?": **(no) "Try other furniture"** returns to the browse surface with the same photo/source/style and a cleared selection to pick a different set and re-render (**FR-069**); **(yes)** for a **Local** selection, "Love it → Cart" proceeds to the cart; for a **Brand** (public) render there is no cart CTA — the yes-path is the per-product **"View at retailer"** links on the render page (the cart stays empty by design, FR-064).
7. The cart is populated from the render's items: `source=supplier` items populate it; `source=public` items are excluded (display-only) — a Brand selection yields an empty cart by design (**FR-064**, FR-031).

## 6. Acceptance criteria

Acceptance criteria **are defined in the corresponding functional requirement (FR)**, not here (see `docs_en/03_requirements.md`). This FEAT only references them:

- FR-066 → criteria in `docs_en/03_requirements.md`
- FR-067 → criteria in `docs_en/03_requirements.md`
- FR-068 → criteria in `docs_en/03_requirements.md`
- FR-069 → criteria in `docs_en/03_requirements.md`

If you detect a new criterion during implementation, first add it to the FR (with its `TC-`) and then continue.

## 7. Business rules

Business rules **live in the FR** (`docs_en/03_requirements.md`); they are not rewritten here. Reference:

- FR-066, FR-067, FR-068, FR-069 (browse/select/render/iterate; governed by **ADR-028**).
- FR-014 / FR-015 — **optional (ADR-028)**: auto-match runs only when no selection is provided.
- FR-063 / FR-064 / FR-065 (ADR-027) — provenance, display-only public products, cart exclusion, attribution — unchanged and reused.

## 8. Proposed technical design

*High-level only; governed by ADR-028 (2026-07-15). The API contract is authoritative in `06_api.md`.*

### Frontend (`web-demo/src`)

- **/style page** — add a **SOURCE toggle** ("Local suppliers | Brand suppliers"), persisted to the store alongside style + budget.
- **New /select page** (between style and render) — fetch `GET /catalog?source&styleId&budgetMaxCop` and render a product grid (`imageUrl`, name, `priceCop`). For brand/public items show a "not sold by Spazio" chip, a "View at retailer" link (`outboundUrl`), and attribution. Selection is capped at 3 (clear selected state + `N/3` counter; disable at 3; deselect allowed); a budget meter for Local-supplier selections; a primary "Render these (N) →" button enabled when ≥1 is selected.
- **/render page** — render the selected `productIds` (`POST /renders` with `productIds`); show the composite; add "Love it → Cart" (→ /cart) and "Try other furniture" (→ /select, keeping photo/source/style, clearing the selection). Keep the existing generating/failed states and the served-render display (`GET /renders/:id/image`, FEAT-002).
- **store.tsx / api.ts** — track `source` + `selectedProductIds`; `getCatalog(source, styleId, budgetMaxCop)`; `createRender` sends `productIds`; catalog image URLs; the iterate action resets the selection but keeps room/source/style/projectId.

### Backend (`backend/src`)

- **New client-facing catalog route** (registered in `app.ts` with the other client routes): `GET /catalog` (browse by source+style, optional budget) and `GET /catalog/products/:id/image` (stream the stored image). Reuse `services/productSummary.ts` (add an `imageUrl` per product) and the style-matching helper used by `matching.ts` (do not duplicate style logic). Public (not device-scoped).
- **renders route** — accept and validate optional `productIds` (≤3; each existing/approved/renderable/in-stock-if-ready-made). *(As built, 2026-07-15: `selectProductsByIds` in `backend/src/services/catalog.ts` does not re-check that a selected id belongs to the requested source — source membership is not a rejection gate; it validates existence + approval + completeness + stock-if-ready-made + CC BY attribution for public.)* Thread the selection to the render job. `renderWorker`: if the job carries a selection, use it as the composited products (after validation); else `matchProducts()` as now. Keep the fabrication guard (only real matched SKUs) and the FR-031 cart auto-populate (public excluded).

### Database

- **No schema change** *(as originally delivered)*. `source`, attribution, and styles already exist (ADR-027, `07_data_model.md`). This feature added no tables or fields at delivery; BUG-005 (2026-07-16) later added `RenderRequest.requestedProductIds` to persist this feature's selection (see the header as-built note).

### Security / scope

- The new `GET /catalog` and `GET /catalog/products/:id/image` are **public** (catalog is public data, like `GET /styles`) — intentionally **not** device-scoped.
- NFR-007 device scoping on the project/render routes is **unchanged**.
- The 3-item cap is enforced **server-side** (a client-only limit is insufficient); a request with more than 3 `productIds` is rejected (FR-067).
- ADR-027 preserved: `source=public` products are never carted/checked-out/commissioned; the real-SKU-only invariant (FR-016) holds.

## 9. Required tests

Test cases live in `docs_en/08_test_plan.md`, where **each `TC-` maps 1:1 to an acceptance criterion of an FR**. The rows for this feature are **TC-127..TC-135** (Status: Pending); the authoritative definitions and requirement mapping are in `08_test_plan.md`:

| ID | Test | Type |
|---|---|---|
| TC-127 | Browse returns the approved, renderable products of the requested source+style, each with an `imageUrl` (FR-066) | Functional |
| TC-128 | Browse filters out unapproved/over-budget products and returns an empty list when none match (FR-066) | Functional / Validation |
| TC-129 | `GET /catalog/products/:id/image` streams a public product's stored image; 404 when there is no stored image or the product does not exist (FR-066) | Functional |
| TC-130 | A render request with more than 3 `productIds` is rejected with `400 too_many_products` (FR-067) | Validation / Security |
| TC-131 | A render request whose `productIds` include a non-existent/unapproved/out-of-stock product is accepted (no 400); the worker silently drops the invalid id(s) and composites only the valid selected products (FR-067) | Validation |
| TC-132 | A render request with valid `productIds` composites exactly those products, not auto-match (FR-068) | Functional |
| TC-133 | A render request with no `productIds` falls back to auto-match (FR-014/FR-015), backward compatible (FR-068) | Functional |
| TC-134 | A second render on the same project with a different selection re-renders the new pick, keeping the photo/source/style (FR-069) | Functional |
| TC-135 | A Brand (`source=public`) selection is display-only and yields an empty cart; a Local (`source=supplier`) selection populates the cart (guard — FR-064/FR-031) | Functional / Security |

## 10. Documentation impact

- [x] Update requirements (FR-066..069; mark FR-014/FR-015 auto-match "optional (ADR-028)").
- [x] Update architecture (browse/catalog surface; user-curated selection flow).
- [x] Update API spec (`GET /catalog`, `GET /catalog/products/:id/image`, `POST /renders` `productIds`).
- [x] Update product vision (user-curated selection flow).
- [x] Update the class-demo scope (the new browse-and-pick demo flow).
- [x] Update the backlog and release notes.
- [ ] Not applicable.

Related decision: **ADR-028**. (GitHub Issue: to be linked when opened.)

## 11. Checklist before implementing

- [x] The feature has a clear objective.
- [x] It is linked to requirements (FR-066..069; FR-014/FR-015 scoped; ADR-028).
- [x] It has acceptance criteria. *(FR-066..069 in `03_requirements.md`)*
- [ ] It has defined tests. *(TC-127..135 defined in `08_test_plan.md`, Status Pending)*
- [x] The technical impact is understood.
- [x] The user impact is understood.

## 12. Checklist before closing

- [ ] Code implemented.
- [ ] Tests executed.
- [ ] Acceptance criteria met.
- [ ] Pull request reviewed.
- [ ] Documentation updated.
- [ ] Release notes updated.

---

## As-built note (2026-07-15) — BUG-003: reliable render page + wizard persistence

Two web-app defects in this flow were fixed under **BUG-003** (see
`10_release_notes.md` and TC-138..TC-140 in `08_test_plan.md`):

- **Strict-safe render kickoff.** The `/render` submit effect previously
  deadlocked under React Strict Mode's dev remount (the page spun on the
  spinner forever while the backend render completed unseen). The kickoff
  promise now lives in a ref, starts at most once per photo+style+selection
  key, and every effect run re-attaches to it; a 60 s backstop also covers the
  `loading` (enqueue) phase.
- **sessionStorage wizard persistence + resume.** The wizard slices
  (`projectId`, room dims, style, source, selection, `renderId`, `renderKey`)
  survive a reload; page guards wait for rehydration before redirecting. A
  reload on `/render` resumes polling the already-submitted render (matched by
  `renderKey` = room:style:selection — no duplicate job). "Try other furniture"
  (FR-069) and the failed-render path call `resetRender()` so the next render of
  even an identical selection is a **fresh** job, never a resume of a dead one.
  The photo `File` is never persisted (its bytes are already on the backend,
  FR-005), nor is server-derived data (render items/cart — refetched by id).

Web-only change: no backend, API, schema, or dependency change.
