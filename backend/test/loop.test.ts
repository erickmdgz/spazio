import { afterEach, describe, expect, it, vi } from "vitest";
import type { FastifyInstance, } from "fastify";
import type { PrismaClient } from "@prisma/client";
import { buildTestApp, operatorSessionCookie } from "./helpers.js";
import { matchProducts, DEFAULT_MATCH_LIMIT } from "../src/services/matching.js";
import { populateCartFromRender } from "../src/services/cart.js";
import { registerRenderWorker } from "../src/jobs/renderWorker.js";
import { InMemoryQueue, type RenderJob } from "../src/jobs/queue.js";
import { FakeRenderPipeline } from "../src/services/render/pipeline.js";

/** A complete, approved, in-stock product row for matching tests. */
function product(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: `prod_${Math.abs(JSON.stringify(overrides).length)}_${String(overrides.id ?? "x")}`,
    priceCop: 100_000,
    classification: "ready_made",
    stock: 3,
    deliveryLeadTimeDays: 5,
    productionLeadTimeDays: null,
    ...overrides,
  };
}

function prismaWith(overrides: Partial<Record<string, unknown>>): PrismaClient {
  return overrides as unknown as PrismaClient;
}

describe("matchProducts (FEAT-005 subset)", () => {
  it("queries only approved, complete, purchasable SKUs and applies the style filter", async () => {
    const findMany = vi.fn().mockResolvedValue([]);
    const findUnique = vi.fn().mockResolvedValue({ id: "style_1", code: "scandi" });
    const prisma = prismaWith({ product: { findMany }, style: { findUnique } });

    await matchProducts(prisma, { styleId: "style_1", budgetMinCop: null, budgetMaxCop: null });

    expect(findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          approvalStatus: "approved",
          completenessStatus: "complete",
          OR: [
            { classification: "ready_made", stock: { gt: 0 } },
            { classification: "made_to_order" },
          ],
          styleAttributes: { has: "scandi" },
        }),
      }),
    );
  });

  it("keeps the greedy total within budget + 10% tolerance (FR-021, ADR-008)", async () => {
    const rows = [
      product({ id: "a", priceCop: 500_000 }),
      product({ id: "b", priceCop: 400_000 }),
      product({ id: "c", priceCop: 300_000 }),
    ];
    const findMany = vi.fn().mockResolvedValue(rows);
    const prisma = prismaWith({ product: { findMany } });

    // Budget 1,000,000 -> cap 1,100,000: a (500k) + b (400k) fit; c (300k) would
    // push the total to 1,200,000 and is skipped.
    const selected = await matchProducts(prisma, {
      styleId: null,
      budgetMinCop: null,
      budgetMaxCop: 1_000_000,
    });
    expect(selected.map((p) => p.id)).toEqual(["a", "b"]);
  });

  it("caps the number of composed items", async () => {
    const rows = Array.from({ length: 10 }, (_, i) => product({ id: `p${i}`, priceCop: 10_000 }));
    const findMany = vi.fn().mockResolvedValue(rows);
    const prisma = prismaWith({ product: { findMany } });

    const selected = await matchProducts(prisma, {
      styleId: null,
      budgetMinCop: null,
      budgetMaxCop: null,
    });
    expect(selected).toHaveLength(DEFAULT_MATCH_LIMIT);
  });
});

describe("render worker (match → render → persist, plan §1.5)", () => {
  it("persists one RenderItem per matched SKU with the real price snapshot", async () => {
    const matched = [
      product({ id: "prod_a", priceCop: 250_000 }),
      product({ id: "prod_b", priceCop: 150_000 }),
    ];
    const createMany = vi.fn().mockResolvedValue({ count: 2 });
    const prisma = prismaWith({
      render: {
        findUnique: vi.fn().mockResolvedValue({
          id: "r1",
          projectId: "proj_1",
          renderRequestId: "rr1",
          renderRequest: {
            id: "rr1",
            styleId: null,
            freeText: null,
            budgetMinCop: null,
            budgetMaxCop: null,
          },
        }),
        update: vi.fn().mockResolvedValue({}),
      },
      roomPhoto: { findFirst: vi.fn().mockResolvedValue({ storageKey: "photos/p1.jpg" }) },
      product: { findMany: vi.fn().mockResolvedValue(matched) },
      renderItem: { createMany },
      renderRequest: { update: vi.fn().mockResolvedValue({}) },
    });

    const queue = new InMemoryQueue<RenderJob>();
    registerRenderWorker(queue, prisma, new FakeRenderPipeline());
    await queue.enqueue({ renderId: "r1" });
    await new Promise((resolve) => setTimeout(resolve, 0)); // let the microtask drain

    expect(createMany).toHaveBeenCalledTimes(1);
    const data = createMany.mock.calls[0]?.[0]?.data as Array<Record<string, unknown>>;
    expect(data.map((d) => [d.productId, d.priceCopSnapshot])).toEqual([
      ["prod_a", 250_000],
      ["prod_b", 150_000],
    ]);
  });
});

