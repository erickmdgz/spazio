# FEAT-005 - AI rendering engine

> **Status legend:** **VERIFIED** = stated in the PRD v0.7 or the one-week iOS pilot; **DRAFT / PROPOSED** = author's structuring, not confirmed; **TBD / PENDING** = reserved for a human decision (PRD §12), tracked as an ADR. Nothing here is implemented; this is a specification.

## 1. Summary

The core engine that turns the user's inputs into a **photorealistic render of their own room furnished only with real, purchasable products**. It matches real, available catalog SKUs to the user's **style, dimensions, budget, and locality**, then composites those SKUs into the room photo at a believable scale.

This is **the one core thing** the pilot must prove (pilot, "The one core thing"): *"Show Valentina a photorealistic image of her own room furnished only with real furniture she can buy right now."* The **central innovation is that the AI does not invent furniture** — every rendered item must correspond to a real SKU already in the marketplace (PRD §1, BR-6, BR-14).

- **Pilot scope (VERIFIED):** matching (FR-014), render generation (FR-015), the real-SKU-only constraint (FR-016), dimension-based scaling (FR-017), rendering only currently available products (FR-018), and keeping total cost within budget plus the agreed tolerance (FR-021 — the tolerance *value* was a human decision, now **decided (pilot): 10%**, see ADR-008).

> **As built — real render now served + displayed (FEAT-002, 2026-07-15).** The render *output* is now delivered to the client. A new **device-scoped** `GET /api/v1/renders/:id/image` streams the stored render (`Render.imageKey`) from object storage with an image content-type (`image/png`, `Cache-Control: private`); once `GET /renders/:id` reports `completed`, the web app fetches this route with `x-device-token` (an `<img>` tag cannot send headers) and displays the **real backend render** (`MfluxRenderPipeline`, ADR-026) instead of a cached preset visual (FR-015). A foreign/unknown device → 404, and a render with no `imageKey` yet (still generating/failed) → 404 so the client keeps polling — no other device's render is leaked (NFR-007). The upstream half of this branch (real photo bytes reaching the engine via `POST /projects/:id/photos`) is in FEAT-002. Contract in `06_api.md` (§5); tests **TC-122 / TC-123 / TC-124** (`08_test_plan.md`). No new ADR — this implements FR-015 with no new decision.
- **Full-product scope (VERIFIED, PRD, out of pilot):** exclude incomplete catalog entries (FR-019), budget-unmet disclosure and alternatives (FR-022), and no-match handling (FR-023).

## 2. Problem or need

Users cannot visualize real furniture in their space before buying, and local suppliers are nearly invisible online (PRD §2; pilot, "The problem"). The engine closes that gap by connecting inspiration directly to purchase. The PRD identifies **render fidelity** — compositing a real SKU into the user's room at the correct size and appearance — as the **highest risk** (PRD §10); a poor match increases returns and disputes. The engine must therefore be constrained to real, available inventory and correct scale, and its **cost per render** and **render-to-purchase** conversion must be tracked from day one (PRD §7).

## 3. Affected user

- **Actor: System** — the AI pipeline performs matching and rendering (PRD §12, "AI role").
- **Beneficiary: Homeowner/renter** — receives the render, published immediately on generation success (ADR-025; the former operator-review step, FEAT-006, is retired).
- **Operator** — monitors render quality (PRD §5). *The per-render review before the user (FEAT-006/FR-027) is superseded by ADR-025 (2026-07-14) — retired.*

## 4. Related requirements

Functional:

- FR-014 — Match real, available catalog SKUs to style, dimensions, budget, and locality *(pilot)*
- FR-015 — Generate a photorealistic render compositing matched SKUs into the room photo *(pilot)*
- FR-016 — Restrict every rendered item to a real, purchasable SKU and never fabricate products *(pilot)*
- FR-017 — Use approximate room dimensions to scale rendered products realistically *(pilot)*
- FR-018 — Restrict rendering to currently available products *(pilot)*
- FR-021 — Keep total rendered product cost within budget plus the agreed tolerance *(pilot; tolerance value adopted for the pilot: 10% — see ADR-008)*
- FR-019 — Exclude catalog entries with incomplete required data from rendering eligibility *(full product, out of pilot)*
- FR-022 — On unmet budget, disclose it and offer the closest available alternative *(full product, out of pilot)*
- FR-023 — On no strong match, suggest similar available products or mark the item unavailable *(full product, out of pilot)*

Non-functional:

- NFR-001 — Single-room render completes within the target time *(PRD target ~2–5 min soft target adopted for the pilot; no hard SLA — see ADR-013)*
- NFR-002 — Targeted edits complete faster than full renders *(edits are FEAT-014, out of pilot)*
- NFR-003 — Enforce a global inference-cost threshold
- NFR-004 — Degrade gracefully via queueing or slower rendering when cost thresholds are exceeded
- NFR-005 — Track cost per render
- NFR-006 — Track render-to-purchase conversion from day one
- NFR-007 — Keep user photos and generated renders private by default

