# API

> **DRAFT — proposed API surface; concrete contracts depend on ADR decisions.**
> Nothing here is built or final. This document sketches the endpoints the product
> *will need* so that requirements stay traceable. The concrete shape of every
> contract (base URL, verbs, auth scheme, payload fields, status codes, pagination,
> async model) depends on decisions that are still reserved for humans — above all
> the technology stack (**ADR-001**), the rendering/AI pipeline (**ADR-002**), and
> the payment gateway and split-settlement model (**ADR-003**, **ADR-004**). Treat
> every path, verb, and JSON body below as *illustrative structuring*, not a
> committed interface.

## How to read this document

Each statement is tagged so the reader can tell fact from proposal:

- **VERIFIED** — stated in the PRD v0.7 or the One-Week iOS Pilot. Cited (e.g. `PRD FR-06`, `BR-22`, `Pilot`).
- **PROPOSED / DRAFT** — a reasonable way to structure the surface, invented here to make the requirement addressable. Not decided.
- **TBD / PENDING** — reserved for a human decision; linked to its ADR in the registry.

The **capabilities** (what the endpoints must let an actor do) are VERIFIED against
the functional requirements. The **endpoints** (paths, verbs, bodies) are
PROPOSED. Values such as the commission percentage, the daily free-render limit,
the cart-hold duration and the budget tolerance appear in the PRD only as
**defaults or examples** and are repeated here as such — they are **not** final.

## Conventions (all PROPOSED / DRAFT)

- **Base path:** a placeholder `/api/v1` is used only for readability. The real
  base path, versioning scheme and host are TBD (**ADR-001**).
- **Auth:** endpoints that touch account or order data assume an authenticated
  session; the scheme (token type, header) is TBD (**ADR-001**). This satisfies
  the *intent* of NFR-008 but does not specify it.
- **Rendering is asynchronous.** A render is expected to take on the order of
  minutes (PRD target ~2–5 min, TBD via **ADR-013**), so render creation is
  modelled as *submit → poll*, not a blocking call.
- **Privacy.** Room photos and renders are private by default (VERIFIED, BR-33 /
  NFR-007); any URL returned is assumed to be access-controlled/expiring. Storage
  mechanism is TBD (**ADR-001**).
- **Currency.** Amounts are shown in the user's local currency (VERIFIED, BR-27 /
  FR-046). Examples use `COP` to match the pilot (Bogotá, one currency); multi-currency
  is architecture-only for now (TBD **ADR-015**, **ADR-018**).
- **JSON bodies below are labelled `illustrative / draft`.** Field names, types and
  units are proposals; none are guaranteed by the PRD.
- **Pilot note.** Some capabilities exist in the pilot only with a human in the
  loop (operator render review, operator forwarding orders); others are excluded
  from the pilot entirely. This is flagged per endpoint.

---

## 1. Accounts, identity & guest checkout

**Capability area:** FEAT-001 (accounts & identity) + guest checkout (part of FEAT-010).
Not part of the pilot core loop — guest checkout and accounts are **excluded from the pilot**
(Pilot: *"Guest checkout … excluded"*; accounts are secondary to render-to-purchase).

### `POST /api/v1/auth/accounts`

- **Purpose (VERIFIED):** Create a user account.
- **Related requirements:** FR-001; NFR-008.

### `POST /api/v1/auth/sessions`

- **Purpose (VERIFIED):** Authenticate an existing user and open a session (sign in).
- **Related requirements:** FR-002; NFR-008.

*Illustrative / draft* — request/response only, shapes are proposed, not final:

```json
// Request
{
  "email": "user@example.com",
  "password": "••••••••"
}
```

```json
// Successful response (200)
{
  "userId": "usr_123",
  "displayName": "Demo User",
  "session": { "token": "<opaque>", "expiresAt": "2026-07-10T18:00:00Z" }
}
```

