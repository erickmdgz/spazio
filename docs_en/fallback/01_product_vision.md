# Product Vision — Fallback Demo

> **Sources of truth:** `Spazio_PRD_v0.7.md` (full-product intent) and `Spazio_One_Week_iOS_Pilot.md` (first milestone). This document defines the **fallback demo**: a 2-day, deliberately reduced version of the Spazio idea, to be shown if the pilot is not demo-ready. It does not replace the pilot; it is a contingency.
>
> **Nothing here is built yet.** Status: DRAFT / PROPOSED (pending human approval).

## Problem (unchanged from Spazio)

People furnishing a room cannot picture how real, purchasable furniture will work in their space before spending money: they overspend, buy pieces that do not fit or do not match, or never start. (VERIFIED — PRD §2; pilot "The problem".)

The fallback attacks the same problem with a smaller promise: instead of a photorealistic render of *your* room, you get **coherent, real, purchasable furniture sets that provably fit your room's dimensions and match in color and style**.

## Target user

**US market** (DECIDED for the fallback — `ADR-F01`; deviation from the pilot's Bogotá/COP scope, `ADR-015`). Persona for the demo, mirroring the pilot's technique of designing for one nameable person:

**Sarah, 29**, rents an apartment in Austin, TX. She wants to furnish her living room, knows its rough dimensions (a tape measure, not a floor plan), has a budget in mind, and no design training. She wants concrete, buyable combinations — not inspiration boards of furniture that doesn't exist or doesn't fit.

## The one core thing

> Show Sarah 2–3 furniture proposals for her room — each one a set of real Home Depot products that match in style and color, belong in that type of room, fit her budget, and **physically fit in her space**.

If a proposal contains an item that isn't real, doesn't belong in the room type, or couldn't fit through basic arithmetic, the demo has failed — regardless of anything else.

## The AI's role

The AI (an LLM consumed through the Ollama Cloud API — `ADR-F03`):

- Interprets the room type, dimensions, and budget.
- Selects, **only from the real product list fetched from The Home Depot via SerpApi**, the items that form each proposal.
- Groups them into style-coherent proposals: harmonious/complementary colors, a recognizable design direction (minimalist, comfy/cozy, modern, rustic — subject to what the API data supports), and furniture types normal for the room type.
- Explains each proposal in one short rationale.

The AI **never invents a product, price, dimension, or color** (inherited hard rule — see `09_ai_usage.md`). This holds structurally: the display layer resolves every proposed product ID against the snapshot of products actually fetched from the Home Depot APIs — an ID that was never fetched has no data and is omitted. Footprint, budget, and cardinality rules travel to the LLM as prompt constraints (best-effort adherence; there is **no deterministic post-validation layer** — stakeholder decision, see `ADR-F03`), and the fit and total figures shown to the user are always recomputed from API data.

## The human's role

- The developer/operator curates the **furniture-type map per room type** and the **search queries** sent to the Home Depot API (the fallback's equivalent of catalog curation).
- The user judges the proposals; there is no purchase in-app — each item links out to its Home Depot product page.
- All product/architecture decisions remain human (`ADR-F01…F03`); the AI proposes and executes.

## Scope

**Included (the whole demo):**

| Capability | Reference |
|---|---|
| Simple web page (form + results) served by the fallback service | FEAT-F01, FEAT-F03 |
| Room type selection (living room, dining room, bedroom, office) | FR-F01 |
| Approximate room dimensions in feet, validated | FR-F02 |
| Optional budget (USD) | FR-F03 |
| Real product retrieval from The Home Depot via SerpApi (search + product details), cached | FEAT-F02; FR-F04, FR-F05 |
| 2–3 LLM-composed style proposals (color harmony + design style + room-type coherence) | FEAT-F03; FR-F06, FR-F08 |
| Fit summary computed from real dimensions; footprint cap as a prompt constraint | FR-F07 |
| Only-real-products guarantee via snapshot resolution at display time | FR-F08, FR-F09 |
| Proposal display with image, name, price, and Home Depot link per item | FR-F10 |

**Out of scope (explicitly, to protect the 2 days):** photo upload and photorealistic rendering; any cart, checkout, payment, or order flow; accounts/login; iOS app (web page only); Bogotá/COP localization; operator review console; supplier onboarding; persistence beyond the process lifetime (no database); Spanish/i18n (demo in English for the US market).

## Success signal

**Fit-and-believe:** in a live demo, a viewer enters a real room's type and dimensions and receives at least two proposals where (a) every item is a real Home Depot product they can open and verify, (b) the set visibly matches in style/color, and (c) the arithmetic fit summary (footprint used vs. available) is credible. Secondary signal: end-to-end response within the target of `NFR-F02`.

## Relationship to the main roadmap

The fallback is disposable by design. If it survives the demo, its reusable assets are the SerpApi client, the proposal-composition system prompt, and the room-type curation maps — candidates to feed the pilot's product-matching module (FEAT-005) later, via the normal plan → approve → implement flow.
