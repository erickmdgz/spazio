import { Prisma, type PrismaClient } from "@prisma/client";
import type { Queue, RenderJob } from "./queue.js";
import type { RenderPipeline } from "../services/render/pipeline.js";
import { matchProducts } from "../services/matching.js";
import { selectProductsByIds } from "../services/catalog.js";
import { populateCartFromRender } from "../services/cart.js";
import { attributionOf } from "../services/attribution.js";

/**
 * Render worker: match → render → persist → publish (plan §1.5; ADR-025).
 * When a render job is dequeued it matches real, purchasable SKUs (FEAT-005
 * subset, see services/matching.ts), runs the pipeline over ONLY those
 * candidates (BR-6/BR-14 — nothing is fabricated), persists the image key and
 * one RenderItem per composed SKU with a real price snapshot, auto-populates
 * the project's cart (FR-031, BR-31), and marks the request `completed` — the
 * render is published to the requesting user immediately on generation success
 * (ADR-025; no operator review). A pipeline failure marks the request `failed`.
 *
 * User-curated selection (ADR-028/FR-068): when the job carries the user's chosen
 * productIds, the worker composites EXACTLY those (after re-validating existence /
 * approval / renderability / stock / attribution via selectProductsByIds) instead
 * of auto-matching. With no selection it falls back to matchProducts() as before
 * (backward compatible). Either way the fabrication guard and the public-excluded
 * cart auto-populate are unchanged: a source=public selection is still composited
 * and tagged for display but never carted (FR-064, ADR-027).
 */
export function registerRenderWorker(
  queue: Queue<RenderJob>,
  prisma: PrismaClient,
  pipeline: RenderPipeline,
): void {
  queue.process(async ({ renderId, productIds }) => {
    // Job start was previously invisible (BUG-005): the queue only logged
    // failures, so a slow render and a never-started one looked identical.
    // eslint-disable-next-line no-console
    console.log(
      `[queue] job started render=${renderId} selection=${productIds?.length ?? 0} product(s)`,
    );
    const render = await prisma.render.findUnique({
      where: { id: renderId },
      include: { renderRequest: true },
    });
    if (!render) return;

    await prisma.renderRequest.update({
      where: { id: render.renderRequestId },
      data: { status: "processing" },
    });

    try {
      const photo = await prisma.roomPhoto.findFirst({
        where: { projectId: render.projectId },
        orderBy: { createdAt: "desc" },
      });

      // User-curated selection composites EXACTLY the chosen products (ADR-028/
      // FR-068), re-validated here; otherwise fall back to auto-match (FR-014/015).
      const products =
        productIds && productIds.length > 0
          ? await selectProductsByIds(prisma, productIds)
          : await matchProducts(prisma, {
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
      // from the pipeline. Provenance (source) is copied from the Product, and a
      // source=public item carries the CC BY 4.0 attribution + "View at retailer"
      // outbound link, propagated onto the render — a derivative work (FR-065,
      // NFR-019, ADR-026/ADR-027). A public item missing required attribution is
      // dropped (FR-065/TC-118 — not composited; matching already excludes it, this
      // is the defensive floor).
      const items = result.items
        .filter((item) => productsById.has(item.productId))
        .map((item) => {
          const product = productsById.get(item.productId)!;
          const isPublic = product.source === "public";
          const attribution = isPublic ? attributionOf(product) : null;
          return {
            renderId,
            productId: item.productId,
            tagPosition: item.tagPosition,
            priceCopSnapshot: product.priceCop,
            source: product.source,
            attribution: attribution
              ? (attribution as unknown as Prisma.InputJsonValue)
              : undefined,
            outboundUrl: isPublic ? (product.sourceUrl ?? undefined) : undefined,
            isPublic,
            hasAttribution: attribution !== null,
          };
        })
        .filter((item) => !item.isPublic || item.hasAttribution)
        .map(({ isPublic: _isPublic, hasAttribution: _hasAttribution, ...data }) => data);
      if (items.length > 0) {
        await prisma.renderItem.createMany({ data: items });
      }

      await prisma.render.update({
        where: { id: renderId },
        data: { imageKey: result.imageKey },
      });

      // Generation success auto-populates the cart from the render's items
      // (FR-031, BR-31; trigger moved here from operator approval — ADR-025).
      // Done before the status flips so a client that sees `completed` finds
      // its cart already populated.
      await populateCartFromRender(prisma, render);

      await prisma.renderRequest.update({
        where: { id: render.renderRequestId },
        data: { status: "completed" },
      });
    } catch (err) {
      await prisma.renderRequest.update({
        where: { id: render.renderRequestId },
        data: { status: "failed" },
      });
      throw err;
    }
  });
}
