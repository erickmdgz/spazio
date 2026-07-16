# Guide for AI Usage in Development

## Principle

AI can accelerate development, but it must not replace product, architecture, security, or business decisions.

For Spazio this principle has two layers:

1. **AI as a coding agent** — the AI writes, maintains, and refactors the codebase, drafts docs, and proposes technical options. It never decides product, architecture, security, or business questions on its own.
2. **AI as a runtime capability** — the AI is also the product's rendering and matching engine. The same discipline applies: at runtime the AI executes rules that humans defined; it never invents products, prices, availability, or business policy.

> **Status note (updated 2026-07-15).** A working **web app** (`web-demo/`) on a **Node 22 / Fastify / Prisma / Postgres** backend is now **built and verified on a local dev stack**: the browse-and-select furnishing flow (ADR-028/FEAT-018), the self-hosted **mflux** render engine (ADR-026), real photo byte-upload and render display (FEAT-002), autonomous render publication with no operator render-review (ADR-025/FEAT-016), cart, and a **mock** checkout all run locally. **Nothing is deployed or released to production** (no `vX.Y.Z` tag), checkout is a **mock** gateway (`ADR-003` still open), the real render engine runs only with `RENDER_ENGINE=mflux` on an Apple-Silicon host, and Local-supplier product images are placeholders. The AI-usage *rules* in this document apply to that built system and to ongoing work; a capability is "**covered** in a release" only once it **ships** and is verified (see `10_release_notes.md`).

## How to read this document

Throughout the Spazio docs we distinguish three levels of certainty. Keep them explicit in every prompt, plan, and PR:

- **VERIFIED** — stated in the PRD (`Spazio_PRD_v0.7.md`) or the pilot (`Spazio_One_Week_iOS_Pilot.md`). Cite the section.
- **PROPOSED / DRAFT** — reasonable structuring the AI adds to move work forward (schemas, module boundaries, endpoint shapes). Must be labeled as draft and confirmed by a human.
- **TBD / PENDING** — a decision the PRD explicitly reserves for humans (see "Tasks that must be decided by humans"). The AI must not resolve these; it surfaces them.

Where the PRD gives a number only as an example or default, an ADR has now settled the value **for the pilot** (keeping the same number where the PRD showed one). The PRD examples and their adopted pilot decisions are:

- Budget tolerance "such as 10%" (PRD BR-9) — adopted for the pilot: 10% (`ADR-008`).
- Daily free renders "defaulting to five" (PRD BR-19, §7) — pilot decision: no limit (`ADR-009`); the five/day default applies only post-pilot. ~~(every render is operator-reviewed)~~ *rationale superseded by ADR-025 (2026-07-14) — the render-review gate is retired; the no-limit value itself stands.*
- Cart stock hold "15 minutes" (PRD BR-22) — pilot decision: no stock hold; the 15-minute hold applies only post-pilot (`ADR-011`).
- Render time "approximately 2–5 minutes" (PRD §7) — adopted for the pilot as a soft target, no hard SLA (`ADR-013`).
- Commission "for example 10%" (PRD §9, BR-28) — adopted for the pilot: 10%, reconciled manually (`ADR-007`).

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
- **Build and maintain the rendering pipeline** that composites products into the user's room photo (PRD §12; `FEAT-005`). *(Engine decided — ADR-026, 2026-07-14: self-hosted FLUX.2 Klein 4B run locally via the mflux CLI as a child process, replacing the earlier hosted-image-API choice of ADR-002; the no-custom-model rule and the hard rule below — never render a non-catalog product, BR-6/BR-14 — are unchanged.)*
- **Interpret visual styles and natural-language style descriptions** (PRD FR-03; `FR-007`, `FR-008`).
- **Apply approximate room dimensions** to scale rendered products realistically (PRD FR-15, BR-7; `FR-017`).
- **Apply keep-or-replace decisions** so kept items stay in the render and are excluded from cart and budget (PRD FR-16, BR-8; `FR-025`, `FR-026`) — note this is out of the one-week pilot.
- **Cross-reference the supplier catalog** to match real, available SKUs to style, dimensions, budget, and locality (PRD FR-06; `FR-014`). *(Flow inverted — ADR-028 / FEAT-018, 2026-07-15: the CURRENT primary flow is **browse-and-select** — the user chooses a source + style, browses the real catalog, and **selects up to 3 products**, and the engine renders exactly that selection. AI auto-match is now an **optional fallback**, run only when a render request carries no user selection; it is no longer the primary furnishing path.)*
- **Generate photorealistic renders** composed only of matched SKUs (PRD FR-06; `FR-015`). *(Scoped caveat — ADR-027, 2026-07-15: matched SKUs are supplier-track products, or — while no supplier catalog exists — real, attributed **public-catalog fallback** products (Amazon Berkeley Objects, CC BY 4.0). When the render composites a public product image, the stored render is a **derivative work** and the CC BY attribution/provenance must propagate into it — see `FR-065`, `NFR-019`. Public products remain display-only and non-purchasable.)*
- **Implement targeted edits** that change only the requested element (PRD FR-18; `FR-052`) — out of the pilot.
- **Enforce the business rules**: budget-plus-tolerance (BR-9), locality (BR-11), delivery coverage and fallback (BR-12), photo-quality validation (BR-15), stock holds and revalidation (BR-22–24), and render-usage limits (BR-19–21). See `FR-018`, `FR-021`, `FR-024`, `FR-039`–`FR-041`, `FR-048`–`FR-050`.
- **Implement sponsored-placement tie-breaking** that only breaks ties between similarly relevant products and never overrides relevance, quality, budget, locality, or availability (PRD §9, BR-29, BR-30; `FR-054`).
- **Define supplier-ingestion schemas and contracts** (PRD §12; `FR-055`, `FR-057`) — label these DRAFT; the supported channels and onboarding terms were human decisions, now decided for the pilot (`ADR-006`: operator manually loads a CSV/Excel of 30–60 curated SKUs, no API/FTP/self-service; `ADR-016`: hand-pick 2–4 Bogotá suppliers under a one-page written agreement).
- **Implement the interface and user flows** (PRD §12).
- **Surface ambiguity and technical risk instead of silently deciding** (PRD §12). When a rule, value, or decision is TBD, the AI raises it; it does not pick a default and move on.