| Code | Cause |
|---|---|
| 400 | Incomplete data |
| 401 | Invalid credentials |
| 403 | Inactive user |

### `GET /api/v1/auth/profile` · `PATCH /api/v1/auth/profile`

- **Purpose (VERIFIED):** Read and update a basic profile and preferences.
- **Related requirements:** FR-003.

### `POST /api/v1/checkout/guest-contact`

- **Purpose (VERIFIED):** Capture and validate guest contact for guest checkout — email (validated), phone, and shipping information (BR-26).
- **Related requirements:** FR-004. **Excluded from the pilot.**

---

## 2. Room capture & inputs (photo + quality check + dimensions)

**Capability area:** FEAT-002. **Pilot core** (photo upload + dimensions).

### `POST /api/v1/photos`  *(representative — full contract, illustrative)*

#### Purpose

**(VERIFIED)** Upload a room photo and validate its quality. The response carries
a quality verdict; an unusable photo is rejected with a request to retake it
(BR-15 / FR-13). Photos are private by default (BR-33 / NFR-007).

#### Request

*Illustrative / draft* — a multipart upload is assumed; fields are proposed:

```
POST /api/v1/photos
Content-Type: multipart/form-data

file=<binary room image>
source="upload"          // "upload" (FR-005) | "capture" (FR-006)
```

#### Successful response

*Illustrative / draft:*

```json
// 201 Created — accepted
{
  "photoId": "pht_abc",
  "quality": {
    "status": "accepted",
    "retakeRequired": false
  },
  "private": true
}
```

```json
// 200 OK — usable image rejected (quality gate, BR-15)
{
  "photoId": "pht_abc",
  "quality": {
    "status": "rejected",
    "retakeRequired": true,
    "reason": "too_dark"          // reason vocabulary is DRAFT / TBD
  }
}
```

#### Errors

| Code | Cause |
|---|---|
| 400 | Missing or unreadable file |
| 413 | File too large (limit TBD) |
| 415 | Unsupported media type |
| 422 | Quality gate failed — retake required (may also be modelled as a `rejected` body per above; final choice is DRAFT) |

#### Related requirements

- FR-005 (upload a room photo)
- FR-024 (validate photo quality, reject with retake — BR-15)
- NFR-007 (photos private by default)

### `POST /api/v1/photos/capture`

- **Purpose (VERIFIED):** Accept a photo taken with the in-app camera.
- **Related requirements:** FR-006. **Excluded from the pilot** (pilot ships photo upload only).

### Approximate room dimensions

- **Purpose (VERIFIED):** Capture approximate room dimensions, used to scale rendered products realistically (BR-7).
- **Modelling (PROPOSED):** dimensions are submitted as fields on the render request (see §5), e.g. `dimensions: { widthCm, lengthCm, heightCm, approximate: true }`. A separate `PATCH /photos/{id}/dimensions` is an alternative; final placement is DRAFT.
- **Related requirements:** FR-011, FR-017. **Pilot core.**

---

## 3. Style catalog & style/budget inputs

**Capability area:** FEAT-003. **Pilot core** (one or two predefined styles + optional free text + budget range).

### `GET /api/v1/styles`

- **Purpose (VERIFIED):** List the predefined visual styles the user can pick from (the visual style catalog).
- **Note (TBD):** the underlying **style taxonomy** is a human decision (**ADR-005**, BR-16); the values returned here are not defined yet. Pilot ships "one or two predefined visual styles".
- **Related requirements:** FR-007; NFR-013.

### Free-text style, budget range, and room-change description

- **Purpose (VERIFIED):** A free-text style description (FR-008), a budget **minimum and maximum** (FR-009), and an optional free-text description of the intended room change (FR-010).
- **Modelling (PROPOSED):** submitted as fields on the render request (see §5): `styleDescription`, `budget: { min, max, currency }`, `changeDescription`.
- **Related requirements:** FR-008, FR-009, FR-010; NFR-013. (FR-007/FR-008/FR-009 are pilot core; FR-010 is not in the pilot.)

