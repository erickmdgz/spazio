# Test plan

## Strategy

The system's main flows will be tested before closing each feature.

## Test types

- Functional tests.
- Validation tests.
- Basic security tests.
- Simple regression tests.
- Manual user tests.

## Test cases

<!-- Each TC- maps 1:1 to an acceptance criterion of an FR (see 03_requirements.md). Status is validity of the case, not execution result; all start Pending. `Automated (#NN)` = validated by automated tests in that PR. `Retired — ADR-025 (2026-07-14)` = the case tests the removed render-review gate and is no longer a valid case; rows are kept for history. Nothing here is implemented. -->

| ID | Feature | Requirement | Case | Expected result | Status |
|---|---|---|---|---|---|
| TC-001 | FEAT-001 Accounts & identity | FR-001 | Register with a unique email and password | A user account is created with status `active` | Pending |
| TC-002 | FEAT-001 Accounts & identity | FR-001 | Register with an already-registered email | Registration is rejected with a `duplicate-email` error and no account is created | Pending |
| TC-003 | FEAT-001 Accounts & identity | FR-001 | Register with a missing or malformed required field | Registration is rejected with a validation error naming the offending field | Pending |
| TC-004 | FEAT-001 Accounts & identity | FR-002 | Sign in with valid credentials for an active account | An authenticated session is established (session/token issued) | Pending |
| TC-005 | FEAT-001 Accounts & identity | FR-002 | Sign in with invalid credentials | The attempt is rejected with an `authentication-failed` status and no session is established | Pending |
| TC-006 | FEAT-001 Accounts & identity | FR-003 | Authenticated user submits valid profile/preference changes | The changes are persisted and reflected on the account | Pending |
| TC-007 | FEAT-001 Accounts & identity | FR-003 | Unauthenticated request attempts to change a profile | The request is rejected with an `unauthorized` status and nothing is persisted | Pending |
| TC-008 | FEAT-010 Checkout & payments | FR-004 | Guest supplies validated email, phone, and complete shipping info | Guest checkout is accepted and the contact/shipping data is captured for the order | Pending |
| TC-009 | FEAT-010 Checkout & payments | FR-004 | Guest supplies an email that fails validation | Checkout is rejected with an `email-validation` error and no order is created | Pending |
| TC-010 | FEAT-010 Checkout & payments | FR-004 | Guest omits phone number or shipping information | Checkout is rejected with the missing field flagged | Pending |
| TC-011 | FEAT-002 Room capture & inputs | FR-005 | Upload a supported image file | The photo is stored, associated with the project, and marked private by default | Pending |
| TC-012 | FEAT-002 Room capture & inputs | FR-005 | Upload an unsupported file type or oversized file | The upload is rejected with a `file-format`/`file-size` error and no photo is stored | Pending |
| TC-013 | FEAT-002 Room capture & inputs | FR-006 | Capture a photo with camera permission granted | The captured image is stored and associated with the project | Pending |
| TC-014 | FEAT-002 Room capture & inputs | FR-006 | Attempt capture with camera permission denied | Capture is blocked with a `permission-required` status and no image is stored | Pending |
| TC-015 | FEAT-003 Style & budget selection | FR-007 | Select a predefined style from the catalog | The selection is persisted on the project | Pending |
| TC-016 | FEAT-003 Style & budget selection | FR-008 | Enter a free-text style description | The text is persisted on the project | Pending |
| TC-017 | FEAT-003 Style & budget selection | FR-009 | Enter a valid budget with minimum ≤ maximum | The budget range is persisted on the project | Pending |
| TC-018 | FEAT-003 Style & budget selection | FR-009 | Enter minimum greater than maximum, or a negative/non-numeric value | The input is rejected with a `budget-range` validation error and nothing is persisted | Pending |
| TC-019 | FEAT-003 Style & budget selection | FR-010 | Enter a free-text description of the intended room change | The text is persisted on the project | Pending |
| TC-020 | FEAT-002 Room capture & inputs | FR-011 | Enter valid positive room dimensions | The dimensions are persisted on the project | Pending |
| TC-021 | FEAT-002 Room capture & inputs | FR-011 | Enter a non-positive or non-numeric dimension value | The input is rejected with a `dimension-validation` error and nothing is persisted | Pending |
| TC-022 | FEAT-004 Localization & delivery coverage | FR-012 | Evaluate suppliers for a resolvable user location | The set of suppliers serving that locality is returned | Pending |
| TC-023 | FEAT-004 Localization & delivery coverage | FR-012 | Evaluate suppliers for a location that cannot be resolved | An `unresolved-location` status is returned with an empty supplier set | Pending |
| TC-024 | FEAT-004 Localization & delivery coverage | FR-013 | Evaluate the delivery zone for a resolvable location | The matching delivery zone is assigned to the project | Pending |
| TC-025 | FEAT-004 Localization & delivery coverage | FR-013 | Evaluate a location outside all defined delivery zones | A `no-coverage` status is returned (triggering delivery fallback per FR-053) | Pending |
| TC-026 | FEAT-005 AI rendering engine | FR-014 | Match with products satisfying style, dimensions, budget, and locality | A set of real, available SKUs is selected | Pending |
| TC-027 | FEAT-005 AI rendering engine | FR-014 | Match when no product satisfies the constraints | An `empty-match` status is returned (triggering the no-match fallback per FR-023) | Pending |
| TC-028 | FEAT-005 AI rendering engine | FR-015 | Generate a render from matched SKUs and a valid room photo | A render compositing those SKUs into the photo is produced with status `completed` and published to the user *(review state removed — ADR-025, 2026-07-14)* | Pending |
| TC-029 | FEAT-005 AI rendering engine | FR-015 | Render generation fails | A `render-failed` status is recorded and no render is shown to the user | Pending |
| TC-030 | FEAT-005 AI rendering engine | FR-016 | Validate items of a generated render | Every rendered item references an existing, purchasable catalog SKU | Pending |
| TC-031 | FEAT-005 AI rendering engine | FR-016 | Render contains an item with no matching catalog SKU | The render is blocked with a `fabricated-item` flag and is not shown to the user | Pending |
| TC-032 | FEAT-005 AI rendering engine | FR-017 | Generate a render with room and product dimensions available | Products are scaled proportionally to the captured room dimensions | Pending |
| TC-033 | FEAT-005 AI rendering engine | FR-017 | Request a render with room dimensions missing | Render generation is blocked with a `missing-dimensions` status | Pending |
| TC-034 | FEAT-005 AI rendering engine | FR-018 | Match ready-made products with current stock greater than zero | Only in-stock ready-made items are rendered | Pending |
| TC-035 | FEAT-005 AI rendering engine | FR-018 | Match a ready-made product with zero or no current stock | It is excluded from the render with an `out-of-stock` exclusion | Pending |
| TC-036 | FEAT-005 AI rendering engine | FR-019 | Evaluate a catalog entry with all required attributes present | The entry is marked eligible for rendering | Pending |
| TC-037 | FEAT-005 AI rendering engine | FR-019 | Evaluate a catalog entry missing a required attribute | The entry is excluded with an `incomplete-data` flag | Pending |
| TC-038 | FEAT-004 Localization & delivery coverage | FR-020 | Match products deliverable to the user's locality | Only locally-deliverable products are rendered | Pending |
| TC-039 | FEAT-004 Localization & delivery coverage | FR-020 | Match a product not deliverable to the user's locality | It is excluded with a `locality` exclusion | Pending |
| TC-040 | FEAT-005 AI rendering engine | FR-021 | Finalize a render within budget plus tolerance | The total product cost is within the budget maximum plus the agreed tolerance | Pending |
| TC-041 | FEAT-005 AI rendering engine | FR-021 | Finalize when the only combination exceeds budget plus tolerance | A `budget-exceeded` status is raised (triggering FR-022) | Pending |
| TC-042 | FEAT-005 AI rendering engine | FR-022 | Budget cannot be met but an alternative exists | The system discloses the budget shortfall and presents the closest available alternative | Pending |
| TC-043 | FEAT-005 AI rendering engine | FR-022 | Budget cannot be met and no alternative exists | A `no-alternative` disclosure is shown and the item is marked unavailable | Pending |
| TC-044 | FEAT-005 AI rendering engine | FR-023 | No strong match but similar available products exist | Similar alternatives are suggested | Pending |
| TC-045 | FEAT-005 AI rendering engine | FR-023 | No strong match and no similar available products | The item is marked `unavailable` | Pending |
| TC-046 | FEAT-002 Room capture & inputs | FR-024 | Validate a photo that passes the quality checks | The photo is accepted for rendering | Pending |
| TC-047 | FEAT-002 Room capture & inputs | FR-024 | Validate an unusable photo | It is rejected with a `quality-failed` status and a retake request | Pending |
| TC-048 | FEAT-012 Keep-or-replace segmentation | FR-025 | User marks an existing item as keep or replace | The mark is persisted on the project | Pending |
| TC-049 | FEAT-012 Keep-or-replace segmentation | FR-026 | Generate a render with an item marked keep | The kept item remains visible in the render | Pending |
| TC-050 | FEAT-012 Keep-or-replace segmentation | FR-026 | Compute cart and budget with an item marked keep | The kept item is excluded from both the cart and the budget total | Pending |
| TC-051 | FEAT-006 Render review & moderation | FR-027 | Operator approves a `pending-review` render | Its status becomes `approved` and it is released to the user | Retired — ADR-025 (2026-07-14) |
| TC-052 | FEAT-006 Render review & moderation | FR-027 | Operator rejects a `pending-review` render | Its status becomes `rejected` and it is not shown to the user | Retired — ADR-025 (2026-07-14) |
| TC-053 | FEAT-006 Render review & moderation | FR-027 | User attempts to view a render not yet reviewed | It is not displayed (blocked by the `pending-review` gate) | Retired — ADR-025 (2026-07-14) |
| TC-054 | FEAT-007 Product tagging & interaction | FR-028 | Generate tags for a completed (published) render *(wording updated per ADR-025)* | Each rendered product carries name, price, supplier, warranty terms, and a listing link | Pending |
| TC-055 | FEAT-007 Product tagging & interaction | FR-029 | Tap a product tag on a completed (published) render *(wording updated per ADR-025)* | The product's details (name, price, supplier, warranty, listing link) are displayed | Pending |
| TC-056 | FEAT-008 Shopping cart & stock holds | FR-030 | Add a tagged, available product to the cart | A cart item is created for that product | Pending |
| TC-057 | FEAT-008 Shopping cart & stock holds | FR-030 | Add a product that is now unavailable | The add is rejected with an `unavailable` status and no cart item is created | Pending |
| TC-058 | FEAT-008 Shopping cart & stock holds | FR-031 | Show a completed (published) render with N tagged products *(trigger changed from approval to generation success — ADR-025)* | The cart is auto-populated with all N products | Pending |
| TC-059 | FEAT-008 Shopping cart & stock holds | FR-032 | Open a populated cart | All cart items with product, quantity, and price are displayed | Pending |
| TC-060 | FEAT-008 Shopping cart & stock holds | FR-033 | Remove an item from the cart | The item is removed and the cart total is recalculated | Pending |
| TC-061 | FEAT-008 Shopping cart & stock holds | FR-034 | Swap a cart item that has available alternatives | The original item is replaced by the chosen alternative and the total is recalculated | Pending |
| TC-062 | FEAT-008 Shopping cart & stock holds | FR-034 | Request a swap for a cart item with no available alternative | The swap is unavailable with a `no-alternative` status | Pending |
| TC-063 | FEAT-008 Shopping cart & stock holds | FR-035 | User confirms the cart | The cart is marked `confirmed` and payment is enabled | Pending |
| TC-064 | FEAT-008 Shopping cart & stock holds | FR-035 | User attempts payment with an unconfirmed cart | Payment is blocked with a `confirmation-required` status | Pending |
| TC-065 | FEAT-009 Estimates & warranty display | FR-036 | Show cart/checkout for items with supplier lead-time data | Each item displays its supplier-sourced production and delivery estimate before checkout | Pending |
| TC-066 | FEAT-009 Estimates & warranty display | FR-036 | Show a cart item lacking supplier estimate data | The item is flagged with a `missing-estimate` status | Pending |
| TC-067 | FEAT-009 Estimates & warranty display | FR-037 | Show the order summary for multiple items with estimates | An aggregated production/delivery estimate for the full order is displayed before checkout | Pending |
| TC-068 | FEAT-009 Estimates & warranty display | FR-038 | Show cart/checkout for items with supplier-declared warranty terms | Each item displays its warranty terms before checkout | Pending |
| TC-069 | FEAT-008 Shopping cart & stock holds | FR-039 | Add a product to the cart successfully | A stock hold is created for the configured hold duration | Pending |
| TC-070 | FEAT-008 Shopping cart & stock holds | FR-039 | Add a product with insufficient stock to place a hold | The hold fails with an `insufficient-stock` status | Pending |
| TC-071 | FEAT-008 Shopping cart & stock holds | FR-040 | Stock hold duration elapses without checkout | The hold is released and the stock returns to availability | Pending |
| TC-072 | FEAT-010 Checkout & payments | FR-041 | Revalidate a confirmed cart whose price/availability are unchanged | Checkout proceeds to payment | Pending |
| TC-073 | FEAT-010 Checkout & payments | FR-041 | Revalidate a cart item whose price or availability changed | Checkout is halted and the changed item is flagged | Pending |
| TC-074 | FEAT-010 Checkout & payments | FR-042 | Pay for a confirmed, revalidated cart | A single payment is processed and an order is created with status `paid` | Pending |
| TC-075 | FEAT-010 Checkout & payments | FR-042 | Payment authorization fails | No order is created and a `payment-failed` status is returned | Pending |
| TC-076 | FEAT-010 Checkout & payments | FR-043 | Settle a paid order spanning multiple suppliers | Funds are split and settled to each supplier | Pending |
| TC-077 | FEAT-010 Checkout & payments | FR-043 | Split settlement to a supplier fails | That supplier's settlement is flagged `failed` for reconciliation | Pending |
| TC-078 | FEAT-010 Checkout & payments | FR-044 | Create an order with items from M distinct suppliers | Exactly one purchase order per supplier (M purchase orders) is generated | Pending |
| TC-079 | FEAT-010 Checkout & payments | FR-045 | Finalize a completed purchase | The marketplace commission is applied and retained by Spazio | Pending |
| TC-080 | FEAT-004 Localization & delivery coverage | FR-046 | Show prices for the user's market/currency | All prices are displayed in that local currency | Pending |
| TC-081 | FEAT-011 Order fulfillment & tracking | FR-047 | View order tracking for a purchase order | The current status and tracking information for that purchase order are displayed | Pending |
| TC-082 | FEAT-011 Order fulfillment & tracking | FR-047 | View tracking for a purchase order with no tracking data yet | A `no-tracking-yet` status is shown | Pending |
| TC-083 | FEAT-013 Render metering & monetization | FR-048 | Request a render as a user below the daily free-render limit | The render proceeds and the user's daily render count increments | Pending |
| TC-084 | FEAT-013 Render metering & monetization | FR-048 | Request a render as a user who has reached the daily free-render limit | The render is blocked with a `limit-reached` status | Pending |
| TC-085 | FEAT-013 Render metering & monetization | FR-049 | Generate a render or apply an edit | The daily counter increments by one for each generation or edit | Pending |
| TC-086 | FEAT-013 Render metering & monetization | FR-050 | Attempt another render as a user at the daily limit | The user is offered the choice to return the next day or to buy a paid render package | Pending |
| TC-087 | FEAT-014 Targeted render refinement | FR-051 | Request a re-render of the same scene | The system asks targeted refinement questions before regenerating | Pending |
| TC-088 | FEAT-014 Targeted render refinement | FR-052 | Run a targeted edit request for one element | Only the requested element changes and the rest of the render is preserved | Pending |
| TC-089 | FEAT-004 Localization & delivery coverage | FR-053 | Return results when local delivery is unavailable | A fallback (nearby regions, alternative shipping, or pickup) is offered | Pending |
| TC-090 | FEAT-004 Localization & delivery coverage | FR-053 | Local delivery unavailable and no fallback option exists | A `no-delivery-available` status is shown | Pending |
| TC-091 | FEAT-013 Render metering & monetization | FR-054 | Order two equally ranked products where one is sponsored | The sponsored product is placed ahead only as a tie-breaker | Pending |
| TC-092 | FEAT-013 Render metering & monetization | FR-054 | Order a sponsored product of lower relevance/quality against a non-sponsored one | Sponsorship does not override the more relevant/higher-quality product | Pending |
| TC-093 | FEAT-015 Supplier catalog management | FR-055 | Supplier submits catalog data via a supported channel | The catalog entries are imported for curation | Pending |
| TC-094 | FEAT-015 Supplier catalog management | FR-055 | Supplier submits in an unsupported format or channel | The submission is rejected with an `unsupported-format` status | Pending |
| TC-095 | FEAT-015 Supplier catalog management | FR-056 | Operator approves an ingested or manually loaded catalog entry | It becomes an active, renderable catalog product | Pending |
| TC-096 | FEAT-015 Supplier catalog management | FR-056 | Operator rejects a catalog entry | It is marked `not-approved` and excluded from rendering | Pending |
| TC-097 | FEAT-015 Supplier catalog management | FR-057 | Save a SKU with all required attributes present | It is stored as complete | Pending |
| TC-098 | FEAT-015 Supplier catalog management | FR-057 | Save a SKU missing a required attribute | It is stored `incomplete` and flagged (excluded from rendering per FR-019) | Pending |
| TC-099 | FEAT-015 Supplier catalog management | FR-058 | Classify a ready-made product | It carries current stock data | Pending |
| TC-100 | FEAT-015 Supplier catalog management | FR-058 | Classify a made-to-order product | It carries supplier-declared production and delivery times | Pending |
| TC-101 | FEAT-015 Supplier catalog management | FR-058 | Save a product classified without required stock/lead-time data | It is flagged with an `invalid-classification` status | Pending |
| TC-102 | FEAT-015 Supplier catalog management | FR-059 | Map a product to the shared style taxonomy | The product carries its style-taxonomy classification | Pending |
| TC-103 | FEAT-015 Supplier catalog management | FR-059 | Evaluate a product with no style-taxonomy mapping | It is flagged `unmapped` and excluded from style matching | Pending |
| TC-104 | FEAT-015 Supplier catalog management | FR-060 | Run synchronization on the configured schedule with supplier updates | Catalog data is updated and ready-made stock is synchronized in real time | Pending |
| TC-105 | FEAT-015 Supplier catalog management | FR-060 | A supplier feed synchronization fails | A `sync-failed` status is recorded for that supplier | Pending |
| TC-106 | FEAT-011 Order fulfillment & tracking | FR-061 | Operator forwards a confirmed, paid order | The order is transmitted to the supplier and marked `forwarded` | Pending |
| TC-107 | FEAT-015 Supplier catalog management | NFR-008 | An operator without the `catalog_curator` role attempts to create or approve a catalog entry | The action is rejected with a `forbidden` (403) status and nothing is persisted | Automated (#34) |
| TC-108 | FEAT-006 Render review & moderation | NFR-008 | An operator without the `render_reviewer` role (or no operator session) attempts to approve or reject a render | The action is rejected (403 without the role; 401 without a session) and the render's review status is unchanged | Retired — ADR-025 (2026-07-14; was Automated #34 — test removal is next-iteration work with the endpoint) |
| TC-109 | FEAT-011 Order fulfillment & tracking | NFR-008 | An operator without the `order_handler` role attempts to forward an order; a buyer requests another buyer's order with a different device token | The forward is rejected with 403; the foreign order read answers 404 with no data leaked | Automated (#34) |
| TC-110 | FEAT-017 Public-catalog fallback | FR-062 | Run the matching/render loop when no supplier catalog satisfies the request | Candidates are drawn from the seeded `source=public` ABO subset and a match/render is produced from real public products *(bootstrap/demo — ADR-027)* | Pending |
| TC-111 | FEAT-017 Public-catalog fallback | FR-062 | Run the matching/render loop when a supplier catalog is available | Only supplier SKUs are used; the public fallback is not activated and the supplier track (in-app checkout, commission, MoR) is unchanged | Pending |
| TC-112 | FEAT-017 Public-catalog fallback | FR-063 | Inspect a public product as it appears in matching, render, and cart contexts | The product carries `source=public`, is visibly labeled `not sold by Spazio`, and is distinguishable from a supplier SKU in every context | Pending |
| TC-113 | FEAT-017 Public-catalog fallback | FR-064 | Run cart, checkout, order, commission, and merchant-of-record paths against a `source=public` product | The public product is excluded from all of them (no cart item, order line, commission, or MoR coverage) | Pending |
| TC-114 | FEAT-017 Public-catalog fallback | FR-064 | Open the card/detail of a public product | A labeled `View at retailer` outbound link is shown and no add-to-cart affordance is present *(display-only)* | Pending |
| TC-115 | FEAT-017 Public-catalog fallback | FR-064 | Attempt to add a `source=public` product to the cart or checkout | The action is refused/absent with a `display-only` status and no cart item is created | Pending |
| TC-116 | FEAT-017 Public-catalog fallback | FR-065 | Display a public product with its provenance recorded | The required CC BY 4.0 attribution (`source_name`, `source_url`, `source_image_url`, `image_license`) is recorded and surfaced on the product | Pending |
| TC-117 | FEAT-017 Public-catalog fallback | FR-065 | Generate a render that composites a public product image | The stored render (a derivative work) carries the propagated image provenance/attribution and displays the CC BY 4.0 attribution | Pending |
| TC-118 | FEAT-017 Public-catalog fallback | FR-065 | Evaluate a `source=public` product missing required attribution for display or rendering | It is excluded/blocked with a `missing-attribution` flag and is neither displayed nor composited | Pending |
| TC-119 | FEAT-017 Public-catalog fallback | NFR-006 | Compute the render-to-purchase metric and commission over a render containing public products | Public products and their non-purchasable renders are excluded from the render-to-purchase metric (NFR-006 segmented) and from commission | Pending |