### Pilot scope reminder

In the one-week iOS pilot, humans stay deliberately in the loop: an operator curates the catalog by hand, ~~an operator reviews **every** render before the user sees it (`FR-027`, `FEAT-006`),~~ the user confirms the cart before paying (`FR-035`), and the operator forwards each order to the supplier manually (`FR-061`). **Superseded by ADR-025 (2026-07-14):** renders are published immediately on generation success; the render-review gate is retired. The AI does the creative and matching work; it does not fulfill orders.

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

> **Scoped caveat (ADR-027, 2026-07-15) — the never-fabricate rule stays intact.** The rule above is unchanged: the AI must never invent or render a product that does not exist. It is **scoped**, not weakened, for the public-catalog bootstrap fallback: while no supplier catalog exists, the AI may render, tag, and display real **public-catalog products** (Amazon Berkeley Objects, CC BY 4.0) that carry **real** dimensions, materials, and images and required **attribution**. These count as **real, attributed, non-fabricated inventory** for **display** — they are not hallucinated furniture, so rendering them does not violate the hard rule. What changes is *purchasability, not reality*: `source=public` products are **display-only**, labeled "not sold by Spazio", offered with a "View at retailer" outbound link, and **never** priced for in-app purchase or added to cart/checkout/orders/commission/MoR. The **purchasable-SKU** guarantee (real, in-stock, purchasable, deliverable supplier SKU with in-app checkout) still holds fully for the **supplier track**. Fabrication — showing a plausible item with **no** backing record — remains forbidden for both tracks. See FEAT-017, FR-062..065, NFR-019.

## Tasks that must be decided by humans

The AI proposes; humans decide. In addition to the general items below, PRD §12 ("Human definitions") reserves a specific list of Spazio decisions. These stay human decisions, not the AI's to make — and for the one-week pilot a human has now made each ADR-linked one, recorded as the ADR shown in the table below (Accepted 2026-07-10). The AI honors each decided pilot value and cites its ADR; it never silently changes one. The rows still marked "human" (no ADR) remain TBD/PENDING, and the AI surfaces them rather than resolving them.

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

### Reserved Spazio decisions (PRD §12) — human-owned; decided for the pilot (see ADRs)