---

## 4. Localization & delivery coverage

**Capability area:** FEAT-004. Locality drives supplier set, delivery zone and currency.
Pilot is fixed to **one delivery zone (Bogotá) and one currency (COP)**, so these
endpoints are effectively constant in the pilot.

### `GET /api/v1/localization/resolve`

- **Purpose (VERIFIED):** From the user's location, determine the applicable suppliers (BR-11), the delivery zone, and the local display currency.
- **Related requirements:** FR-012, FR-013, FR-046 (BR-27); NFR-017.

### `GET /api/v1/delivery/coverage`

- **Purpose (VERIFIED):** Report whether items are deliverable to the user's locality (BR-11) and, when local delivery is unavailable, surface fallback options — nearby regions, alternative shipping, or pickup (BR-12).
- **Related requirements:** FR-020, FR-053. **Excluded from the pilot** (single fixed zone).
- **Note (TBD):** market rules — taxes, payment methods, legality — are per-market and human-decided (**ADR-015**, **ADR-018**).

---

## 5. Render generation, review & targeted edit

**Capability area:** FEAT-005 (rendering) + FEAT-006 (operator review) + FEAT-014 (targeted edit) + FEAT-013 (metering).
This is the heart of the product. **The pipeline itself is undecided (ADR-002); everything below is DRAFT.**
The core render + human review is **pilot core**.

### `POST /api/v1/renders`  *(representative — full contract, illustrative)*

#### Purpose

**(VERIFIED)** Submit a render request. The system matches real, available catalog
SKUs to the chosen style, dimensions, budget and locality (PRD FR-06), and generates a
photorealistic composite of those SKUs into the room photo (PRD FR-06). Hard
constraints (all VERIFIED): every rendered item is a real, purchasable SKU and
nothing is fabricated (BR-6, BR-14); only currently available stock is rendered
(BR-4); dimensions are used to scale realistically (BR-7); total cost stays within
budget plus the agreed tolerance (BR-9). Because rendering is slow, this returns a
**pending** render that the client polls; the render is shown to the user only
**after an operator approves it** (Pilot; FR-027).

#### Request

*Illustrative / draft* — fields are proposed, not final:

```json
{
  "photoId": "pht_abc",
  "styleId": "sty_mediterranean",          // from GET /styles (FR-007), optional
  "styleDescription": "light colors, natural wood, beige sofa",  // FR-008, optional
  "changeDescription": "furnish the empty living room",          // FR-010, optional
  "budget": { "min": 3000000, "max": 6000000, "currency": "COP" },// FR-009
  "dimensions": { "widthCm": 400, "lengthCm": 550, "heightCm": 260, "approximate": true } // FR-011/FR-017
}
```

#### Successful response

*Illustrative / draft* — async submit; poll `GET /renders/{id}`:

```json
// 202 Accepted
{
  "renderId": "rnd_789",
  "status": "queued",             // queued → rendering → pending_review → approved | rejected
  "countsAsAttempt": true,        // one attempt against the daily limit (BR-20)
  "estimateSeconds": 180          // informational; render-time target is TBD (ADR-013)
}
```

#### Errors

| Code | Cause |
|---|---|
| 400 | Missing photo/style/budget/dimensions inputs |
| 402 | Daily free-render limit reached — return next day or buy a package (BR-21). *Limit is a PRD default of five, TBD (**ADR-009**); package pricing TBD (**ADR-010**). Metering is excluded from the pilot.* |
| 404 | `photoId` not found |
| 409 | Budget cannot be met within tolerance — see fallback behaviour below (BR-10) |
| 422 | No strong match for one or more items (BR-13) |

