# ADR-002 - Rendering / AI pipeline

## Status

Proposed.

## Context

The PRD reserves the rendering / AI pipeline choice as a human decision (this ADR follows from PRD §12, "AI role," which lists building and maintaining the rendering pipeline, and from the pilot's Day-1 task to "set up the rendering pipeline and prompt"). Nothing is built yet.

This is the product's core and highest-risk area:

- The central innovation is that **the AI does not invent furniture**; every rendered item must correspond to a real, purchasable SKU already in the marketplace (PRD §1; BR-6, BR-14; FR-015, FR-016).
- The pipeline must composite matched SKUs into the user's own room photo photorealistically, at believable scale, using approximate room dimensions (FR-015, FR-017; BR-7), and only from currently available products (BR-4; FR-018).
- **Render fidelity is called out as the highest risk** in the PRD: accurately compositing a real SKU into the user's room at the correct size and appearance; a poor match could increase returns and disputes (PRD §10).
- Dependencies include object detection and segmentation and an AI pipeline constrained to real inventory (PRD §10).
- Performance and cost constraints apply: a render-time target (PRD ~2–5 min, TBD; NFR-001), faster targeted edits (NFR-002), a global inference-cost threshold, graceful degradation, and per-render cost tracking (PRD §7; NFR-003, NFR-004, NFR-005).
- In the pilot, an operator reviews each render before it reaches the user (Pilot, "The human's role"; FR-027), which the pipeline design must accommodate.

## Decision

PENDING - to be decided by the team.

## Alternatives considered

1. **Hosted image-generation / inpainting API (2D diffusion-based compositing of product images into the room photo).**
   - Pros: Fast to stand up for the one-week pilot; no GPU infrastructure; can iterate on prompts quickly.
   - Cons: Hard to guarantee a rendered object is the exact real SKU rather than a plausible look-alike (tension with BR-6/BR-14); per-render cost and latency depend on a third party; less control over cost threshold enforcement.

2. **Self-hosted open image models (diffusion / segmentation run on own or rented GPUs).**
   - Pros: Full control over cost per render (NFR-005), data privacy for user photos (BR-33, NFR-007), and pipeline behavior; no per-call vendor fees.
   - Cons: Significant setup and MLOps effort, likely too heavy for a one-week pilot; still needs strong SKU-fidelity controls.

3. **3D / product-asset compositing (place supplier-provided product images or 3D assets into a reconstructed scene, with lighting/scale from dimensions).**
   - Pros: Strongest guarantee that what is shown is the real SKU (uses actual product photos/assets), directly serving BR-6/BR-14 and scale realism (BR-7); deterministic.
   - Cons: Depends on high-quality product assets from suppliers (catalog completeness, BR-1); photorealism and natural placement are harder; more per-scene engineering.

4. **Hybrid: segmentation of the room + AI inpainting constrained to real product images/assets, with a matching layer that selects SKUs first.**
   - Pros: Combines fidelity (real SKUs first) with photorealism (AI compositing); fits the "match then render" flow (FR-014 → FR-015); supports operator review (FR-027).
   - Cons: Most components to build and integrate; hardest to fit into one week without cutting corners.

(Any option must include a mechanism to keep every rendered item tied to a real, available SKU and never fabricate products — BR-6, BR-14, FR-016 — and to disclose/handle no-match and budget cases — FR-022, FR-023.)

## Positive consequences

- A resolved pipeline directly determines whether the core loop works: a believable render of real, buyable furniture (Pilot, "The one core thing"), which the whole product depends on.
- Choosing with fidelity and cost in mind protects the primary metric (render-to-purchase) and controls inference spend from day one (NFR-006).

## Negative consequences

- The wrong choice risks low render fidelity — the PRD's highest risk — increasing returns and disputes, or unbounded inference cost with low conversion (PRD §10).
- Some options that maximize fidelity (3D/asset compositing, self-hosting) are hard to deliver in the one-week pilot window; some options that are fast (hosted API) weaken the "real SKU only" guarantee. This tension must be resolved deliberately.

## Date

TBD.