## 5. Expected flow

This feature covers the matching-and-render portion of the PRD §8 basic flow (its output then feeds tagging and cart; renders are published immediately on generation success — ADR-025):

1. Inputs are gathered by upstream features: photo + dimensions (FEAT-002), style + budget (FEAT-003), and locality (FEAT-004).
2. (Internal) The engine **matches** real, available catalog SKUs to style, dimensions, budget, and locality (FR-014), restricting candidates to **real, purchasable SKUs** (FR-016) that are **currently available** (FR-018) and, in the full product, that have **complete data** (FR-019) and are **deliverable to the locality** (FR-020, handled with FEAT-004).
3. (PRD §8 step 9) The AI **generates the room render**, compositing the matched SKUs into the user's photo and **scaling them to the approximate dimensions** (FR-015, FR-017).
4. The engine keeps total cost **within budget plus the agreed tolerance** (FR-021, pilot; tolerance value **adopted for the pilot: 10%**, ADR-008). (Full product) If budget cannot be met it **discloses this and offers the closest alternative** (FR-022); where no strong match exists it **suggests similar products or marks the item unavailable** (FR-023).
5. The render is **published to the requesting user immediately on generation success** (ADR-025 — the former operator-review step, FEAT-006/FR-027, is retired) and the flow continues to product tagging (PRD §8 step 10, FEAT-007).

## 6. Acceptance criteria

Acceptance criteria **are defined in the corresponding functional requirement (FR)**, not here (see `docs_en/03_requirements.md`). This FEAT only references them:

- FR-014 → criteria in `docs_en/03_requirements.md`
- FR-015 → criteria in `docs_en/03_requirements.md`
- FR-016 → criteria in `docs_en/03_requirements.md`
- FR-017 → criteria in `docs_en/03_requirements.md`
- FR-018 → criteria in `docs_en/03_requirements.md`
- FR-019 → criteria in `docs_en/03_requirements.md`
- FR-021 → criteria in `docs_en/03_requirements.md`
- FR-022 → criteria in `docs_en/03_requirements.md`
- FR-023 → criteria in `docs_en/03_requirements.md`

If you detect a new criterion during implementation, first add it to the FR (with its `TC-`) and then continue.

## 7. Business rules

Business rules **live in the FR** (`docs_en/03_requirements.md`); they are not rewritten here. Reference:

- FR-016 (PRD BR-6, BR-14: every rendered item must correspond to a real, purchasable SKU; the system must never fabricate unavailable products)
- FR-017 (PRD BR-7: approximate dimensions must be used to scale products realistically)
- FR-018 (PRD BR-4: ready-made items must never be rendered when unavailable)
- FR-019 (PRD BR-2: incomplete catalog entries are excluded from rendering)
- FR-021 (PRD BR-9: total product cost should not exceed budget beyond an agreed tolerance — **10% adopted for the pilot (PRD BR-9 default)**, see ADR-008)
- FR-022 (PRD BR-10: on unmet budget, disclose and offer the closest available alternative)
- FR-023 (PRD BR-13: on no strong match, suggest similar available products or mark the item unavailable)

## 8. Proposed technical design

*High-level only. The rendering/AI pipeline and stack were human decisions (PRD §12), now decided: the render engine is **self-hosted FLUX.2 Klein 4B (Apache-2.0), run locally via the mflux CLI as a child process** — the model and hosting are now decided (**ADR-026**, 2026-07-14, superseding ADR-002's hosted-generative-image-API clause). No custom-trained model (Klein is pretrained open weights, so ADR-002's no-custom-model rule stands); ADR-002's mandatory-operator-QA clause was already superseded by ADR-025 (2026-07-14 — renders are published immediately on generation success). Stack: managed backend (ADR-001; client now the web app per ADR-024) with the render engine on a separate **Apple-Silicon render worker** consuming the async render-job queue (ADR-026).*

### Frontend

- A **render request** trigger and a **progress/wait** state on the iOS client while generation runs (render time target ~2–5 min soft, no hard SLA in the pilot, NFR-001 / ADR-013). Renders are published immediately on generation success (ADR-025); the former approval hold (FEAT-006) is retired.
- Display of the returned render image (private by default). Tagging overlay is FEAT-007.

### Backend

