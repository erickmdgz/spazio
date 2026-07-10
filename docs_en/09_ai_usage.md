# Guide for AI Usage in Development

## Principle

AI can accelerate development, but it must not replace product, architecture, security, or business decisions.

For Spazio this principle has two layers:

1. **AI as a coding agent** — the AI writes, maintains, and refactors the codebase, drafts docs, and proposes technical options. It never decides product, architecture, security, or business questions on its own.
2. **AI as a runtime capability** — the AI is also the product's rendering and matching engine. The same discipline applies: at runtime the AI executes rules that humans defined; it never invents products, prices, availability, or business policy.

> **Status note.** Nothing described in this document is built yet. Everything in the Spazio docs is a **specification**. Do not treat any capability below as implemented or "covered" until it ships and is verified.

## How to read this document

Throughout the Spazio docs we distinguish three levels of certainty. Keep them explicit in every prompt, plan, and PR:

- **VERIFIED** — stated in the PRD (`Spazio_PRD_v0.7.md`) or the pilot (`Spazio_One_Week_iOS_Pilot.md`). Cite the section.
- **PROPOSED / DRAFT** — reasonable structuring the AI adds to move work forward (schemas, module boundaries, endpoint shapes). Must be labeled as draft and confirmed by a human.
- **TBD / PENDING** — a decision the PRD explicitly reserves for humans (see "Tasks that must be decided by humans"). The AI must not resolve these; it surfaces them.

Where the PRD gives a number only as an example or default, it stays a **PRD-stated default to be confirmed by humans**, not a settled value. The examples that appear in the PRD are:

- Budget tolerance "such as 10%" (PRD BR-9) — default/example, pending `ADR-008`.
- Daily free renders "defaulting to five" (PRD BR-19, §7) — default, pending `ADR-009`.
- Cart stock hold "15 minutes" (PRD BR-22) — default, pending `ADR-011`.
- Render time "approximately 2–5 minutes" (PRD §7) — target, pending `ADR-013`.
- Commission "for example 10%" (PRD §9, BR-28) — example, pending `ADR-007`.

## Tasks AI can support

### General engineering support

- Generate initial code.
- Create repetitive components.
- Suggest folder structures.
- Write tests.
- Detect common errors.
- Refactor code.
- Draft initial technical documentation.
- Explain existing code.
- Propose technical alternatives (labeled DRAFT until a human chooses).

### Spazio-specific AI responsibilities (from PRD §12 "AI role" and the pilot)

The AI coding agent — and the runtime pipeline it builds — is expected to:

- **Generate and maintain the application codebase**: client, backend, database, and APIs (PRD §12).
- **Build and maintain the rendering pipeline** that composites products into the user's room photo (PRD §12; `FEAT-005`).
- **Interpret visual styles and natural-language style descriptions** (PRD FR-03; `FR-007`, `FR-008`).
- **Apply approximate room dimensions** to scale rendered products realistically (PRD FR-15, BR-7; `FR-017`).
- **Apply keep-or-replace decisions** so kept items stay in the render and are excluded from cart and budget (PRD FR-16, BR-8; `FR-025`, `FR-026`) — note this is out of the one-week pilot.
- **Cross-reference the supplier catalog** to match real, available SKUs to style, dimensions, budget, and locality (PRD FR-06; `FR-014`).
- **Generate photorealistic renders** composed only of matched SKUs (PRD FR-06; `FR-015`).
- **Implement targeted edits** that change only the requested element (PRD FR-18; `FR-052`) — out of the pilot.
- **Enforce the business rules**: budget-plus-tolerance (BR-9), locality (BR-11), delivery coverage and fallback (BR-12), photo-quality validation (BR-15), stock holds and revalidation (BR-22–24), and render-usage limits (BR-19–21). See `FR-018`, `FR-021`, `FR-024`, `FR-039`–`FR-041`, `FR-048`–`FR-050`.
- **Implement sponsored-placement tie-breaking** that only breaks ties between similarly relevant products and never overrides relevance, quality, budget, locality, or availability (PRD §9, BR-29, BR-30; `FR-054`).
- **Define supplier-ingestion schemas and contracts** (PRD §12; `FR-055`, `FR-057`) — label these DRAFT; the supported channels and onboarding terms are human decisions (`ADR-006`, `ADR-016`).
- **Implement the interface and user flows** (PRD §12).
- **Surface ambiguity and technical risk instead of silently deciding** (PRD §12). When a rule, value, or decision is TBD, the AI raises it; it does not pick a default and move on.

