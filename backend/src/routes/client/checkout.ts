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

      // Public-catalog products are display-only and must never be purchased
      // (FR-064, ADR-027). They are excluded at cart population (populateCartFromRender)
      // and blocked from being swapped in (PUT /cart/items), so a confirmed cart
      // should never hold one; this is the defensive floor at the checkout boundary.
      // A public product carried through here would also skew commission/MoR, so it
      // must be refused before any Order/PurchaseOrder/commission is computed
      // (FR-064/TC-113, NFR-006/TC-119).
      if (cart.items.some((it) => it.product.source === "public")) {
        return reply.code(400).send({
          error: "display_only",
          message: "Cart contains a display-only public-catalog product (FR-064).",
        });
      }

      // Integrity floor: a source=supplier item must carry a supplierId to generate
      // the PurchaseOrder that fulfils it. The FEAT-017 migration sets Product.supplierId
      // null ON DELETE, so a deleted supplier row could orphan an item; refuse the
      // checkout rather than charge the buyer (subtotal/commission below) for something
      // no PO can fulfil. Public items are already blocked above; this only catches an
      // orphaned supplier item.
      if (cart.items.some((it) => it.product.source === "supplier" && !it.product.supplierId)) {
        return reply.code(409).send({
          error: "integrity_error",
          message: "Cart contains a supplier product with no supplier to fulfil it.",
        });
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
      // supplierId is null only for source=public products (ADR-027), which are
      // display-only and must never reach the cart/checkout (FR-064 — enforced at
      // cart population). This guard is defensive: a public product carries no
      // supplier to forward a PurchaseOrder to, so it never contributes one.
      const bySupplier = new Map<string, number>();
      for (const it of cart.items) {
        if (!it.product.supplierId) continue;
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
