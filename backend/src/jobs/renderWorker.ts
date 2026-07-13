import type { PrismaClient } from "@prisma/client";
import type { Queue, RenderJob } from "./queue.js";
import type { RenderPipeline } from "../services/render/pipeline.js";

/**
 * Render worker stub. Wires the queue to the render pipeline: when a render job is
 * dequeued it (would) run the pipeline, persist the resulting image key + items,
 * and leave the render in `pending_review` for operator QA (FR-027).
 *
 * This is a scaffold: the body performs the minimal persistence and is safe to run
 * against a live DB, but the matching/scaling logic is deferred to the feature.
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

    const result = await pipeline.generate({
      renderId,
      photoStorageKey: photo?.storageKey ?? "",
      styleId: render.renderRequest.styleId,
      freeText: render.renderRequest.freeText,
      budgetMinCop: render.renderRequest.budgetMinCop,
      budgetMaxCop: render.renderRequest.budgetMaxCop,
      candidateProductIds: [], // matching is deferred; scaffold passes none
    });

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
