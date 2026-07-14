import type { PrismaClient } from "@prisma/client";
import type { Queue, RenderJob } from "./queue.js";
import type { RenderPipeline } from "../services/render/pipeline.js";
import { matchProducts } from "../services/matching.js";

/**
 * Render worker: match → render → persist → pending_review (plan §1.5).
 * When a render job is dequeued it matches real, purchasable SKUs (FEAT-005
 * subset, see services/matching.ts), runs the pipeline over ONLY those
 * candidates (BR-6/BR-14 — nothing is fabricated), persists the image key and
 * one RenderItem per composed SKU with a real price snapshot, and leaves the
 * render in `pending_review` for operator QA (FR-027).
 */
export function registerRenderWorker(
  queue: Queue<RenderJob>,
  prisma: PrismaClient,
  pipeline: RenderPipeline,
): void {
  queue.process(async ({ renderId }) => {
    const render = await prisma.render.findUnique({
      where: { id: renderId },
      include: { renderRequest: true },
    });
    if (!render) return;

    const photo = await prisma.roomPhoto.findFirst({
      where: { projectId: render.projectId },
      orderBy: { createdAt: "desc" },
    });

    const products = await matchProducts(prisma, {
      styleId: render.renderRequest.styleId,
      budgetMinCop: render.renderRequest.budgetMinCop,
      budgetMaxCop: render.renderRequest.budgetMaxCop,
    });
    const productsById = new Map(products.map((product) => [product.id, product]));

    const result = await pipeline.generate({
      renderId,
      photoStorageKey: photo?.storageKey ?? "",
      styleId: render.renderRequest.styleId,
      freeText: render.renderRequest.freeText,
      budgetMinCop: render.renderRequest.budgetMinCop,
      budgetMaxCop: render.renderRequest.budgetMaxCop,
      candidateProductIds: products.map((product) => product.id),
    });

    // Fabrication guard (FR-016, TC-031): persist only items that resolve to a
    // matched, real product; price snapshots come from the Product row, never
    // from the pipeline.
    const items = result.items
      .filter((item) => productsById.has(item.productId))
      .map((item) => ({
        renderId,
        productId: item.productId,
        tagPosition: item.tagPosition,
        priceCopSnapshot: productsById.get(item.productId)?.priceCop ?? 0,
      }));
    if (items.length > 0) {
      await prisma.renderItem.createMany({ data: items });
    }

    await prisma.render.update({
      where: { id: renderId },
      data: { imageKey: result.imageKey },
    });
    await prisma.renderRequest.update({
      where: { id: render.renderRequestId },
      data: { status: "completed" },
    });
  });
}