> **Budget / no-match fallbacks (VERIFIED behaviour, DRAFT shape):** when the
> budget cannot be met the system must disclose it and offer the closest available
> alternative (FR-022, BR-10); when there is no strong match it must suggest
> similar available products or mark the item unavailable (FR-023, BR-13). These
> may surface as a `409/422` body or as flags on the render result; the exact
> shape is DRAFT. The budget tolerance itself is a PRD *example* of "such as 10%",
> TBD (**ADR-008**).

#### Related requirements

- FR-014 (match real available SKUs), FR-015 (generate composite), FR-016 (real SKUs only — BR-6/BR-14)
- FR-017 (scale by dimensions — BR-7), FR-018 (available stock only — BR-4), FR-021 (within budget+tolerance — BR-9)
- FR-022 / FR-023 (budget & no-match fallbacks), FR-019 (incomplete catalog entries excluded — BR-2)
- FR-048 / FR-049 (daily limit and attempt counting — metering, not in pilot)
- NFR-001 (render-time target, TBD), NFR-003/NFR-005 (cost threshold / cost per render)

### `GET /api/v1/renders/{renderId}`

- **Purpose (VERIFIED):** Poll a render's status and, once approved, retrieve the image and its tagged items. A render is only visible to the user after operator approval (FR-027).
- **Related requirements:** FR-015, FR-027; NFR-001, NFR-007.

### `POST /api/v1/renders/{renderId}/edits`

- **Purpose (VERIFIED):** Apply a targeted edit that affects only the requested element (PRD FR-18); on repeated renders of the same scene the system may ask targeted refinement questions first (PRD FR-18). Each edit counts as one attempt (BR-20).
- **Related requirements:** FR-051, FR-052, FR-049; NFR-002. **Excluded from the pilot.**

### `POST /api/v1/operator/renders/{renderId}/approve` · `.../reject`

- **Purpose (VERIFIED):** Operator reviews each render and approves (or rejects) it before it is shown to the user (Pilot; PRD §5 render-quality monitoring). Actor: **Operator**.
- **Related requirements:** FR-027. **Pilot core.**

### `GET /api/v1/renders/quota`

- **Purpose (VERIFIED):** Report the user's remaining free renders for the day and, when the limit is reached, the options: return next day or buy a render package (BR-19, BR-21).
- **Note (TBD):** the daily limit is a PRD **default of five** (**ADR-009**); render-package pricing is undecided (**ADR-010**).
- **Related requirements:** FR-048, FR-049, FR-050. **Excluded from the pilot.**

---

## 6. Product tags & interaction

**Capability area:** FEAT-007. **Pilot core** (tappable product tags on the render).

### `GET /api/v1/renders/{renderId}/items`

- **Purpose (VERIFIED):** List the products shown in a render, each tagged with name, price, supplier, warranty, and listing link (PRD FR-07).
- **Related requirements:** FR-028; NFR-015.

### `GET /api/v1/renders/{renderId}/items/{itemId}`

- **Purpose (VERIFIED):** View a tagged product's details by "tapping" it in the render (PRD FR-07b).
- **Related requirements:** FR-029, FR-028; NFR-015.

---

## 7. Cart & stock holds

**Capability area:** FEAT-008. **Pilot core** (auto-populated cart, review, item removal).
The cart is a **suggestion** and must be explicitly confirmed before payment (BR-31).

### `GET /api/v1/cart`

- **Purpose (VERIFIED):** Review cart contents. On render approval the cart is auto-populated with every product shown in the render (PRD FR-08); a returned item includes its captured price and its stock-hold expiry.
- **Related requirements:** FR-031, FR-032; NFR-014.

### `POST /api/v1/cart/items`

- **Purpose (VERIFIED):** Add a rendered/tagged product to the cart. Adding an item places a stock hold for the configured duration (BR-22).
- **Note (TBD):** the hold duration is a PRD **default of 15 minutes** (**ADR-011**); on expiry the hold is released back to availability (BR-23).
- **Related requirements:** FR-030, FR-039, FR-040. (FR-030/holds not in the pilot; pilot ships auto-population + review + removal.)

