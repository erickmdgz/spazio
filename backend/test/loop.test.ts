import { afterEach, describe, expect, it, vi } from "vitest";
import type { FastifyInstance, } from "fastify";
import type { PrismaClient } from "@prisma/client";
import { buildTestApp } from "./helpers.js";
import { matchProducts, DEFAULT_MATCH_LIMIT } from "../src/services/matching.js";
import { populateCartFromRender } from "../src/services/cart.js";
import { registerRenderWorker } from "../src/jobs/renderWorker.js";
import { InMemoryQueue, type RenderJob } from "../src/jobs/queue.js";
import { FakeRenderPipeline, type RenderPipeline } from "../src/services/render/pipeline.js";

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

describe("render worker (match → render → persist → publish, plan §1.5 / ADR-025)", () => {
  /** Prisma mock covering the whole worker path, including cart auto-populate. */
  function workerPrisma(matched: Array<Record<string, unknown>>) {
    const renderItemCreateMany = vi.fn().mockResolvedValue({ count: matched.length });
    const requestUpdate = vi.fn().mockResolvedValue({});
    const cartUpsert = vi.fn().mockResolvedValue({ id: "cart_1", status: "draft" });
    const cartItemDeleteMany = vi.fn().mockResolvedValue({ count: 0 });
    const cartItemCreateMany = vi.fn().mockResolvedValue({ count: matched.length });
    const tx = {
      cart: { upsert: cartUpsert },
      cartItem: { deleteMany: cartItemDeleteMany, createMany: cartItemCreateMany },
    };
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
      renderItem: {
        createMany: renderItemCreateMany,
        findMany: vi
          .fn()
          .mockResolvedValue(
            matched.map((p) => ({ productId: p.id, priceCopSnapshot: p.priceCop })),
          ),
      },
      renderRequest: { update: requestUpdate },
      $transaction: vi.fn(async (fn: (t: typeof tx) => Promise<void>) => fn(tx)),
    });
    return {
      prisma,
      mocks: { renderItemCreateMany, requestUpdate, cartUpsert, cartItemCreateMany },
    };
  }

  async function runJob(prisma: PrismaClient, pipeline: RenderPipeline) {
    const queue = new InMemoryQueue<RenderJob>();
    registerRenderWorker(queue, prisma, pipeline);
    await queue.enqueue({ renderId: "r1" });
    await new Promise((resolve) => setTimeout(resolve, 0)); // let the microtask drain
  }

  it("persists one RenderItem per matched SKU with the real price snapshot", async () => {
    const { prisma, mocks } = workerPrisma([
      product({ id: "prod_a", priceCop: 250_000 }),
      product({ id: "prod_b", priceCop: 150_000 }),
    ]);
    await runJob(prisma, new FakeRenderPipeline());

    expect(mocks.renderItemCreateMany).toHaveBeenCalledTimes(1);
    const data = mocks.renderItemCreateMany.mock.calls[0]?.[0]?.data as Array<
      Record<string, unknown>
    >;
    expect(data.map((d) => [d.productId, d.priceCopSnapshot])).toEqual([
      ["prod_a", 250_000],
      ["prod_b", 150_000],
    ]);
  });

  it("publishes on generation success: cart auto-populated, request completed, no operator action (FR-031, ADR-025)", async () => {
    const { prisma, mocks } = workerPrisma([product({ id: "prod_a", priceCop: 250_000 })]);
    await runJob(prisma, new FakeRenderPipeline());

    expect(mocks.cartUpsert).toHaveBeenCalled();
    expect(mocks.cartItemCreateMany).toHaveBeenCalledWith({
      data: [{ cartId: "cart_1", productId: "prod_a", priceCopSnapshot: 250_000 }],
    });
    expect(mocks.requestUpdate).toHaveBeenLastCalledWith({
      where: { id: "rr1" },
      data: { status: "completed" },
    });
  });

  it("marks the request failed when the pipeline throws (no cart populated)", async () => {
    const { prisma, mocks } = workerPrisma([product({ id: "prod_a", priceCop: 250_000 })]);
    const failing: RenderPipeline = {
      generate: vi.fn().mockRejectedValue(new Error("pipeline down")),
    };
    await runJob(prisma, failing);

    expect(mocks.requestUpdate).toHaveBeenLastCalledWith({
      where: { id: "rr1" },
      data: { status: "failed" },
    });
    expect(mocks.cartUpsert).not.toHaveBeenCalled();
  });
});

describe("cart auto-populate on generation success (FR-031, ADR-025)", () => {
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
