# Data model

> **Draft - proposed data model; architecture decided for the pilot (see `ADR-001`).**
> This document is a first structuring of Spazio's domain entities, derived from the PRD v0.7 and the One-Week iOS Pilot. Nothing here is implemented. **Update (PR #21):** the pilot entity subset is now expressed as a Prisma schema in `backend/prisma/schema.prisma` (not deployed); this document remains the full-product draft. The physical schema, database engine, and field types follow the technology stack — a human decision now decided for the pilot as a native iOS (SwiftUI) app with a small managed backend and a managed relational (Postgres) database plus object storage, single environment/region (see `ADR-001 Technology stack`; the client has since changed to the **web app** — `ADR-024`, 2026-07-14). **Update (ADR-025, 2026-07-14):** the operator render-review gate is removed — renders are published to the requesting user immediately on generation success; the `Render` review states and reviewer stamps below are marked Retired (removed from the as-built code by FEAT-016 (#38)). Treat every table below as a specification to review, not a settled design.

## How to read this document

Each entity has a short purpose line, a field table (`Field / Type / Required / Description`), and — at the end of the document — a consolidated **Rules** section with the PRD-derived invariants that span entities.

**Confidence labels used in the Description column:**

| Label | Meaning |
|---|---|
| (PRD …) / (BR-…) / (FR-…) | **Verified** — the field or constraint is stated in the PRD or pilot. The citation points to the source. |
| **(proposed)** | **Draft** — a reasonable structuring choice not explicitly stated in the PRD; included for referential integrity or clarity, and open to change. |
| **(pilot: … - ADR-…)** | **Decided (pilot)** — the value, model, or vocabulary is adopted for the one-week iOS pilot per the referenced `ADR-` (some carry an explicit revisit-before-scale caveat). |

**Type conventions.** Types are generic and technology-neutral (`UUID`, `String`, `Text`, `Decimal`, `Integer`, `Boolean`, `DateTime`, `Enum`, `JSON`, `Array`, `URL`). Concrete types depend on the stack (`ADR-001`).

**Structural scaffolding.** Every entity is shown with a surrogate `id` (primary key), foreign keys (`*_id`), and audit timestamps (`created_at`, and where relevant `updated_at`). These are a conventional relational-draft scaffold; they are **(proposed)** collectively and are not re-labeled row by row.

**PRD example / default values — decided for the pilot.** Where the PRD gives a value only as an example or default — commission "for example 10%", daily render limit "defaulting to five", cart hold "15 minutes", budget tolerance "such as 10%" — the pilot decision is recorded with its `ADR-`: commission 10% (`ADR-007`) and budget tolerance 10% (`ADR-008`) are adopted for the pilot, while the daily free-render limit (`ADR-009`) and the cart hold (`ADR-011`) are not applied in the pilot and their PRD defaults (five/day, 15 minutes) apply only post-pilot.

---

## Relationships overview

Draft relationships between the core entities. All are **(proposed)** structuring faithful to the PRD flow (PRD §8) and pilot loop.

```text
User (or guest) ──< Project ──1 RoomPhoto (1..*)
                       │
                       └──< RenderRequest ──1 Render ──< RenderItem >── Product
                                                              │
Render ──1 Cart ──< CartItem ──1 StockHold                    │
                       │                                       │
                       └────────────< (each references) ───────┘
Cart ──1 Order ──< PurchaseOrder (one per Supplier) ──1 OrderTracking
Order ──1 Payment ──1 Commission
Product >── Supplier ──< DeliveryZone
Supplier / Product ──< SponsoredPlacement
Product.style_attributes ── StyleTaxonomy ── Style
User / Supplier / Order ── Market
Operator ── (curates Product/Style, forwards PurchaseOrder)
```

*(Operator render review removed — ADR-025, 2026-07-14.)*

Cardinality summary (draft):

- A **Project** bundles one user session's inputs and has one or more **RoomPhoto** records (PRD §8 "one or more photos").
- A **RenderRequest** produces (at most) one **Render**; a re-render or edit is a new RenderRequest (BR-20).
- A **Render** has many **RenderItem** links, each pointing to exactly one **Product** (BR-6).
- A **Cart** is derived from one Render and holds many **CartItem** records; each CartItem may have one **StockHold** (BR-22).
- An **Order** results from one confirmed Cart, is paid by one **Payment**, and fans out into one **PurchaseOrder per Supplier** (BR-25).
- A **Supplier** owns many **Product** records and serves one or more **DeliveryZone** areas (BR-11).

---

## Entity: User

A homeowner/renter with profile, preferences, and order history; may also transact as a guest without a persistent account (PRD §5, FR-001–FR-004).

