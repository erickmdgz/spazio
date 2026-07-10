# Spazio — PRD v0.7

**AI-Generated Space Design & Shoppable Furniture Marketplace**  
**MVP Product Requirements Document**  
**Version:** 0.7  
**Date:** July 10, 2026

## 1. Overview

Spazio enables an individual furnishing a room in their home to see an AI-generated, photorealistic version of the space, fully furnished in a chosen style or a style described in natural language, within a specified budget, using real furniture and decor from local suppliers integrated into the Spazio marketplace.

Users upload or capture a photo of the room and provide approximate dimensions. They then select a predefined style or describe the desired result in free text, for example:

> A modern living room, Mediterranean style, light colors, natural wood, beige sofa, minimalist decor.

Users may mark existing items to keep or replace. The system accounts for budget, room dimensions, location, supplier availability, and delivery zones.

Spazio returns:

- A rendered image of the furnished room.
- Product tags for the exact items shown.
- A shopping cart pre-populated with those products.
- Direct in-app checkout.

The central innovation is that the AI does not invent furniture. Every rendered item must correspond to a real, purchasable SKU already loaded into the marketplace.

This connects inspiration directly to purchase and gives local suppliers a digital sales channel that many currently lack.

## 2. Objective

### Main goal

Enable a user to generate a realistic, purchasable interior design for their own space in minutes, using real furniture and accessories from local suppliers, matched to style, room dimensions, location, and budget.

### Problem to solve

Interior design is expensive, difficult to visualize, and confusing before purchase. Consumers may overspend, choose incompatible pieces, or abandon the process. Local furniture and decor suppliers often lack the digital tools and visibility to compete with large retailers.

### Expected impact

- Faster path from inspiration to purchase.
- Greater visibility and sales opportunities for local suppliers.
- Fewer returns and regretted purchases.
- New marketplace commission revenue for Spazio.

### Success signal: render-to-purchase

The main metric is the percentage of AI-generated renders that lead to a completed in-app purchase of one or more products shown in the render, during the same session and without the user leaving Spazio to search elsewhere.

Style accuracy, catalog completeness, and rendering quality matter only to the extent that they improve this metric.

## 3. Scope

### Must have

- User account and basic profile.
- Saved designs.
- Order history.
- Guest checkout.
- Photo upload and in-app camera capture.
- Approximate room-dimension input.
- Visual style catalog.
- Free-text style description.
- Ability to mark existing items to keep or replace.
- Budget minimum and maximum.
- Localization and delivery-zone detection.
- AI-generated render using only real, available products.
- Configurable daily render limit, defaulting to five.
- Targeted refinement when re-rendering the same scene.
- Product tagging in the render with name, price, supplier, warranty, and listing link.
- Auto-populated shopping cart.
- Ability to review, remove, or swap cart items.
- Fifteen-minute cart stock hold.
- Production and delivery estimates per item.
- Warranty information per item.
- In-app payment through a payment gateway.
- Single user payment across multiple suppliers.
- One purchase order per supplier.
- Multi-currency pricing.
- Delivery-coverage fallback.
- No-match fallback.
- Supplier self-service catalog ingestion through software integration, Excel, API, or FTP.
- Basic order tracking.

### Could have

- Multiple render variations.
- Save, revisit, and share designs.
- AI design chat assistant.
- Multi-room projects.
- Live AR preview.
- Full supplier dashboard.
- Personalized recommendations.
- Installment or financing options.
- Paid render packages.

### Out of scope

- Real-time AR overlay.
- Human interior-design consultations.
- Custom furniture outside the catalog.
- Multi-vendor shipment optimization beyond one purchase order per supplier.
- Loyalty or rewards programs.
- Delivery outside launch regions except through fallback options.

## 4. Business Rules

1. Supplier catalog entries must include:
   - Photos.
   - Dimensions.
   - Price.
   - Available colors.
   - Materials.
   - Stock or inventory.
   - Category.
   - Style attributes.
   - Production and delivery lead time.
   - Warranty terms.

