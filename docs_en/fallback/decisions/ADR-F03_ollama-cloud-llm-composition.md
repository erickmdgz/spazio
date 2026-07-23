# ADR-F03 — LLM composition via the Ollama Cloud API with schema-constrained output and a rule-based fallback; no post-validation layer

**Status:** Proposed (pending human approval) · **Scope:** 2-day fallback demo only · **Date:** 2026-07-13
**History:** 2026-07-13 — initial draft included a deterministic post-validation layer; **removed the same day by stakeholder decision** ("retirar por completo el validador"). 2026-07-13 — **revised from local Ollama to the hosted Ollama Cloud API** by stakeholder decision. This record reflects the revised design and the accepted risks.

## Context

The fallback needs a component that turns ~60–90 real products into 2–3 style-coherent proposals (color harmony, design direction, room coherence, fit, budget). The stakeholder chose **Ollama as the LLM provider, consumed through its hosted Cloud API** (ollama.com, authenticated with an API key) rather than a local install — no local hardware requirement, access to larger hosted models, same API contract as local Ollama. LLM output remains the demo's least reliable link: a model can emit malformed JSON or rule-violating selections.

## Decision

1. **Ollama Cloud API**: calls go to Ollama's hosted endpoint (`OLLAMA_URL`, default `https://ollama.com`, same `/api/chat` contract as local Ollama) authenticated with **`OLLAMA_API_KEY`** (env only — NFR-F01). Default model: chosen from Ollama's hosted catalog at build time (DRAFT — e.g. `gpt-oss:20b`), env-swappable via `OLLAMA_MODEL`, temperature 0.4.
2. **Structured output**: every call passes a JSON schema through Ollama's `format` parameter, so the response shape is machine-enforced; the model's only free text is `style_name`, `design_direction`, `palette_description`, `rationale` (NFR-F04).
3. **No deterministic post-validation layer** (stakeholder decision, 2026-07-13): the numeric constraints — footprint cap, budget ceiling, per-type cardinality — travel to the model in the prompt and are **best-effort**. What remains non-negotiable is structural: the display payload is built by resolving product IDs against the fetched catalog snapshot (unknown ID ⇒ item omitted; < 3 resolvable items ⇒ proposal dropped), and every displayed total and fit figure is recomputed from API data, never read from the model (FR-F08; NFR-F04). Rehearsal spot-checks are the manual safety net (`08_test_plan.md`).
4. **Rule-based fallback composer**: if the model produces malformed/schema-nonconforming output for **N=2 attempts**, or the Ollama API is unreachable, proposals are composed deterministically (group eligible products by color family; pick per furniture type by price fit and footprint headroom) and flagged `composer: "rules"`. The demo can therefore complete **even with the Ollama API down or the network out** — this path is rehearsed explicitly (Ollama-outage drill, `08_test_plan.md`).
5. The **system prompt is a versioned artifact** (`fallback/09_ai_usage.md`); changing its rules is a product decision requiring human sign-off — with no validator, the prompt is the only lever over the numeric constraints.

## Alternatives considered

- **Local Ollama install**: initially specified (no API key, offline, no per-call cost). **Replaced by the Cloud API by stakeholder decision**: no local install or GPU/RAM dependency on the demo machine, and access to larger hosted models with better instruction-following — which matters more now that there is no validator. Same API contract, so a local swap remains trivial if ever needed.
- **Different hosted LLM (Claude API)**: better structured-output reliability, but the stakeholder selected Ollama as the provider. The `LLMComposer` interface keeps a provider swap cheap if reliability disappoints in rehearsal.
- **No LLM — rules only**: maximally reliable but loses the demonstrable "AI taste" (style naming, palette reasoning), which is part of the thesis. Kept, instead, as the fallback path.
- **LLM free-form text + lenient parsing**: rejected outright — leniently parsed output is how fabricated products sneak in; violates the hard rule.
- **Deterministic post-validation layer** (ID membership, cardinality, footprint, budget gates with content-based retries): initially specified, **removed by stakeholder decision** to simplify the build; risk accepted and recorded below.

## Positive consequences

- No local install, model download, or hardware requirement on the demo machine; inference speed does not depend on the laptop.
- Hosted catalog gives access to larger models with stronger instruction-following — the main lever for the prompt-only constraints (no validator).
- The guardrails that remain (schema → structural snapshot resolution → rules fallback) mean model failure can never produce a fabricated product or block demo completion.
- Removing the validator and the content-based retry loop shrinks Day 1 scope and worst-case latency.

## Negative consequences

- **Footprint, budget, and cardinality adherence now depend entirely on the model following the prompt.** A rule-violating proposal (over budget, oversized, four sofas) can reach the user; the recomputed fit summary and totals make it visible, and rehearsal spot-checks with prompt tuning are the only mitigation.
- **The live demo now depends on network and Ollama-service availability, quotas, and pricing** (a second external dependency besides SerpApi, whose cache does not cover the LLM). Mitigation: the rule-based composer completes the demo through an outage (rehearsed drill).
- `OLLAMA_API_KEY` is a second secret to manage (env only, never committed — NFR-F01).
- Structured-output support and model availability must be confirmed against the hosted catalog on Day 1 (the default model choice is DRAFT).
