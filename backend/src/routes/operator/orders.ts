import type { FastifyPluginAsync } from "fastify";
import type { OrderStatus } from "@prisma/client";
import { requireOperatorRole } from "../../auth/operator.js";

/**
 * Operator order forwarding queue (§0.1#5; FR-061). Registered under /api/v1/operator.
 * In the pilot the operator forwards each paid order to suppliers manually.
 *  - GET  /orders?status=paid_unforwarded
 *  - POST /orders/:id/forward   order_handler role; only from paid_unforwarded,
 *                               so a double-forward cannot silently overwrite the
 *                               forwarded_at/forwarded_by audit trail (NFR-008).
 */
export const operatorOrderRoutes: FastifyPluginAsync = async (app) => {
  const { prisma } = app.deps;

  app.get<{ Querystring: { status?: OrderStatus } }>(
    "/orders",
    {
      schema: {
        querystring: {
          type: "object",
          properties: {
            status: {
              type: "string",
              enum: ["pending", "paid_unforwarded", "forwarded", "completed", "cancelled"],
            },
          },
        },
      },
    },
    async (request, reply) => {
      const status = request.query.status ?? "paid_unforwarded";
      const orders = await prisma.order.findMany({
        where: { status },
        include: { purchaseOrders: true },
        orderBy: { createdAt: "asc" },
      });
      return reply.code(200).send({ orders });
    },
  );

  // Manually forward a paid order to its suppliers (FR-061). Marks POs + order forwarded.
  app.post<{ Params: { id: string } }>(
    "/orders/:id/forward",
    {
      preHandler: requireOperatorRole("order_handler"),
      schema: {
        params: { type: "object", required: ["id"], properties: { id: { type: "string" } } },
      },
    },
    async (request, reply) => {
      const orderId = request.params.id;
      const order = await prisma.order.findUnique({ where: { id: orderId } });
      if (!order) {
        return reply.code(404).send({ error: "not_found", message: "Order not found." });
      }
      if (order.status !== "paid_unforwarded") {
        return reply.code(409).send({
          error: "invalid_state",
          message: `Order is ${order.status}, not paid_unforwarded.`,
        });
      }
      const now = new Date();
      await prisma.$transaction([
        prisma.purchaseOrder.updateMany({
          where: { orderId },
          data: {
            status: "sent_to_supplier",
            forwardedAt: now,
            forwardedById: request.operator?.operatorId ?? null,
          },
        }),
        prisma.order.update({ where: { id: orderId }, data: { status: "forwarded" } }),
      ]);
      return reply.code(200).send({ id: orderId, status: "forwarded" });
    },
  );
};