### `DELETE /api/v1/cart/items/{itemId}`

- **Purpose (VERIFIED):** Remove a product from the cart.
- **Related requirements:** FR-033. **Pilot core.**

### `PATCH /api/v1/cart/items/{itemId}`

- **Purpose (VERIFIED):** Swap a cart item for an alternative product.
- **Related requirements:** FR-034. **Excluded from the pilot.**

### `POST /api/v1/cart/confirm`

- **Purpose (VERIFIED):** Explicitly confirm the cart before payment (the cart is a suggestion — BR-31).
- **Related requirements:** FR-035. **Pilot core** (user confirms the cart before paying).

---

## 8. Estimates & warranty

**Capability area:** FEAT-009. Price, delivery and warranty must be visible before checkout (NFR-015).

### `GET /api/v1/cart/estimates`

- **Purpose (VERIFIED):** Show supplier-sourced production and delivery estimates per item (BR-17), aggregated estimates for the full order, and supplier-declared warranty terms per item (BR-18) — all before checkout.
- **Related requirements:** FR-036 (per-item estimate — **pilot core**), FR-037 (aggregated — not in pilot), FR-038 (warranty display — **excluded from the pilot**); NFR-015.

---

## 9. Checkout & payment

**Capability area:** FEAT-010. **Pilot core** for the single in-app payment; the
automated split settlement, one-PO-per-supplier automation, commission retention
and guest checkout are **excluded from the pilot** (in the pilot the operator
forwards the order and handles fulfilment manually — FR-061).

> **All payment contracts here are DRAFT and blocked on human decisions:** the
> payment gateway and split-settlement model (**ADR-003**), the merchant-of-record
> model (**ADR-004**), and the commission percentage (**ADR-007**). Payment
> processing must be PCI-compliant (NFR-009) and the gateway must support split
> settlement, multi-supplier payouts, multi-currency, guest checkout and automatic
> commission retention (NFR-010–012) — these are requirements on the *chosen*
> gateway, not a chosen design.

### `POST /api/v1/checkout`  *(representative — full contract, illustrative)*

#### Purpose

**(VERIFIED)** Turn a confirmed cart into an order. At checkout, price and
availability are revalidated before payment (BR-24). Checkout produces **one user
payment** and **one purchase order per supplier** (BR-25). A marketplace
commission is retained on every completed purchase (BR-28). Guest checkout
requires validated email, phone and shipping (BR-26).

#### Request

*Illustrative / draft:*

```json
{
  "cartId": "crt_555",
  "confirmed": true,                       // cart must be confirmed first (BR-31)
  "contact": {                              // required for guest checkout (BR-26)
    "email": "valentina@example.com",
    "phone": "+57...",
    "shipping": { "line1": "...", "city": "Bogotá", "zone": "dz_bogota" }
  }
}
```

#### Successful response

*Illustrative / draft* — payment confirmation is gateway-dependent (**ADR-003**),
so a payment intent / client secret is only a placeholder shape:

```json
// 201 Created
{
  "orderId": "ord_001",
  "revalidation": { "priceChanged": false, "availabilityChanged": false },  // BR-24
  "purchaseOrders": [                        // one per supplier (BR-25)
    { "purchaseOrderId": "po_a", "supplierId": "sup_1", "subtotal": 4200000, "currency": "COP" },
    { "purchaseOrderId": "po_b", "supplierId": "sup_2", "subtotal": 1500000, "currency": "COP" }
  ],
  "totals": {
    "productTotal": 5700000,
    "commission": { "note": "PRD EXAMPLE of 10%, TBD via ADR-007", "amount": null },
    "currency": "COP"
  },
  "payment": { "status": "requires_confirmation", "intentRef": "<gateway-dependent, TBD ADR-003>" }
}
```

#### Errors