| Field | Type | Required | Description |
|---|---|---|---|
| id | UUID | Yes | Primary key **(proposed)**. |
| account_type | Enum | Yes | `registered` or `guest` **(proposed)**; the PRD supports both registration and guest checkout (FR-01, BR-26). |
| name | String | No | Display name for the basic profile (PRD FR-01 / FR-003). |
| email | String | Yes | Contact email; **must be unique** for registered accounts and validated for guest checkout (PRD FR-01, BR-26). |
| phone | String | Conditional | Phone number; required for guest checkout (BR-26). |
| password_hash | String | Conditional | Hashed credential for registered users; never stored in plaintext (NFR-008). Decided (pilot): no end-user login/password/account system - see ADR-022 (stack per ADR-001); this field is unused in the pilot. Not set for guests. |
| preferences | JSON | No | Basic profile preferences (PRD FR-003). |
| market_id | UUID (FK) | No | User's market/locality, used for suppliers and delivery zones (PRD FR-05) → `Market`. |
| status | Enum | No | `active` / `inactive` **(proposed)**; an inactive account cannot sign in. |
| created_at | DateTime | Yes | Record creation timestamp **(proposed)**. |

## Entity: Operator

Spazio staff who curate the catalog, maintain the style taxonomy, and (in the pilot) forward orders manually (PRD §5, pilot "human's role"). *(Render review retired — ADR-025, 2026-07-14.)*

