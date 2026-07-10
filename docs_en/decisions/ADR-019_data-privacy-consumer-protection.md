# ADR-019 - Data privacy & consumer protection

## Status

Proposed.

## Context

The PRD reserves data privacy and consumer protection as human decisions (PRD §12, "Human definitions": "Data privacy," "Consumer protection," "Legal and compliance requirements"). Nothing is built yet.

What the PRD states:

- User photos and generated renders are private by default (BR-33; NFR-007). Users upload photos of their own personal spaces (PRD §11 assumption: "Users are willing to upload personal-space photos").
- Authentication protects account and order data (NFR-008); payment processing must be PCI-compliant (NFR-009).
- Guest checkout collects validated email, phone, and shipping information (FR-004; BR-26), which is personal data requiring handling rules.
- Legal requirements must be configured per market (NFR-018); consumer protection and local legal requirements are called out as hard parts of multi-country complexity (PRD §10).
- The canonical data model treats `RoomPhoto` and `Render` as private by default.

Pilot context: the pilot collects real users' room photos in Bogotá (Valentina persona). Colombia has its own data-protection regime; expansion markets may add GDPR-style obligations. Concrete privacy and consumer-protection policy is human-reserved and needs legal input (PRD §2 principles; §12). This ADR frames the choice; it does not set legal policy.

## Decision

PENDING - to be decided by the team.

## Alternatives considered

1. **Comply with the launch market's baseline only (e.g., local data-protection and consumer law for the pilot market), broaden per market.**
   - Pros: Smallest initial legal scope; matches phased launch (PRD §11) and per-market configuration (NFR-018); faster to launch.
   - Cons: Each new market reopens privacy/consumer-protection work; risk of architecture not ready for stricter regimes later.

2. **Privacy-by-design to a broad standard (e.g., GDPR-grade) from the start.**
   - Pros: One high bar covers most markets; strong default for private photos/renders (BR-33, NFR-007); fewer surprises when expanding.
   - Cons: More upfront effort (consent, data-subject rights, retention, deletion) than the pilot strictly needs; may slow early delivery.

3. **Use third-party consent / privacy / identity tooling.**
   - Pros: Offloads consent management, data-subject requests, and audit trails; speeds multi-market compliance.
   - Cons: Cost and dependency; still requires human-approved policy and correct configuration per market.

(Whatever the compliance scope, the technical baseline must keep photos and renders private by default (BR-33, NFR-007), protect account/order data via authentication (NFR-008), and keep payments PCI-compliant (NFR-009).)

## Positive consequences

- A resolved approach protects the personal-space photos users upload (a stated adoption assumption, PRD §11) and builds the trust the render-to-purchase loop depends on.
- Deciding the standard early lets retention, consent, and deletion be built into the data model (RoomPhoto, Render, User) rather than retrofitted.

## Negative consequences

- Under-scoping privacy/consumer protection risks legal penalties and lost trust, especially as markets expand (PRD §10); over-scoping too early can slow the pilot.
- The decision is coupled to markets (ADR-015), merchant-of-record and consumer-protection responsibility (ADR-004), and warranty/disputes (ADR-020); it needs legal counsel and human approval.

## Date

TBD.
