# ADR-021 - Brand identity & visual design system

## Status

Proposed.

## Context

The PRD reserves brand identity, the visual design system, and final copywriting as human decisions (PRD §12, "Human definitions": "Brand identity," "Visual design system," "Final copywriting"). Nothing is built yet.

What the PRD states:

- The PRD version history notes a "**dark green and off-white visual redesign**" (PRD §14, v0.3). This is a **PRD-stated visual direction to be confirmed**, not an approved design system.
- Usability requirements the design must serve: style, dimensions, and budget entry require minimal steps (NFR-013); the app must visibly distinguish purchased catalog items from existing kept items (NFR-014); price, delivery, and warranty must be visible before checkout (NFR-015).
- Most users lack formal design vocabulary and style selection should be visual (PRD §5, "User context"); budget must be visible throughout (PRD §5).
- The AI implements the interface and user flows (PRD §12, "AI role"), but brand/design decisions are human-reserved.

Pilot context: the pilot is a native iOS app for one persona (Valentina) in Bogotá (Pilot). A minimal, credible visual treatment is needed for the pilot even though the full design system is human-reserved. This ADR frames the choice; it does not set brand or copy.

## Decision

PENDING - to be decided by the team.

## Alternatives considered

1. **Bespoke Spazio design system (custom components, typography, and the dark-green / off-white palette noted in the PRD, to be confirmed).**
   - Pros: Distinct brand; full control over the visual identity implied in PRD v0.3; consistent across future platforms.
   - Cons: Most effort to define and maintain; likely more than the one-week iOS pilot needs.

2. **Platform-native foundation (iOS Human Interface Guidelines / native components) with a light Spazio brand layer.**
   - Pros: Fastest for the native iOS pilot; familiar, accessible UX; easy to meet minimal-step usability (NFR-013); brand applied via color/type/logo.
   - Cons: Less differentiated; may need rework when expanding to other platforms (Android/web) later.

3. **Adopt an existing UI kit / design framework, themed to Spazio.**
   - Pros: Speeds delivery with ready components; consistent patterns; can apply the dark-green/off-white direction as a theme.
   - Cons: Possible generic feel; dependency and licensing; theming to a strong brand still takes work.

(Whichever is chosen, the design must support the specific usability requirements: distinguishing bought vs. kept items (NFR-014), always-visible budget (PRD §5), and pre-checkout visibility of price/delivery/warranty (NFR-015). Final copywriting is separately human-reserved.)

## Positive consequences

- A resolved design system gives the AI-built interface (PRD §12) a consistent, on-brand foundation and encodes the usability requirements (NFR-013–NFR-015) directly.
- Deciding early avoids visual rework and keeps the experience trustworthy and easy for design-novice users (PRD §5), supporting conversion.

## Negative consequences

- A full bespoke system is likely over-investment for the one-week iOS pilot; a too-thin approach may not carry the brand or the required usability distinctions (NFR-014).
- Choices made for iOS may need adaptation for Android/web later; brand identity and final copywriting remain human approvals that this ADR cannot pre-empt.

## Date

TBD.
