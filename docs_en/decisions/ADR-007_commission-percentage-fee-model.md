# ADR-007 - Commission percentage & marketplace fee model

## Status

Proposed.

## Context

The PRD reserves the commission percentage as a human decision (PRD §12, "Human definitions": "Commission percentage"). Nothing is built yet.

What the PRD states:

- The primary revenue stream is a commission on completed purchases made from generated renders, "**for example 10%** of the product price" (PRD §9, "Commission per sale"). The 10% figure is a **PRD-stated example**, not a decided rate.
- Spazio applies a marketplace commission to every completed purchase (BR-28; FR-045).
- The gateway must support automatic Spazio commission retention (NFR-012), and the commission interacts with settlement (ADR-003) and merchant-of-record (ADR-004).
- The canonical `Commission` entity is described as "the marketplace fee Spazio retains on each completed purchase (PRD example 10%, TBD)."

This ADR must decide both the **fee model** (how commission is structured) and the **rate(s)**. The pilot does not require automated commission (fulfillment is manual — FR-061), so this is a full-product decision.

## Decision

PENDING - to be decided by the team.

## Alternatives considered

1. **Flat percentage on product price (e.g., the PRD's example 10%, to be confirmed).**
   - Pros: Simple to explain to suppliers and to compute; matches BR-28 and the PRD example; easy to retain automatically (NFR-012).
   - Cons: One rate may not fit categories with very different margins; may be too high for low-margin suppliers or too low to cover inference cost (NFR-003, NFR-005).

2. **Tiered / category- or supplier-specific rates.**
   - Pros: Aligns commission with each category's margins and supplier value; can incentivize onboarding of key suppliers (ADR-016).
   - Cons: More complex to administer, communicate, and reconcile; harder to display and audit.

3. **Flat fee per order (or per purchase order) instead of a percentage.**
   - Pros: Predictable revenue per transaction; simple.
   - Cons: Poorly matched to order value (unfair on small orders, cheap on large ones); diverges from the PRD's percentage framing (PRD §9).

4. **Hybrid (percentage plus a minimum fee, or percentage plus listing/placement fees).**
   - Pros: Protects revenue on small orders while staying proportional on large ones; can combine with sponsored placement (ADR-017).
   - Cons: More moving parts; risk of supplier pushback; harder to keep transparent.

(The rate level is a separate axis from the model and must be set with unit economics in mind — inference cost per render (NFR-005) versus render-to-purchase conversion (NFR-006).)

## Positive consequences

- Resolving this defines the primary revenue stream (PRD §9) and lets the gateway automate retention (NFR-012, FR-045).
- A rate set against real inference cost and conversion data protects margin and de-risks the "low conversion → high rendering expense" risk (PRD §10, "Inference cost").

## Negative consequences

- Too high a rate deters supplier onboarding (worsening cold-start risk, PRD §10); too low a rate may not cover rendering cost.
- Commission is tightly coupled to merchant-of-record (ADR-004) and taxes (ADR-018); setting it in isolation risks financial or legal misalignment.

## Date

TBD.