2. Incomplete catalog entries are excluded from rendering.

3. Products are classified as:
   - In-stock ready-made.
   - Made-to-order or manufacturable.

4. Ready-made items require current stock data and must never be rendered when unavailable.

5. Made-to-order items must include supplier-declared production and delivery times.

6. Every rendered item must correspond to a real, purchasable SKU.

7. Approximate room dimensions must be used to scale products realistically.

8. Existing items marked to keep:
   - Must remain in the render.
   - Must be excluded from the cart.
   - Must be excluded from the budget calculation.

9. The total product cost should not exceed the budget beyond an agreed tolerance, such as 10%.

10. When the budget cannot be met, the system must disclose this and offer the closest available alternative.

11. Only products deliverable to the user’s locality may be rendered.

12. When local delivery is unavailable, the system may offer:
    - Nearby regions.
    - Alternative shipping.
    - Pickup.

13. When no strong product match exists, the system must suggest similar available products or mark the item as unavailable.

14. The system must never fabricate unavailable products.

15. Unusable photos must be rejected with a request to retake them.

16. Products must be mapped to a shared style taxonomy.

17. Delivery and production estimates must come from supplier data and be shown before checkout.

18. Warranty terms must be supplier-declared and displayed before checkout.

19. Free render usage is configurable, defaulting to five attempts per user per day.

20. Every generation or edit counts as one attempt.

21. After reaching the limit, the user may return the next day or buy a render package.

22. Adding an item to the cart holds stock for 15 minutes.

23. Expired holds return stock to availability.

24. Price and stock must be validated again at checkout.

25. Checkout produces one user payment and one purchase order per supplier.

26. Guest checkout requires:
    - Email validation.
    - Phone number.
    - Shipping information.

27. Prices are shown in the local currency.

28. Spazio applies a marketplace commission to every completed purchase.

29. Premium or sponsored supplier placement may only break ties between similarly relevant products.

30. Sponsored placement must never override quality, relevance, budget, or locality.

31. The cart is a suggestion and must be explicitly confirmed before payment.

32. Supplier data must synchronize regularly, or in real time for ready-made stock.

33. User photos and generated renders are private by default.

## 5. Users

### User type 1: Homeowners and renters

Individuals furnishing or redesigning a room.

### User type 2: Local suppliers

Furniture and decor suppliers whose catalog powers the marketplace.

### User type 3: Spazio operators

Staff responsible for:

- Catalog curation.
- Style taxonomy.
- Monetization thresholds.
- Render-quality monitoring.
- Order-flow supervision.

### User context

- Users want a fast path from visualization to purchase.
- Most users lack formal design vocabulary.
- Style selection should be visual.
- Budget must be visible throughout the experience.
- Delivery time and warranty strongly influence purchase decisions.

## 6. Functional Requirements

| ID | Requirement |
|---|---|
| FR-01 | Allow users to create an account, manage a basic profile and preferences, and use guest checkout. |
| FR-02 | Allow photo upload and in-app photo capture. |
| FR-03 | Allow visual style selection and free-text style descriptions. |
| FR-04 | Allow budget input and a free-text description of the intended room change. |
| FR-05 | Use localization to determine suppliers and delivery zones. |
| FR-06 | Generate an AI-rendered image using real catalog products that match style, dimensions, budget, and availability. |
| FR-07 | Tag every rendered product with name, price, supplier, warranty, and listing link. |
| FR-07b | Let users tap a tagged product to view details and add or remove it. |
| FR-08 | Auto-populate the cart with every rendered product. |
| FR-09 | Allow users to review, remove, or swap cart items. |
| FR-10 | Show production time, delivery time, and warranty per item and for the full order. |
| FR-11 | Process one payment across multiple suppliers, generate one purchase order per supplier, and support guest checkout. |
| FR-12 | Provide order status and tracking per purchase order. |
| FR-13 | Detect unusable photos and request a retake. |
| FR-14 | Detect budget violations and offer alternatives. |
| FR-15 | Use approximate room dimensions to scale products. |
| FR-16 | Let users mark items to keep or replace and exclude kept items from cart and budget. |
| FR-17 | Enforce a configurable daily render limit and offer return-later or paid-package options. |
| FR-18 | Ask targeted questions during repeated renders and edit only the requested element. |
| FR-19 | Hold stock for 15 minutes and revalidate price and availability at checkout. |
| FR-20 | Display prices in local currency. |
| FR-21 | Provide delivery fallback options. |
| FR-22 | Provide similar alternatives or restock options when no match exists. |
| FR-23 | Let suppliers ingest catalog data through software integration, Excel, API, or FTP. |

