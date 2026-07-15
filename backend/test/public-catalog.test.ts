import { afterEach, describe, expect, it, vi } from "vitest";
import type { FastifyInstance } from "fastify";
import type { PrismaClient } from "@prisma/client";
import { buildTestApp } from "./helpers.js";
import { matchProducts } from "../src/services/matching.js";
import { populateCartFromRender } from "../src/services/cart.js";
import { registerRenderWorker } from "../src/jobs/renderWorker.js";
import { InMemoryQueue, type RenderJob } from "../src/jobs/queue.js";
import { FakeRenderPipeline } from "../src/services/render/pipeline.js";
import { productSummary } from "../src/services/productSummary.js";
import { hasRequiredAttribution } from "../src/services/attribution.js";
import { PILOT } from "../src/config.js";

/**
 * FEAT-017 public-catalog bootstrap fallback (ADR-027) — TC-110..119, mapped 1:1
 * to docs_en/08_test_plan.md. Hermetic: FakeRenderPipeline, mocked Prisma, no DB.
 *
 *   FR-062: TC-110 / TC-111   FR-063: TC-112
 *   FR-064: TC-113 / TC-114 / TC-115
 *   FR-065: TC-116 / TC-117 / TC-118
 *   NFR-006: TC-119
 */

function prismaWith(overrides: Partial<Record<string, unknown>>): PrismaClient {
  return overrides as unknown as PrismaClient;
}

/** A real, purchasable supplier SKU (source=supplier). */
function supplierProduct(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: "sup_prod_1",
    sku: "sofa-teide",
    name: "Teide 3-Seat Sofa",
    category: "Seating",
    priceCop: 4_200_000,
    photos: ["catalog/supplier/sofa-teide.jpg"],
    classification: "ready_made",
    stock: 3,
    deliveryLeadTimeDays: 12,
    productionLeadTimeDays: null,
    source: "supplier" as const,
    supplierId: "sup_1",
    sourceName: null,
    sourceUrl: null,
    sourceImageUrl: null,
    imageLicense: null,
    supplier: { name: "Maderos" },
    ...overrides,
  };
}

