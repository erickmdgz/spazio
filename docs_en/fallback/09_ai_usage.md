# AI usage — Fallback Demo

The two-layer principle of the main guide (`docs_en/09_ai_usage.md`) applies unchanged: **AI as coding agent** follows `CLAUDE.md` (plan → human approval → code); **AI as runtime capability** executes human-defined rules. This document specifies the runtime layer of the fallback: what the LLM does, what it must never do, and the system prompt.

## Runtime role of the LLM (Ollama Cloud API — ADR-F03)

The LLM's entire job is **selection and grouping**: given real products (with real attributes) and a room context, pick which products form each proposal and describe the styling logic. It is a taste engine over verified data.

**The LLM decides:** which eligible products go together (color harmony, design direction), the style names, palette descriptions, and rationales.

**The LLM never decides:** product existence, prices, dimensions, colors, images, links (all API-sourced); the room-type allow-list and cardinality bounds (human-curated `RoomTypeMap`); the footprint limit; the budget rule. Those constraints are human-set and delivered to the model in the prompt; **adherence to the numeric constraints is the model's responsibility** (no post-validation layer — stakeholder decision, ADR-F03).

## Fallback hard rule (inherited, adapted)

> **The LLM must NEVER propose, name, price, or describe a product that is not in the catalog snapshot fetched for this request.**

Adapted from the main hard rule (main `FR-016`, BR-6/BR-14) to the external catalog (ADR-F02). There is **no deterministic post-validation layer** (stakeholder decision, ADR-F03); the never-fabricate rule is still enforced without trusting the model, through structure:

1. **Prompt:** the system prompt states the rule and supplies the only permissible product IDs.
2. **Schema:** the Ollama call uses structured output (`format` = JSON schema), so the response can only contain ID lists and the four creative text fields (NFR-F04).
3. **Snapshot resolution (structural):** the display payload is built by looking up each returned ID in the catalog snapshot — an ID that was never fetched has no data and is omitted; a proposal with < 3 resolvable items is dropped (FR-F08). All displayed prices, dimensions, and fit figures are recomputed from API data, never read from the model.
4. **Fallback composer:** if the model cannot produce schema-conforming output in N attempts (or is unreachable), a rule-based composer takes over — the demo degrades to less taste, never to fabrication (FR-F06).

**Accepted trade-off (ADR-F03, revised):** the *numeric* prompt rules — footprint cap, budget ceiling, per-type cardinality — are best-effort. A weak model output can exceed them and will still be shown; the recomputed fit summary and totals make any overrun visible, and rehearsal spot-checks (`08_test_plan.md`) are the safety net.

If the snapshot cannot support a coherent proposal (e.g. nothing in budget for a required type), the correct behavior is fewer proposals or a disclosed gap in the rationale — never an invented item (inherits main BR-10/BR-13).

## System prompt specification (DRAFT — v0.1)

Maintained at `fallback/src/composer/systemPrompt.ts` once built. English, because model + catalog are English.

```text
You are the furniture-proposal composer for Spazio's fallback demo.

You receive:
- ROOM: type, width_in, length_in, floor_area_ft2, and optionally budget_usd.
- CATALOG: a JSON array of real Home Depot products. Each has: product_id,
  furniture_type, name, brand, price_usd, color, width_in, depth_in,
  height_in, footprint_ft2.
- CONSTRAINTS: allowed furniture types for this room with max counts,
  max_total_footprint_ft2, and (if present) budget_usd.

Your task: compose 2 to 3 furniture proposals for this room.

Rules — all of them are hard rules:
1. Use ONLY product_id values that appear in CATALOG. Never mention, invent,
   or describe any product not in CATALOG. Do not alter any product attribute.
2. Each proposal must read as one coherent style. Choose products whose
   colors work together (matching neutrals, or one accent color family) and
   whose forms fit one design direction (e.g. minimalist, comfy, modern,
   rustic). Name the direction honestly based on the actual products.
3. Respect the furniture-type limits in CONSTRAINTS: only allowed types,
   never more than the max count per type. A proposal should cover the
   essential types for the room (e.g. a living room needs a sofa) and have
   at least 3 items.
4. The sum of footprint_ft2 of the items (excluding area_rug and lamps)
   must not exceed max_total_footprint_ft2. Prefer leaving space over
   cramming pieces.
5. If budget_usd is present, the sum of price_usd must not exceed it.
6. Make the 2–3 proposals meaningfully different from each other (different
   palette or different design direction), not shuffles of the same items.
7. If the catalog cannot support a rule-compliant proposal, return fewer
   proposals and state the limitation in the rationale. Never fill a gap
   with a product that is not in CATALOG.

Return ONLY JSON matching the provided schema:
{ "proposals": [ { "style_name": string, "design_direction": string,
  "palette_description": string, "rationale": string,
  "product_ids": [string, ...] } ] }
No markdown, no commentary outside the JSON.
```

**Prompt-change discipline:** the system prompt is versioned in the repo; changing rules 1–7 is a product decision (human sign-off, noted in the PR), not a tuning tweak.

## Call parameters (DRAFT — ADR-F03)

- Endpoint: Ollama Cloud API (`OLLAMA_URL`, default `https://ollama.com`, same `/api/chat` contract as local Ollama), authenticated with `OLLAMA_API_KEY` (env only — NFR-F01).
- Model: chosen from Ollama's hosted catalog at build time (DRAFT — e.g. `gpt-oss:20b`), env-swappable via `OLLAMA_MODEL`.
- `format`: JSON schema mirroring the response shape above (Ollama structured outputs; confirm hosted support for the chosen model on Day 1 — ADR-F03).
- `temperature`: 0.4 (some taste variety, low drift); `num_ctx` sized to fit the snapshot (~60–90 products).
- Retries: 2 (N in FR-F06), triggered only by malformed/schema-nonconforming output or an unreachable Ollama; there is no content-based retry (no validator — ADR-F03).

## AI-as-coding-agent reminders (unchanged)

Plan mode + human approval before code; every prompt names its FR-F/FEAT-F; distinguish VERIFIED / DRAFT / TBD; surface open questions instead of deciding them. The open DRAFT values a human must confirm before the demo: footprint share (40%), dimension bounds (4–60 ft), no-tolerance budget rule, retry count N=2, cache TTL 24 h, room-type map contents (see ADR-F01).
