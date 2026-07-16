# ADR-008 - Budget tolerance

## Status

Accepted.

## Context

The PRD reserves the budget tolerance as a human decision (PRD §12, "Human definitions": "Budget tolerance"). Nothing is built yet (point-in-time context as of this decision, 2026-07-10; 2026-07-15: a working web app + backend are now built and verified locally — see ADR-024+ and the current-system summary — so this reads as historical, not a present-tense claim).

What the PRD states:

- The total product cost should not exceed the budget beyond an agreed tolerance, "**such as 10%**" (BR-9). The 10% figure is a **PRD-stated example**, not a decided value.
- Users enter a budget range with minimum and maximum (FR-009); the system keeps total rendered product cost within budget plus the agreed tolerance (FR-021; BR-9).
- When the budget cannot be met, the system must disclose this and offer the closest available alternative (FR-022; BR-10).
- Budget must be visible throughout the experience and strongly shapes user trust (PRD §5, "User context").
- Budget input is in scope for the pilot (FR-009 is pilot-included; Pilot, "Included": "Budget range input"), and the budget-adherence rule (FR-021) is pilot-included, so a working tolerance value is needed for the pilot even if only provisional.

The `budget tolerance` is both the numeric allowance and the rule for how it is applied (symmetric vs. over-only, percentage vs. absolute).

## Decision

Adopt a 10% budget tolerance (the PRD BR-9 stated default). Scope: one-week iOS pilot.

## Alternatives considered

1. **Fixed percentage tolerance over the maximum (e.g., the PRD's example 10%, to be confirmed).**
   - Pros: Simple, proportional to budget size; matches the PRD example (BR-9); easy to explain and enforce (FR-021).
   - Cons: On small budgets, 10% may be too little to include a needed item; on large budgets, it may allow a big absolute overshoot.

2. **Fixed absolute tolerance (a currency amount over the maximum).**
   - Pros: Predictable overshoot cap regardless of budget size; easy for users to understand.
   - Cons: Must be set per currency/market (ties to ADR-015, ADR-018); poor fit across very different budget sizes.

3. **Asymmetric / over-only tolerance vs. treating the budget range strictly.**
   - Pros (strict): Maximum user trust — never exceeds the stated max; simplest promise.
   - Cons (strict): May force "no strong match" outcomes more often (FR-023; BR-13), reducing render quality and conversion.

4. **User-configurable tolerance (let the user opt into a stretch).**
   - Pros: Puts control with the user; transparent.
   - Cons: Adds steps, conflicting with minimal-step input (NFR-013); more UI and edge cases.

## Positive consequences

- A resolved tolerance makes budget adherence (FR-021) and the over-budget disclosure/alternative flow (FR-022; BR-10) well-defined and testable.
- The right value balances staying within user expectations (trust) against finding enough matching SKUs to fill the room (conversion).

## Negative consequences

- Too tight a tolerance increases "budget cannot be met" outcomes — a documented risk when the catalog lacks products in a price range (PRD §10, "Unsatisfied budgets").
- Too loose a tolerance erodes trust by letting orders exceed the stated budget; percentage vs. absolute choice also interacts with multi-currency display (FR-046; BR-27).

## Date

2026-07-10.
