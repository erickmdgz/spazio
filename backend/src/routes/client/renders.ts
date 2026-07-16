import type { FastifyPluginAsync } from "fastify";
import { emit, EVENTS } from "../../events.js";
import { productSummary } from "../../services/productSummary.js";
import { cancel as cancelInFlightRender } from "../../services/render/registry.js";
import { projectOwnedByDevice, requireDeviceToken } from "./deviceScope.js";

/** Hard cap on a user-curated selection (ADR-028): the Klein engine composites
 * ~2-3 reference images (ADR-026), so at most 3 products may be rendered. */
const MAX_SELECTED_PRODUCTS = 3;

interface CreateRenderBody {
  projectId: string;
  styleId?: string;
  freeText?: string;
  budgetMinCop?: number;
  budgetMaxCop?: number;
  /**
   * The user's curated selection (ADR-028/FR-068): up to 3 productIds. When
   * present the worker composites EXACTLY these (after validating them); when
   * omitted it falls back to auto-match (FR-014/FR-015, now optional).
   */
  productIds?: string[];
}

/**
 * Render routes.
 *  - POST /renders             create + enqueue; finalizes the project; emits render_created
 *                              (FR-014..018/021)
 *  - GET  /renders/:id         poll generation status (queued/processing/completed/failed);
 *                              a completed render is immediately visible (ADR-025)
 *  - GET  /renders/:id/image   stream the stored render image bytes (FR-015)
 *  - GET  /renders/:id/items   tagged products; emits render_viewed (FR-028/029, §0.1#8)
 *  - POST /renders/:id/cancel  stop an in-flight render now — SIGKILL any running
 *                              child and mark the request failed (BUG-002/NFR-004)
 */
export const renderRoutes: FastifyPluginAsync = async (app) => {
  const { prisma, queue, storage } = app.deps;

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
            productIds: { type: "array", items: { type: "string" } },
          },
        },
      },
    },
    async (request, reply) => {
      const { projectId, styleId, freeText, budgetMinCop, budgetMaxCop, productIds } =
        request.body;

      const token = await requireDeviceToken(request, reply);
      if (!token) return;
      if (!(await projectOwnedByDevice(prisma, projectId, token))) {
        return reply.code(404).send({ error: "not_found", message: "Project not found." });
      }

      // Hard 3-item cap on a user-curated selection (ADR-028/FR-067). Enforced
      // server-side; the worker re-validates each id's existence/approval/stock.
      if (productIds && productIds.length > MAX_SELECTED_PRODUCTS) {
        return reply.code(400).send({
          error: "too_many_products",
          message: `Select at most ${MAX_SELECTED_PRODUCTS} products.`,
        });
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
            // Snapshot the requested selection (BUG-005): the queue payload is
            // volatile, so this row is the only durable record on failure.
            requestedProductIds: productIds ?? [],
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

      // Thread the user's selection onto the job (ADR-028/FR-068). When present the
      // worker composites EXACTLY these (validated) products; when absent it
      // auto-matches (backward compatible).
      await queue.enqueue({
        renderId: render.id,
        productIds: productIds && productIds.length > 0 ? productIds : undefined,
      });
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

  // Cancel an in-flight render (BUG-002 / NFR-004 graceful degradation). The client
  // calls this on its own timeout and when navigating away from /render, so leaving
  // the page frees the render host's memory now rather than at the backend cap.
  // Device-scoped exactly like the other /renders routes (NFR-007): a foreign or
  // unknown device/render answers 404, no existence leak. It SIGKILLs any live
  // mflux child via the registry, then marks the request `failed` if it is still
  // queued/processing. Idempotent: cancelling an already-terminal render is a no-op
  // that still returns 200. No new status value — cancellation reuses `failed`.
  app.post<{ Params: { id: string } }>(
    "/renders/:id/cancel",
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
        select: {
          renderRequestId: true,
          project: { select: { deviceToken: true } },
          renderRequest: { select: { status: true } },
        },
      });
      // Another device's (or an unknown) render answers 404 — no existence leak.
      if (!render || render.project.deviceToken !== token) {
        return reply.code(404).send({ error: "not_found", message: "Render not found." });
      }

      // Kill any live child immediately (frees memory now, not at the cap). No-op
      // when nothing is in flight — the render may already have settled.
      cancelInFlightRender(request.params.id);

      // Mark failed only while still in flight; already-terminal is left untouched
      // so cancel is idempotent (the killed child's pipeline reject also fails it).
      const status = render.renderRequest.status;
      if (status === "queued" || status === "processing") {
        await prisma.renderRequest.update({
          where: { id: render.renderRequestId },
          data: { status: "failed" },
        });
      }

      return reply.code(200).send({ status: "failed" });
    },
  );

  // Serve the stored render image bytes (FR-015). An <img> tag cannot send the
  // device-token header, so the client fetches this with the header and turns the
  // response into an object URL. Device-scoped: a foreign device answers 404
  // (no existence leak, NFR-007). A render with no imageKey yet (still
  // generating/failed) answers 404 so the client keeps polling.
  app.get<{ Params: { id: string } }>(
    "/renders/:id/image",
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
        select: { imageKey: true, project: { select: { deviceToken: true } } },
      });
      // Another device's render answers 404 — no existence leak (NFR-007).
      if (!render || render.project.deviceToken !== token) {
        return reply.code(404).send({ error: "not_found", message: "Render not found." });
      }
      // No image stored yet (still generating or failed) — keep polling.
      if (!render.imageKey) {
        return reply.code(404).send({ error: "not_ready", message: "Render image not ready." });
      }
      const bytes = await storage.get(render.imageKey);
      return reply
        .code(200)
        .header("Content-Type", "image/png")
        .header("Cache-Control", "private")
        .send(bytes);
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
