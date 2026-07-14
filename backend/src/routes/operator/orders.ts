import type { FastifyPluginAsync } from "fastify";
import type { OrderStatus } from "@prisma/client";

/**
 * Operator order forwarding queue (§0.1#5; FR-061). Registered under /api/v1/operator.
 * In the pilot the operator forwards each paid order to suppliers manually.
 *  - GET  /orders?status=paid_unforwarded
 *  - POST /orders/:id/forward
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
      schema: {
        params: { type: "object", required: ["id"], properties: { id: { type: "string" } } },
      },
    },
    async (request, reply) => {
      const orderId = request.params.id;
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