- **Matching service** (DRAFT / PROPOSED): selects candidate SKUs from the catalog constrained by style (via the shared taxonomy, ADR-005), dimensions, budget, availability, completeness, and locality. Candidate data comes from FEAT-015 (supplier catalog) and FEAT-004 (locality/delivery).
- **Rendering pipeline** (orchestration): composites matched SKUs into the user's photo at correct scale. The engine is **self-hosted FLUX.2 Klein 4B (Apache-2.0), run locally via the mflux CLI as a child process (`mflux-generate-flux2-edit --model flux2-klein-4b`, quantized) — decided, see ADR-026 (2026-07-14, superseding ADR-002's hosted-API clause; the no-custom-trained-model rule still holds, as Klein is pretrained open weights)** *(ADR-002's mandatory-operator-QA clause was superseded by ADR-025, 2026-07-14)*. Concretely a new `MfluxRenderPipeline` replaces the placeholder `FakeRenderPipeline`, which stays the default/test/CI implementation and is selected only when the mflux engine is configured; any object detection/segmentation is left to implementation. The engine runs on a separate **Apple-Silicon render worker** (mflux requires Apple MLX) consuming the async render-job queue, alongside the managed backend (ADR-001; client now the web app per ADR-024).
- **Cost & conversion instrumentation:** track **cost per render** (NFR-005) and **render-to-purchase** from day one (NFR-006); enforce a **global inference-cost threshold** (NFR-003) and **degrade gracefully** via queueing/slower rendering when exceeded (NFR-004).
- **Real-SKU guarantee:** the pipeline must be architected so rendered items are always drawn from real catalog SKUs and can be tagged back to them (FR-016 → feeds FEAT-007). Approach is **DRAFT / PROPOSED**, aligned with the decided engine (ADR-026); the real-SKU-only invariant (BR-6/BR-14/FR-016, from ADR-002) is unchanged by the engine swap — the composite is built from the matched SKU's operator-curated image and never fabricates products.

### Database

- Entities involved (canonical registry; fields **DRAFT / PROPOSED** until modeled in `07_data_model.md`):
  - `RenderRequest` — a single render request; counts as one attempt (metering is FEAT-013, out of pilot) and is tracked for cost.
  - `Render` — the generated photorealistic image, **private by default**; the render lifecycle keeps generation states only (`RenderRequest.status`: `queued` / `processing` / `completed` / `failed`; `Render.status`: `completed` / `failed` — see `07_data_model.md`). *The operator review states (pending/approved) are retired — superseded by ADR-025 (2026-07-14).*
  - `RenderItem` — the link between a `Render` and a shown `Product` (carries the data used by tagging in FEAT-007).
  - Reads from `Product`, `Style`/`StyleTaxonomy`, `Project`, `RoomPhoto`, `DeliveryZone`.
- Field-level schema is **TBD**; minimum catalog completeness that gates eligibility requires **all PRD BR-1 fields present — decided (pilot), see ADR-014**.

### Security

- **Renders and user photos are private by default** (NFR-007 / PRD BR-33).
- Access to render inputs/outputs restricted to the owning user ~~and authorized operators~~ *(the operator read grant existed for the FEAT-006 render review and is retired — ADR-025, 2026-07-14; NFR-007 owner scoping stands)*.
- Guardrail on the AI: it must **surface ambiguity and technical risk instead of silently deciding** (PRD §12, "AI role").

## 9. Required tests

Test cases live in `08_test_plan.md`, where **each `TC-` maps 1:1 to an acceptance criterion of an FR** (see `03_requirements.md`). The test cases for this feature **already exist** in `08_test_plan.md`: **TC-026–TC-037 and TC-040–TC-045** are the rows mapped to FEAT-005's FRs. (TC-038 and TC-039 fall inside that numeric range but belong to FEAT-004 / FR-020, locality.)

The `TC-` rows in `08_test_plan.md` for this feature's related FRs are:

- FR-016 (pilot) — **critical** (TC-030, TC-031): rendered items always resolve to real, purchasable SKUs; the system never fabricates a product.
- FR-018 (pilot) (TC-034, TC-035): unavailable ready-made stock is never rendered.
- FR-014 / FR-015 / FR-017 (pilot) (TC-026, TC-027 / TC-028, TC-029 / TC-032, TC-033): matching honors style/dimensions/budget/locality; render composites matched SKUs at believable scale.
- FR-019 (full product) (TC-036, TC-037): incomplete catalog entries are excluded.
- FR-021 (pilot; tolerance value 10%, adopted for the pilot — see ADR-008) (TC-040, TC-041): total product cost is kept within budget plus the agreed tolerance.
- FR-022 (full product) (TC-042, TC-043): unmet budget is disclosed with the closest available alternative.
- FR-023 (full product) (TC-044, TC-045): no-match yields similar suggestions or an unavailable mark.
- Cross-cutting NFR checks — render-time target (NFR-001), cost-per-render tracking (NFR-005), render-to-purchase tracking (NFR-006), privacy of renders (NFR-007) — do not yet have dedicated `TC-` rows in `08_test_plan.md`.

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
