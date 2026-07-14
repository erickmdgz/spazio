import type { FastifyPluginAsync } from "fastify";
import { emit, EVENTS } from "../../events.js";

/**
 * Cart routes. The cart is auto-populated from an approved render (FR-031, BR-31);
 * there is NO manual add in the pilot — POST /cart/items is intentionally absent
 * (FR-030 deferred, §0.1#2).
 *  - GET    /cart                auto-populated cart (FR-031)
 *  - PUT    /cart/items/:id      swap a line for another product (FR-033)
 *  - DELETE /cart/items/:id      remove a line (FR-032)
 *  - POST   /cart/confirm        confirm the cart; emits cart_confirmed (FR-035)
 *  - GET    /cart/estimates      per-item production/delivery estimates (FR-036/037)
 */
export const cartRoutes: FastifyPluginAsync = async (app) => {
  const { prisma } = app.deps;

  app.get<{ Querystring: { projectId: string } }>(
    "/cart",
    {
      schema: {
        querystring: {
          type: "object",
          required: ["projectId"],
          properties: { projectId: { type: "string" } },
        },
      },
    },
    async (request, reply) => {
      const cart = await prisma.cart.findUnique({
        where: { projectId: request.query.projectId },
        include: { items: true },
      });
      if (!cart) {
        return reply.code(404).send({ error: "not_found", message: "Cart not found." });
      }
      return reply.code(200).send({
        id: cart.id,
        status: cart.status,
        items: cart.items.map((it) => ({
          id: it.id,
          productId: it.productId,
          quantity: it.quantity,
          priceCopSnapshot: it.priceCopSnapshot,
        })),
      });
    },
  );

  // Swap a cart line for another product (FR-033).
  app.put<{ Params: { id: string }; Body: { productId: string } }>(
    "/cart/items/:id",
    {
      schema: {
        params: { type: "object", required: ["id"], properties: { id: { type: "string" } } },
        body: {
          type: "object",
          required: ["productId"],
          properties: { productId: { type: "string" } },
        },
      },
    },
    async (request, reply) => {
      const item = await prisma.cartItem.update({
        where: { id: request.params.id },
        data: { productId: request.body.productId },
      });
      return reply.code(200).send({ id: item.id, productId: item.productId });
    },
  );

  // Remove a cart line (FR-032).
  app.delete<{ Params: { id: string } }>(
    "/cart/items/:id",
    {
      schema: {
        params: { type: "object", required: ["id"], properties: { id: { type: "string" } } },
      },
    },
    async (request, reply) => {
      await prisma.cartItem.delete({ where: { id: request.params.id } });
      return reply.code(204).send();
    },
  );

  // Confirm the cart (FR-035); emits cart_confirmed (§0.1#8).
  app.post<{ Body: { cartId: string } }>(
    "/cart/confirm",
    {
      schema: {
        body: { type: "object", required: ["cartId"], properties: { cartId: { type: "string" } } },
      },
    },
    async (request, reply) => {
      const cart = await prisma.cart.update({
        where: { id: request.body.cartId },
        data: { status: "confirmed" },
      });
      await emit(prisma, {
        type: EVENTS.CART_CONFIRMED,
        projectId: cart.projectId,
        metadata: { cartId: cart.id },
      });
      return reply.code(200).send({ id: cart.id, status: cart.status });
    },
  );

  // Per-item production/delivery estimates before checkout (FR-036; FEAT-009).
  // Estimates come straight from the supplier lead-time fields on the Product
  // row — never fabricated; a missing value is returned as null so the client
  // shows a `missing-estimate` placeholder. Aggregated estimates (FR-037) are
  // deferred. Warranty is NOT displayed in the pilot (ADR-020).
  app.get<{ Querystring: { cartId: string } }>(
    "/cart/estimates",
    {
      schema: {
        querystring: {
          type: "object",
          required: ["cartId"],
          properties: { cartId: { type: "string" } },
        },
      },
    },
    async (request, reply) => {
      const cart = await prisma.cart.findUnique({
        where: { id: request.query.cartId },
        include: { items: { include: { product: true } } },
      });
      if (!cart) {
        return reply.code(404).send({ error: "not_found", message: "Cart not found." });
      }
      return reply.code(200).send({
        cartId: cart.id,
        items: cart.items.map((item) => ({
          cartItemId: item.id,
          productId: item.productId,
          name: item.product.name,
          classification: item.product.classification,
          deliveryLeadTimeDays: item.product.deliveryLeadTimeDays ?? null,
          productionLeadTimeDays:
            item.product.classification === "made_to_order"
              ? (item.product.productionLeadTimeDays ?? null)
              : null,
        })),
      });
    },
  );
};