### Pilot scope reminder

In the one-week iOS pilot, humans stay deliberately in the loop: an operator curates the catalog by hand, an operator reviews **every** render before the user sees it (`FR-027`, `FEAT-006`), the user confirms the cart before paying (`FR-035`), and the operator forwards each order to the supplier manually (`FR-061`). The AI does the creative and matching work; it does not fulfill or auto-approve.

## Spazio hard rule (non-negotiable)

> **The AI must NEVER render, tag, price, or fabricate a product that is not a real, in-stock, purchasable catalog SKU.**

This is the central innovation of Spazio and the top runtime constraint. It is not optional and it is not subject to model discretion. It is grounded in the PRD:

- Every rendered item must correspond to a real, purchasable SKU (PRD BR-6; `FR-016`).
- The system must never fabricate unavailable products (PRD BR-14; `FR-016`).
- Ready-made items must never be rendered when out of stock (PRD BR-4; `FR-018`).
- Incomplete catalog entries are excluded from rendering (PRD BR-2; `FR-019`).
- Only products deliverable to the user's locality may be rendered (PRD BR-11; `FR-020`).
- When no strong match exists, suggest a similar available product or mark the item unavailable — never invent one (PRD BR-13; `FR-023`).

Concretely, this means the AI must not:

- Hallucinate furniture, decor, brands, prices, dimensions, colors, materials, warranties, or lead times.
- Show a plausible-looking item that has no backing SKU in the catalog.
- Render an out-of-stock ready-made item or a catalog entry missing required data.
- Fill a budget or style gap by inventing a product instead of disclosing the gap and offering the closest real alternative (PRD BR-10; `FR-022`).

If matching real SKUs cannot satisfy the request, the correct behavior is to disclose the limitation and offer real alternatives or mark the item unavailable — **never** to fabricate.

## Tasks that must be decided by humans

The AI proposes; humans decide. In addition to the general items below, PRD §12 ("Human definitions") reserves a specific list of Spazio decisions. The AI must treat every one of these as TBD/PENDING and must not present any of them as decided or final in code, docs, or output.

### General product and delivery decisions

- Which problem is going to be solved.
- Which features are actually necessary.
- What is out of scope.
- Which data is going to be stored.
- Which permissions each user must have.
- Which risks are acceptable.
- Which technical decisions are suitable for the project.
- What is considered done (acceptance criteria).
- What is released to production (release approval).

### Reserved Spazio decisions (PRD §12) — do not present as final

