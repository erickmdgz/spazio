import { afterEach, describe, expect, it, vi } from "vitest";
import type { FastifyInstance } from "fastify";
import { buildTestApp, operatorSessionCookie } from "./helpers.js";

/**
 * Loop hardening (#34): the §2.4 DoD carve-out security TCs (TC-107/TC-109;
 * TC-108 retired with the render-review gate — ADR-025), status-machine
 * preconditions, and NFR-007 device scoping.
 */
describe("operator role enforcement (NFR-008, TC-107/TC-109)", () => {
  let app: FastifyInstance | undefined;

  afterEach(async () => {
    await app?.close();
  });

  it("TC-107: a non-curator cannot create or approve a catalog entry", async () => {
    ({ app } = await buildTestApp());
    const asHandler = { cookie: operatorSessionCookie({ role: "order_handler" }) };
    const approve = await app.inject({
      method: "POST",
      url: "/api/v1/operator/catalog/products/p1/approve",
      headers: asHandler,
    });
    expect(approve.statusCode).toBe(403);
  });

  it("TC-109: a non-handler cannot forward an order", async () => {
    ({ app } = await buildTestApp());
    const response = await app.inject({
      method: "POST",
      url: "/api/v1/operator/orders/o1/forward",
      headers: { cookie: operatorSessionCookie({ role: "catalog_curator" }) },
    });
    expect(response.statusCode).toBe(403);
  });

  it("a role-less operator stays all-purpose (pilot staffing)", async () => {
    const updateMany = vi.fn().mockResolvedValue({ count: 1 });
    const update = vi.fn().mockResolvedValue({ id: "o1", status: "forwarded" });
    ({ app } = await buildTestApp({
      order: {
        findUnique: vi.fn().mockResolvedValue({ id: "o1", status: "paid_unforwarded" }),
        update,
      },
      purchaseOrder: { updateMany },
      $transaction: vi.fn(async (operations: unknown[]) => Promise.all(operations)),
    }));
    const response = await app.inject({
      method: "POST",
      url: "/api/v1/operator/orders/o1/forward",
      headers: { cookie: operatorSessionCookie({ role: null }) },
    });
    expect(response.statusCode).toBe(200);
  });
});

describe("status-machine preconditions", () => {
  let app: FastifyInstance | undefined;

  afterEach(async () => {
    await app?.close();
  });

  it("forwarding an already forwarded order answers 409 (audit trail preserved)", async () => {
    const updateMany = vi.fn();
    ({ app } = await buildTestApp({
      order: { findUnique: vi.fn().mockResolvedValue({ id: "o1", status: "forwarded" }) },
      purchaseOrder: { updateMany },
    }));
    const response = await app.inject({
      method: "POST",
      url: "/api/v1/operator/orders/o1/forward",
      headers: { cookie: operatorSessionCookie({ role: "order_handler" }) },
    });
    expect(response.statusCode).toBe(409);
    expect(updateMany).not.toHaveBeenCalled();
  });

  it("approving an incomplete SKU answers 409 (BR-1 / ADR-014)", async () => {
    ({ app } = await buildTestApp({
      product: {
        findUnique: vi.fn().mockResolvedValue({ id: "p1", completenessStatus: "incomplete" }),
      },
    }));
    const response = await app.inject({
      method: "POST",
      url: "/api/v1/operator/catalog/products/p1/approve",
      headers: { cookie: operatorSessionCookie({ role: "catalog_curator" }) },
    });
    expect(response.statusCode).toBe(409);
  });

  it("PATCHing a SKU recomputes BR-1 completeness (FR-057)", async () => {
    const update = vi.fn().mockResolvedValue({ id: "p1", completenessStatus: "complete" });
    ({ app } = await buildTestApp({
      product: {
        findUnique: vi.fn().mockResolvedValue({
          id: "p1",
          photos: ["x.svg"],
          colors: ["oak"],
          materials: ["wood"],
          styleAttributes: ["scandinavian"],
          priceCop: 100,
          deliveryLeadTimeDays: 5,
          warrantyTerms: "12m",
          widthCm: 10,
          depthCm: 10,
          heightCm: null, // the missing BR-1 field
          classification: "ready_made",
          stock: 2,
          productionLeadTimeDays: null,
        }),
        update,
      },
    }));
    const response = await app.inject({
      method: "PATCH",
      url: "/api/v1/operator/catalog/products/p1",
      headers: { cookie: operatorSessionCookie({ role: "catalog_curator" }) },
      payload: { heightCm: 40 },
    });
    expect(response.statusCode).toBe(200);
    expect(update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ completenessStatus: "complete" }),
      }),
    );
  });
});

describe("device scoping (NFR-007)", () => {
  let app: FastifyInstance | undefined;

  afterEach(async () => {
    await app?.close();
  });

  it("client reads without a device token answer 401", async () => {
    ({ app } = await buildTestApp());
    const response = await app.inject({ method: "GET", url: "/api/v1/renders/r1" });
    expect(response.statusCode).toBe(401);
  });

  it("a buyer cannot read another buyer's order (404, no existence leak)", async () => {
    ({ app } = await buildTestApp({
      order: {
        findUnique: vi.fn().mockResolvedValue({
          id: "o1",
          status: "paid_unforwarded",
          purchaseOrders: [],
          payment: null,
          project: { deviceToken: "device-A" },
        }),
      },
    }));
    const response = await app.inject({
      method: "GET",
      url: "/api/v1/orders/o1",
      headers: { "x-device-token": "device-B" },
    });
    expect(response.statusCode).toBe(404);
  });

  it("a buyer cannot read another buyer's render", async () => {
    ({ app } = await buildTestApp({
      render: {
        findUnique: vi.fn().mockResolvedValue({
          id: "r1",
          imageKey: "k",
          project: { deviceToken: "device-A" },
          renderRequest: { status: "completed" },
        }),
      },
    }));
    const response = await app.inject({
      method: "GET",
      url: "/api/v1/renders/r1",
      headers: { "x-device-token": "device-B" },
    });
    expect(response.statusCode).toBe(404);
  });

  it("a buyer cannot remove another buyer's cart line", async () => {
    const del = vi.fn();
    ({ app } = await buildTestApp({
      cartItem: {
        findUnique: vi.fn().mockResolvedValue({
          id: "ci1",
          cart: { project: { deviceToken: "device-A" } },
        }),
        delete: del,
      },
    }));
    const response = await app.inject({
      method: "DELETE",
      url: "/api/v1/cart/items/ci1",
      headers: { "x-device-token": "device-B" },
    });
    expect(response.statusCode).toBe(404);
    expect(del).not.toHaveBeenCalled();
  });

  it("the owning device reads its own render (completed = immediately visible, ADR-025)", async () => {
    ({ app } = await buildTestApp({
      render: {
        findUnique: vi.fn().mockResolvedValue({
          id: "r1",
          imageKey: "k",
          project: { deviceToken: "device-A" },
          renderRequest: { status: "completed" },
        }),
      },
    }));
    const response = await app.inject({
      method: "GET",
      url: "/api/v1/renders/r1",
      headers: { "x-device-token": "device-A" },
    });
    expect(response.statusCode).toBe(200);
    expect(response.json().status).toBe("completed");
  });
});
