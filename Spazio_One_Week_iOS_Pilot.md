# Spazio — One-Week iOS Pilot

> **Update (ADR-024, 2026-07-14):** this document is the original first-milestone spec, kept unchanged as source material. The platform decision has since changed — the product continues on the **web app** (`web-demo/`) at class-demo scale, and **no native iOS app will be built**. The loop this document defines (render-to-purchase, one city, human in the loop) still governs. See `docs_en/decisions/ADR-024_web-app-platform-pivot.md`.

**Pilot Product Requirements — the smallest version we can put in a real person’s hands**

**Target:** Live on iOS, one city, in one week  
**Date:** July 10, 2026

> This is not the full product. It is the one loop we must prove first: a real person, in one city, sees their own room furnished with real furniture and buys at least one piece. Everything not needed to test that is cut.

## The problem

Someone who wants to redesign a room cannot picture how real, purchasable furniture will actually look in their own space before spending money. As a result, they may overspend, buy pieces that do not fit or match, or never begin.

At the same time, local stores that stock those pieces are often nearly invisible online, making it difficult for motivated buyers to find and purchase from them.

## The one user

The pilot is designed for one specific person:

**Valentina, 33**, rents an apartment in Bogotá. She wants to furnish her living room, has a rough budget in mind, shops comfortably from her iPhone, and has no design training. She has a photo of the empty or partially furnished room and wants to see what it could look like, then buy the furniture, without hiring anyone.

Designing for one real, nameable person keeps every pilot decision concrete: if something does not help Valentina go from photo to purchase, it is excluded.

## The one core thing

The single job the pilot must do is:

> Show Valentina a photorealistic image of her own room furnished only with real furniture she can buy right now.

Everything else—accounts, filters, sharing, multiple styles, order tracking—is secondary. If the render is not believable or the furniture is not actually purchasable, nothing else matters.

## The AI’s role

The AI:

- Interprets the chosen style and room photo.
- Decides which real, in-stock catalog products fit the space, style, and budget.
- Generates the photorealistic render by compositing those products into the user’s photo at a believable scale.
- Drafts the shopping cart with the exact products shown, including price and supplier.

The AI owns the creative and matching work. It must never invent a product that is not in the catalog.

## The human’s role

For the one-week pilot, humans remain deliberately in the loop because this is faster to build and protects the customer while the AI is still unproven.

| Human role | Why they are involved |
|---|---|
| Operator curates the catalog by hand | The AI can only show real, purchasable items. A small, clean, manually loaded catalog from a few suppliers ensures every rendered product is real, priced, and in stock. |
| Operator reviews each render before it reaches the user | Render fidelity is the biggest risk. A human checks that the image matches the real products and looks believable. |
| User confirms the cart before paying | The render is a suggestion, not an order. The user must explicitly approve the purchase. |
| Operator places the purchase order with the supplier | No automated split payment or supplier integration is built in week one. The operator forwards the confirmed order manually. |

## The signal that it is working

### Render-to-purchase

A pilot user completes a real purchase of at least one product shown in their render, in the same session, inside Spazio, without leaving to search elsewhere.

The metric is:

```text
render-to-purchase rate = purchases / renders
```

If users generate renders but do not buy, the core loop is not working, regardless of image quality. Even a small number of genuine render-to-purchase completions is enough to justify continuing development.

## Pilot scope

### Included

- Native iOS app only.
- One city and one delivery zone: Bogotá.
- One currency: COP.
- Small manually curated catalog from a few local suppliers.
- Photo upload.
- Approximate room dimensions.
- One or two predefined visual styles.
- Optional free-text style description.
- Budget range input.
- AI render using only real, in-stock catalog products.
- Human review before the render is shown.
- Tappable product tags on the render.
- Automatically populated cart with price and supplier.
- Cart review and item removal.
- One simple in-app checkout.
- Price and estimated delivery or production time per item.

### Excluded from the pilot

- Android and web.
- Multiple cities, countries, and currencies.
- Supplier self-service ingestion through API, FTP, or automated Excel processing.
- Keep-or-replace existing furniture through segmentation.
- Targeted edit-by-question refinement.
- Daily render limits.
- Paid render packages.
- Guest checkout.
- Saved designs.
- Sharing.
- Personalized recommendations.
- Chat assistant.
- Automated split payments.
- One-purchase-order-per-supplier automation.
- Full order tracking.
- Warranty display.
- Augmented reality.
- Multiple rooms.

## One-week plan

| Day | Focus |
|---|---|
| Day 1 | Select the supplier set and manually load approximately 30–60 clean SKUs with photo, price, dimensions, stock, and style tag. Set up the rendering pipeline and prompt. |
| Days 2–3 | Build the iOS flow: photo + dimensions + style + budget → render → tagged products → cart. Connect the rendering pipeline. |
| Day 4 | Add cart review and simple checkout or payment. Set up operator render review and manual order handoff. |
| Day 5 | Run an end-to-end internal test using real rooms. Tune render quality and product matching against the catalog. |
| Day 6 | Fix the main issues found during the dry run. Release a TestFlight build to a few real pilot users. |
| Day 7 | Launch to the pilot group, monitor render-to-purchase, and collect feedback. |

## Go / no-go decision

Continue building if real pilot users complete render-to-purchase: they buy what they see.

If users generate renders but do not purchase, the team must improve that loop—especially fidelity, catalog fit, or trust—before adding any feature from the full PRD.

# Scope Cuts & Triggers

This section explains what was removed from the full PRD to fit the one-week pilot and which constraint caused each cut.

Every item below exists in the full PRD v0.7. Each was excluded for a specific reason: it is not necessary to test whether a real person, in one city, sees their own room furnished with real furniture and buys at least one piece.

| Cut from the full PRD | Trigger or pilot constraint |
|---|---|
| Android and web | One-week native iOS pilot; a single platform is required to fit the schedule. |
| Multi-city, multi-country, multi-currency | The pilot is limited to one delivery zone in Bogotá and one currency, COP. Localization complexity is deferred until the local loop works. |
| Supplier self-service ingestion through API, FTP, or Excel automation | The catalog is manually loaded. Building ingestion infrastructure is unnecessary for 30–60 hand-picked SKUs. |
| Keep-or-replace existing furniture through segmentation | It is not required to test photo → render → purchase. Segmentation risk and development time are removed; full replacement is assumed. |
| Targeted edit-by-question refinement, daily render limits, and paid render packages | These are scale, monetization, and cost-control mechanisms. The pilot only needs a human-reviewed render, not a fully self-service metered loop. |
| Guest checkout, saved designs, sharing, personalized recommendations, and chat assistant | None directly improve the render-to-purchase signal. |
| Automated split payments, one purchase order per supplier, and full tracking | A human operator handles fulfillment manually because the infrastructure does not yet exist. |
| Warranty display, AR, and multi-room | These are secondary to the single core loop. |

## Governing trigger

The governing question behind every cut is:

> Does the render lead to a real purchase in the same session?

Anything not required to test that loop is excluded.

Features should only be added back after render-to-purchase is confirmed. Even then, priority should go to whatever most improves the conversion ratio—render fidelity, catalog fit, or trust—not automatically to any specific deferred feature.