| Human decision (PRD §12) | Related ADR | Pilot decision — Accepted 2026-07-10 (see ADR) |
|---|---|---|
| Budget tolerance | `ADR-008` | Decided (pilot) — `ADR-008`: 10% (PRD BR-9 default adopted). |
| Commission percentage & fee model | `ADR-007` | Decided (pilot) — `ADR-007`: 10% of product price (PRD §9, BR-28), reconciled manually in the pilot. |
| Catalog synchronization frequency | `ADR-012` | Decided (pilot) — `ADR-012`: manual / on-demand refresh by the operator; no automated sync. |
| Render-time target | `ADR-013` | Decided (pilot) — `ADR-013`: ~2–5 minutes soft target (PRD §7); no hard SLA. |
| Daily free-render limit | `ADR-009` | Decided (pilot) — `ADR-009`: no limit; the five/day default (BR-19) applies only post-pilot. ~~(every render is operator-reviewed)~~ *rationale superseded by ADR-025 (2026-07-14); the no-limit value stands.* |
| Render-package pricing | `ADR-010` | Decided (pilot) — `ADR-010`: not offered in the pilot (deferred). |
| Cart-hold duration | `ADR-011` | Decided (pilot) — `ADR-011`: no stock hold; the 15-minute hold (BR-22) applies only post-pilot. |
| Payment gateway | `ADR-003` | Decided (pilot) — `ADR-003`: a single PCI-compliant hosted checkout, one payment in COP (provider selection: revisit before scale). |
| Merchant-of-record model | `ADR-004` | Decided (pilot) — `ADR-004`: the Spazio operating entity collects the single payment and pays suppliers manually (revisit before scale). |
| Split-settlement model | `ADR-003` | Decided (pilot) — `ADR-003`: no split settlement; the operator pays suppliers manually (revisit before scale). |
| Style taxonomy | `ADR-005` | Decided (pilot) — `ADR-005`: 1–2 predefined visual styles + free-text description; no taxonomy engine. |
| Supplier onboarding terms & contracts | `ADR-016` | Decided (pilot) — `ADR-016`: 2–4 hand-picked Bogotá suppliers under a one-page written agreement (commission, lead times, warranty). |
| Supported ingestion channels | `ADR-006` | Decided (pilot) — `ADR-006`: operator manually loads a CSV/Excel of 30–60 curated SKUs; no API/FTP/self-service ingestion. |
| Sponsored-plan pricing | `ADR-017` | Decided (pilot) — `ADR-017`: not offered in the pilot (deferred). |
| Initial markets | `ADR-015` | Decided (pilot) — `ADR-015`: Bogotá, Colombia; COP only. |
| Supplier partners | `ADR-016` | Decided (pilot) — `ADR-016`: hand-pick 2–4 Bogotá suppliers (business task, done manually). |
| Minimum catalog completeness | `ADR-014` | Decided (pilot) — `ADR-014`: a SKU is renderable only if all PRD BR-1 fields are present; the operator enforces this on load. |
| Legal and compliance requirements | `ADR-018`, `ADR-019`, `ADR-020` | Decided (pilot) — `ADR-018`/`ADR-019`/`ADR-020`: manual/minimal pilot approach (single-market manual taxes/invoicing, minimum-data privacy + consent, warranty not displayed, disputes handled manually); revisit before scale. |
| Data privacy | `ADR-019` | Decided (pilot) — `ADR-019`: photos/renders private by default (BR-33), collect the minimum data, short privacy notice + consent at first use; align with Ley 1581, legal review before scale. |
| Consumer protection | `ADR-019` | Decided (pilot) — `ADR-019`: minimum-data + consent pilot approach; legal review before scale. |
| Warranty rules | `ADR-020` | Decided (pilot) — `ADR-020`: the pilot does not display warranty; suppliers' own warranty terms apply. |
| Taxes | `ADR-018` | Decided (pilot) — `ADR-018`: single market (Colombia); taxes/invoicing handled manually, no tax engine; revisit before scale, confirm with an accountant. |
| Payments | `ADR-003` | Decided (pilot) — `ADR-003`: single hosted checkout, one payment in COP; no split settlement. |
| Brand identity | `ADR-021` | Decided (pilot) — `ADR-021`: dark-green + off-white palette (PRD v0.3), a simple wordmark, system font; minimal. |
| Visual design system | `ADR-021` | Decided (pilot) — `ADR-021`: minimal (palette + wordmark + system font); full design system later. |
| Final copywriting | human | Reserved for humans; no ADR — stays TBD. |
| Acceptance criteria | human | Reserved for humans; no ADR — stays TBD. |
| Release approval | human | Reserved for humans; no ADR — stays TBD. |
| Security review | human | Reserved for humans; no ADR — stays TBD. |
| Code review | human | Reserved for humans; no ADR — stays TBD. |
| Catalog quality | human (operator) | Reserved for the operator; ongoing operational judgment, no ADR. |
| Dispute resolution | `ADR-020` | Decided (pilot) — `ADR-020`: disputes handled manually by the operator; suppliers' warranty terms apply. |

When work touches a row that is still open (the "human" rows with no ADR), the AI records the open question, proposes options as DRAFT if useful, and waits for a human decision. When work touches a row already decided (an ADR is listed), the AI applies the decided pilot value and cites its ADR; it never silently changes a settled value or re-guesses one that is already decided.

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
- Flag any value that started as a **PRD default/example** (tolerance, daily limit, hold duration, render time, commission); its pilot value is now decided by the corresponding ADR (see the decisions table), so require it to be read from configuration keyed to that ADR rather than hardcoded.
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
- [ ] Decided PRD §12 values live in configuration and reference their ADR (see the decisions table); rows still reserved for humans with no ADR are not encoded as if settled.
- [ ] Budget, locality, delivery, photo-quality, stock-hold, and usage-limit rules are enforced as specified, with the error/fallback path handled (disclose gap, offer alternative, or mark unavailable — never fabricate).
- [ ] Operator-in-the-loop steps are respected where the spec requires them (catalog curation, manual order handoff; ~~render review~~ retired — ADR-025).
- [ ] User photos and generated renders are private by default (BR-33).
- [ ] Claims in the PR distinguish VERIFIED vs PROPOSED/DRAFT vs TBD, and cite PRD/pilot sections.