> **Update (PR #27):** built in the pilot schema (`backend/prisma/schema.prisma`) — scrypt-hashed `password_hash`, optional single `role` (enum below), `status` `active`/`inactive`. Console sign-in is implemented (build plan §1.7 — nothing is deployed). **Update (#34):** per-action role gating is enforced — curator/reviewer/handler each gate their actions; a role-less operator is all-purpose. **Update (ADR-025, 2026-07-14):** the `render_reviewer` role is retired from the target spec (render review removed); `catalog_curator` and `order_handler` stand. The role was removed from code by FEAT-016 (#38).

| Field | Type | Required | Description |
|---|---|---|---|
| id | UUID | Yes | Primary key **(proposed)**. |
| name | String | Yes | Operator name **(proposed)**. |
| email | String | Yes | Login/contact email; unique **(proposed)**. |
| password_hash | String | Yes | Hashed credential; auth mechanism decided (pilot): per the decided stack (see ADR-001) - operator access only; the pilot has no end-user accounts (ADR-022). |
| role | Enum | No | Operator function **(proposed)**, e.g. `catalog_curator`, `order_handler` (PRD §5 responsibilities). *(`render_reviewer` retired — ADR-025, 2026-07-14.)* |
| status | Enum | No | `active` / `inactive` **(proposed)**. |
| created_at | DateTime | Yes | Record creation timestamp **(proposed)**. |

## Entity: Supplier

A local furniture/decor vendor whose catalog powers the marketplace, with onboarding terms and delivery coverage (PRD §5, FR-05, FR-11, BR-28).

| Field | Type | Required | Description |
|---|---|---|---|
| id | UUID | Yes | Primary key **(proposed)**. |
| name | String | Yes | Supplier/store name; shown as the product's supplier tag (PRD FR-07). |
| contact_email | String | No | Operational contact **(proposed)**. |
| contact_phone | String | No | Operational contact **(proposed)**. |
| market_id | UUID (FK) | No | Supplier's market/locality (PRD FR-05) → `Market`. |
| ingestion_channel | Enum | No | How the supplier's catalog is ingested: software integration / Excel / API / FTP (PRD FR-23). Supported channels decided (pilot): operator manually loads a CSV/Excel of 30-60 curated SKUs; no API/FTP/self-service ingestion - see ADR-006. In the pilot, catalog is loaded manually by an operator. |
| onboarding_terms_ref | String | No | Reference to the negotiated onboarding terms/contract **(proposed)**; terms decided (pilot): a one-page written agreement (commission, lead times, warranty) with 2-4 hand-picked Bogotá suppliers - see ADR-016. |
| commission_rate | Decimal | No | Negotiated commission override, if any **(proposed)**; the marketplace default rate decided (pilot): 10% of product price, reconciled manually - see ADR-007. |
| payout_account_ref | String | No | Settlement/payout account reference **(proposed)** for split settlement; decided (pilot): no split settlement - the operator pays suppliers manually (revisit before scale) - see ADR-003 / ADR-004. Not used in the pilot (fulfillment is manual). |
| status | Enum | No | `active` / `inactive` **(proposed)**. |
| created_at | DateTime | Yes | Record creation timestamp **(proposed)**. |

## Entity: Product

A real, purchasable SKU with photos, dimensions, price, colors, materials, stock, category, style attributes, lead time, and warranty (PRD §4 BR-1, BR-3–BR-6). Every rendered item must map to one of these (BR-6, BR-14).

| Field | Type | Required | Description |
|---|---|---|---|
| id | UUID | Yes | Primary key **(proposed)**. |
| supplier_id | UUID (FK) | Yes | Owning supplier (PRD FR-07) → `Supplier`. |
| sku | String | Yes | Real, purchasable SKU identifier (PRD BR-6). |
| name | String | Yes | Product name; used in the render tag (PRD BR-1, FR-07). |
| description | Text | No | Product description **(proposed)**. |
| category | String | Yes | Product category (PRD BR-1). |
| photos | Array&lt;URL&gt; | Yes | Product photos (PRD BR-1). |
| dimensions | JSON | Yes | Physical dimensions, e.g. `{width_cm, depth_cm, height_cm}` **(proposed sub-fields / units)**; required attribute (PRD BR-1) and used to scale the render (BR-7, FR-15). |
| price | Decimal | Yes | Unit price (PRD BR-1). |
| currency | String | Yes | Currency of `price` (PRD BR-27) → aligned with `Market`. |
| available_colors | Array&lt;String&gt; | Yes | Available colors (PRD BR-1). |
| materials | Array&lt;String&gt; | Yes | Materials (PRD BR-1). |
| product_type | Enum | Yes | `ready_made` (in-stock) or `made_to_order` (manufacturable) (PRD BR-3). |
| stock_quantity | Integer | Conditional | Current stock; **required for `ready_made`** and never rendered when unavailable (PRD BR-4). May be null for `made_to_order`. |
| production_lead_time | String / Integer | Conditional | Supplier-declared production time; **required for `made_to_order`** (PRD BR-5); shown as an estimate before checkout (BR-17). |
| delivery_lead_time | String / Integer | Yes | Supplier-declared delivery time (PRD BR-1); shown as an estimate before checkout (BR-17). |
| warranty_terms | Text | Yes | Supplier-declared warranty terms (PRD BR-1); displayed before checkout (BR-18). |
| style_attributes | JSON / Array | Yes | Style attributes (PRD BR-1), mapped to the shared taxonomy (BR-16) → `StyleTaxonomy`. Vocabulary decided (pilot): 1-2 predefined visual styles + free-text description; no taxonomy engine - see ADR-005. |
| listing_url | URL | No | Listing link surfaced in the product tag (PRD FR-07). |
| is_complete | Boolean | No | Derived flag **(proposed)**: true only if all required attributes are present. Incomplete entries are excluded from rendering (PRD BR-2). |
| last_synced_at | DateTime | No | Last catalog sync **(proposed)**; supplier data must synchronize regularly, and in real time for ready-made stock (PRD BR-32). Frequency decided (pilot): manual / on-demand refresh by the operator; no automated sync - see ADR-012. |
| created_at | DateTime | Yes | Record creation timestamp **(proposed)**. |

## Entity: Style

A predefined visual style a user can select, mapped to product style attributes (PRD FR-03, §5). The pilot ships one or two predefined styles.

| Field | Type | Required | Description |
|---|---|---|---|
| id | UUID | Yes | Primary key **(proposed)**. |
| name | String | Yes | Style display name (PRD FR-03). |
| code | String | No | Stable slug/code **(proposed)**. |
| description | Text | No | Short description of the style **(proposed)**. |
| preview_image_url | URL | No | Visual thumbnail for selection; style selection should be visual (PRD §5). |
| taxonomy_id | UUID (FK) | No | Mapping to the shared taxonomy (PRD BR-16) → `StyleTaxonomy`. |
| status | Enum | No | `active` / `inactive` **(proposed)**. |

Note: the full set of predefined styles is part of the style taxonomy, decided (pilot): 1-2 predefined visual styles + free-text description; no taxonomy engine - see ADR-005.

## Entity: StyleTaxonomy

The shared classification mapping products and user style choices to a common vocabulary (PRD BR-16). The vocabulary and hierarchy decided (pilot): 1-2 predefined visual styles + free-text description; no taxonomy engine - see ADR-005.

| Field | Type | Required | Description |
|---|---|---|---|
| id | UUID | Yes | Primary key **(proposed)**. |
| label | String | Yes | Human-readable taxonomy term (PRD BR-16); values decided (pilot): 1-2 predefined visual styles + free-text description; no taxonomy engine - see ADR-005. |
| code | String | No | Stable code for the term **(proposed)**. |
| parent_id | UUID (FK) | No | Self-reference for a hierarchical taxonomy **(proposed)** → `StyleTaxonomy`. |
| description | Text | No | Definition/notes for the term **(proposed)**. |

## Entity: Project

A user's room-design session bundling room photo(s), dimensions, budget, style, and locality inputs (PRD §8). Basis for saved designs (a PRD "must have"; saved designs are excluded from the pilot).

| Field | Type | Required | Description |
|---|---|---|---|
| id | UUID | Yes | Primary key **(proposed)**. |
| user_id | UUID (FK) | No | Owning user; nullable for guest sessions **(proposed)** → `User` (PRD FR-004, BR-26). |
| market_id | UUID (FK) | No | Resolved locality for suppliers/delivery (PRD FR-05) → `Market`. |
| style_id | UUID (FK) | No | Selected predefined style (PRD FR-03) → `Style`; may be null when only free text is used. |
| style_description | Text | No | Free-text style description (PRD FR-03 / FR-008). |
| room_change_description | Text | No | Free-text description of the intended room change (PRD FR-04 / FR-010). |
| budget_min | Decimal | Yes | Minimum budget (PRD FR-04 / FR-009). |
| budget_max | Decimal | Yes | Maximum budget (PRD FR-04 / FR-009). |
| currency | String | Yes | Budget currency, shown in local currency (PRD BR-27). |
| room_dimensions | JSON | Yes | Approximate room dimensions, e.g. `{width_cm, length_cm, height_cm}` **(proposed sub-fields / units)** (PRD FR-15); used to scale products (BR-7). |
| keep_replace_map | JSON | No | Existing items marked to keep vs replace **(proposed structure)** (PRD FR-16, BR-8). **Excluded from the pilot** (keep-or-replace segmentation is deferred). |
| created_at | DateTime | Yes | Record creation timestamp **(proposed)**. |

## Entity: RoomPhoto

An uploaded or captured room image, private by default and subject to quality validation (PRD FR-02, BR-15, BR-33).

| Field | Type | Required | Description |
|---|---|---|---|
| id | UUID | Yes | Primary key **(proposed)**. |
| project_id | UUID (FK) | Yes | Parent session **(proposed)** → `Project`. |
| image_ref | URL / String | Yes | Storage reference for the photo (PRD FR-02). |
| source | Enum | No | `upload` or `camera` **(proposed values)** (PRD FR-02; in-app camera is FR-006, not in the pilot). |
| quality_status | Enum | No | `pending` / `accepted` / `rejected` **(proposed values)**; unusable photos are rejected with a retake request (PRD BR-15, FR-13). |
| rejection_reason | String | No | Reason returned on rejection **(proposed)** (PRD BR-15). |
| is_private | Boolean | Yes | Private by default (PRD BR-33, NFR-007). Default `true`. |
| created_at | DateTime | Yes | Record creation timestamp **(proposed)**. |

## Entity: RenderRequest

A single render or edit request; counts as one attempt against the daily limit and is tracked for cost (PRD FR-17, BR-20; NFR-005).

| Field | Type | Required | Description |
|---|---|---|---|
| id | UUID | Yes | Primary key **(proposed)**. |
| project_id | UUID (FK) | Yes | Source session **(proposed)** → `Project`. |
| user_id | UUID (FK) | No | Requesting user; nullable for guests **(proposed)** → `User`. |
| type | Enum | Yes | `generate` or `edit`; each generation or edit counts as one attempt (PRD BR-20). Targeted edits are FR-052 (not in the pilot). |
| status | Enum | No | `queued` / `processing` / `completed` / `failed` **(proposed values)**; graceful degradation may queue when cost thresholds are exceeded (NFR-004). |
| parent_render_id | UUID (FK) | No | Prior render being re-rendered/edited **(proposed)** → `Render` (PRD FR-18). |
| refinement_input | Text | No | Answers to targeted refinement questions **(proposed)** (PRD FR-18 / FR-051). Not in the pilot. |
| inference_cost | Decimal | No | Tracked cost per render **(proposed)** (NFR-005); a global inference-cost threshold applies (NFR-003). |
| counts_against_limit | Boolean | No | Whether this attempt is metered **(proposed)** (PRD BR-19/BR-20). Daily free-render limit decided (pilot): no limit; the PRD default of five/day applies only post-pilot - see ADR-009. Metering is excluded from the pilot. |
| created_at | DateTime | Yes | Request timestamp **(proposed)**. |

## Entity: Render

A generated photorealistic image of the furnished room, private by default and published to the requesting user immediately on generation success (PRD FR-06, BR-33; ADR-025, 2026-07-14 — the FR-027 operator review is retired).

| Field | Type | Required | Description |
|---|---|---|---|
| id | UUID | Yes | Primary key **(proposed)**. |
| render_request_id | UUID (FK) | Yes | Originating request **(proposed)** → `RenderRequest`. |
| project_id | UUID (FK) | Yes | Source session **(proposed)** → `Project`. |
| image_ref | URL / String | Yes | Storage reference for the generated image (PRD FR-06). |
| status | Enum | Yes | `completed` / `failed` **(proposed values)**; the render is published to the user immediately on generation success. *(Superseded by ADR-025, 2026-07-14: review states `pending_review`/`approved`/`rejected` removed; removed from code by FEAT-016 (#38).)* |
| reviewed_by | UUID (FK) | No | **Retired — ADR-025 (2026-07-14):** render review removed; field slated for removal from the schema. *(Pilot: built, PR #27 — stamped from the operator session; removal is next-iteration work.)* |
| reviewed_at | DateTime | No | **Retired — ADR-025 (2026-07-14):** render review removed; field slated for removal from the schema. *(Pilot: built, PR #27 — removal is next-iteration work.)* |
| total_product_cost | Decimal | No | Sum of rendered products **(proposed / derived)**; must stay within budget plus tolerance (PRD BR-9). |
| within_budget | Boolean | No | Whether total is within budget + tolerance **(proposed)** (PRD BR-9, FR-14). Tolerance decided (pilot): 10% - see ADR-008. |
| is_private | Boolean | Yes | Private by default (PRD BR-33, NFR-007). Default `true`. |
| created_at | DateTime | Yes | Record creation timestamp **(proposed)**. |

## Entity: RenderItem

The link between a Render and a shown Product, carrying tag data: position, name, price, supplier, warranty, and listing link (PRD FR-07). Every RenderItem references a real, purchasable SKU (BR-6).

| Field | Type | Required | Description |
|---|---|---|---|
| id | UUID | Yes | Primary key **(proposed)**. |
| render_id | UUID (FK) | Yes | Parent render **(proposed)** → `Render`. |
| product_id | UUID (FK) | Yes | The real SKU shown; never fabricated (PRD BR-6, BR-14) → `Product`. |
| tag_position | JSON | No | On-image tag coordinates for tap-to-view **(proposed)** (PRD FR-07b). |
| display_name | String | Yes | Product name captured at render time (PRD FR-07). |
| captured_price | Decimal | Yes | Price captured at render time (PRD FR-07). |
| supplier_id | UUID (FK) | Yes | Supplier shown in the tag (PRD FR-07) → `Supplier`. |
| warranty_terms | Text | No | Warranty shown in the tag (PRD FR-07, BR-18). |
| listing_url | URL | No | Listing link shown in the tag (PRD FR-07). |
| rendered_scale | JSON | No | Applied scale/placement metadata **(proposed)** (PRD BR-7, FR-15). |
| is_kept_item | Boolean | No | Marks an existing item kept by the user **(proposed)** (PRD BR-8). Kept items remain in the render but are excluded from cart and budget. Keep-or-replace is **excluded from the pilot**. |

## Entity: Cart

The auto-populated, user-confirmable suggestion of products derived from a render (PRD FR-08, BR-31).

| Field | Type | Required | Description |
|---|---|---|---|
| id | UUID | Yes | Primary key **(proposed)**. |
| project_id | UUID (FK) | Yes | Source session **(proposed)** → `Project`. |
| render_id | UUID (FK) | Yes | Render the cart was populated from (PRD FR-08) → `Render`. |
| user_id | UUID (FK) | No | Owning user; nullable for guests **(proposed)** → `User`. |
| status | Enum | Yes | `draft` / `confirmed` **(proposed values)**; the cart is a suggestion and must be explicitly confirmed before payment (PRD BR-31, FR-35). |
| confirmed_at | DateTime | No | Explicit confirmation timestamp **(proposed)** (PRD BR-31). |
| currency | String | Yes | Cart currency, shown in local currency (PRD BR-27). |
| subtotal | Decimal | No | Sum of cart items **(proposed / derived)**. |
| created_at | DateTime | Yes | Record creation timestamp **(proposed)**. |

## Entity: CartItem

A single product entry in the cart with quantity and captured price (PRD FR-08, FR-09).

| Field | Type | Required | Description |
|---|---|---|---|
| id | UUID | Yes | Primary key **(proposed)**. |
| cart_id | UUID (FK) | Yes | Parent cart **(proposed)** → `Cart`. |
| product_id | UUID (FK) | Yes | Referenced product (PRD FR-08) → `Product`. |
| render_item_id | UUID (FK) | No | Originating render tag **(proposed)** → `RenderItem`. |
| quantity | Integer | Yes | Quantity **(proposed)**; defaults to 1. |
| unit_price | Decimal | Yes | Price captured when added; revalidated at checkout (PRD BR-24). |
| currency | String | Yes | Line currency (PRD BR-27). |
| created_at | DateTime | Yes | Record creation timestamp **(proposed)**. |

Note: kept items (see `RenderItem.is_kept_item`) are excluded from the cart (PRD BR-8).

## Entity: StockHold

A time-boxed reservation of stock for a cart item, released on expiry (PRD FR-19, BR-22, BR-23).

| Field | Type | Required | Description |
|---|---|---|---|
| id | UUID | Yes | Primary key **(proposed)**. |
| cart_item_id | UUID (FK) | Yes | Held line **(proposed)** → `CartItem`. |
| product_id | UUID (FK) | Yes | Product whose stock is held **(proposed)** → `Product`. |
| quantity | Integer | Yes | Quantity held **(proposed)** (PRD BR-22). |
| held_at | DateTime | Yes | When the hold started; a hold is placed on add-to-cart (PRD BR-22). |
| expires_at | DateTime | Yes | Expiry = `held_at` + hold duration. Decided (pilot): no stock hold; the PRD default of 15 minutes applies only post-pilot - see ADR-011. |
| status | Enum | Yes | `active` / `released` / `consumed` **(proposed values)**; expired holds return stock to availability (PRD BR-23). |

Note: applies to ready-made stock. Stock holds are **excluded from the pilot** (FR-039/FR-040 not included).

## Entity: Order

A confirmed purchase resulting from a single user payment spanning one or more suppliers (PRD FR-11, BR-25, BR-26).

| Field | Type | Required | Description |
|---|---|---|---|
| id | UUID | Yes | Primary key **(proposed)**. |
| user_id | UUID (FK) | No | Buyer; nullable for guest checkout **(proposed)** → `User` (PRD FR-004, BR-26). |
| cart_id | UUID (FK) | Yes | Confirmed cart the order came from **(proposed)** → `Cart` (PRD BR-31). |
| payment_id | UUID (FK) | No | The single payment for the order **(proposed)** → `Payment` (PRD FR-11). |
| market_id | UUID (FK) | No | Market/locality of the order **(proposed)** → `Market`. |
| status | Enum | No | `pending` / `confirmed` / `in_fulfillment` / `completed` / `cancelled` **(proposed values)**. |
| total_amount | Decimal | Yes | Order total (PRD FR-11). |
| currency | String | Yes | Order currency, shown in local currency (PRD BR-27). |
| contact_email | String | Conditional | Validated email; required for guest checkout (PRD BR-26). |
| contact_phone | String | Conditional | Phone; required for guest checkout (PRD BR-26). |
| shipping_address | JSON | Yes | Shipping information; required for guest checkout (PRD BR-26). Structure **(proposed)**. |
| commission_id | UUID (FK) | No | Retained marketplace commission **(proposed)** → `Commission` (PRD BR-28). |
| created_at | DateTime | Yes | Record creation timestamp **(proposed)**. |

## Entity: PurchaseOrder

One per supplier, generated from an Order and forwarded to the supplier for fulfillment (PRD FR-11, BR-25). In the pilot, an operator forwards each one manually (FR-061).

| Field | Type | Required | Description |
|---|---|---|---|
| id | UUID | Yes | Primary key **(proposed)**. |
| order_id | UUID (FK) | Yes | Parent order (PRD BR-25) → `Order`. |
| supplier_id | UUID (FK) | Yes | Supplier fulfilling this PO; one PO per supplier (PRD BR-25) → `Supplier`. |
| status | Enum | No | `created` / `sent_to_supplier` / `accepted` / `in_production` / `shipped` / `delivered` / `cancelled` **(proposed values)**. |
| subtotal | Decimal | Yes | Supplier's portion of the order **(proposed)**. |
| currency | String | Yes | Currency (PRD BR-27). |
| production_estimate | String / Integer | No | Aggregated supplier production estimate (PRD BR-17). |
| delivery_estimate | String / Integer | No | Aggregated supplier delivery estimate (PRD BR-17). |
| forwarded_by | UUID (FK) | No | Operator who forwarded the PO in the pilot → `Operator` (pilot; FR-061). *(Pilot: built, PR #27 — stamped from the operator session.)* |
| forwarded_at | DateTime | No | Manual forward timestamp (pilot; FR-061). *(Pilot: built, PR #27.)* |
| created_at | DateTime | Yes | Record creation timestamp **(proposed)**. |

Note: automated split settlement and one-PO-per-supplier automation are **excluded from the pilot** (handled manually by the operator).

## Entity: OrderTracking

Status and tracking updates per purchase order (PRD FR-12). Full tracking is a PRD "basic" item and is not in the pilot.

| Field | Type | Required | Description |
|---|---|---|---|
| id | UUID | Yes | Primary key **(proposed)**. |
| purchase_order_id | UUID (FK) | Yes | Tracked PO (PRD FR-12) → `PurchaseOrder`. |
| status | String | Yes | Current fulfillment status (PRD FR-12). |
| tracking_number | String | No | Carrier tracking number **(proposed)**. |
| carrier | String | No | Shipping carrier **(proposed)**. |
| status_updated_at | DateTime | Yes | When the status last changed **(proposed)**. |
| notes | Text | No | Free-text update note **(proposed)**. |

## Entity: Payment

The single user payment record, PCI-processed, feeding split settlement and commission retention (PRD FR-11, NFR-009–NFR-012, BR-28).

| Field | Type | Required | Description |
|---|---|---|---|
| id | UUID | Yes | Primary key **(proposed)**. |
| order_id | UUID (FK) | Yes | Paid order (PRD FR-11) → `Order`. |
| amount | Decimal | Yes | Total charged in one payment (PRD FR-11). |
| currency | String | Yes | Payment currency; multi-currency support (NFR-011, BR-27). |
| status | Enum | No | `pending` / `authorized` / `captured` / `failed` / `refunded` **(proposed values)**. |
| gateway_reference | String | No | External gateway transaction id **(proposed)**; gateway decided (pilot): a single PCI-compliant hosted checkout collecting one payment in COP (provider selection revisit before scale) - see ADR-003. |
| payment_method | String | No | Method used **(proposed)**; per-market methods (NFR-018). |
| commission_amount | Decimal | No | Commission retained by Spazio **(proposed)** (PRD BR-28) → `Commission`. |
| split_settlement | JSON | No | Per-supplier payout breakdown **(proposed structure)** (NFR-010); decided (pilot): no split settlement - the operator pays suppliers manually (revisit before scale) - see ADR-003 / ADR-004. **Excluded from the pilot**. |
| paid_at | DateTime | No | Capture timestamp **(proposed)**. |
| created_at | DateTime | Yes | Record creation timestamp **(proposed)**. |

Note: card data is handled by the PCI-compliant gateway and is not stored by Spazio **(proposed)** (NFR-009); gateway and merchant-of-record model decided (pilot): a single PCI-compliant hosted checkout collecting one COP payment, with the Spazio operating entity as merchant of record paying suppliers manually (revisit before scale) - see ADR-003 / ADR-004.

## Entity: Commission

The marketplace fee Spazio retains on each completed purchase (PRD BR-28, §9).

| Field | Type | Required | Description |
|---|---|---|---|
| id | UUID | Yes | Primary key **(proposed)**. |
| order_id | UUID (FK) | Yes | Order the fee applies to **(proposed)** → `Order` (PRD BR-28). |
| rate | Decimal | Yes | Commission rate. Decided (pilot): 10% of product price, reconciled manually - see ADR-007. |
| base_amount | Decimal | Yes | Amount the commission is computed on **(proposed)** (PRD §9 "of the product price"). |
| amount | Decimal | Yes | Computed commission amount **(proposed)**. |
| currency | String | Yes | Currency (PRD BR-27). |
| created_at | DateTime | Yes | Record creation timestamp **(proposed)**. |

## Entity: DeliveryZone

A geographic area a supplier can deliver to, used for locality filtering and delivery fallback (PRD FR-05, BR-11, BR-12).

| Field | Type | Required | Description |
|---|---|---|---|
| id | UUID | Yes | Primary key **(proposed)**. |
| supplier_id | UUID (FK) | Yes | Supplier serving this zone **(proposed)** → `Supplier` (PRD BR-11). |
| market_id | UUID (FK) | No | Market the zone belongs to **(proposed)** → `Market`. |
| name | String | Yes | Zone name, e.g. "Bogotá" (pilot: one delivery zone). |
| geo_definition | JSON | No | Boundary definition (postal codes / city list / polygon) **(proposed)**. |
| delivery_available | Boolean | No | Whether local delivery is currently available **(proposed)** (PRD BR-11). |
| fallback_options | JSON | No | Nearby regions / alternative shipping / pickup **(proposed structure)** (PRD BR-12). |

## Entity: Market

A launch region/city with its currency, taxes, payment methods, and legal configuration (PRD NFR-017, NFR-018). Initial markets decided (pilot): Bogotá, Colombia; COP only - see ADR-015.

| Field | Type | Required | Description |
|---|---|---|---|
| id | UUID | Yes | Primary key **(proposed)**. |
| name | String | Yes | Market name, e.g. "Bogotá, Colombia" (pilot: single market). |
| country_code | String | No | ISO country code **(proposed)**. |
| currency | String | Yes | Local currency; prices shown in it (PRD BR-27). Pilot: COP. |
| locale | String | No | Language/format locale **(proposed)**. |
| tax_config | JSON | No | Per-market tax configuration **(proposed structure)** (NFR-018); taxes decided (pilot): single market (Colombia), taxes/invoicing handled manually, no tax engine (revisit before scale) - see ADR-018. |
| payment_methods | JSON | No | Per-market payment methods **(proposed structure)** (NFR-018); gateway decided (pilot): a single PCI-compliant hosted checkout collecting one payment in COP - see ADR-003. |
| legal_config | JSON | No | Per-market legal/compliance settings **(proposed structure)** (NFR-018); decided (pilot): single Colombian market with taxes/invoicing handled manually (ADR-018) and privacy via a short notice + consent aligned to Ley 1581 with minimum data (legal review before scale) - see ADR-018 / ADR-019. |
| status | Enum | No | `active` / `inactive` **(proposed)**. |

## Entity: SponsoredPlacement

A paid premium-visibility record usable only to break ties among similarly relevant products (PRD §9, BR-29, BR-30, FR-054). Plan and pricing decided (pilot): not offered (deferred) - see ADR-017. Excluded from the pilot.

| Field | Type | Required | Description |
|---|---|---|---|
| id | UUID | Yes | Primary key **(proposed)**. |
| supplier_id | UUID (FK) | Yes | Sponsoring supplier **(proposed)** → `Supplier` (PRD §9). |
| product_id | UUID (FK) | No | Promoted product, if scoped to a SKU **(proposed)** → `Product`. |
| market_id | UUID (FK) | No | Market the placement applies to **(proposed)** → `Market`. |
| weight | Decimal | No | Tie-break weight **(proposed)**; may only break ties, never override relevance/quality/budget/locality/availability (PRD BR-29, BR-30). |
| active_from | DateTime | No | Start of the placement window **(proposed)**. |
| active_to | DateTime | No | End of the placement window **(proposed)**. |
| status | Enum | No | `active` / `inactive` **(proposed)**. |

---

## Rules

PRD-derived invariants that constrain the data model. Each cites its source. Decision values are tagged with their `ADR-` and are adopted for the one-week iOS pilot (some carry an explicit revisit-before-scale caveat).

### Identity and accounts

- **Unique email.** A registered user's email must be unique; guest-checkout email must be validated (PRD FR-01, BR-26).
- **No plaintext credentials.** Passwords are stored only as hashes; the authentication mechanism follows the decided stack (see ADR-001), and the pilot has no end-user accounts/login/password - see ADR-022 (NFR-008).
- **Guest checkout data.** Guest checkout requires a validated email, a phone number, and shipping information (PRD BR-26).

### Catalog integrity

- **Required attributes.** A catalog entry must carry photos, dimensions, price, available colors, materials, stock/inventory, category, style attributes, production & delivery lead time, and warranty terms (PRD BR-1).
- **Incomplete entries excluded from rendering.** Entries missing any required attribute are not eligible for rendering (PRD BR-2).
- **Classification.** Every product is either `ready_made` (in-stock) or `made_to_order`/manufacturable (PRD BR-3). Ready-made requires current stock (BR-4); made-to-order requires supplier-declared production and delivery times (BR-5).
- **Shared taxonomy.** Products must be mapped to the shared style taxonomy (PRD BR-16); the taxonomy vocabulary decided (pilot): 1-2 predefined visual styles + free-text description; no taxonomy engine - see ADR-005.
- **Catalog synchronization.** Supplier data must synchronize regularly, and in real time for ready-made stock (PRD BR-32); frequency decided (pilot): manual / on-demand refresh by the operator; no automated sync - see ADR-012.

### Rendering

- **Real SKUs only.** Every rendered item must correspond to a real, purchasable SKU; the system must never fabricate products (PRD BR-6, BR-14). Each `RenderItem` references a `Product`.
- **Availability gate.** Ready-made items must never be rendered when unavailable (PRD BR-4).
- **Locality gate.** Only products deliverable to the user's locality may be rendered (PRD BR-11); when local delivery is unavailable, the system may offer nearby regions, alternative shipping, or pickup (BR-12).
- **Scale to room.** Approximate room dimensions must be used to scale products realistically (PRD BR-7, FR-15).
- **Budget bound.** Total product cost should not exceed the budget beyond an agreed tolerance — decided (pilot) **10%** - see ADR-008 (PRD BR-9). If the budget cannot be met, the system discloses this and offers the closest available alternative (BR-10). When no strong match exists, it suggests similar available products or marks the item unavailable (BR-13).
- **Kept items.** Existing items marked to keep must remain in the render but be excluded from the cart and the budget calculation (PRD BR-8). *(Keep-or-replace is excluded from the pilot.)*
- **Photo quality.** Unusable photos must be rejected with a request to retake (PRD BR-15).
- **Privacy by default.** User photos and generated renders are private by default (PRD BR-33, NFR-007).
- **Human review (pilot).** Superseded by ADR-025 (2026-07-14): the operator render-review gate is retired — renders are published immediately on generation success (FR-027 retired).

### Render metering

- **One attempt per generation/edit.** Every generation or edit counts as one render attempt (PRD BR-20). Free usage decided (pilot): no limit; the PRD default of five attempts per user per day applies only post-pilot - see ADR-009 (BR-19). On reaching the limit, the user may return the next day or buy a render package — package pricing decided (pilot): not offered (deferred) - see ADR-010 (BR-21). *(Metering is excluded from the pilot.)*
- **Cost tracking.** Cost per render is tracked and a global inference-cost threshold applies (NFR-003, NFR-005).

### Cart, holds, and checkout

- **Cart is a suggestion.** The cart is auto-populated from the render and must be explicitly confirmed before payment (PRD BR-31, FR-08, FR-35).
- **Stock hold.** Adding an item to the cart holds stock for a configured duration — decided (pilot): no stock hold; the PRD default of 15 minutes applies only post-pilot - see ADR-011 (PRD BR-22); expired holds return stock to availability (BR-23). *(Stock holds are excluded from the pilot.)*
- **Revalidate at checkout.** Price and stock must be revalidated at checkout before payment (PRD BR-24).
- **Estimates and warranty before checkout.** Supplier-sourced production and delivery estimates and supplier-declared warranty terms must be shown before checkout (PRD BR-17, BR-18, NFR-015).

### Payments and settlement

- **One payment, one PO per supplier.** Checkout produces one user payment and one purchase order per supplier (PRD BR-25). *(Automated split settlement and PO automation are excluded from the pilot; the operator forwards each PO manually — FR-061.)*
- **Local currency.** Prices are shown in the user's local currency (PRD BR-27); the architecture supports multiple currencies (NFR-011, NFR-017).
- **Commission.** Spazio applies a marketplace commission to every completed purchase — decided (pilot) **10%** of product price, reconciled manually - see ADR-007 (PRD BR-28).
- **PCI compliance.** Payment processing must be PCI-compliant; card data is handled by the gateway — decided (pilot): a single PCI-compliant hosted checkout collecting one COP payment with no split settlement, and the Spazio operating entity as merchant of record paying suppliers manually (revisit before scale) - see ADR-003 / ADR-004 (NFR-009–NFR-012).

### Monetization visibility

- **Sponsored tie-break only.** Sponsored placement may only break ties among similarly relevant, high-quality products, and must never override relevance, product quality, budget, locality, or availability (PRD BR-29, BR-30). Plan and pricing decided (pilot): not offered (deferred) - see ADR-017. *(Excluded from the pilot.)*

### Internationalization

- **Per-market configuration.** Taxes, payment methods, and legal requirements must be configurable per market (NFR-018); taxes and compliance decided (pilot): single Colombian market, taxes/invoicing handled manually, privacy via a short notice + consent aligned to Ley 1581 with minimum data (revisit / legal review before scale) - see ADR-018 / ADR-019. Initial launch markets decided (pilot): Bogotá, Colombia; COP only - see ADR-015; the pilot runs in a single market (Bogotá, COP).
