# ADR-011 - Cart-hold duration

## Status

Accepted.

## Context

The PRD reserves the cart-hold duration as a human decision (PRD §12, "Human definitions": "Cart-hold duration"). Nothing is built yet (point-in-time context as of this decision, 2026-07-10; 2026-07-15: a working web app + backend are now built and verified locally — see ADR-024+ and the current-system summary — so this reads as historical, not a present-tense claim).

What the PRD states:

- Adding an item to the cart holds stock for **15 minutes** (BR-22; PRD §3 "Must have": "Fifteen-minute cart stock hold"). The 15-minute figure is a **PRD-stated default**, not a final decision.
- The system places a stock hold when a product is added to the cart, for the configured duration (FR-039; BR-22); expired holds return stock to availability (FR-040; BR-23); price and stock are revalidated at checkout (FR-041; BR-24).
- The canonical `StockHold` entity is "a time-boxed reservation of stock for a cart item (PRD default 15 minutes, TBD), released on expiry."
- Holds matter mainly for ready-made stock, which must never be rendered/sold when unavailable (BR-4; FR-018); made-to-order items have lead times rather than fixed stock (BR-5).

Pilot context: stock holds (FR-039, FR-040) are **not** in the pilot's included set, and the pilot has a small manually curated catalog with a single simple checkout, so contention is low. This is primarily a full-product decision, though the value affects any early checkout logic.

## Decision

NO stock hold in the pilot (tiny manually-curated catalog; operator checks availability). The PRD's 15-minute hold applies only when holds are built post-pilot. Scope: one-week iOS pilot.

## Alternatives considered

1. **Keep the PRD default of 15 minutes (to be confirmed).**
   - Pros: Matches BR-22 and the "Must have" list; a familiar e-commerce hold length; enough time to review, remove, or swap items (FR-032–FR-034) and check out.
   - Cons: On scarce ready-made stock, 15 minutes per abandoned cart can lock inventory away from other buyers.

2. **Shorter hold (e.g., 5–10 minutes).**
   - Pros: Frees scarce stock faster; reduces false unavailability for other users.
   - Cons: May expire before a user finishes reviewing/swapping and paying, causing revalidation failures at checkout (BR-24) and lost sales.

3. **Longer hold (e.g., 30–60 minutes).**
   - Pros: Very comfortable for slower buyers; fewer mid-checkout expirations.
   - Cons: Locks stock longer; worse for scarce inventory and cold-start catalogs (PRD §10).

4. **Dynamic duration by stock type or scarcity (e.g., shorter for low-stock ready-made items; not needed for made-to-order).**
   - Pros: Balances buyer comfort against inventory contention; recognizes that made-to-order items (BR-5) do not need the same hold.
   - Cons: More complex to implement and explain; needs reliable real-time stock data (BR-32).

## Positive consequences

- A resolved duration makes the hold/expiry/revalidation flow (FR-039–FR-041; BR-22–BR-24) well-defined and testable.
- Tuning it against real inventory scarcity balances conversion (enough time to buy) against availability (not locking scarce stock).

## Negative consequences

- Too long a hold on scarce ready-made stock creates false "unavailable" for other buyers; too short a hold expires mid-checkout, triggering revalidation failures (BR-24) and lost sales.
- The value interacts with catalog synchronization frequency (ADR-012) and real-time stock accuracy (BR-32); a hold is only as trustworthy as the stock data behind it.

## Date

2026-07-10.