| Code | Cause |
|---|---|
| 400 | Missing guest contact fields (BR-26) or unconfirmed cart (BR-31) |
| 402 | Payment declined (gateway-dependent — TBD **ADR-003**) |
| 409 | Price or availability changed at revalidation (BR-24) — client must re-confirm |
| 410 | Stock hold expired (BR-23) |

#### Related requirements

- FR-035 (explicit cart confirmation — BR-31), FR-041 (revalidate price & availability — BR-24)
- FR-042 (single in-app payment), FR-043 (split settlement), FR-044 (one PO per supplier — BR-25)
- FR-045 (commission — BR-28), FR-004 (guest contact — BR-26), FR-046 (local currency)
- NFR-009 (PCI), NFR-010 (split settlement / multi-supplier payout), NFR-011 (multi-currency), NFR-012 (guest checkout + commission retention)

### `POST /api/v1/payments/{paymentId}/confirm`

- **Purpose (VERIFIED):** Complete the single user payment (feeds split settlement and commission retention). **Shape entirely gateway-dependent — DRAFT (ADR-003).**
- **Related requirements:** FR-042, FR-043, FR-045; NFR-009, NFR-010.

---

## 10. Orders & tracking

**Capability area:** FEAT-011. In the pilot, tracking is minimal and the operator
forwards each confirmed order to the supplier manually (FR-061).

### `GET /api/v1/orders` · `GET /api/v1/orders/{orderId}`

- **Purpose (VERIFIED):** List a user's orders and view an order with its per-purchase-order status and tracking (PRD FR-12).
- **Related requirements:** FR-047. (Full tracking is **excluded from the pilot**.)

### `POST /api/v1/operator/purchase-orders/{purchaseOrderId}/forward`

- **Purpose (VERIFIED):** Operator manually forwards a confirmed order to the supplier (Pilot — no automated split payment/integration in week one). Actor: **Operator**.
- **Related requirements:** FR-061, FR-044. **Pilot core.**

---

## 11. Supplier catalog ingestion & operator curation

**Capability area:** FEAT-015. In the pilot the catalog is **manually loaded by an
operator** from a few local suppliers; **self-service ingestion is excluded from
the pilot**. Every rendered item depends on this data being complete (BR-1, BR-2).

### `POST /api/v1/operator/catalog/products`  · `PATCH /.../{sku}`

- **Purpose (VERIFIED):** Operator curates and approves catalog entries (Pilot; PRD §5), storing the required per-SKU attributes: photos, dimensions, price, colors, materials, stock, category, style attributes, production/delivery lead time, and warranty (BR-1). Each product is classified as in-stock ready-made or made-to-order with the required stock/lead-time data (BR-3, BR-4, BR-5) and mapped to the shared style taxonomy (BR-16). Actor: **Operator**.
- **Note (TBD):** the style taxonomy is human-decided (**ADR-005**); minimum catalog completeness is human-decided (**ADR-014**).
- **Related requirements:** FR-056, FR-057, FR-058, FR-059. **Pilot core.**

### `POST /api/v1/suppliers/{supplierId}/catalog:import`

- **Purpose (VERIFIED):** Let suppliers self-ingest catalog data. The PRD lists candidate channels — software integration, Excel, API, FTP — but the supported set is undecided.
- **Note (TBD):** supported ingestion channels are human-decided (**ADR-006**); onboarding terms (**ADR-016**).
- **Related requirements:** FR-055. **Excluded from the pilot.**

### `GET /api/v1/catalog/products` *(internal — matching/render input)*

- **Purpose (VERIFIED):** Query the curated catalog for matching. Entries with incomplete required data are excluded from rendering eligibility (BR-2); only currently available stock is eligible (BR-4). Sponsored placement may act **only as a tie-breaker** and must never override relevance, quality, budget, locality or availability (BR-29, BR-30).
- **Note (TBD):** catalog synchronization frequency is human-decided (**ADR-012**, BR-32); sponsored-placement plan/pricing (**ADR-017**).
- **Related requirements:** FR-014, FR-019, FR-060, FR-054.

