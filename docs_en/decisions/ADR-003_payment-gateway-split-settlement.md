# ADR-003 - Payment gateway & split-settlement model

## Status

Accepted.

## Context

The PRD reserves both the payment gateway and the split-settlement model as human decisions (PRD §12, "Human definitions": "Payment gateway," "Split-settlement model"). Nothing is built yet.

The requirements the gateway must eventually satisfy are documented:

- One in-app payment across multiple suppliers, generating one purchase order per supplier (FR-042, FR-044; BR-25), with settlement to multiple suppliers via split settlement (FR-043).
- PCI-compliant payment processing (NFR-009).
- Gateway support for marketplace-style split settlement, multi-supplier payouts, multi-currency, guest checkout, and automatic Spazio commission retention (PRD §7; NFR-010, NFR-011, NFR-012).
- Prices displayed in the user's local currency (FR-046; BR-27); commission retained on every completed purchase (FR-045; BR-28).
- **Documented risk:** split settlement across suppliers may not be equally available in every country (PRD §10, "Payment gateway complexity").

Pilot context: automated split payments and one-purchase-order-per-supplier automation are **excluded from the pilot**; a human operator forwards the confirmed order to the supplier manually (Pilot, "Excluded from the pilot"; FR-061). The pilot runs in Bogotá with currency COP (Pilot, "Included"). So this decision is about the full product, informed by (but not required for) the pilot's single simple checkout.

## Decision

Decided (pilot): a single PCI-compliant hosted checkout collecting ONE payment in COP. NO split settlement in the pilot; the operator pays suppliers manually (see ADR-003).

Scope: one-week iOS pilot.

Split settlement + gateway/provider selection for COP: revisit before scale.

## Alternatives considered

1. **A global marketplace-style gateway with connected-accounts / split payouts.**
   - Pros: Native marketplace split settlement, multi-supplier payouts, multi-currency, and commission retention in one platform (NFR-010–NFR-012); mature PCI posture.
   - Cons: Split-settlement and payout availability vary by country (PRD §10); onboarding suppliers as sub-accounts adds friction; fees.

2. **A LATAM-focused gateway with local coverage (relevant to the Bogotá pilot market and COP).**
   - Pros: Strong local payment methods and currency support for the initial market; likely better local acceptance rates.
   - Cons: Marketplace split settlement and multi-country expansion support must be verified per feature; may not scale cleanly to other markets (ties to ADR-015).

3. **An enterprise gateway with broad multi-country marketplace support.**
   - Pros: Wide country and method coverage; built for multi-market marketplaces; strong split/payout features.
   - Cons: Heavier integration and commercial overhead; likely over-scoped for early stages.

4. **Manual / operator-mediated settlement for now (as in the pilot), gateway decision deferred.**
   - Pros: Matches the pilot's excluded-automation stance (FR-061); lowest build cost to validate render-to-purchase first.
   - Cons: Does not satisfy the full-product requirements (FR-043, FR-044); not scalable; only valid as an explicit interim step.

(The gateway choice and the split-settlement model are related but distinct — a gateway may offer several settlement patterns, e.g., destination charges, separate charges + transfers, or hold-and-payout. The chosen model interacts with ADR-004, merchant-of-record.)

## Positive consequences

- Resolving this enables the single-payment, multi-supplier checkout that the marketplace depends on (FR-042–FR-044) and automatic commission retention (FR-045).
- Choosing with the initial market in mind (COP/Bogotá) plus a path to multi-country avoids reworking payments when new markets open.

## Negative consequences

- Country-by-country variation in split settlement (PRD §10) means one gateway may not fit all future markets, forcing either a multi-gateway strategy or market sequencing.
- Getting PCI scope, guest checkout (FR-004; BR-26), and commission retention wrong has legal and financial consequences; this decision is tightly coupled to ADR-004 (merchant-of-record) and ADR-018 (taxes).

## Date

2026-07-10.
