# ADR-026 - Self-hosted render engine (FLUX.2 Klein 4B via mflux)

## Status

Accepted (product owner, 2026-07-14).

Scope: the rendering-engine implementation, from 2026-07-14 onward. Supersedes **only** the **hosted generative image API clause** of ADR-002 (the choice to composite via a third-party hosted image API with an unselected vendor). Everything else in ADR-002 stands: **no custom-trained model** (FLUX.2 Klein 4B is pretrained open weights, not a model trained by us), and the **real-SKU-only** invariant (every rendered item maps to a real, purchasable SKU — BR-6, BR-14, FR-016) is unchanged and preserved. ADR-025 (renders published immediately on generation success) and the async submit-and-poll render-job contract are unaffected.

## Context

ADR-002 chose a **hosted generative image API** for compositing product images into the user's room photo, and explicitly left the vendor unselected ("built behind interfaces," per the ADR-001 implementation note). ADR-002's Alternative #2 (self-hosted open image models) was rejected mainly because the MLOps effort looked too heavy for the then-current one-week pilot window.

Since then the platform framing changed (ADR-024: the product continues as the web app at class-demo scale; the one-week pilot program no longer governs), and the render-review gate was removed (ADR-025: renders publish on generation success). Against that backdrop the product owner evaluated a self-hosted engine and proved it on hardware:

- **FLUX.2 Klein 4B** (Black Forest Labs) runs locally through the **mflux** CLI (Apple MLX). On the owner's M2 (32 GB RAM), `mflux-generate-flux2-edit --model flux2-klein-4b -q 8` composites a product image into a room photo well, at ~13.5 GB peak RAM and a few minutes per edit. Latency is acceptable to the owner and fits the existing async render-job model. *(Measurement update — BUG-004, 2026-07-16: that proof point was a single-reference edit with a warm model cache. A worst-case curated render — 3 reference products, 960×1280 output — measures **617 s** (~75 s per diffusion step × 8) at **19.75 GB peak MLX memory** on the same host; per-step cost grows steeply with reference-image count and resolution. The async model absorbs it: `RENDER_TIMEOUT_MS` now defaults to 15 min (BUG-004) and render jobs run strictly serialized (BUG-005). Latency remains acceptable to the owner — ADR-013's soft target with no hard SLA stands.)*
- **Licensing (verified from the model card):** the **4B** Klein weights are **Apache-2.0** (commercial use permitted). The 9B Klein and FLUX.2 dev variants are Non-Commercial. The engine must therefore pin to the **4B** variant to keep commercial use clean.
- **Deployment reality:** mflux depends on Apple MLX, so the render host **must be Apple Silicon**. Typical managed Node backends are x86 Linux and cannot run mflux. This is a genuine new constraint against ADR-001's single managed environment, and is addressed by running the engine on a separate render host rather than in the API process.
- **Privacy upside:** self-hosting means room photos and renders no longer egress to a third-party image vendor, which strengthens the privacy posture (BR-33, NFR-007, ADR-019).

The prior blocker (heavy MLOps for a one-week pilot) is overtaken by the working M2 proof and the relaxed scope.

## Decision

1. **The render engine is self-hosted FLUX.2 Klein 4B, run locally via the mflux CLI as a child process.** A new `MfluxRenderPipeline` invokes `mflux-generate-flux2-edit` (model `flux2-klein-4b`, quantized) as a subprocess to composite the operator-curated product image(s) into the user's room photo. This replaces the placeholder `FakeRenderPipeline` as the real rendering implementation.
2. **Pin to the 4B variant.** The engine uses FLUX.2 Klein **4B** specifically because it is Apache-2.0 (commercial use). The 9B / dev variants (Non-Commercial) must not be used.
3. **The async contract is unchanged.** The existing `POST /renders` → `202` + poll model already fits a slow local child process; render jobs continue through the same queue and status lifecycle. No API contract change is introduced by this ADR.
4. **Render host is Apple Silicon.** The engine runs on an Apple-Silicon render worker that consumes the existing async render-job queue, kept separate from the (x86-capable) API backend. For the class demo, the owner's M2 is that worker.
5. **`FakeRenderPipeline` stays as the default/test/CI implementation.** `MfluxRenderPipeline` is selected only when explicitly configured; tests and CI remain hermetic with no dependency on mflux, MLX, or Apple-Silicon hardware. No third-party vendor client beyond mflux is required.
6. **Invariants preserved.** The real-SKU-only guarantee (BR-6, BR-14, FR-016) is unchanged: the engine composites the matched real SKU's curated image and never fabricates products. ADR-002's "no custom-trained model" rule holds — Klein is pretrained open weights.

## Alternatives considered

1. **Hosted generative image API (ADR-002's original choice).** Now rejected. Pros: fastest to stand up, no local hardware. Cons that decided against it: a per-render vendor fee, latency and cost dependent on a third party, and room photos egressing to an external vendor. Superseded by the self-hosted choice below.
2. **Self-hosted open image models (ADR-002's Alternative #2).** Chosen. ADR-002 rejected this for "significant setup and MLOps effort, likely too heavy for a one-week pilot." That con is overtaken: mflux + Klein 4B is proven working on the owner's M2, and the pilot window no longer governs (ADR-024). Full control over cost and behavior; no per-call vendor fees; user photos stay on the render host.

(Any option must keep every rendered item tied to a real, available SKU and never fabricate products — BR-6, BR-14, FR-016; this is preserved by compositing the matched SKU's curated image.)

## Positive consequences

- **Zero marginal per-render vendor fee.** Rendering cost becomes local compute rather than a metered third-party call, removing the per-call cost dependency ADR-002 worried about (NFR-005).
- **Privacy win.** Room photos and renders no longer leave to a third-party image vendor, strengthening BR-33 / NFR-007 / ADR-019.
- **Full control** over the pipeline, model version, and behavior, with open (Apache-2.0) weights and no vendor lock-in.

## Negative consequences

- **Apple-Silicon-only render host.** mflux requires Apple MLX, so the engine cannot run on a typical x86 Linux managed backend. This is a real deployment constraint against ADR-001's single managed environment, mitigated by running a separate Apple-Silicon render worker off the existing async queue (the owner's M2 for the class demo). It adds an operational moving part and a hardware dependency the hosted API did not have.
- **Local compute / hardware cost replaces per-call fees.** The cost shifts from metered vendor calls to owning and running Apple-Silicon hardware; at low volume this is favorable, but capacity is bounded by the hardware rather than elastic.
- **Slower than a tuned hosted API.** A few minutes per edit on the M2 (measured up to ~10 min for a 3-reference render — see the BUG-004 measurement update above) is slower than a purpose-built hosted service could be, but latency is acceptable to the owner and fits the async submit-and-poll model; the ~2–5 min soft render-time target (ADR-013 / NFR-001) remains a soft target with no hard SLA.
- The **highest-risk render-fidelity concern** from ADR-002 / PRD §10 is unchanged by the engine swap; ADR-025 already removed the review gate, and this ADR introduces no new mitigation.

## Date

2026-07-14.
