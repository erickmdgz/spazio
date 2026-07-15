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
 *  - GET  /renders/:id         poll generation status (queued/processing/completed/failed);
 *                              a completed render is immediately visible (ADR-025)
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
          },
        });
      });

      await queue.enqueue({ renderId: render.id });
      // NFR-006/TC-119: a render-to-purchase metric must exclude renders that
      // contain only source=public products (they can never convert). Provenance
      // is not known here — matching runs in the worker — so RENDER_CREATED cannot
      // carry a publicOnly flag yet. No metric engine exists today (public items
      // simply never reach checkout/commission), so this is deferred per the
      // FEAT-017 memo: whoever builds the metric must segment public-only renders
      // out of the denominator using the render items' `source` rather than the
      // event stream alone.
      await emit(prisma, {
        type: EVENTS.RENDER_CREATED,
        projectId,
        metadata: { renderId: render.id },
      });

      return reply.code(202).send({
        renderId: render.id,
        status: "queued",
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
        include: {
          project: { select: { deviceToken: true } },
          renderRequest: { select: { status: true } },
        },
      });
      // Another device's render answers 404 — no existence leak (NFR-007).
      if (!render || render.project.deviceToken !== token) {
        return reply.code(404).send({ error: "not_found", message: "Render not found." });
      }
      // Generation status only — a completed render is immediately visible (ADR-025).
      return reply.code(200).send({
        renderId: render.id,
        status: render.renderRequest.status,
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
        items: render.items
          // A source=public item missing its required CC BY attribution is not
          // displayed (FR-065/TC-118 — defensive; the worker already drops it).
          .filter((it) => it.source !== "public" || it.attribution != null)
          .map((it) => ({
            id: it.id,
            productId: it.productId,
            tagPosition: it.tagPosition,
            priceCopSnapshot: it.priceCopSnapshot,
            // Provenance so the UI can label + link (FR-063/FR-065). A public item
            // is display-only ("not sold by Spazio") with a "View at retailer"
            // outbound link and CC BY 4.0 attribution instead of add-to-cart (FR-064).
            source: it.source,
            attribution: it.attribution ?? null,
            outboundUrl: it.outboundUrl ?? null,
            // The tag carries name, price, supplier (FR-028; plan §1.5 step 5).
            product: productSummary(it.product),
          })),
      });
    },
  );
};
