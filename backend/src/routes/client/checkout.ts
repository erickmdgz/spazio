import type { FastifyPluginAsync } from "fastify";
import { emit, EVENTS } from "../../events.js";
import { PILOT } from "../../config.js";
import { requireDeviceToken } from "./deviceScope.js";

interface CheckoutBody {
  cartId: string;
  contact: {
    email: string;
    phone: string;
    shipping?: {
      name?: string;
      line1?: string;
      city?: string;
      region?: string;
      country?: string;
    };
  };
}

/**
 * Checkout & orders.
 *  - POST /checkout    single COP capture (FR-042) + ADR-022 contact + commissionCop;
 *                      creates Order + one PurchaseOrder per supplier AT CHECKOUT (§0.1#1);
 *                      emits checkout_started then purchase_completed (§0.1#8)
 *  - GET  /orders/:id  order detail (FR-047)
 */
export const checkoutRoutes: FastifyPluginAsync = async (app) => {
  const { prisma, payments } = app.deps;

  app.post<{ Body: CheckoutBody }>(
    "/checkout",
    {
      schema: {
        body: {
          type: "object",
          required: ["cartId", "contact"],
          properties: {
            cartId: { type: "string" },
            contact: {
              type: "object",
              required: ["email", "phone"],
              properties: {
                email: { type: "string" },
                phone: { type: "string" },
                shipping: {
                  type: "object",
                  properties: {
                    name: { type: "string" },
                    line1: { type: "string" },
                    city: { type: "string" },
                    region: { type: "string" },
                    country: { type: "string" },
                  },
                },
              },
            },
          },
        },
      },
    },
    async (request, reply) => {
      const { cartId, contact } = request.body;

      const token = await requireDeviceToken(request, reply);
      if (!token) return;
      const cart = await prisma.cart.findUnique({
        where: { id: cartId },
        include: {
          items: { include: { product: true } },
          project: { select: { deviceToken: true } },
        },
      });
      if (!cart || cart.project.deviceToken !== token) {
        return reply.code(404).send({ error: "not_found", message: "Cart not found." });
      }
      if (cart.status !== "confirmed") {
        return reply
          .code(400)
          .send({ error: "cart_not_confirmed", message: "Cart must be confirmed (BR-31)." });
      }

      await emit(prisma, {
        type: EVENTS.CHECKOUT_STARTED,
        projectId: cart.projectId,
        metadata: { cartId: cart.id },
      });

      // Totals. Commission is retained by Spazio (10%, reconciled manually — ADR-007).
      const subtotalCop = cart.items.reduce(
        (sum, it) => sum + it.priceCopSnapshot * it.quantity,
        0,
      );
      const commissionCop = Math.round(subtotalCop * PILOT.COMMISSION_RATE);
      const totalCop = subtotalCop; // buyer pays the product total (single COP capture)

      // Distinct suppliers -> one PurchaseOrder each (§0.1#1, BR-25).
      const bySupplier = new Map<string, number>();
      for (const it of cart.items) {
        const prev = bySupplier.get(it.product.supplierId) ?? 0;
        bySupplier.set(it.product.supplierId, prev + it.priceCopSnapshot * it.quantity);
      }

      const shipping = contact.shipping ?? {};
      const order = await prisma.$transaction(async (tx) => {
        const created = await tx.order.create({
          data: {
            projectId: cart.projectId,
            contactEmail: contact.email,
            contactPhone: contact.phone,
            shippingName: shipping.name ?? null,
            shippingLine1: shipping.line1 ?? null,
            shippingCity: shipping.city ?? PILOT.MARKET_NAME,
            shippingRegion: shipping.region ?? null,
            shippingCountry: shipping.country ?? PILOT.COUNTRY_CODE,
            subtotalCop,
            commissionCop,
            totalCop,
            status: "pending",
          },
        });

        // Create one PurchaseOrder per supplier AT CHECKOUT (§0.1#1).
        for (const [supplierId, poSubtotal] of bySupplier) {
          await tx.purchaseOrder.create({
            data: { orderId: created.id, supplierId, subtotalCop: poSubtotal, status: "created" },
          });
        }

        await tx.payment.create({
          data: { orderId: created.id, amountCop: totalCop, status: "pending" },
        });
        return created;
      });

      // Single COP capture (ADR-003/004); manual payout note.
      const capture = await payments.capture({
        orderId: order.id,
        amountCop: totalCop,
        currency: "COP",
        contactEmail: contact.email,
      });
      await payments.notePayout(order.id);

      const paid = capture.status === "captured";
      await prisma.payment.update({
        where: { orderId: order.id },
        data: { status: paid ? "captured" : "failed" },
      });
      await prisma.order.update({
        where: { id: order.id },
        data: { status: paid ? "paid_unforwarded" : "cancelled" },
      });

      if (paid) {
        await emit(prisma, {
          type: EVENTS.PURCHASE_COMPLETED,
          projectId: cart.projectId,
          metadata: { orderId: order.id, totalCop },
        });
      }

      return reply.code(201).send({
        orderId: order.id,
        status: paid ? "paid_unforwarded" : "cancelled",
        subtotalCop,
        commissionCop,
        totalCop,
        currency: PILOT.CURRENCY,
        payment: { status: capture.status, reference: capture.reference },
      });
    },
  );

  app.get<{ Params: { id: string } }>(
    "/orders/:id",
    {
      schema: {
        params: { type: "object", required: ["id"], properties: { id: { type: "string" } } },
      },
    },
    async (request, reply) => {
      const token = await requireDeviceToken(request, reply);
      if (!token) return;
      const order = await prisma.order.findUnique({
        where: { id: request.params.id },
        include: {
          purchaseOrders: true,
          payment: true,
          project: { select: { deviceToken: true } },
        },
      });
      // A buyer cannot read another buyer's order (§2.4 carve-out, NFR-008).
      if (!order || order.project.deviceToken !== token) {
        return reply.code(404).send({ error: "not_found", message: "Order not found." });
      }
      return reply.code(200).send({
        id: order.id,
        status: order.status,
        subtotalCop: order.subtotalCop,
        commissionCop: order.commissionCop,
        totalCop: order.totalCop,
        currency: PILOT.CURRENCY,
        purchaseOrders: order.purchaseOrders.map((po) => ({
          id: po.id,
          supplierId: po.supplierId,
          status: po.status,
          subtotalCop: po.subtotalCop,
        })),
        payment: order.payment
          ? { status: order.payment.status, amountCop: order.payment.amountCop }
          : null,
      });
    },
  );
};