## 7. Non-Functional Requirements

### Performance

- Typical single-room renders should complete within approximately 2–5 minutes.
- Targeted edits should complete faster than full renders.

### Cost control

- Enforce configurable daily render limits.
- Use a global inference-cost threshold.
- Degrade gracefully through queueing or slower rendering when cost thresholds are exceeded.
- Track cost per render.
- Track render-to-purchase conversion from day one.

### Security and payments

- Photos and designs are private by default.
- Authentication protects account and order data.
- Payment processing must be PCI-compliant.
- The gateway must support:
  - Marketplace-style split settlement.
  - Multi-supplier payouts.
  - Multi-currency.
  - Guest checkout.
  - Automatic Spazio commission retention.

### Usability

- Style, dimensions, and budget should require minimal steps.
- The app must distinguish purchased catalog items from existing items kept by the user.
- Price, delivery, and warranty must be visible before checkout.

### Scalability and internationalization

- Supplier onboarding should scale by region.
- Architecture should support multiple countries and currencies.
- Taxes, payment methods, and legal requirements must be configured per market.

## 8. Basic Flow

1. User creates an account or continues as guest.
2. User activates localization.
3. User selects a style.
4. User enters room dimensions.
5. User enters a budget and room description.
6. User uploads or captures one or more photos.
7. User marks existing items to keep or replace.
8. System validates photo quality.
9. AI generates the room render.
10. System tags the products shown.
11. System auto-populates the cart.
12. User reviews, removes, or swaps products.
13. User may request a targeted edit.
14. Cart stock is held for 15 minutes.
15. User checks out with one payment.
16. System generates one purchase order per supplier.
17. Availability and price are revalidated.
18. System shows delivery, production time, and warranty.
19. User tracks order status.

### Expected outcome

The user sees a photorealistic version of their furnished room and buys the exact real products shown, with transparent pricing, delivery, and warranty information.

## 9. Monetization Model

### Marketplace flow

```text
supplier catalog
→ AI matching
→ generated render
→ in-app purchase
→ Spazio commission
```

### Commission per sale

The primary revenue stream is a commission on completed purchases made from generated renders, for example 10% of the product price.

### Render packages

Rendering is free up to a configurable daily limit. Users may buy additional render packages after reaching the limit.

### Sponsored supplier visibility

Suppliers may pay for premium visibility. Sponsored placement may only break ties among similarly relevant and high-quality products.

It must not override:

- Relevance.
- Product quality.
- Budget.
- Locality.
- Availability.

### Future non-MVP revenue ideas

- Supplier analytics.
- Premium user subscriptions.
- Designer services.
- Advertising.

## 10. Dependencies and Risks

### Dependencies

- Accurate supplier catalog data.
- AI pipeline constrained to real inventory.
- Object detection and segmentation.
- Shared style and product taxonomy.
- PCI-compliant payment gateway.
- Supplier lead-time and warranty data.

### Known risks

#### Render fidelity

The highest risk is accurately compositing a real SKU into the user’s room at the correct size and appearance. A poor match could increase returns and disputes.

