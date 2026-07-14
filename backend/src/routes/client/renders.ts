import type { FastifyPluginAsync } from "fastify";
import { emit, EVENTS } from "../../events.js";
import { productSummary } from "../../services/productSummary.js";
import { projectOwnedByDevice, requireDeviceToken } from "./deviceScope.js";

interface CreateRenderBody {
  projectId: string;
  styleId?: string;
  freeText?: string;
  budgetMinCop?: number;
  budgetMaxCop?: number;
}

/**
 * Render routes.
 *  - POST /renders             create + enqueue; finalizes the project; emits render_created
 *                              (FR-014..018/021)
 *  - GET  /renders/:id         poll render status (visible after operator approval, FR-027)
 *  - GET  /renders/:id/items   tagged products; emits render_viewed (FR-028/029, §0.1#8)
 */
export const renderRoutes: FastifyPluginAsync = async (app) => {
  const { prisma, queue } = app.deps;

  app.post<{ Body: CreateRenderBody }>(
    "/renders",
    {
      schema: {
        body: {
          type: "object",
          required: ["projectId"],
          properties: {
            projectId: { type: "string" },
            styleId: { type: "string" },
            freeText: { type: "string" },
            budgetMinCop: { type: "integer" },
            budgetMaxCop: { type: "integer" },
          },
        },
      },
    },
    async (request, reply) => {
      const { projectId, styleId, freeText, budgetMinCop, budgetMaxCop } = request.body;

      const token = await requireDeviceToken(request, reply);
      if (!token) return;
      if (!(await projectOwnedByDevice(prisma, projectId, token))) {
        return reply.code(404).send({ error: "not_found", message: "Project not found." });
      }

      const render = await prisma.$transaction(async (tx) => {
        // Finalize the project (§0.1#3: bootstrapped at first input, finalized at render).
        await tx.project.update({ where: { id: projectId }, data: { status: "finalized" } });

        const renderRequest = await tx.renderRequest.create({
          data: {
            projectId,
            styleId: styleId ?? null,
            freeText: freeText ?? null,
            budgetMinCop: budgetMinCop ?? null,
            budgetMaxCop: budgetMaxCop ?? null,
            status: "queued",
          },
        });

        return tx.render.create({
          data: {
            renderRequestId: renderRequest.id,
            projectId,
            reviewStatus: "pending_review",
          },
        });
      });

      await queue.enqueue({ renderId: render.id });
      await emit(prisma, {
        type: EVENTS.RENDER_CREATED,
        projectId,
        metadata: { renderId: render.id },
      });

      return reply.code(202).send({
        renderId: render.id,
        status: "queued",
        reviewStatus: render.reviewStatus,
      });
    },
  );

  app.get<{ Params: { id: string } }>(
    "/renders/:id",
    {
      schema: {
        params: { type: "object", required: ["id"], properties: { id: { type: "string" } } },
      },
    },
    async (request, reply) => {
      const token = await requireDeviceToken(request, reply);
      if (!token) return;
      const render = await prisma.render.findUnique({
        where: { id: request.params.id },
        include: { project: { select: { deviceToken: true } } },
      });
      // Another device's render answers 404 — no existence leak (NFR-007).
      if (!render || render.project.deviceToken !== token) {
        return reply.code(404).send({ error: "not_found", message: "Render not found." });
      }
      return reply.code(200).send({
        renderId: render.id,
        reviewStatus: render.reviewStatus,
        imageKey: render.imageKey,
      });
    },
  );

  app.get<{ Params: { id: string } }>(
    "/renders/:id/items",
    {
      schema: {
        params: { type: "object", required: ["id"], properties: { id: { type: "string" } } },
      },
    },
    async (request, reply) => {
      const token = await requireDeviceToken(request, reply);
      if (!token) return;
      const render = await prisma.render.findUnique({
        where: { id: request.params.id },
        include: {
          items: { include: { product: { include: { supplier: true } } } },
          project: { select: { deviceToken: true } },
        },
      });
      if (!render || render.project.deviceToken !== token) {
        return reply.code(404).send({ error: "not_found", message: "Render not found." });
      }

      // render_viewed is emitted here (§0.1#8).
      await emit(prisma, {
        type: EVENTS.RENDER_VIEWED,
        projectId: render.projectId,
        metadata: { renderId: render.id },
      });

      return reply.code(200).send({
        renderId: render.id,
        items: render.items.map((it) => ({
          id: it.id,
          productId: it.productId,
          tagPosition: it.tagPosition,
          priceCopSnapshot: it.priceCopSnapshot,
          // The tag carries name, price, supplier (FR-028; plan §1.5 step 5).
          product: productSummary(it.product),
        })),
      });
    },
  );
};
