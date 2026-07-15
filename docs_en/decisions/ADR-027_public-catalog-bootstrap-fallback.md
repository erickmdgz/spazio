# ADR-027 - Public-catalog bootstrap fallback (Amazon Berkeley Objects, CC BY 4.0)

## Status

Accepted (product owner, 2026-07-15).

Scope: catalog sourcing from 2026-07-15 onward, for a **bootstrap/demo period while Spazio has no onboarded suppliers**. This ADR introduces a second, clearly-labeled **`source=public`** product track that lives **outside** the founding real-purchasable-SKU guarantee. It **scopes (does not delete)** clauses of several prior decisions — it **qualifies** FR-016 and the CLAUDE.md §1 / vision thesis with a narrow, dated caveat (same dated-marker precedent as ADR-024/025/026), and it carves out clauses of ADR-004, ADR-006, ADR-007, and ADR-014 as noted below. The **supplier track** (BR-6, BR-14, FR-016, in-app checkout, commission, MoR) is **unchanged and fully preserved**. Image provenance flowing into a render (a derivative work) ties to ADR-026 and NFR-019.

## Context

Spazio's founding thesis is that every rendered item maps to a **real, in-stock, purchasable SKU from a local supplier**, checkout-able in-app (PRD §1; BR-6, BR-14; FR-016). That thesis assumes a supplier catalog exists. Today it does not:

- **No suppliers are onboarded yet.** Supplier self-service ingestion is not built (ADR-006 defers it; the pilot/demo relies on a small operator-curated catalog), and there are zero real supplier SKUs to match, render, or display. The two-sided cold start is a documented risk (PRD §10).
- **The web app needs real products to demonstrate the loop.** Per ADR-024 the product continues as the web app at class-demo scale, and ADR-023 delivers the class demo. To show matching → render → display credibly, the app needs a body of products with **real dimensions, materials, and images** — not fabricated placeholders (fabrication would violate the spirit of BR-14 and produce unrealistic renders, the PRD §10 highest risk).
- **The supplier marketplace stays real.** The local-supplier marketplace (checkout, split settlement, commission, MoR, fulfillment) remains fully built and is demoed with **seeded fake-supplier data** (ADR-023). We do not want a bootstrap catalog to dilute or weaken that guarantee.

The decision is therefore how to source real products for the demo **without** a supplier catalog, **without** scraping retailers (Office Depot or any store — ToS and copyright), and **without** eroding the founding purchasable-SKU invariant for the supplier track.

## Decision

A **dual-track catalog**. The supplier track is unchanged. A second, additive, temporary **public-catalog bootstrap fallback** is introduced, under **quarantine, not dilution**:

1. **Source = Amazon Berkeley Objects (ABO), licensed CC BY 4.0.** ABO provides real product records (dimensions, materials, categories, images). CC BY 4.0 permits commercial use and compositing/modification **with attribution**. **Attribution is required** and must be recorded and displayed. We do **not** scrape retailers.
2. **A `source=public` provenance, distinct from supplier SKUs.** Products carry a source of `supplier` or `public` (data-model spec in `07_data_model.md`). Public products carry attribution fields (source name, source URL, source image URL, image license). `supplier_id` becomes conditional (present for `supplier`, absent for `public`).
3. **Display-only, with a labeled "View at retailer" outbound link.** Public products are **never** added to cart, checkout, orders, commission, merchant-of-record, or the render-to-purchase metric. They are clearly labeled **"not sold by Spazio"** and route the user to an outbound retailer link. This is **not** a monetized affiliate program.
4. **Quarantine, not dilute — an explicit, dated, scoped deviation.** The founding invariant (every rendered item = a real, in-stock, purchasable SKU from a local supplier, with in-app checkout — BR-6, BR-14, FR-016) stays **true for the supplier track**. Public fallback products are a clearly-labeled, non-purchasable, temporary bootstrap/demo track **outside** that guarantee. FR-016 and the CLAUDE.md §1 / vision thesis are **qualified with a narrow dated caveat, not rewritten or deleted**.
5. **Completeness / curation stance — prefer keeping the gate.** The preferred path is to **seed only COMPLETE ABO records** for the `source=public` track so the existing BR-1 / FR-019 / ADR-014 completeness gate holds **with no waiver**. Only if complete records cannot be assembled is a **documented relaxed completeness profile for `source=public`** acceptable (recorded as an explicit carve-out on ADR-014), and even then public products stay display-only and labeled.
6. **Image provenance into renders.** ABO images are CC BY and legal to composite **with attribution**. When the render engine (ADR-026, self-hosted FLUX.2 Klein 4B via mflux) composites a public product image into the room photo, the stored render is a **derivative work**; the image provenance and attribution must flow from the fallback source into the stored render. NFR-019 covers this legal/compliance obligation.

