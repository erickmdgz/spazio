import type { FastifyPluginAsync } from "fastify";
import { emit, EVENTS } from "../../events.js";
import { populateCartFromRender } from "../../services/cart.js";
import { requireOperatorRole } from "../../auth/operator.js";

/**
 * Operator render review queue (§0.1#5; FR-027). Registered under /api/v1/operator.
 *  - GET  /renders?status=pending_review
 *  - POST /renders/:id/approve   render_reviewer role; only from pending_review;
 *                                emits render_approved + auto-populates the cart
 *  - POST /renders/:id/reject    render_reviewer role; only from pending_review
 *
 * The pending_review precondition is enforced atomically (conditional update),
 * so a stale queue view cannot re-approve, double-emit, or flip an already
 * released render (NFR-008 intent; review finding deferred from PR #32).
 */
export const operatorRenderRoutes: FastifyPluginAsync = async (app) => {
  const { prisma } = app.deps;
  const reviewerOnly = requireOperatorRole("render_reviewer");

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
      preHandler: reviewerOnly,
      schema: {
        params: { type: "object", required: ["id"], properties: { id: { type: "string" } } },
      },
    },
    async (request, reply) => {
      const render = await prisma.render.findUnique({ where: { id: request.params.id } });
      if (!render) {
        return reply.code(404).send({ error: "not_found", message: "Render not found." });
      }
      const { count } = await prisma.render.updateMany({
        where: { id: render.id, reviewStatus: "pending_review" },
        data: {
          reviewStatus: "approved",
          reviewedAt: new Date(),
          reviewedById: request.operator?.operatorId ?? null,
        },
      });
      if (count === 0) {
        return reply.code(409).send({
          error: "invalid_state",
          message: `Render is ${render.reviewStatus}, not pending_review.`,
        });
      }

      // Approval auto-populates the cart from the render's items (FR-031, BR-31).
      await populateCartFromRender(prisma, render);

      await emit(prisma, {
        type: EVENTS.RENDER_APPROVED,
        projectId: render.projectId,
        metadata: { renderId: render.id },
      });

      return reply.code(200).send({ id: render.id, reviewStatus: "approved" });
    },
  );

  app.post<{ Params: { id: string } }>(
    "/renders/:id/reject",
    {
      preHandler: reviewerOnly,
      schema: {
        params: { type: "object", required: ["id"], properties: { id: { type: "string" } } },
      },
    },
    async (request, reply) => {
      const render = await prisma.render.findUnique({ where: { id: request.params.id } });
      if (!render) {
        return reply.code(404).send({ error: "not_found", message: "Render not found." });
      }
      const { count } = await prisma.render.updateMany({
        where: { id: render.id, reviewStatus: "pending_review" },
        data: {
          reviewStatus: "rejected",
          reviewedAt: new Date(),
          reviewedById: request.operator?.operatorId ?? null,
        },
      });
      if (count === 0) {
        return reply.code(409).send({
          error: "invalid_state",
          message: `Render is ${render.reviewStatus}, not pending_review.`,
        });
      }
      return reply.code(200).send({ id: render.id, reviewStatus: "rejected" });
    },
  );
};