---

## Traceability summary

Capability area → feature → FRs the endpoints serve. IDs are canonical (see the registry).

| # | Capability area | Feature | FRs served | In pilot? |
|---|---|---|---|---|
| 1 | Accounts, identity & guest | FEAT-001 (+FR-004) | FR-001, FR-002, FR-003, FR-004 | No |
| 2 | Room capture & inputs | FEAT-002 | FR-005, FR-006, FR-011, FR-024 | Core (upload + dimensions) |
| 3 | Style catalog & inputs | FEAT-003 | FR-007, FR-008, FR-009, FR-010 | Core (FR-010 no) |
| 4 | Localization & delivery | FEAT-004 | FR-012, FR-013, FR-020, FR-046, FR-053 | Partial (fixed zone) |
| 5 | Render generation, review, edit | FEAT-005, FEAT-006, FEAT-014, FEAT-013 | FR-014–FR-023, FR-027, FR-048–FR-052 | Core (FR-027 review); edits/metering no |
| 6 | Product tags & interaction | FEAT-007 | FR-028, FR-029 | Core |
| 7 | Cart & stock holds | FEAT-008 | FR-030–FR-035, FR-039, FR-040 | Core (holds/swap no) |
| 8 | Estimates & warranty | FEAT-009 | FR-036, FR-037, FR-038 | Partial (FR-036 only) |
| 9 | Checkout & payment | FEAT-010 | FR-004, FR-035, FR-041–FR-045, FR-046 | Core (single payment); split/PO/commission no |
| 10 | Orders & tracking | FEAT-011 | FR-047, FR-061 | Core (FR-061 manual forward) |
| 11 | Supplier catalog & curation | FEAT-015 (+FR-054 tie-breaking, FEAT-013) | FR-055, FR-056, FR-057, FR-058, FR-059, FR-060 (+FR-054) | Core (operator curation); self-ingest no |

> **Note on FR-017:** Room *dimensions* are captured under FEAT-002 (FR-011), but the
> dimension-based *scaling* requirement **FR-017** is served by the render engine
> (**FEAT-005**, row 5, within the FR-014–FR-023 range) — per the canonical registry.

## Open decisions that gate these contracts

None of the following are decided; each blocks part of the surface above (see the ADR registry):

- **ADR-001** technology stack — base path, auth, storage, async model.
- **ADR-002** rendering / AI pipeline — the entire render section (§5).
- **ADR-003 / ADR-004** payment gateway, split-settlement, merchant-of-record — checkout & payment (§9).
- **ADR-005** style taxonomy — `GET /styles`, catalog style mapping.
- **ADR-006** supplier ingestion channels — supplier self-ingest (§11).
- **ADR-007** commission percentage (PRD *example* 10%) — checkout totals.
- **ADR-008** budget tolerance (PRD *example* "such as 10%") — render budget rule.
- **ADR-009 / ADR-010** daily free-render limit (PRD *default* five) and render-package pricing — render metering.
- **ADR-011** cart-hold duration (PRD *default* 15 minutes) — stock holds.
- **ADR-012** catalog synchronization frequency — catalog sync.
- **ADR-013** render-time target (PRD *target* ~2–5 min) — render async estimates.
- **ADR-014** minimum catalog completeness — catalog curation gate.
- **ADR-015 / ADR-018** initial markets, taxes & multi-market compliance — localization, currency, checkout.
- **ADR-016** supplier partners & onboarding terms — supplier ingestion.
- **ADR-017** sponsored-placement plan & pricing — catalog tie-breaking.
- **ADR-019 / ADR-020** data privacy / consumer protection, warranty & dispute rules — privacy defaults, warranty display, order handling.
- **ADR-021** brand identity & visual design system — client-facing surfaces.

> **Reminder:** this is a DRAFT specification. Nothing here is implemented, and no
> capability listed is "built" or "covered" — these are proposed contracts pending
> the decisions above and human approval.