**Clauses this ADR scopes (qualifies, does not delete):**

- **FR-016 / BR-6 / BR-14 (real purchasable SKU only):** qualified — the invariant governs the **supplier track**; `source=public` products are an explicit, labeled, non-purchasable exception. Not deleted.
- **ADR-004 (merchant-of-record):** MoR **does not cover** public products; Spazio is not the seller of record for them (they are not sold by Spazio at all).
- **ADR-006 (supplier ingestion channels):** a **public-dataset fetch/import is a new ingestion channel** distinct from the four supplier channels ADR-006 governs; it is not supplier self-service.
- **ADR-007 (commission):** **no commission** applies to public products (they are never purchased through Spazio).
- **ADR-014 (minimum catalog completeness):** preferred path keeps the gate by seeding **complete** ABO records; the fallback is a **documented relaxed completeness profile for `source=public` only**.
- **ADR-023 (class demo):** the demo's seeded catalog is extended with a **seeded ABO subset** for the public track; the supplier track keeps its seeded fake-supplier data.

## Alternatives considered

1. **Scrape Office Depot (or another retailer) for products.** Rejected: violates retailer Terms of Service and copyright on product data and images; no license to composite the images into renders (derivative works). Legally unacceptable.
2. **Affiliate / retailer product APIs (e.g., commerce affiliate feeds).** Rejected: these programs typically **forbid compositing/modifying** product images (which the render engine requires) and/or are closed/gated; and they would frame the fallback as monetized affiliate commerce, which is explicitly not the intent.
3. **Manually-seeded sample/placeholder products.** Viable and considered. Rejected in favor of ABO because ABO supplies **real metadata** (true dimensions, materials, real product images) that make matching and render scale realistic, whereas hand-invented samples risk unrealistic renders (PRD §10 highest risk) and edge toward fabrication.
4. **Amazon Berkeley Objects (ABO), CC BY 4.0 — chosen.** Real product metadata and images, an explicit commercial-use + modification license (with required attribution), and no ToS/scraping exposure.

## Positive consequences

- **The demo has real products now**, with real dimensions/materials/images, so matching → render → display works before any supplier is onboarded — the cold-start blocker (PRD §10) is unblocked for the bootstrap period.
- **The founding thesis stays intact.** The supplier-track purchasable-SKU guarantee (BR-6/BR-14/FR-016), checkout, commission, and MoR are untouched; the deviation is narrow, dated, labeled, and quarantined.
- **Legally clean sourcing.** CC BY 4.0 permits commercial use and compositing with attribution; no scraping, no retailer ToS/copyright exposure.
- **Additive and reversible.** The public track can be removed once real suppliers exist without touching supplier-track functionality.

## Negative consequences

- **External egress.** A public-dataset fetch/import channel and outbound "View at retailer" links introduce external egress the closed supplier catalog did not have; the import path and outbound links must be recorded and controlled (ADR-006 carve-out, NFR-019).
- **Image-rights chain into renders.** A composited render is a derivative of a CC BY image, so attribution must propagate from the source into the stored render and its display; failure to carry attribution is a license violation (NFR-019, tied to ADR-026). This is an ongoing compliance obligation, not a one-time step.
- **Metric distortion.** Public products could distort render-to-purchase (NFR-006) if counted; mitigated by **segmenting** the metric so non-purchasable public renders are excluded from the purchase-conversion denominator.
- **User confusion risk.** A real-looking product that cannot be bought in-app may confuse users who expect Spazio's purchasable-SKU promise; mitigated by **clear "not sold by Spazio" labeling** and the explicit "View at retailer" outbound affordance.
- **Two standards to maintain.** A `source=public` track alongside the supplier track adds a provenance dimension across catalog, matching, render, API, and metrics, and (if the relaxed completeness profile is used) a second completeness bar to police — a real maintenance cost, accepted because the track is temporary.

## Date

2026-07-15.
