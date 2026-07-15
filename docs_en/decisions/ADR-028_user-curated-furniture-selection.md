# ADR-028 - User-curated furniture selection (browse-and-pick, up to 3 items)

## Status

Accepted (product owner, 2026-07-15).

Scope: the render-request flow from 2026-07-15 onward. This ADR **inverts the furnishing flow**: instead of the AI auto-selecting furniture and rendering a whole room (PRD §8 auto-furnish), the user **browses the real catalog, picks up to 3 products, and renders exactly those** into the room photo. It is a deliberate, documented **deviation from the PRD §8 auto-furnish default** (same dated-marker precedent as ADR-024/025/026/027). It **scopes (does not delete)** the auto-match requirements: FR-014 (match SKUs) and FR-015 (composite) stay valid — auto-match becomes an **optional fallback** used only when the request carries no user selection. The product-provenance model (`source=supplier|public`, ADR-027) and the real-purchasable-SKU invariant (FR-016) are unchanged.

## Context

The founding loop (PRD §8, FR-014/FR-015) is *auto-furnish*: the system matches real, available SKUs to style/dimensions/budget/locality and composites the whole set into the room without the user choosing individual pieces. Two forces motivate revisiting this for the web app (ADR-024) at class-demo scale (ADR-023):

- **The user has no control over what gets rendered.** Auto-furnish decides for the user which sofa, which table, which lamp. For a demo whose point is a shoppable, believable result, letting the user browse the real catalog and pick the pieces they actually want is a stronger, more honest experience — and it makes the "every item is a real SKU you can buy" promise tangible, because the user is choosing from the real catalog, not receiving a black-box selection.
- **The render engine has a hard reference-image limit.** The self-hosted FLUX.2 Klein 4B engine (ADR-026) composites reliably with only about **2–3 reference product images** at once. Auto-furnishing a full room can select more items than the engine can composite well. A small, explicit user selection matches the engine's real capability instead of fighting it.

The dual-track catalog (ADR-027) already distinguishes purchasable **supplier** products from display-only **public** (Amazon Berkeley Objects) products, so the browse surface can present either track with the correct purchase/label behavior.

## Decision

**Invert the flow to browse-and-pick, capped at 3 items.** The approved flow is:

> upload photo → choose **SOURCE** (Local suppliers | Brand suppliers) → choose **STYLE** → **browse & select up to 3 real products** → **render** the selection into the room → "like it?" → **(no)** back to browse with the same photo/source/style, pick different furniture, re-render → **(yes)** cart → checkout.

1. **A public browse surface.** A new catalog browse endpoint returns the approved, renderable products of a chosen source and style (optionally price-filtered), each with an image URL for display. It is public data (like `GET /styles`) and is **not** device-scoped.
2. **Source mapping.** **"Local suppliers" = `source=supplier`** (the seeded Bogotá SKUs) — purchasable, they populate cart/checkout. **"Brand suppliers" = `source=public`** (the ABO real-brand catalog) — display-only per ADR-027: never carted/checked-out/commissioned, shown "not sold by Spazio" with a "View at retailer" outbound link and CC BY 4.0 attribution.
3. **Select up to 3.** The user selects **at most 3** products. The 3-cap is the hard product rule (owner decision), enforced **server-side** on the render request (a request with more than 3 is rejected). It matches the Klein engine's ~2–3 reference-image limit (ADR-026).
4. **Render exactly the selection.** The render request accepts an optional `productIds` list. When provided, the render worker composites **exactly those** (validated) products instead of calling auto-match; when omitted, the existing auto-match behavior is kept (backward compatible). Every selected id must be an existing, approved, renderable product (in-stock if ready-made).
5. **Iterate keeping the photo.** "Try other furniture" returns the user to the browse surface with the **same photo, source, and style**, clears the selection, and lets them pick a different set and re-render — a second render on the same project.
6. **Cart follows provenance (ADR-027 unchanged).** The cart is built from the render's items as today: `source=public` items are **excluded** (display-only), `source=supplier` items populate the cart. So a Brand-suppliers render yields an **empty cart** by design (buy via the retailer link); a Local-suppliers render yields a **normal cart**.

**Clauses this ADR scopes (qualifies, does not delete):**

- **FR-014 / FR-015 (auto-match + composite):** auto-match becomes an **optional fallback**, used only when a render request carries no user selection. The requirements stay valid and are marked "optional (ADR-028)"; they are not deleted.
- **PRD §8 auto-furnish default:** replaced, for the request flow, by user-curated selection. Recorded here as the deliberate deviation.

## Alternatives considered

1. **Keep auto-furnish (PRD §8) unchanged.** Rejected for the demo: it gives the user no control and can select more items than the Klein engine composites well (ADR-026), producing weaker renders.
2. **Browse-and-pick with no cap (render everything selected).** Rejected: exceeds the engine's ~2–3 reference-image limit and degrades render quality; also lengthens render time with no benefit.
3. **Browse-and-pick capped at 3 — chosen.** Gives the user control over exactly what is rendered, matches the engine's real capability, and keeps the auto-match path available as an optional fallback for backward compatibility.

## Positive consequences

- **The user controls the result.** Browsing the real catalog and picking the pieces makes the "real, purchasable SKUs" promise tangible and the render intentional.
- **Matches the engine.** A ≤3-item selection fits the Klein reference-image limit (ADR-026), so composites stay reliable.
- **Backward compatible.** Auto-match (FR-014/FR-015) is preserved as a fallback; requests without a selection behave exactly as before.
- **Provenance-correct cart.** Reuses ADR-027: supplier selections buy in-app, brand selections are display-only — no new purchase invariant to police.

## Negative consequences

- **Deviation from the PRD.** The request flow no longer matches PRD §8 auto-furnish; this is a documented, dated deviation that must be revisited if the PRD flow is reinstated at scale.
- **More user steps.** Browsing and selecting adds a step the auto-furnish flow did not have; accepted because it buys user control and better renders.
- **Supplier image gap surfaces.** Local-supplier SKUs carry placeholder web-asset SVGs (`photos[0]`), so a supplier render is generic — a known gap (not fixed here); brand/public products carry real photos.
- **A hard 3-cap to enforce.** The cap must be enforced server-side (a client-only limit is insufficient); a request over 3 is rejected (FR-067).

## Date

2026-07-15.