describe("cart auto-populate on approval (FR-031)", () => {
  function cartPrisma(cartStatus: "draft" | "confirmed") {
    const upsert = vi.fn().mockResolvedValue({ id: "cart_1", status: cartStatus });
    const deleteMany = vi.fn().mockResolvedValue({ count: 0 });
    const createMany = vi.fn().mockResolvedValue({ count: 1 });
    const tx = { cart: { upsert }, cartItem: { deleteMany, createMany } };
    return {
      mocks: { upsert, deleteMany, createMany },
      overrides: {
        renderItem: {
          findMany: vi
            .fn()
            .mockResolvedValue([{ productId: "prod_a", priceCopSnapshot: 250_000 }]),
        },
        $transaction: vi.fn(async (fn: (t: typeof tx) => Promise<void>) => fn(tx)),
      },
    };
  }

  it("replaces the draft cart lines with the render's items", async () => {
    const { mocks, overrides } = cartPrisma("draft");
    await populateCartFromRender(prismaWith(overrides), { id: "r1", projectId: "proj_1" });
    expect(mocks.upsert).toHaveBeenCalled();
    expect(mocks.deleteMany).toHaveBeenCalledWith({ where: { cartId: "cart_1" } });
    expect(mocks.createMany).toHaveBeenCalledWith({
      data: [{ cartId: "cart_1", productId: "prod_a", priceCopSnapshot: 250_000 }],
    });
  });

  it("never clobbers a cart the user already confirmed", async () => {
    const { mocks, overrides } = cartPrisma("confirmed");
    await populateCartFromRender(prismaWith(overrides), { id: "r1", projectId: "proj_1" });
    expect(mocks.deleteMany).not.toHaveBeenCalled();
    expect(mocks.createMany).not.toHaveBeenCalled();
  });
});

describe("operator approval triggers auto-populate end-to-end", () => {
  let app: FastifyInstance | undefined;

  afterEach(async () => {
    await app?.close();
  });

  it("POST /operator/renders/:id/approve populates the cart and emits render_approved", async () => {
    const upsert = vi.fn().mockResolvedValue({ id: "cart_1", status: "draft" });
    const createMany = vi.fn().mockResolvedValue({ count: 1 });
    const eventCreate = vi.fn().mockResolvedValue({ id: "evt_1" });
    const txStub = {
      cart: { upsert },
      cartItem: { deleteMany: vi.fn().mockResolvedValue({ count: 0 }), createMany },
    };
    ({ app } = await buildTestApp({
      render: {
        findUnique: vi
          .fn()
          .mockResolvedValue({ id: "r1", projectId: "proj_1", reviewStatus: "pending_review" }),
        updateMany: vi.fn().mockResolvedValue({ count: 1 }),
      },
      renderItem: {
        findMany: vi.fn().mockResolvedValue([{ productId: "prod_a", priceCopSnapshot: 1 }]),
      },
      $transaction: vi.fn(async (fn: (t: typeof txStub) => Promise<void>) => fn(txStub)),
      event: { create: eventCreate },
    }));

    const response = await app.inject({
      method: "POST",
      url: "/api/v1/operator/renders/r1/approve",
      headers: { cookie: operatorSessionCookie() },
    });
    expect(response.statusCode).toBe(200);
    expect(upsert).toHaveBeenCalled();
    expect(createMany).toHaveBeenCalled();
    expect(eventCreate).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ type: "render_approved" }) }),
    );
  });
});

describe("cart estimates (FR-036, FEAT-009)", () => {
  let app: FastifyInstance | undefined;

  afterEach(async () => {
    await app?.close();
  });

  it("returns per-item lead times straight from the product rows", async () => {
    ({ app } = await buildTestApp({
      cart: {
        findUnique: vi.fn().mockResolvedValue({
          id: "cart_1",
          project: { deviceToken: "dev_1" },
          items: [
            {
              id: "ci_1",
              productId: "prod_a",
              product: product({
                id: "prod_a",
                name: "Sofa",
                deliveryLeadTimeDays: 7,
              }),
            },
            {
              id: "ci_2",
              productId: "prod_b",
              product: product({
                id: "prod_b",
                name: "Custom table",
                classification: "made_to_order",
                stock: null,
                productionLeadTimeDays: 21,
                deliveryLeadTimeDays: 4,
              }),
            },
          ],
        }),
      },
    }));

    const response = await app.inject({
      method: "GET",
      url: "/api/v1/cart/estimates?cartId=cart_1",
      headers: { "x-device-token": "dev_1" },
    });
    expect(response.statusCode).toBe(200);
    const body = response.json();
    expect(body.items).toEqual([
      expect.objectContaining({
        cartItemId: "ci_1",
        deliveryLeadTimeDays: 7,
        productionLeadTimeDays: null,
      }),
      expect.objectContaining({
        cartItemId: "ci_2",
        deliveryLeadTimeDays: 4,
        productionLeadTimeDays: 21,
      }),
    ]);
  });

  it("404s on an unknown cart", async () => {
    ({ app } = await buildTestApp({ cart: { findUnique: vi.fn().mockResolvedValue(null) } }));
    const response = await app.inject({
      method: "GET",
      url: "/api/v1/cart/estimates?cartId=nope",
      headers: { "x-device-token": "dev_1" },
    });
    expect(response.statusCode).toBe(404);
  });
});
