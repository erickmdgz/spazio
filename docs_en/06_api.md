# API

> **DRAFT — proposed API surface; contract shapes still to be detailed.**
> Nothing here is built yet. This document sketches the endpoints the product
> *will need* so that requirements stay traceable. The concrete shape of every
> contract (base URL, verbs, auth scheme, payload fields, status codes, pagination,
> async model) is still draft, but the decisions that gate it are now **Accepted for
> the pilot** — the technology stack is a native iOS (SwiftUI) app + one managed
> backend service + Postgres + object storage (**ADR-001**; client since changed
> to the **web app** by **ADR-024**, 2026-07-14), the rendering/AI
> engine is **self-hosted FLUX.2 Klein 4B run locally via the mflux CLI as a
> child process** (**ADR-026**, 2026-07-14, superseding ADR-002's
> hosted-generative-image-API clause; ADR-002's no-custom-model rule stands, and
> its mandatory operator-QA clause was superseded by **ADR-025**, 2026-07-14 —
> renders are published immediately on generation success), and checkout is a single PCI-compliant COP capture with **no
> split settlement**, the operator paying suppliers manually (**ADR-003**,
> **ADR-004**). Treat every path, verb, and JSON body below as *illustrative
> structuring*, not a committed interface. **Update (PR #21):** the pilot subset
> of this surface now exists as typed stub routes in `backend/` under `/api/v1`
> (business logic stubbed, 501); where they differ, the pilot build plan §0.1
> boundaries govern the pilot code. **Update (PR #27):** operator access is now
> session-based — `POST/GET/DELETE /api/v1/operator/session` (sign-in / whoami /
> sign-out against the `Operator` table, httpOnly cookie) guards every
> `/operator/*` route, and the three §0.1#5 operator queue reads
> (`GET /operator/renders?status=…`, `GET /operator/catalog/products?filter=…`,
> `GET /operator/orders?status=…`) drive the console shell at `/operator/console`.
> **Update (#31, PR #32/#33):** the pilot loop is now implemented and verified
> end-to-end on a local stack (web app → these endpoints → Postgres): `GET
> /styles` exists (FR-007); `GET /renders/{id}/items` and `GET /cart` carry a
> product summary (name, price, supplier — FR-028/032); `GET /cart/estimates` is
> live (FR-036); matching + cart auto-populate + checkout with commission run
> against seeded catalog data. As of #31, image-gen and payments were both FAKE
> drivers with vendors open.
> **Update (ADR-026, 2026-07-14):** the render engine is now **decided** —
> self-hosted FLUX.2 Klein 4B run locally via the mflux CLI (a new
> `MfluxRenderPipeline`; `FakeRenderPipeline` stays the default/test/CI driver).
> The render vendor pick is **CLOSED**; only the payment vendor (ADR-003) stays
> open.
> **Update (ADR-025, 2026-07-14):** the operator render-review gate is retired —
> renders are published to the requesting user immediately on generation
> success. FR-027 and FEAT-006 are retired; the render approve/reject endpoints
> and the `pending_review` queue read below are marked Retired and have been
> removed from code by FEAT-016 (#38); they are kept here only as as-built
> history (catalog curation and order forwarding are unaffected).

## How to read this document

Each statement is tagged so the reader can tell fact from proposal:

- **VERIFIED** — stated in the PRD v0.7 or the One-Week iOS Pilot. Cited (e.g. `PRD FR-06`, `BR-22`, `Pilot`).
- **PROPOSED / DRAFT** — a reasonable way to structure the surface, invented here to make the requirement addressable. Not decided.
- **TBD / PENDING** — reserved for a human decision; linked to its ADR in the registry.

The **capabilities** (what the endpoints must let an actor do) are VERIFIED against
the functional requirements. The **endpoints** (paths, verbs, bodies) are
PROPOSED. Values such as the commission percentage, the daily free-render limit,
the cart-hold duration and the budget tolerance appear in the PRD only as
**defaults or examples**; for the pilot they are **adopted as decided values**
(see **ADR-007**, **ADR-008**, **ADR-009**, **ADR-011**).

## Conventions (all PROPOSED / DRAFT)

- **Base path:** a placeholder `/api/v1` is used only for readability. The stack is
  decided — one managed backend service (**ADR-001**) with the web app as the client
  (**ADR-024**); the concrete
  base path, versioning scheme and host are an implementation detail left to build.
- **Auth:** endpoints that touch account or order data assume an authenticated
  session; the stack is decided (**ADR-001**) and the concrete scheme (token type,
  header) is an implementation detail. This satisfies the *intent* of NFR-008 but
  does not specify it. *(As built for the **operator** surface — PR #27: cookie-session
  sign-in against the `Operator` table; see the operator session endpoints in §5.
  Client endpoints stay unauthenticated in the pilot — ADR-022.)*
- **Rendering is asynchronous.** A render is expected to take on the order of
  minutes (PRD target ~2–5 min, adopted for the pilot as a soft target with no hard
  SLA via **ADR-013**), so render creation is modelled as *submit → poll*, not a
  blocking call.
- **Privacy.** Room photos and renders are private by default (VERIFIED, BR-33 /
  NFR-007); any URL returned is assumed to be access-controlled/expiring. Storage is
  object storage for photos/renders, decided (**ADR-001**).
- **Currency.** Amounts are shown in the user's local currency (VERIFIED, BR-27 /
  FR-046). The pilot is fixed to Bogotá and COP only, decided (**ADR-015**); taxes/
  invoicing are handled manually for the pilot with no tax engine (**ADR-018**,
  revisit before scale). Multi-currency stays architecture-only, out of the pilot.
- **JSON bodies below are labelled `illustrative / draft`.** Field names, types and
  units are proposals; none are guaranteed by the PRD.
- **Pilot note.** Some capabilities exist in the pilot only with a human in the
  loop (operator forwarding orders); others are excluded from the pilot
  entirely. This is flagged per endpoint. *(Operator render review was retired
  by ADR-025, 2026-07-14.)*

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
- **Note (Decided, pilot):** the **style taxonomy** is 1–2 predefined visual styles + free-text description, no taxonomy engine (**ADR-005**, BR-16); the concrete style values are a draft data detail. Pilot ships "one or two predefined visual styles".
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
- **Note (Decided, pilot):** single market — Bogotá, Colombia, COP only (**ADR-015**); taxes/invoicing are handled manually for the pilot with no tax engine (**ADR-018**, revisit before scale).

---

## 5. Render generation & targeted edit

**Capability area:** FEAT-005 (rendering) + FEAT-014 (targeted edit) + FEAT-013 (metering) *(FEAT-006 operator review retired — ADR-025, 2026-07-14)*.
This is the heart of the product. **The engine is decided — self-hosted FLUX.2 Klein 4B run locally via the mflux CLI as a child process (ADR-026, 2026-07-14, superseding ADR-002's hosted-generative-image-API clause; ADR-002's no-custom-model rule stands, its mandatory operator-QA clause superseded by ADR-025); the concrete contracts below are still DRAFT and unchanged by the engine swap (async submit → poll).**
The core render is **pilot core**; renders are published immediately on generation success (ADR-025).

### `POST /api/v1/renders`  *(representative — full contract, illustrative)*

#### Purpose

**(VERIFIED)** Submit a render request. The system matches real, available catalog
SKUs to the chosen style, dimensions, budget and locality (PRD FR-06), and generates a
photorealistic composite of those SKUs into the room photo (PRD FR-06). Hard
constraints (all VERIFIED): every rendered item is a real, purchasable SKU and
nothing is fabricated (BR-6, BR-14); only currently available stock is rendered
(BR-4); dimensions are used to scale realistically (BR-7); total cost stays within
budget plus the agreed tolerance (BR-9). Because rendering is slow, this returns a
**pending** render that the client polls; the render is published to the user
immediately on generation success (ADR-025, 2026-07-14; the FR-027 operator
gate is retired).

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
  "status": "queued",             // queued → processing → completed | failed (review states removed — ADR-025)
  "countsAsAttempt": true,        // one attempt against the daily limit (BR-20)
  "estimateSeconds": 180          // informational; render-time target ~2–5 min soft target, no hard SLA in the pilot (ADR-013)
}
```

#### Errors

| Code | Cause |
|---|---|
| 400 | Missing photo/style/budget/dimensions inputs |
| 402 | Daily free-render limit reached — return next day or buy a package (BR-21). *The pilot has NO daily limit (metering excluded *(the operator-review rationale was retired by ADR-025)*) — the PRD default of five applies only when metering is built post-pilot (**ADR-009**); render packages are not offered in the pilot (**ADR-010**).* |
| 404 | `photoId` not found |
| 409 | Budget cannot be met within tolerance — see fallback behaviour below (BR-10) |
| 422 | No strong match for one or more items (BR-13) |

> **Budget / no-match fallbacks (VERIFIED behaviour, DRAFT shape):** when the
> budget cannot be met the system must disclose it and offer the closest available
> alternative (FR-022, BR-10); when there is no strong match it must suggest
> similar available products or mark the item unavailable (FR-023, BR-13). These
> may surface as a `409/422` body or as flags on the render result; the exact
> shape is DRAFT. The budget tolerance is **10%**, adopted for the pilot
> (**ADR-008**).

#### Related requirements

- FR-014 (match real available SKUs), FR-015 (generate composite), FR-016 (real SKUs only — BR-6/BR-14)
- FR-017 (scale by dimensions — BR-7), FR-018 (available stock only — BR-4), FR-021 (within budget+tolerance — BR-9)
- FR-022 / FR-023 (budget & no-match fallbacks), FR-019 (incomplete catalog entries excluded — BR-2)
- FR-048 / FR-049 (daily limit and attempt counting — metering, not in pilot)
- NFR-001 (render-time target — ~2–5 min soft target, no hard SLA in the pilot, **ADR-013**), NFR-003/NFR-005 (cost threshold / cost per render)

### `GET /api/v1/renders/{renderId}`

- **Purpose (VERIFIED):** Poll a render's status and, once completed, retrieve the image and its tagged items. Renders are published to the requesting user immediately on generation success (ADR-025, 2026-07-14; FR-027 retired).
- **Related requirements:** FR-015; NFR-001, NFR-007 *(FR-027 retired — ADR-025)*.

### `POST /api/v1/renders/{renderId}/edits`

- **Purpose (VERIFIED):** Apply a targeted edit that affects only the requested element (PRD FR-18); on repeated renders of the same scene the system may ask targeted refinement questions first (PRD FR-18). Each edit counts as one attempt (BR-20).
- **Related requirements:** FR-051, FR-052, FR-049; NFR-002. **Excluded from the pilot.**

### `POST /api/v1/operator/renders/{renderId}/approve` · `.../reject`

- **Retired — ADR-025 (2026-07-14).** The operator render-review gate is removed; renders are published immediately on generation success, and cart auto-population (FR-031) is triggered by generation success instead of approval. *(As built — PR #27/#31: these endpoints stamped `reviewed_by` and auto-populated the cart on approval; FEAT-016 (#38) has since removed them from code.)*

### `POST /api/v1/operator/session` · `GET` · `DELETE` *(as built, pilot — PR #27)*

- **Purpose:** Operator sign-in (email + password against the `Operator` table, hashed credentials), whoami, and sign-out. Sets/clears the HMAC-signed httpOnly session cookie that guards every other `/operator/*` route — the pilot's only authenticated surface (build plan §1.7; NFR-008 intent). Actor: **Operator**.
- **Companion queue reads (§0.1#5, as built):** `GET /operator/renders?status=pending_review` (render-review queue — **Retired, ADR-025**; removed from code by FEAT-016 (#38)), `GET /operator/catalog/products?filter=incomplete|unmapped|pending` (curation list), `GET /operator/orders?status=paid_unforwarded` (forwarding queue). These back the console shell served at `/operator/console`.
- **Related requirements:** FR-056–FR-059, FR-061; NFR-008 *(FR-027 retired — ADR-025)*. **Pilot core.**

### `GET /api/v1/renders/quota`

- **Purpose (VERIFIED):** Report the user's remaining free renders for the day and, when the limit is reached, the options: return next day or buy a render package (BR-19, BR-21).
- **Note (Decided, pilot):** metering is excluded from the pilot — NO daily limit (the PRD **default of five** applies only when metering is built post-pilot, **ADR-009**) and no render packages (deferred, **ADR-010**).
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

- **Purpose (VERIFIED):** Review cart contents. On render publication (immediately on generation success — ADR-025, 2026-07-14; previously on operator approval) the cart is auto-populated with every product shown in the render (PRD FR-08); a returned item includes its captured price and its stock-hold expiry.
- **Related requirements:** FR-031, FR-032; NFR-014.

### `POST /api/v1/cart/items`

- **Purpose (VERIFIED):** Add a rendered/tagged product to the cart. Adding an item places a stock hold for the configured duration (BR-22).
- **Note (Decided, pilot):** the pilot has **NO stock hold** (tiny operator-curated catalog; the operator checks availability) — the PRD **default of 15 minutes** applies only when holds are built post-pilot (**ADR-011**); when holds exist, on expiry the hold is released back to availability (BR-23).
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
- **As built (#31 increment 1):** per-item lead times straight from the `Product` row (`deliveryLeadTimeDays`; `productionLeadTimeDays` for made-to-order), null = `missing-estimate` placeholder, never fabricated. FR-037 aggregation and FR-038 warranty stay out.

---

## 9. Checkout & payment

**Capability area:** FEAT-010. **Pilot core** for the single in-app payment; the
automated split settlement, one-PO-per-supplier automation, commission retention
and guest checkout are **excluded from the pilot** (in the pilot the operator
forwards the order and handles fulfilment manually — FR-061).

> **The payment decisions are Accepted for the pilot; the contract shapes here are
> still DRAFT.** Checkout is a single PCI-compliant hosted COP capture with **no
> split settlement** — the operator pays suppliers manually (**ADR-003**); the
> Spazio operating entity is the merchant of record for the pilot (**ADR-004**,
> revisit before scale, confirm with an accountant); commission is **10%** of
> product price, reconciled manually (**ADR-007**). Payment processing must be
> PCI-compliant (NFR-009); split settlement, multi-supplier payouts, multi-currency,
> guest checkout and automatic commission retention (NFR-010–012) are **out of the
> pilot** and remain requirements on any gateway chosen before scale.

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

*Illustrative / draft* — the checkout model is decided (a single PCI-compliant COP
capture, no split — **ADR-003**), but the concrete provider is a scale-time choice
(revisit before scale), so the payment intent / client secret is only a placeholder shape:

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
    "commission": { "note": "Decided (pilot): 10% of product price, reconciled manually — ADR-007", "amount": null },
    "currency": "COP"
  },
  "payment": { "status": "requires_confirmation", "intentRef": "<single hosted COP capture — ADR-003; concrete provider revisit before scale>" }
}
```

#### Errors

| Code | Cause |
|---|---|
| 400 | Missing guest contact fields (BR-26) or unconfirmed cart (BR-31) |
| 402 | Payment declined (single hosted COP capture — **ADR-003**; concrete provider revisit before scale) |
| 409 | Price or availability changed at revalidation (BR-24) — client must re-confirm |
| 410 | Stock hold expired (BR-23) |

#### Related requirements

- FR-035 (explicit cart confirmation — BR-31), FR-041 (revalidate price & availability — BR-24)
- FR-042 (single in-app payment), FR-043 (split settlement), FR-044 (one PO per supplier — BR-25)
- FR-045 (commission — BR-28), FR-004 (guest contact — BR-26), FR-046 (local currency)
- NFR-009 (PCI), NFR-010 (split settlement / multi-supplier payout), NFR-011 (multi-currency), NFR-012 (guest checkout + commission retention)

### `POST /api/v1/payments/{paymentId}/confirm`

- **Purpose (VERIFIED):** Complete the single user payment. In the pilot this is one PCI-compliant COP capture with **no split settlement**; commission is reconciled manually (decided — **ADR-003**, **ADR-007**). The concrete gateway shape is still DRAFT (provider revisit before scale).
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
- **Note (Decided, pilot):** the style taxonomy is 1–2 predefined visual styles + free-text, no taxonomy engine (**ADR-005**); minimum catalog completeness is all PRD BR-1 fields present, operator-enforced on load (**ADR-014**).
- **Related requirements:** FR-056, FR-057, FR-058, FR-059. **Pilot core.**

### `POST /api/v1/suppliers/{supplierId}/catalog:import`

- **Purpose (VERIFIED):** Let suppliers self-ingest catalog data. The PRD lists candidate channels — software integration, Excel, API, FTP — but for the pilot **none** is supported: self-service ingestion is excluded and the operator loads a CSV/Excel instead (decided — **ADR-006**).
- **Note (Decided, pilot):** ingestion is an operator-loaded spreadsheet (CSV/Excel) of 30–60 curated SKUs — no API/FTP/self-service in the pilot (**ADR-006**); suppliers are 2–4 hand-picked Bogotá partners under a one-page written agreement (**ADR-016**).
- **Related requirements:** FR-055. **Excluded from the pilot.**

### `GET /api/v1/catalog/products` *(internal — matching/render input)*

- **Purpose (VERIFIED):** Query the curated catalog for matching. Entries with incomplete required data are excluded from rendering eligibility (BR-2); only currently available stock is eligible (BR-4). Sponsored placement may act **only as a tie-breaker** and must never override relevance, quality, budget, locality or availability (BR-29, BR-30).
- **Note (Decided, pilot):** catalog synchronization is a manual / on-demand refresh by the operator, no automated sync (**ADR-012**, BR-32); sponsored placement is not offered in the pilot (**ADR-017**).
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
| 5 | Render generation & edit | FEAT-005, FEAT-014, FEAT-013 *(FEAT-006 retired — ADR-025)* | FR-014–FR-023, FR-048–FR-052 *(FR-027 retired — ADR-025)* | Core; edits/metering no |
| 6 | Product tags & interaction | FEAT-007 | FR-028, FR-029 | Core |
| 7 | Cart & stock holds | FEAT-008 | FR-030–FR-035, FR-039, FR-040 | Core (holds/swap no) |
| 8 | Estimates & warranty | FEAT-009 | FR-036, FR-037, FR-038 | Partial (FR-036 only) |
| 9 | Checkout & payment | FEAT-010 | FR-004, FR-035, FR-041–FR-045, FR-046 | Core (single payment); split/PO/commission no |
| 10 | Orders & tracking | FEAT-011 | FR-047, FR-061 | Core (FR-061 manual forward) |
| 11 | Supplier catalog & curation | FEAT-015 (+FR-054 tie-breaking, FEAT-013) | FR-055, FR-056, FR-057, FR-058, FR-059, FR-060 (+FR-054) | Core (operator curation); self-ingest no |

> **Note on FR-017:** Room *dimensions* are captured under FEAT-002 (FR-011), but the
> dimension-based *scaling* requirement **FR-017** is served by the render engine
> (**FEAT-005**, row 5, within the FR-014–FR-023 range) — per the canonical registry.

## Decisions that shape these contracts (Accepted for the pilot)

All of the following are **Accepted** for the one-week iOS pilot (Date 2026-07-10; see the ADR registry). Each shapes part of the surface above; the concrete contract shapes remain DRAFT:

- **ADR-001** technology stack — Accepted: native iOS (SwiftUI) app + one managed backend service + Postgres + object storage, single environment/region. Shapes base path, auth, storage, async model (concrete tool/product choices left to implementation). *Client choice superseded by **ADR-024** (web app).*
- **ADR-002** rendering / AI pipeline — Accepted: no custom-trained model. Shapes the render section (§5). *Hosted-generative-image-API engine clause superseded by **ADR-026** (2026-07-14) — self-hosted FLUX.2 Klein 4B via mflux; the no-custom-model rule still stands. Mandatory-operator-QA clause superseded by **ADR-025** (2026-07-14) — renders publish immediately on generation success.*
- **ADR-026** self-hosted render engine — Accepted (2026-07-14): the render engine is self-hosted FLUX.2 Klein 4B (Apache-2.0) run locally via the mflux CLI as a child process, on a separate Apple-Silicon render worker consuming the async render-job queue. Supersedes only ADR-002's hosted-API clause. **No API path/verb/body change** — the async `POST /renders` → `202` + poll model already fits a slow local child process. The render vendor pick is now closed.
- **ADR-003 / ADR-004** payment & merchant of record — Accepted: a single PCI-compliant hosted COP capture with **no split settlement**, the operator paying suppliers manually (**ADR-003**); the Spazio operating entity is the merchant of record for the pilot (**ADR-004**, revisit before scale). Shapes checkout & payment (§9).
- **ADR-005** style taxonomy — Accepted: 1–2 predefined visual styles + free-text, no taxonomy engine. Shapes `GET /styles`, catalog style mapping.
- **ADR-006** supplier ingestion channels — Accepted: operator-loaded CSV/Excel of 30–60 curated SKUs, no self-service ingestion in the pilot. Shapes supplier self-ingest (§11).
- **ADR-007** commission percentage — Accepted: **10%** of product price, reconciled manually in the pilot. Shapes checkout totals.
- **ADR-008** budget tolerance — Accepted: **10%**. Shapes the render budget rule.
- **ADR-009 / ADR-010** render metering — Accepted: **no daily limit** in the pilot (the PRD default of five applies only post-pilot) and no render packages (deferred). Shapes render metering.
- **ADR-011** cart-hold duration — Accepted: **no stock hold** in the pilot (the PRD default of 15 minutes applies only post-pilot). Shapes stock holds.
- **ADR-012** catalog synchronization frequency — Accepted: manual / on-demand refresh by the operator, no automated sync. Shapes catalog sync.
- **ADR-013** render-time target — Accepted: **~2–5 min** soft target, no hard SLA in the pilot. Shapes render async estimates.
- **ADR-014** minimum catalog completeness — Accepted: all PRD BR-1 fields required, operator-enforced on load. Shapes the catalog curation gate.
- **ADR-015 / ADR-018** market, taxes & compliance — Accepted: single market Bogotá, COP only (**ADR-015**); taxes/invoicing handled manually for the pilot, no tax engine (**ADR-018**, revisit before scale). Shapes localization, currency, checkout.
- **ADR-016** supplier partners & onboarding terms — Accepted: 2–4 hand-picked Bogotá suppliers under a one-page written agreement. Shapes supplier ingestion.
- **ADR-017** sponsored-placement plan & pricing — Accepted: not offered in the pilot (deferred). Shapes catalog tie-breaking.
- **ADR-019 / ADR-020** privacy & warranty/disputes — Accepted: photos/renders private by default, minimum data + short consent (**ADR-019**, align Colombia Ley 1581, legal review before scale); warranty **not displayed** in the pilot, disputes handled manually by the operator (**ADR-020**). Shapes privacy defaults, warranty display, order handling.
- **ADR-021** brand identity & visual design system — Accepted: dark-green + off-white palette, simple wordmark, system font; full design system later. Shapes client-facing surfaces.

> **Reminder:** this is a DRAFT specification. Nothing here is implemented yet, and
> no capability listed is "built" or "covered" — these are proposed contracts. The
> gating decisions above are **Accepted for the pilot**; the concrete contract shapes
> still await implementation and human approval.
