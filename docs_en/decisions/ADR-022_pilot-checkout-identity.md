# ADR-022 - Pilot checkout identity model

## Status

Accepted.

## Context

The one-week iOS pilot needs "one simple in-app checkout" so a user can complete a purchase, yet the pilot scope both excludes the full guest-checkout feature and puts accounts (FEAT-001) out of pilot. The source spec does not say how a pilot user is identified at checkout, leaving an open question that must be resolved before the checkout flow can be built.

Several documented constraints shape it:

- Accounts (FEAT-001) are out of the pilot, so there is no login, password, or account system to rely on.
- The guest-checkout feature is explicitly excluded from the pilot, so the full guest-checkout implementation is also unavailable.
- The pilot still requires the operator to fulfill orders manually (single-capture payment, manual supplier payout - ADR-003/004), which means the order must carry enough contact and shipping data to be fulfilled.
- Data privacy calls for collecting the minimum data (email, phone, shipping) with a short privacy notice and consent at first use (ADR-019; PRD BR-26, BR-33; align with Colombia Ley 1581).

There is a real tension between "no accounts and no full guest-checkout feature" and "a checkout that still captures what the operator needs to ship the order." This ADR makes that trade-off explicit and resolves the previously-open identity question for the pilot.

## Decision

Minimal contact capture at checkout: the user provides email + phone + shipping address (per PRD BR-26 data), stored with the order for operator fulfillment. NO login, NO password, NO account system, and NOT the full guest-checkout feature. This resolves the previously-open identity question and is consistent with accounts (FEAT-001) being out of the pilot, the guest-checkout feature being excluded, and ADR-019 minimum-data.

Scope: one-week iOS pilot.

## Alternatives considered

1. **Minimal contact capture (email + phone + shipping address, stored with the order). [chosen]**
   - Pros: Smallest possible build; no auth, session, or account infrastructure; captures exactly the data the operator needs to fulfill manually (PRD BR-26); aligns with ADR-019 minimum-data and with accounts/guest-checkout being out of the pilot.
   - Cons: The user is not persistently identified across sessions; technically it is a stripped-down guest checkout, so care is needed to avoid scope-creeping it into the excluded full guest-checkout feature.

2. **Email-only lightweight passwordless account (magic link / OTP).**
   - Pros: Gives a persistent identity and a path to order history later; still no password to manage.
   - Cons: Adds auth infrastructure (link/OTP delivery, session handling) that the one-week pilot does not need; effectively begins building accounts (FEAT-001), which is out of pilot; more data and consent surface than the minimum.

3. **Full accounts (FEAT-001: registration, login, password, profile).**
   - Pros: Persistent identity, order history, and profile for the long term; the eventual target for scale.
   - Cons: FEAT-001 is explicitly out of the pilot; largest build, most infrastructure and security surface; directly contradicts the one-week iOS pilot scope.

4. **Full guest-checkout feature.**
   - Pros: A recognized pattern for checkout without accounts; potentially richer than bare contact capture.
   - Cons: The guest-checkout feature is explicitly excluded from the pilot; building it out would exceed the intended minimal scope.

(The chosen option is deliberately the minimum among these; the others record why heavier identity models were not adopted for the pilot.)

## Positive consequences

- Resolves the previously-open "how is a pilot user identified?" question, unblocking the single in-app checkout flow.
- Smallest build that still lets the operator fulfill orders manually, with no auth, session, or account system to develop or secure.
- Consistent with the pilot's other exclusions (accounts out, guest-checkout excluded) and with ADR-019 minimum-data and PRD BR-26/BR-33.

## Negative consequences

- The user is not persistently identified between sessions, so there is no built-in order history or returning-user recognition in the pilot (order status is shown for the single active order via FR-047 tracking / operator).
- It is technically a stripped-down guest checkout, so there is a risk of it drifting toward the excluded full guest-checkout feature or toward accounts (FEAT-001); revisit the identity model before scale.

## Date

2026-07-10.