#### Keep-or-replace segmentation

Incorrect object detection could conflict with user intent.

#### Two-sided cold start

Insufficient supplier coverage may produce poor results for specific styles, budgets, or locations.

#### Inference cost

Low conversion may lead to significant rendering expense without offsetting revenue.

#### Multi-country complexity

Currency is relatively simple. Taxes, payment rails, consumer protection, and local legal requirements are not.

#### Payment gateway complexity

Split settlement across suppliers may not be equally available in every country.

#### Poor user photos

Low-quality images may reduce render accuracy.

#### Unsatisfied budgets

The available catalog may not contain enough products within certain budget ranges.

#### Supplier data reliability

Delivery times and warranty information depend on supplier accuracy.

## 11. Assumptions

- Suppliers can provide structured catalog data.
- Users are willing to upload personal-space photos.
- Users can provide approximate dimensions.
- A shared style taxonomy can cover common preferences.
- The architecture can support multiple countries, while launch remains phased.
- Initial launch markets have enough local catalog coverage.
- Users are willing to complete purchases inside the app.

## 12. AI Role and Human Definitions

### AI role

The AI coding agent is expected to:

- Generate and maintain the application codebase.
- Build client, backend, database, and APIs.
- Build and maintain the rendering pipeline.
- Interpret visual styles and natural-language descriptions.
- Apply room dimensions and keep-or-replace decisions.
- Cross-reference the supplier catalog.
- Generate photorealistic renders.
- Implement targeted edits.
- Enforce budget, locality, delivery, photo-quality, stock, and usage rules.
- Implement sponsored-placement tie-breaking.
- Define supplier-ingestion schemas and contracts.
- Implement the interface and user flows.
- Surface ambiguity and technical risk instead of silently deciding.

### Human definitions

Humans must decide and approve:

- Budget tolerance.
- Commission percentage.
- Catalog synchronization frequency.
- Render-time target.
- Daily free-render limit.
- Render-package pricing.
- Cart-hold duration.
- Payment gateway.
- Merchant-of-record model.
- Split-settlement model.
- Style taxonomy.
- Supplier onboarding terms.
- Supplier contracts.
- Supported ingestion channels.
- Sponsored-plan pricing.
- Initial markets.
- Supplier partners.
- Minimum catalog completeness.
- Legal and compliance requirements.
- Data privacy.
- Consumer protection.
- Warranty rules.
- Taxes.
- Payments.
- Brand identity.
- Visual design system.
- Final copywriting.
- Acceptance criteria.
- Release approval.
- Security review.
- Code review.
- Catalog quality.
- Dispute resolution.

## 13. Approvals

| Role | Name | Date |
|---|---|---|
| Product |  |  |
| Business |  |  |
| Commercial |  |  |

## 14. Version History

| Version | Date | Changes | Author |
|---|---|---|---|
| 0.1 | Jul 9, 2026 | Initial draft with overview, scope, users, functional and non-functional requirements, basic flow, dependencies, risks, assumptions, and approvals. | Product |
| 0.2 | Jul 9, 2026 | Added free-text style description, tap-to-buy interaction, supplier catalog attributes, sponsored placement, and monetization model. | Product |
| 0.3 | Jul 9, 2026 | Added dark green and off-white visual redesign. | Product |
| 0.4 | Jul 9, 2026 | Added AI Role and Human Definitions. | Product |
| 0.5 | Jul 9, 2026 | Added render-to-purchase as the primary success indicator. | Product |
| 0.6 | Jul 9, 2026 | Added dimensions, keep-or-replace, multi-supplier payment, stock classifications, cart holds, configurable render limits, targeted edits, supplier ingestion, delivery and no-match fallbacks, multi-currency, guest checkout, and warranty. | Product |
| 0.7 | Jul 10, 2026 | Removed B2B business-owner user type and references. Product now focuses on B2C consumers. | Product |