/** A display-only public product (source=public, ABO, CC BY 4.0). */
function publicProduct(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: "pub_prod_1",
    sku: "abo-B0ABO123",
    name: "ABO Accent Chair",
    category: "Seating",
    priceCop: 900_000,
    photos: ["catalog/public/abo-B0ABO123.jpg"],
    classification: "ready_made",
    stock: null,
    deliveryLeadTimeDays: 0,
    productionLeadTimeDays: null,
    source: "public" as const,
    supplierId: null,
    sourceName: "Amazon Berkeley Objects (ABO)",
    sourceUrl: "https://www.amazon.com/dp/B0ABO123",
    sourceImageUrl: "https://amazon-berkeley-objects.s3.amazonaws.com/images/B0ABO123.jpg",
    imageLicense: "CC BY 4.0",
    supplier: null,
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// FR-062 — matching fallback
// ---------------------------------------------------------------------------
describe("FR-062 public-catalog fallback in matching", () => {
  it("TC-110 draws source=public candidates when no supplier SKU satisfies the request", async () => {
    const findMany = vi
      .fn()
      .mockResolvedValueOnce([]) // supplier track: empty catalog for the constraints
      .mockResolvedValueOnce([publicProduct()]); // public fallback
    const prisma = prismaWith({
      product: { findMany },
      style: { findUnique: vi.fn().mockResolvedValue(null) },
    });

    const result = await matchProducts(prisma, {
      styleId: null,
      budgetMinCop: null,
      budgetMaxCop: null,
    });

    expect(result).toHaveLength(1);
    expect(result[0]?.source).toBe("public");
    // The fallback query targets source=public and requires full CC BY attribution
    // (FR-065 — missing-attribution public products are never candidates).
    expect(findMany).toHaveBeenCalledTimes(2);
    expect(findMany.mock.calls[1]?.[0].where).toEqual(
      expect.objectContaining({
        source: "public",
        approvalStatus: "approved",
        completenessStatus: "complete",
        sourceName: { not: null },
        sourceUrl: { not: null },
        sourceImageUrl: { not: null },
        imageLicense: { not: null },
      }),
    );
  });

  it("TC-111 uses only supplier SKUs and does NOT activate the public fallback when a supplier catalog is available", async () => {
    const findMany = vi.fn().mockResolvedValueOnce([supplierProduct()]);
    const prisma = prismaWith({
      product: { findMany },
      style: { findUnique: vi.fn().mockResolvedValue(null) },
    });

    const result = await matchProducts(prisma, {
      styleId: null,
      budgetMinCop: null,
      budgetMaxCop: null,
    });

    expect(result).toHaveLength(1);
    expect(result[0]?.source).toBe("supplier");
    // Only the supplier query ran — the public fallback was never queried.
    expect(findMany).toHaveBeenCalledTimes(1);
    expect(findMany.mock.calls[0]?.[0].where).toEqual(
      expect.objectContaining({ source: "supplier" }),
    );
  });
});

// ---------------------------------------------------------------------------
// FR-063 — labeled / distinguishable in every context
// ---------------------------------------------------------------------------
describe("FR-063 public products are labeled and distinguishable", () => {
  it("TC-112 a public product carries source=public and the not-sold-by-Spazio label; a supplier product does not", () => {
    const pub = productSummary(publicProduct() as never);
    const sup = productSummary(supplierProduct() as never);

    expect(pub.source).toBe("public");
    expect(pub.notSoldBySpazio).toBe(true);
    expect(pub.supplierName).toBeNull();

    expect(sup.source).toBe("supplier");
    expect(sup.notSoldBySpazio).toBe(false);
    expect(sup.supplierName).toBe("Maderos");
  });
});

// ---------------------------------------------------------------------------
// FR-064 — display-only: never carted / checked out / ordered / commissioned
// ---------------------------------------------------------------------------
describe("FR-064 public products are display-only (non-purchasable)", () => {
  let app: FastifyInstance | undefined;
  afterEach(async () => {
    await app?.close();
  });

  it("TC-113 excludes public items from the cart and refuses a checkout that holds one (no order/commission/MoR)", async () => {
    // Cart auto-populate excludes source=public render items.
    const createMany = vi.fn().mockResolvedValue({ count: 1 });
    const tx = {
      cart: { upsert: vi.fn().mockResolvedValue({ id: "cart_1", status: "draft" }) },
      cartItem: { deleteMany: vi.fn().mockResolvedValue({}), createMany },
    };
    await populateCartFromRender(
      prismaWith({
        renderItem: {
          findMany: vi.fn().mockResolvedValue([
            { productId: "sup_prod_1", priceCopSnapshot: 4_200_000, source: "supplier" },
            { productId: "pub_prod_1", priceCopSnapshot: 900_000, source: "public" },
          ]),
        },
        $transaction: vi.fn(async (fn: (t: typeof tx) => Promise<void>) => fn(tx)),
      }),
      { id: "r1", projectId: "proj_1" },
    );
    expect(createMany).toHaveBeenCalledWith({
      data: [{ cartId: "cart_1", productId: "sup_prod_1", priceCopSnapshot: 4_200_000 }],
    });

    // Defensive floor: checkout refuses a confirmed cart still holding a public item
    // before any Order / PurchaseOrder / commission is computed.
    const orderCreate = vi.fn();
    ({ app } = await buildTestApp({
      cart: {
        findUnique: vi.fn().mockResolvedValue({
          id: "crt_1",
          projectId: "prj_1",
          status: "confirmed",
          project: { deviceToken: "dev_1" },
          items: [
            {
              id: "ci_pub",
              productId: "pub_prod_1",
              quantity: 1,
              priceCopSnapshot: 900_000,
              product: { supplierId: null, source: "public" },
            },
          ],
        }),
      },
      $transaction: vi.fn(async (fn: (t: { order: { create: typeof orderCreate } }) => unknown) =>
        fn({ order: { create: orderCreate } }),
      ),
    }));
    const res = await app.inject({
      method: "POST",
      url: "/api/v1/checkout",
      headers: { "x-device-token": "dev_1" },
      payload: { cartId: "crt_1", contact: { email: "a@b.com", phone: "+57 300 000 0000" } },
    });
    expect(res.statusCode).toBe(400);
    expect(res.json().error).toBe("display_only");
    expect(orderCreate).not.toHaveBeenCalled();
  });

  it("TC-114 surfaces a View-at-retailer outbound link for a public product and none for a supplier product", () => {
    const pub = productSummary(publicProduct() as never);
    expect(pub.outboundUrl).toBe("https://www.amazon.com/dp/B0ABO123");
    expect(pub.notSoldBySpazio).toBe(true);

    const sup = productSummary(supplierProduct() as never);
    expect(sup.outboundUrl).toBeNull();
  });

  it("TC-115 refuses a cart swap onto a source=public product with a display_only status", async () => {
    const update = vi.fn();
    ({ app } = await buildTestApp({
      cartItem: {
        findUnique: vi.fn().mockResolvedValue({
          id: "ci1",
          cart: { project: { deviceToken: "dev_1" } },
        }),
        update,
      },
      product: { findUnique: vi.fn().mockResolvedValue({ source: "public" }) },
    }));
    const res = await app.inject({
      method: "PUT",
      url: "/api/v1/cart/items/ci1",
      headers: { "x-device-token": "dev_1" },
      payload: { productId: "pub_prod_1" },
    });
    expect(res.statusCode).toBe(400);
    expect(res.json().error).toBe("display_only");
    expect(update).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// FR-065 — CC BY 4.0 attribution recorded, propagated, and enforced
// ---------------------------------------------------------------------------
describe("FR-065 CC BY 4.0 attribution", () => {
  let app: FastifyInstance | undefined;
  afterEach(async () => {
    await app?.close();
  });

  it("TC-116 records and surfaces the required CC BY 4.0 attribution on a public product", () => {
    const pub = productSummary(publicProduct() as never);
    expect(pub.attribution).toEqual({
      sourceName: "Amazon Berkeley Objects (ABO)",
      sourceUrl: "https://www.amazon.com/dp/B0ABO123",
      sourceImageUrl: "https://amazon-berkeley-objects.s3.amazonaws.com/images/B0ABO123.jpg",
      imageLicense: "CC BY 4.0",
    });
  });

  it("TC-117 propagates the image provenance/attribution onto a render composited from a public product", async () => {
    const renderItemCreateMany = vi.fn().mockResolvedValue({ count: 1 });
    const tx = {
      cart: { upsert: vi.fn().mockResolvedValue({ id: "cart_1", status: "draft" }) },
      cartItem: { deleteMany: vi.fn().mockResolvedValue({}), createMany: vi.fn() },
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
      // Supplier track empty -> public fallback returns the ABO product (FR-062).
      product: { findMany: vi.fn().mockResolvedValueOnce([]).mockResolvedValueOnce([publicProduct()]) },
      renderItem: { createMany: renderItemCreateMany, findMany: vi.fn().mockResolvedValue([]) },
      renderRequest: { update: vi.fn().mockResolvedValue({}) },
      $transaction: vi.fn(async (fn: (t: typeof tx) => Promise<void>) => fn(tx)),
    });

    const queue = new InMemoryQueue<RenderJob>();
    registerRenderWorker(queue, prisma, new FakeRenderPipeline());
    await queue.enqueue({ renderId: "r1" });
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(renderItemCreateMany).toHaveBeenCalledTimes(1);
    const data = renderItemCreateMany.mock.calls[0]?.[0]?.data as Array<Record<string, unknown>>;
    expect(data[0]).toEqual(
      expect.objectContaining({
        productId: "pub_prod_1",
        source: "public",
        outboundUrl: "https://www.amazon.com/dp/B0ABO123",
        attribution: {
          sourceName: "Amazon Berkeley Objects (ABO)",
          sourceUrl: "https://www.amazon.com/dp/B0ABO123",
          sourceImageUrl: "https://amazon-berkeley-objects.s3.amazonaws.com/images/B0ABO123.jpg",
          imageLicense: "CC BY 4.0",
        },
      }),
    );
  });

  it("TC-118 excludes/blocks a source=public product missing required attribution (neither displayed nor composited)", async () => {
    // Helper-level: a public product missing any of the four fields fails the gate.
    expect(hasRequiredAttribution(publicProduct() as never)).toBe(true);
    expect(hasRequiredAttribution(publicProduct({ imageLicense: null }) as never)).toBe(false);
    expect(hasRequiredAttribution(publicProduct({ sourceImageUrl: null }) as never)).toBe(false);

    // Display-level: the render-items response drops a public item with no attribution
    // and keeps a supplier item and a well-formed public item.
    ({ app } = await buildTestApp({
      render: {
        findUnique: vi.fn().mockResolvedValue({
          id: "r1",
          projectId: "proj_1",
          project: { deviceToken: "dev_1" },
          items: [
            {
              id: "ri_sup",
              productId: "sup_prod_1",
              tagPosition: null,
              priceCopSnapshot: 4_200_000,
              source: "supplier",
              attribution: null,
              outboundUrl: null,
              product: supplierProduct(),
            },
            {
              id: "ri_pub_ok",
              productId: "pub_prod_1",
              tagPosition: null,
              priceCopSnapshot: 900_000,
              source: "public",
              attribution: {
                sourceName: "Amazon Berkeley Objects (ABO)",
                sourceUrl: "https://www.amazon.com/dp/B0ABO123",
                sourceImageUrl:
                  "https://amazon-berkeley-objects.s3.amazonaws.com/images/B0ABO123.jpg",
                imageLicense: "CC BY 4.0",
              },
              outboundUrl: "https://www.amazon.com/dp/B0ABO123",
              product: publicProduct(),
            },
            {
              id: "ri_pub_bad",
              productId: "pub_bad",
              tagPosition: null,
              priceCopSnapshot: 500_000,
              source: "public",
              attribution: null, // missing-attribution -> excluded (FR-065)
              outboundUrl: null,
              product: publicProduct({
                id: "pub_bad",
                sourceName: null,
                sourceUrl: null,
                sourceImageUrl: null,
                imageLicense: null,
              }),
            },
          ],
        }),
      },
    }));
    const res = await app.inject({
      method: "GET",
      url: "/api/v1/renders/r1/items",
      headers: { "x-device-token": "dev_1" },
    });
    expect(res.statusCode).toBe(200);
    const items = res.json().items as Array<{ id: string; source: string; outboundUrl: string | null }>;
    const ids = items.map((i) => i.id);
    expect(ids).toContain("ri_sup");
    expect(ids).toContain("ri_pub_ok");
    expect(ids).not.toContain("ri_pub_bad");
    // The surviving public item surfaces its provenance + outbound link.
    const pub = items.find((i) => i.id === "ri_pub_ok");
    expect(pub?.source).toBe("public");
    expect(pub?.outboundUrl).toBe("https://www.amazon.com/dp/B0ABO123");
  });
});

// ---------------------------------------------------------------------------
// NFR-006 — public products excluded from the render-to-purchase metric / commission
// ---------------------------------------------------------------------------
describe("NFR-006 public products excluded from commission / render-to-purchase", () => {
  it("TC-119 computes commission only over supplier items; public items never enter the purchasable basis", async () => {
    const createMany = vi.fn().mockResolvedValue({ count: 1 });
    const tx = {
      cart: { upsert: vi.fn().mockResolvedValue({ id: "cart_1", status: "draft" }) },
      cartItem: { deleteMany: vi.fn().mockResolvedValue({}), createMany },
    };
    // A render tagged one supplier + one public product.
    await populateCartFromRender(
      prismaWith({
        renderItem: {
          findMany: vi.fn().mockResolvedValue([
            { productId: "sup_prod_1", priceCopSnapshot: 4_200_000, source: "supplier" },
            { productId: "pub_prod_1", priceCopSnapshot: 900_000, source: "public" },
          ]),
        },
        $transaction: vi.fn(async (fn: (t: typeof tx) => Promise<void>) => fn(tx)),
      }),
      { id: "r1", projectId: "proj_1" },
    );

    const carted = createMany.mock.calls[0]?.[0]?.data as Array<{ priceCopSnapshot: number }>;
    // Only the supplier item forms the purchasable basis (FR-064).
    expect(carted).toEqual([
      { cartId: "cart_1", productId: "sup_prod_1", priceCopSnapshot: 4_200_000 },
    ]);
    // Commission is therefore computed over supplier value only — the public
    // product contributes nothing (NFR-006 segmented).
    const subtotalCop = carted.reduce((sum, i) => sum + i.priceCopSnapshot, 0);
    const commissionCop = Math.round(subtotalCop * PILOT.COMMISSION_RATE);
    expect(subtotalCop).toBe(4_200_000);
    expect(commissionCop).toBe(420_000);
  });
});
