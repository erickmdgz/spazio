# ADR-F01 — Fallback demo: scope, market, and output form

**Status:** Proposed (pending human approval) · **Scope:** 2-day fallback demo only · **Date:** 2026-07-13

## Context

The one-week iOS pilot (photo → AI render → in-app purchase, Bogotá/COP) may not be demo-ready within 2 days. A contingency is needed that proves the core Spazio thesis — *AI composes coherent, purchasable furniture sets constrained by real space and real inventory* — with minimal build risk. The main product decisions (ADR-001…ADR-022) were made for the pilot and several do not fit a 2-day window (native iOS, render pipeline, checkout, operator console, Bogotá suppliers).

## Decision

Build a **proposals-only** fallback demo:

1. **Output = structured style proposals** (2–3 lists of real products with images, prices, and outbound links), **no image generation, no render** of the user's room.
2. **No transaction**: no cart, checkout, payment, or order flow; purchase happens on homedepot.com via the link.
3. **Market = United States, currency = USD** (deviation from ADR-015 Bogotá/COP), because the catalog source is The Home Depot US.
4. **Inputs = room type + approximate dimensions + optional budget**; no photo upload.
5. **Human review moves upstream**: instead of per-output operator approval (FR-027), humans curate the room-type/furniture map and search queries. There is **no per-output gate of any kind** — the deterministic validator originally specified here was **removed by stakeholder decision on 2026-07-13** (see ADR-F03); numeric constraints travel in the prompt (best-effort) and rehearsal spot-checks are the manual safety net. The demo values that need explicit human confirmation before build: footprint share default **40%**, dimension bounds **4–60 ft**, budget as a **prompt-level ceiling with no tolerance** (deviation from ADR-008), LLM retry count **N=2**, cache TTL **24 h**, and the contents of the room-type map.
6. **Disposable by design**: the fallback ships in its own namespace (`FR-F/FEAT-F/TC-F/ADR-F`) and folders, and creates no obligation on the pilot roadmap.

## Alternatives considered

- **Compress the pilot** (render + checkout in 2 days): rejected — render fidelity and payments are exactly the two highest-risk, slowest pieces.
- **Static mock demo** (hardcoded proposals): rejected — proves nothing about the thesis; the live "real products, real constraints" mechanic is the point.
- **Keep Bogotá market with a scraped local catalog**: rejected — no reliable 2-day API source for Bogotá suppliers; The Home Depot API is turnkey.

## Positive consequences

- Demo risk collapses: no image model, no payments, no iOS review, no supplier onboarding.
- The core promise (never invent furniture; fit is arithmetic) is preserved and even easier to show live.
- Zero interference with the team's pilot work (additive files, separate namespace).

## Negative consequences

- The demo does not show the signature visual (your own room, rendered) — the "wow" is weaker.
- US market work is throwaway for a Bogotá-first product.
- No purchase loop means render-to-purchase, the pilot's success metric, cannot be measured; the fallback measures believability only.
- With the validator removed (ADR-F03), footprint/budget/cardinality adherence depends on the model following the prompt; a rule-violating proposal can reach the user, mitigated only by visible recomputed figures and rehearsal spot-checks.
