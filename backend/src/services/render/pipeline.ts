/**
 * RenderPipeline — hosted generative image API abstraction (ADR-002).
 *
 * Hard rule (BR-6 / BR-14): every rendered item must map to a real, in-stock SKU;
 * the pipeline never fabricates products. The pilot ships a FAKE implementation
 * that returns a placeholder image key and echoes back the candidate SKUs it was
 * given — it does not call any external vendor. Renders are published immediately
 * on generation success (ADR-025).
 */

export interface RenderPipelineInput {
  renderId: string;
  photoStorageKey: string;
  styleId?: string | null;
  freeText?: string | null;
  budgetMinCop?: number | null;
  budgetMaxCop?: number | null;
  /** Real, in-stock, approved candidate SKUs the render may compose (BR-6/BR-14). */
  candidateProductIds: string[];
}

export interface RenderPipelineItem {
  productId: string;
  tagPosition: { x: number; y: number };
  priceCopSnapshot: number;
}

export interface RenderPipelineResult {
  imageKey: string;
  items: RenderPipelineItem[];
}

export interface RenderPipeline {
  generate(input: RenderPipelineInput): Promise<RenderPipelineResult>;
}

/**
 * Fake pipeline for the pilot/dev. Deterministic, no external calls. It only ever
 * references SKUs passed in candidateProductIds (conceptually enforcing "real
 * in-stock SKUs only"); it does not invent products.
 */
export class FakeRenderPipeline implements RenderPipeline {
  async generate(input: RenderPipelineInput): Promise<RenderPipelineResult> {
    const items: RenderPipelineItem[] = input.candidateProductIds.map((productId, i) => ({
      productId,
      tagPosition: { x: (i + 1) * 0.1, y: (i + 1) * 0.1 },
      // Snapshot price is filled by the caller from the real Product row; the
      // fake pipeline has no price knowledge, so it returns 0 as a placeholder.
      priceCopSnapshot: 0,
    }));
    return {
      imageKey: `renders/${input.renderId}/composite.png`,
      items,
    };
  }
}
