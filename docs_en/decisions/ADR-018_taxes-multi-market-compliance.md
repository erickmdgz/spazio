# ADR-018 - Taxes & multi-market compliance

## Status

Accepted.

## Context

The PRD reserves taxes and legal/compliance requirements as human decisions (PRD §12, "Human definitions": "Legal and compliance requirements," "Taxes," "Payments"). Nothing is built yet.

What the PRD states:

- Taxes, payment methods, and legal requirements must be configured per market (PRD §7; NFR-018); the architecture must support multiple countries and currencies (NFR-017).
- Prices are shown in the local currency (FR-046; BR-27); a single user payment can span multiple suppliers with one purchase order per supplier (FR-042, FR-044; BR-25).
- **Documented risk:** "Currency is relatively simple. Taxes, payment rails, consumer protection, and local legal requirements are not" (PRD §10, "Multi-country complexity").
- Tax handling is inseparable from the merchant-of-record model (ADR-004) — who collects and remits — and from the payment/settlement gateway (ADR-003).

Pilot context: the pilot runs in one market (Bogotá, COP). The pilot documents do not detail tax handling, and formal tax/compliance policy is human-reserved and needs legal input (PRD §2 principles; §12). This ADR concerns how taxes and per-market compliance are handled as markets open.

## Decision

Single market (Colombia); taxes and invoicing handled manually for the pilot; no tax engine.

Scope: one-week iOS pilot.

Revisit before scale; confirm with an accountant.

## Alternatives considered

1. **Compute and manage taxes in-house per market (own tax rules/config).**
   - Pros: Full control; fits the "configured per market" requirement (NFR-018); no third-party fee.
   - Cons: Heavy and error-prone across countries (PRD §10 risk); ongoing maintenance of changing tax rules; needs legal expertise per market.

2. **Use a tax-automation provider for calculation and, optionally, filing.**
   - Pros: Offloads complex, changing tax logic; accelerates multi-market launch (NFR-017, NFR-018); reduces compliance risk.
   - Cons: Additional cost and dependency; still requires correct MoR configuration (ADR-004); coverage varies by country.

3. **Delegate tax responsibility to suppliers or to a merchant-of-record provider.**
   - Pros: Shifts tax collection/remittance to the seller of record (ties to ADR-004); lighter burden on Spazio.
   - Cons: Depends on the MoR decision; fragmented buyer receipts if suppliers are MoR (FR-042 single payment vs. multiple sellers); less control.

4. **Phased: single-market compliance first (pilot market), broaden per market as launched.**
   - Pros: Matches phased launch (PRD §11) and market sequencing (ADR-015); limits initial legal scope.
   - Cons: Each new market reopens the tax/compliance question; risk of building market-specific debt.

## Positive consequences

- A resolved approach makes per-market tax and legal configuration (NFR-018) concrete and reduces the multi-country compliance risk (PRD §10).
- Aligning tax handling with the MoR decision (ADR-004) and gateway (ADR-003) gives a coherent, auditable money-and-tax flow.

## Negative consequences

- Getting taxes or compliance wrong carries legal and financial penalties and varies by market (PRD §10) — this is a high-stakes, legally advised decision.
- It cannot be finalized independently of merchant-of-record (ADR-004), gateway/settlement (ADR-003), and target markets (ADR-015); premature choices risk rework per market.

## Date

2026-07-10.