| Human decision (PRD §12) | Related ADR | PRD-stated default/example, if any |
|---|---|---|
| Budget tolerance | `ADR-008` | "such as 10%" (BR-9) — example only |
| Commission percentage & fee model | `ADR-007` | "for example 10%" (§9, BR-28) — example only |
| Catalog synchronization frequency | `ADR-012` | "regularly, real time for ready-made stock" (BR-32) — direction, not a value |
| Render-time target | `ADR-013` | "approximately 2–5 minutes" (§7) — target to confirm |
| Daily free-render limit | `ADR-009` | "defaulting to five" (BR-19) — default to confirm |
| Render-package pricing | `ADR-010` | none |
| Cart-hold duration | `ADR-011` | "15 minutes" (BR-22) — default to confirm |
| Payment gateway | `ADR-003` | none |
| Merchant-of-record model | `ADR-004` | none |
| Split-settlement model | `ADR-003` | none |
| Style taxonomy | `ADR-005` | none (BR-16 requires one; values TBD) |
| Supplier onboarding terms & contracts | `ADR-016` | none |
| Supported ingestion channels | `ADR-006` | PRD lists "integration, Excel, API, FTP" (FR-23) — candidates, not final |
| Sponsored-plan pricing | `ADR-017` | none |
| Initial markets | `ADR-015` | none (pilot uses Bogotá / COP as a pilot scope, not a launch decision) |
| Supplier partners | `ADR-016` | none |
| Minimum catalog completeness | `ADR-014` | none (BR-1 lists required attributes; the threshold is TBD) |
| Legal and compliance requirements | `ADR-018`, `ADR-019`, `ADR-020` | none |
| Data privacy | `ADR-019` | "photos and renders private by default" (BR-33) is a rule; the policy is TBD |
| Consumer protection | `ADR-019` | none |
| Warranty rules | `ADR-020` | supplier-declared display (BR-18); the rules are TBD |
| Taxes | `ADR-018` | "configured per market" (§7) — direction only |
| Payments | `ADR-003` | none |
| Brand identity | `ADR-021` | none |
| Visual design system | `ADR-021` | none |
| Final copywriting | human | none |
| Acceptance criteria | human | none |
| Release approval | human | none |
| Security review | human | none |
| Code review | human | none |
| Catalog quality | human (operator) | none |
| Dispute resolution | `ADR-020` | none |

When work touches any row above, the AI records the open question, proposes options as DRAFT if useful, and waits for a human decision (recorded as an ADR where one is listed). It does not encode a guessed value as if it were settled.

## Rules for AI prompts

Every technical prompt must include:

1. Project context.
2. Affected file or module.
3. Related requirement (`FR-`/`NFR-`) or feature (`FEAT-`).
4. Constraints.
5. Expected result.
6. What must not be modified.
7. Acceptance criteria.

For Spazio, add these constraints when the work touches rendering, matching, catalog, pricing, or checkout:

- State the **hard rule** explicitly: rendered items must map to real, in-stock, deliverable SKUs; never fabricate.
- Name the business rules in scope (e.g. BR-6, BR-11, BR-22) and their FR IDs, so the output is traceable.
- Flag any value that is a **PRD default/example** (tolerance, daily limit, hold duration, render time, commission) and require it to be read from configuration, not hardcoded, until the corresponding ADR is decided.
- Require the AI to **surface** any TBD it hits rather than choosing a value.

## AI prompt template

See `templates/template_ai_prompt.md`.

## Human review rules

Before accepting AI-generated code:

- [ ] I understand what the code does.
- [ ] The code corresponds to the requirement.
- [ ] It does not add unnecessary complexity.
- [ ] It does not introduce dependencies without need.
- [ ] It does not expose secrets.
- [ ] It does not break existing flows.
- [ ] It has basic error handling.
- [ ] It has tests or a clear way to be validated.
- [ ] It is documented if it changes important behavior.

Additional Spazio checks when the change touches rendering, matching, catalog, pricing, or checkout:

- [ ] No product can be rendered, tagged, or added to a cart without a backing real, in-stock, deliverable SKU (the hard rule holds).
- [ ] No reserved PRD §12 decision is hardcoded as final; PRD defaults/examples live in configuration and reference their ADR.
- [ ] Budget, locality, delivery, photo-quality, stock-hold, and usage-limit rules are enforced as specified, with the error/fallback path handled (disclose gap, offer alternative, or mark unavailable — never fabricate).
- [ ] Operator-in-the-loop steps are respected where the pilot requires them (render review, manual order handoff).
- [ ] User photos and generated renders are private by default (BR-33).
- [ ] Claims in the PR distinguish VERIFIED vs PROPOSED/DRAFT vs TBD, and cite PRD/pilot sections.
