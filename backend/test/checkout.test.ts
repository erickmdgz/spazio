import { afterEach, describe, expect, it, vi } from "vitest";
import type { FastifyInstance } from "fastify";
import { buildTestApp } from "./helpers.js";

describe("POST /checkout", () => {
  let app: FastifyInstance | undefined;

  afterEach(async () => {
    await app?.close();
  });

  it("creates a PurchaseOrder row at checkout (§0.1#1)", async () => {
    const poCreate = vi.fn().mockResolvedValue({ id: "po_1" });
    const tx = {
      order: { create: vi.fn().mockResolvedValue({ id: "ord_1", projectId: "prj_1" }) },
      purchaseOrder: { create: poCreate },
      payment: { create: vi.fn().mockResolvedValue({ id: "pay_1" }) },
    };

    const prismaOverrides = {
      cart: {
        findUnique: vi.fn().mockResolvedValue({
          id: "crt_1",
          projectId: "prj_1",
          status: "confirmed",
          project: { deviceToken: "dev_1" },
          items: [
            {
              id: "ci_1",
              productId: "p_1",
              quantity: 1,
              priceCopSnapshot: 4_200_000,
              product: { supplierId: "sup_1" },
            },
            {
              id: "ci_2",
              productId: "p_2",
              quantity: 2,
              priceCopSnapshot: 750_000,
              product: { supplierId: "sup_2" },
            },
          ],
        }),
      },
      $transaction: vi.fn(async (cb: (t: typeof tx) => Promise<unknown>) => cb(tx)),
      payment: { update: vi.fn().mockResolvedValue({}) },
      order: { update: vi.fn().mockResolvedValue({}) },
    };

    ({ app } = await buildTestApp(prismaOverrides));

    const res = await app.inject({
      method: "POST",
      url: "/api/v1/checkout",
      headers: { "x-device-token": "dev_1" },
      payload: {
        cartId: "crt_1",
        contact: { email: "buyer@example.com", phone: "+57 300 000 0000" },
      },
    });

    expect(res.statusCode).toBe(201);
    // One PurchaseOrder per distinct supplier (§0.1#1) -> two suppliers here.
    expect(poCreate).toHaveBeenCalledTimes(2);

    const body = res.json();
    // subtotal = 4_200_000 + 2 * 750_000 = 5_700_000; commission = 10%.
    expect(body.subtotalCop).toBe(5_700_000);
    expect(body.commissionCop).toBe(570_000);
    expect(body.status).toBe("paid_unforwarded");
  });

  it("rejects an unconfirmed cart", async () => {
    const prismaOverrides = {
      cart: {
        findUnique: vi.fn().mockResolvedValue({
          id: "crt_2",
          projectId: "prj_2",
          status: "draft",
          project: { deviceToken: "dev_2" },
          items: [],
        }),
      },
    };
    ({ app } = await buildTestApp(prismaOverrides));
    const res = await app.inject({
      method: "POST",
      url: "/api/v1/checkout",
      headers: { "x-device-token": "dev_2" },
      payload: { cartId: "crt_2", contact: { email: "a@b.com", phone: "+57" } },
    });
    expect(res.statusCode).toBe(400);
  });
});
