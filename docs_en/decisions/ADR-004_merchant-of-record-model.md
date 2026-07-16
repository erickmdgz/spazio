# ADR-004 - Merchant-of-record model

## Status

Accepted. **Scoped by ADR-027 (2026-07-15):** the merchant-of-record model here governs the **supplier track** unchanged. It **does not cover** `source=public` public-catalog bootstrap products (Amazon Berkeley Objects, CC BY 4.0) — Spazio is **not the seller of record** for them because they are **not sold by Spazio at all** (display-only, clearly labeled "not sold by Spazio", with a "View at retailer" outbound link; never in cart/checkout/orders). See `decisions/ADR-027_public-catalog-bootstrap-fallback.md`.

## Context

The PRD reserves the merchant-of-record (MoR) model as a human decision (PRD §12, "Human definitions"). Nothing is built yet (point-in-time context as of this decision, 2026-07-10; 2026-07-15: a working web app + backend are now built and verified locally — see ADR-024+ and the current-system summary — so this reads as historical, not a present-tense claim).

The MoR is the legal seller in each transaction — the party responsible to the buyer for the sale, and typically the party accountable for tax collection/remittance and much of consumer protection. Spazio's model raises the question directly because:

- A single user payment can span multiple suppliers, producing one purchase order per supplier (FR-042, FR-044; BR-25), and funds are settled to multiple suppliers via split settlement (FR-043). Who is the seller of record for that combined transaction is not specified.
- Spazio retains a marketplace commission on every completed purchase (FR-045; BR-28), which frames it as an intermediary — but MoR status is a separate legal question.
- The MoR choice drives taxes (ADR-018), data privacy and consumer protection (ADR-019), warranty and dispute resolution (ADR-020), and the payment/settlement model (ADR-003).
- Multi-country complexity is a documented risk: "Taxes, payment rails, consumer protection, and local legal requirements are not [simple]" (PRD §10).

This decision needs legal input and is explicitly outside the AI's authority (PRD §2 principles; §12).

## Decision

Decided (pilot): the Spazio operating entity collects the single payment and pays suppliers manually (see ADR-004).

Scope: one-week iOS pilot.

Tax/legal implications, ties ADR-018: revisit before scale; confirm with an accountant.

## Alternatives considered

1. **Suppliers are the merchant of record; Spazio is a facilitating marketplace / agent.**
   - Pros: Each supplier owns the sale, tax collection, warranty, and disputes for its items — matching supplier-declared warranty (BR-18) and supplier-sourced estimates (BR-17); lighter legal/tax burden on Spazio.
   - Cons: A single user payment across multiple suppliers (FR-042) becomes several legal sales, complicating receipts, refunds, and the buyer experience; consumer trust and dispute handling are fragmented across suppliers.

2. **Spazio is the merchant of record (buys from / resells suppliers, or acts as the contracting seller).**
   - Pros: One clean legal sale and one relationship with the buyer; simpler receipts, refunds, and consumer-protection story; stronger brand trust.
   - Cons: Spazio assumes tax collection/remittance across markets (PRD §10 risk), product liability, and warranty exposure; heavier compliance and accounting; changes the meaning of "commission" vs. margin.

3. **Third-party merchant-of-record provider handles the sale, tax, and payout.**
   - Pros: Offloads global tax and MoR compliance to a specialist; can accelerate multi-country launch (NFR-017, NFR-018).
   - Cons: Additional fees and dependency; must still support marketplace split to suppliers (FR-043) and commission retention (FR-045); less control over the buyer relationship.

4. **Hybrid / per-market model (MoR determined by market and supplier type).**
   - Pros: Adapts to where split settlement and MoR rules differ by country (PRD §10); can start simple in the pilot market and vary as markets open.
   - Cons: Most complex to operate and reason about; risk of inconsistent buyer experience and higher legal overhead.

## Positive consequences

- Resolving MoR gives clear owners for tax, consumer protection, warranty, and disputes, which the dependent ADRs (018, 019, 020) need before they can be settled.
- A clean model improves buyer trust — delivery time and warranty strongly influence purchase decisions (PRD §5) — and clarifies what "commission" means financially.

## Negative consequences

- Whichever party is MoR takes on tax and liability exposure that is hard to unwind later and varies by market (PRD §10).
- The choice constrains ADR-003 (settlement) and ADR-018 (taxes); an inconsistent or deferred decision risks non-compliance when new markets open.

## Date

2026-07-10.
