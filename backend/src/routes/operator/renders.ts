import type { FastifyPluginAsync } from "fastify";
import { emit, EVENTS } from "../../events.js";

/**
 * Operator render review queue (§0.1#5; FR-027). Registered under /api/v1/operator.
 *  - GET  /renders?status=pending_review
 *  - POST /renders/:id/approve   emits render_approved (§0.1#8)
 *  - POST /renders/:id/reject
 */
export const operatorRenderRoutes: FastifyPluginAsync = async (app) => {
  const { prisma } = app.deps;

  app.get<{ Querystring: { status?: "pending_review" | "approved" | "rejected" } }>(
    "/renders",
    {
      schema: {
        querystring: {
          type: "object",
          properties: {
            status: { type: "string", enum: ["pending_review", "approved", "rejected"] },
          },
        },
      },
    },
    async (request, reply) => {
      const status = request.query.status ?? "pending_review";
      const renders = await prisma.render.findMany({
        where: { reviewStatus: status },
        orderBy: { createdAt: "asc" },
      });
      return reply.code(200).send({ renders });
    },
  );

  app.post<{ Params: { id: string } }>(
    "/renders/:id/approve",
    {
      schema: {
        params: { type: "object", required: ["id"], properties: { id: { type: "string" } } },
      },
    },
    async (request, reply) => {
      const render = await prisma.render.update({
        where: { id: request.params.id },
        data: { reviewStatus: "approved", reviewedAt: new Date() },
      });

      // Approval auto-populates the cart (FR-031) — deferred to the cart feature.
      await emit(prisma, {
        type: EVENTS.RENDER_APPROVED,
        projectId: render.projectId,
        metadata: { renderId: render.id },
      });

      return reply.code(200).send({ id: render.id, reviewStatus: render.reviewStatus });
    },
  );

  app.post<{ Params: { id: string } }>(
    "/renders/:id/reject",
    {
      schema: {
        params: { type: "object", required: ["id"], properties: { id: { type: "string" } } },
      },
    },
    async (request, reply) => {
      const render = await prisma.render.update({
        where: { id: request.params.id },
        data: { reviewStatus: "rejected", reviewedAt: new Date() },
      });
      return reply.code(200).send({ id: render.id, reviewStatus: render.reviewStatus });
    },
  );
};
