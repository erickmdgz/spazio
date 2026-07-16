import { afterEach, describe, expect, it, vi } from "vitest";
import type { FastifyInstance } from "fastify";
import type { PrismaClient } from "@prisma/client";
import { buildTestApp } from "./helpers.js";
import { registerRenderWorker } from "../src/jobs/renderWorker.js";
import { InMemoryQueue, type RenderJob } from "../src/jobs/queue.js";
import { FakeRenderPipeline } from "../src/services/render/pipeline.js";

/**
 * FEAT-018 browse-and-select furniture (ADR-028) — TC-127..TC-135, mapped 1:1 to
 * docs_en/08_test_plan.md. Hermetic: FakeRenderPipeline, mocked Prisma, no DB.
 *
 *   FR-066: TC-127 (browse the catalog by source + style),
 *           TC-128 (exclude non-matching products; empty list when none match),
 *           TC-129 (GET /catalog/products/:id/image streams / 404s)
 *   FR-067: TC-130 (>3 selected products -> 400 too_many_products),
 *           TC-131 (an invalid selected id is dropped by worker validation, not a 400)
 *   FR-068: TC-132 (a render composites EXACTLY the user's selection, not auto-match),
 *           TC-133 (no productIds -> auto-match fallback, backward compatible)
 *   FR-069: TC-134 (iterate — a second render on the same project, different selection)
 *   guard : TC-135 (a source=public selection is display-only, excluded from the cart)
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
    priceCop: 3_200_000,
    photos: ["/products/sofa-teide.svg"],
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

/**
 * Worker prisma double: resolves a render, serves a `product.findMany` from the
 * given catalog (so a selection's `{ id: { in } }` returns exactly those products),
 * and captures the composited RenderItem rows + the cart auto-populate.
 */
function workerPrisma(opts: {
  catalog: Array<ReturnType<typeof supplierProduct> | ReturnType<typeof publicProduct>>;
  renderItemCreateMany: ReturnType<typeof vi.fn>;
  cartItemCreateMany: ReturnType<typeof vi.fn>;
  productFindMany?: ReturnType<typeof vi.fn>;
  renderItemsForCart?: Array<Record<string, unknown>>;
  /** RenderRequest.status seen at dequeue (default "queued"; TC-145 uses "failed"). */
  requestStatus?: string;
}) {
  const byId = new Map(opts.catalog.map((p) => [p.id, p]));
  const productFindMany =
    opts.productFindMany ??
    vi.fn(async ({ where }: { where: { id?: { in: string[] } } }) => {
      const ids = where.id?.in ?? [];
      return ids.map((id) => byId.get(id)).filter(Boolean);
    });
  const tx = {
    cart: { upsert: vi.fn().mockResolvedValue({ id: "cart_1", status: "draft" }) },
    cartItem: { deleteMany: vi.fn().mockResolvedValue({}), createMany: opts.cartItemCreateMany },
  };
  return prismaWith({
    render: {
      findUnique: vi.fn(async ({ where }: { where: { id: string } }) => ({
        id: where.id,
        projectId: "proj_1",
        renderRequestId: `${where.id}_rr`,
        renderRequest: {
          id: `${where.id}_rr`,
          status: opts.requestStatus ?? "queued",
          styleId: null,
          freeText: null,
          budgetMinCop: null,
          budgetMaxCop: null,
        },
      })),
      update: vi.fn().mockResolvedValue({}),
    },
    roomPhoto: { findFirst: vi.fn().mockResolvedValue({ storageKey: "photos/p1.jpg" }) },
    product: { findMany: productFindMany },
    renderItem: {
      createMany: opts.renderItemCreateMany,
      findMany: vi.fn().mockResolvedValue(opts.renderItemsForCart ?? []),
    },
    renderRequest: { update: vi.fn().mockResolvedValue({}) },
    $transaction: vi.fn(async (fn: (t: typeof tx) => Promise<void>) => fn(tx)),
  });
}

/** Run one render job to completion through the worker + FakeRenderPipeline. */
async function runWorker(prisma: PrismaClient, job: RenderJob) {
  const queue = new InMemoryQueue<RenderJob>();
  registerRenderWorker(queue, prisma, new FakeRenderPipeline());
  await queue.enqueue(job);
  await new Promise((resolve) => setTimeout(resolve, 0));
}

// ---------------------------------------------------------------------------
// FR-066 — browse the catalog by source + style
// ---------------------------------------------------------------------------
describe("FR-066 browse the catalog by source + style", () => {
  let app: FastifyInstance | undefined;
  afterEach(async () => {
    await app?.close();
  });

  it("TC-127 returns approved supplier products filtered by source + style, each with a web-asset imageUrl", async () => {
    const findMany = vi.fn().mockResolvedValue([supplierProduct()]);
    ({ app } = await buildTestApp({
      style: { findUnique: vi.fn().mockResolvedValue({ id: "st_min", code: "minimalist" }) },
      product: { findMany },
    }));

    const res = await app.inject({
      method: "GET",
      url: "/api/v1/catalog?source=supplier&styleId=st_min&budgetMaxCop=5000000",
    });

    expect(res.statusCode).toBe(200);
    const products = res.json().products as Array<Record<string, unknown>>;
    expect(products).toHaveLength(1);
    expect(products[0]).toEqual(
      expect.objectContaining({
        productId: "sup_prod_1",
        source: "supplier",
        notSoldBySpazio: false,
        supplierName: "Maderos",
        // Supplier image is the web-asset path (photos[0]).
        imageUrl: "/products/sofa-teide.svg",
      }),
    );
    // The query is scoped to source=supplier, the resolved style code, and the
    // budget cap — i.e. only renderable products of the chosen source/style.
    expect(findMany).toHaveBeenCalledTimes(1);
    expect(findMany.mock.calls[0]?.[0].where).toEqual(
      expect.objectContaining({
        source: "supplier",
        approvalStatus: "approved",
        completenessStatus: "complete",
        styleAttributes: { has: "minimalist" },
        priceCop: { lte: 5_000_000 },
      }),
    );
  });

  it("TC-127 returns public products with a served imageUrl and the not-sold-by-Spazio label", async () => {
    const findMany = vi.fn().mockResolvedValue([publicProduct()]);
    ({ app } = await buildTestApp({
      style: { findUnique: vi.fn().mockResolvedValue(null) },
      product: { findMany },
    }));

    const res = await app.inject({ method: "GET", url: "/api/v1/catalog?source=public" });

    expect(res.statusCode).toBe(200);
    const products = res.json().products as Array<Record<string, unknown>>;
    expect(products[0]).toEqual(
      expect.objectContaining({
        productId: "pub_prod_1",
        source: "public",
        notSoldBySpazio: true,
        outboundUrl: "https://www.amazon.com/dp/B0ABO123",
        // Public image is served from private storage via the image endpoint.
        imageUrl: "/api/v1/catalog/products/pub_prod_1/image",
      }),
    );
    expect(findMany.mock.calls[0]?.[0].where).toEqual(
      expect.objectContaining({ source: "public" }),
    );
  });

  it("rejects an unknown source with a 400 (schema enum)", async () => {
    ({ app } = await buildTestApp());
    const res = await app.inject({ method: "GET", url: "/api/v1/catalog?source=nonsense" });
    expect(res.statusCode).toBe(400);
  });

  it("TC-128 excludes non-matching products and returns an empty list when none match", async () => {
    // The style/source/budget gates live in the Prisma `where` (asserted in TC-127);
    // when that filtered query matches nothing, the endpoint returns an empty array.
    const findMany = vi.fn().mockResolvedValue([]);
    ({ app } = await buildTestApp({
      style: { findUnique: vi.fn().mockResolvedValue({ id: "st_min", code: "minimalist" }) },
      product: { findMany },
    }));

    const res = await app.inject({
      method: "GET",
      url: "/api/v1/catalog?source=supplier&styleId=st_min&budgetMaxCop=100000",
    });

    expect(res.statusCode).toBe(200);
    expect(res.json().products).toEqual([]);
    // The budget cap and style are pushed into the query, so over-budget / wrong-style
    // / unapproved rows are excluded at the DB, never post-filtered in the route.
    expect(findMany.mock.calls[0]?.[0].where).toEqual(
      expect.objectContaining({
        source: "supplier",
        approvalStatus: "approved",
        completenessStatus: "complete",
        styleAttributes: { has: "minimalist" },
        priceCop: { lte: 100000 },
      }),
    );
  });

  it("TC-129 serves the stored image bytes for a public product and 404s a missing one", async () => {
    const bytes = Buffer.from("PUBLIC_IMAGE_BYTES");
    ({ app } = await buildTestApp(
      {
        product: {
          findUnique: vi
            .fn()
            .mockResolvedValueOnce({ photos: ["catalog/public/abo-B0ABO123.jpg"] })
            .mockResolvedValueOnce(null),
        },
      },
      { storage: { get: vi.fn().mockResolvedValue(bytes) } as never },
    ));

    const ok = await app.inject({ method: "GET", url: "/api/v1/catalog/products/pub_prod_1/image" });
    expect(ok.statusCode).toBe(200);
    expect(ok.headers["content-type"]).toBe("image/jpeg");
    expect(ok.rawPayload.equals(bytes)).toBe(true);

    const missing = await app.inject({ method: "GET", url: "/api/v1/catalog/products/nope/image" });
    expect(missing.statusCode).toBe(404);
  });
});

// ---------------------------------------------------------------------------
// FR-067 — select at most 3 products
// ---------------------------------------------------------------------------
describe("FR-067 the 3-item selection cap", () => {
  let app: FastifyInstance | undefined;
  afterEach(async () => {
    await app?.close();
  });

  it("TC-130 refuses a render carrying more than 3 productIds with 400 too_many_products", async () => {
    const enqueue = vi.fn().mockResolvedValue(undefined);
    const $transaction = vi.fn();
    ({ app } = await buildTestApp(
      { project: { findFirst: vi.fn().mockResolvedValue({ id: "proj_1" }) }, $transaction },
      { queue: { enqueue, process: vi.fn() } },
    ));

    const res = await app.inject({
      method: "POST",
      url: "/api/v1/renders",
      headers: { "x-device-token": "dev_1" },
      payload: { projectId: "proj_1", productIds: ["a", "b", "c", "d"] },
    });

    expect(res.statusCode).toBe(400);
    expect(res.json().error).toBe("too_many_products");
    // No render is created and nothing is enqueued.
    expect($transaction).not.toHaveBeenCalled();
    expect(enqueue).not.toHaveBeenCalled();
  });

  it("accepts a render with exactly 3 productIds and threads them onto the job", async () => {
    const enqueue = vi.fn().mockResolvedValue(undefined);
    ({ app } = await buildTestApp(
      {
        project: { findFirst: vi.fn().mockResolvedValue({ id: "proj_1" }) },
        $transaction: vi.fn().mockResolvedValue({ id: "r1" }),
      },
      { queue: { enqueue, process: vi.fn() } },
    ));

    const res = await app.inject({
      method: "POST",
      url: "/api/v1/renders",
      headers: { "x-device-token": "dev_1" },
      payload: { projectId: "proj_1", productIds: ["a", "b", "c"] },
    });

    expect(res.statusCode).toBe(202);
    expect(enqueue).toHaveBeenCalledWith({ renderId: "r1", productIds: ["a", "b", "c"] });
  });

  // TC-144 (BUG-005): the requested selection is snapshotted on the RenderRequest
  // row — the queue payload is volatile, and RenderItem rows exist only for
  // successful renders, so without this a failed render loses which products the
  // user attempted.
  it("TC-144 persists the requested selection on the RenderRequest row", async () => {
    const renderRequestCreate = vi.fn().mockResolvedValue({ id: "rr1" });
    const tx = {
      project: { update: vi.fn().mockResolvedValue({}) },
      renderRequest: { create: renderRequestCreate },
      render: { create: vi.fn().mockResolvedValue({ id: "r1" }) },
    };
    const enqueue = vi.fn().mockResolvedValue(undefined);
    ({ app } = await buildTestApp(
      {
        project: { findFirst: vi.fn().mockResolvedValue({ id: "proj_1" }) },
        $transaction: vi.fn(async (fn: (t: typeof tx) => Promise<unknown>) => fn(tx)),
      },
      { queue: { enqueue, process: vi.fn() } },
    ));

    const selected = await app.inject({
      method: "POST",
      url: "/api/v1/renders",
      headers: { "x-device-token": "dev_1" },
      payload: { projectId: "proj_1", productIds: ["a", "b"] },
    });
    expect(selected.statusCode).toBe(202);
    expect(renderRequestCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ requestedProductIds: ["a", "b"] }),
      }),
    );

    // No selection (auto-match fallback) persists an empty snapshot, not null.
    const autoMatch = await app.inject({
      method: "POST",
      url: "/api/v1/renders",
      headers: { "x-device-token": "dev_1" },
      payload: { projectId: "proj_1" },
    });
    expect(autoMatch.statusCode).toBe(202);
    expect(renderRequestCreate).toHaveBeenLastCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ requestedProductIds: [] }),
      }),
    );
  });

  // TC-145 (BUG-005): with serialized jobs, 'queued' is a long-lived state — a
  // render cancelled while waiting must be skipped at dequeue, not resurrected
  // to 'processing' and rendered anyway (terminal stays terminal, TC-137).
  it("TC-145 skips a job cancelled while it waited in the queue", async () => {
    const renderItemCreateMany = vi.fn();
    const cartItemCreateMany = vi.fn();
    const prisma = workerPrisma({
      catalog: [supplierProduct()],
      renderItemCreateMany,
      cartItemCreateMany,
      requestStatus: "failed", // cancelled via POST /renders/:id/cancel while queued
    });

    await runWorker(prisma, { renderId: "r1", productIds: ["sup_prod_1"] });

    // Not flipped back to 'processing', nothing composited, nothing carted.
    expect(prisma.renderRequest.update).not.toHaveBeenCalled();
    expect(renderItemCreateMany).not.toHaveBeenCalled();
    expect(cartItemCreateMany).not.toHaveBeenCalled();
  });

  it("TC-131 drops an invalid selected id in the worker (no 400) and composites only the valid ones", async () => {
    const renderItemCreateMany = vi.fn().mockResolvedValue({ count: 1 });
    const cartItemCreateMany = vi.fn().mockResolvedValue({ count: 1 });
    // selectProductsByIds runs `product.findMany({ where: { id: { in }, approved,
    // complete } })`; a non-existent / unapproved / non-renderable id simply is not
    // returned by that query, so it never reaches the composite.
    const productFindMany = vi.fn(async ({ where }: { where: { id?: { in: string[] } } }) => {
      const catalog = [supplierProduct({ id: "sup_prod_1" })]; // "ghost" is absent (invalid)
      const ids = where.id?.in ?? [];
      return catalog.filter((p) => ids.includes(p.id));
    });
    const prisma = workerPrisma({
      catalog: [],
      renderItemCreateMany,
      cartItemCreateMany,
      productFindMany,
      renderItemsForCart: [
        { productId: "sup_prod_1", priceCopSnapshot: 3_200_000, source: "supplier" },
      ],
    });

    // The route already accepted this (<=3 ids, 202); the worker validates the ids.
    await runWorker(prisma, { renderId: "r1", productIds: ["sup_prod_1", "ghost"] });

    // The render is produced compositing ONLY the valid id — "ghost" is dropped.
    expect(renderItemCreateMany).toHaveBeenCalledTimes(1);
    const data = renderItemCreateMany.mock.calls[0]?.[0]?.data as Array<Record<string, unknown>>;
    expect(data.map((d) => d.productId)).toEqual(["sup_prod_1"]);
  });
});

// ---------------------------------------------------------------------------
// FR-068 — a render composites EXACTLY the user's selection
// ---------------------------------------------------------------------------
describe("FR-068 render the user's selection", () => {
  it("TC-132 composites exactly the selected productIds (with real price snapshots) and does NOT auto-match", async () => {
    const renderItemCreateMany = vi.fn().mockResolvedValue({ count: 2 });
    const cartItemCreateMany = vi.fn().mockResolvedValue({ count: 2 });
    const productFindMany = vi.fn(async ({ where }: { where: { id?: { in: string[] } } }) => {
      const catalog = [
        supplierProduct({ id: "sup_prod_1", priceCop: 3_200_000 }),
        supplierProduct({ id: "sup_prod_2", sku: "rug-sabana", priceCop: 890_000 }),
        supplierProduct({ id: "sup_prod_3", sku: "lamp-arco", priceCop: 640_000 }),
      ];
      const ids = where.id?.in ?? [];
      return catalog.filter((p) => ids.includes(p.id));
    });
    const prisma = workerPrisma({
      catalog: [],
      renderItemCreateMany,
      cartItemCreateMany,
      productFindMany,
      renderItemsForCart: [
        { productId: "sup_prod_1", priceCopSnapshot: 3_200_000, source: "supplier" },
        { productId: "sup_prod_3", priceCopSnapshot: 640_000, source: "supplier" },
      ],
    });

    await runWorker(prisma, { renderId: "r1", productIds: ["sup_prod_1", "sup_prod_3"] });

    // The selection query fetched EXACTLY the chosen ids — not a source-wide match.
    expect(productFindMany).toHaveBeenCalledTimes(1);
    const where = productFindMany.mock.calls[0]?.[0].where as { id?: { in: string[] }; source?: string };
    expect(where.id?.in).toEqual(["sup_prod_1", "sup_prod_3"]);
    expect(where.source).toBeUndefined();

    // Composited items are exactly the two selected products, priced from the row.
    expect(renderItemCreateMany).toHaveBeenCalledTimes(1);
    const data = renderItemCreateMany.mock.calls[0]?.[0]?.data as Array<Record<string, unknown>>;
    expect(data.map((d) => d.productId)).toEqual(["sup_prod_1", "sup_prod_3"]);
    expect(data.map((d) => d.priceCopSnapshot)).toEqual([3_200_000, 640_000]);
  });

  it("TC-133 with no productIds falls back to auto-match (FR-014), never the id-selection path", async () => {
    const renderItemCreateMany = vi.fn().mockResolvedValue({ count: 1 });
    const cartItemCreateMany = vi.fn().mockResolvedValue({ count: 1 });
    // matchProducts queries by `source` (no `id` filter); selectProductsByIds queries
    // by `id: { in }`. Returning a SKU only for the source-scoped query proves the
    // auto-match path ran and the selection path did not.
    const productFindMany = vi.fn(
      async ({ where }: { where: { id?: { in: string[] }; source?: string } }) => {
        if (!where.id && where.source === "supplier") return [supplierProduct({ id: "auto_1" })];
        return [];
      },
    );
    const prisma = workerPrisma({
      catalog: [],
      renderItemCreateMany,
      cartItemCreateMany,
      productFindMany,
      renderItemsForCart: [
        { productId: "auto_1", priceCopSnapshot: 3_200_000, source: "supplier" },
      ],
    });

    await runWorker(prisma, { renderId: "r1" }); // no productIds -> auto-match fallback

    // No query used an id-selection filter (the selection path was not taken)...
    const wheres = productFindMany.mock.calls.map(
      (c) => c[0].where as { id?: { in: string[] }; source?: string },
    );
    expect(wheres.some((w) => w.id?.in)).toBe(false);
    // ...and the source-scoped auto-match query ran and its SKU was composited.
    expect(wheres.some((w) => w.source === "supplier")).toBe(true);
    const data = renderItemCreateMany.mock.calls[0]?.[0]?.data as Array<Record<string, unknown>>;
    expect(data.map((d) => d.productId)).toEqual(["auto_1"]);
  });
});

// ---------------------------------------------------------------------------
// FR-069 — iterate: a second render on the same project with a different selection
// ---------------------------------------------------------------------------
describe("FR-069 iterate with a different selection", () => {
  it("TC-134 a second render on the same project composites the new selection", async () => {
    const renderItemCreateMany = vi.fn().mockResolvedValue({ count: 1 });
    const cartItemCreateMany = vi.fn().mockResolvedValue({ count: 1 });
    const prisma = workerPrisma({
      catalog: [
        supplierProduct({ id: "sup_prod_1" }),
        supplierProduct({ id: "sup_prod_2", sku: "rug-sabana" }),
        supplierProduct({ id: "sup_prod_3", sku: "lamp-arco" }),
      ],
      renderItemCreateMany,
      cartItemCreateMany,
    });

    // First selection.
    await runWorker(prisma, { renderId: "r1", productIds: ["sup_prod_1"] });
    // Iterate: same project, a different selection (keeping photo/source/style).
    await runWorker(prisma, { renderId: "r2", productIds: ["sup_prod_2", "sup_prod_3"] });

    expect(renderItemCreateMany).toHaveBeenCalledTimes(2);
    const first = renderItemCreateMany.mock.calls[0]?.[0]?.data as Array<Record<string, unknown>>;
    const second = renderItemCreateMany.mock.calls[1]?.[0]?.data as Array<Record<string, unknown>>;
    expect(first.map((d) => d.productId)).toEqual(["sup_prod_1"]);
    expect(second.map((d) => d.productId)).toEqual(["sup_prod_2", "sup_prod_3"]);
  });
});

// ---------------------------------------------------------------------------
// Guard — a source=public selection is display-only, excluded from the cart
// ---------------------------------------------------------------------------
describe("guard: a brand/public selection is display-only (excluded from the cart)", () => {
  it("TC-135 composites the selected public product but populates no cart line", async () => {
    const renderItemCreateMany = vi.fn().mockResolvedValue({ count: 1 });
    const cartItemCreateMany = vi.fn().mockResolvedValue({ count: 0 });
    const prisma = workerPrisma({
      catalog: [publicProduct()],
      renderItemCreateMany,
      cartItemCreateMany,
      // The render tagged the public product; cart auto-populate reads it back.
      renderItemsForCart: [
        { productId: "pub_prod_1", priceCopSnapshot: 900_000, source: "public" },
      ],
    });

    await runWorker(prisma, { renderId: "r1", productIds: ["pub_prod_1"] });

    // The public product IS composited/tagged, carrying its provenance + link.
    const data = renderItemCreateMany.mock.calls[0]?.[0]?.data as Array<Record<string, unknown>>;
    expect(data[0]).toEqual(
      expect.objectContaining({
        productId: "pub_prod_1",
        source: "public",
        outboundUrl: "https://www.amazon.com/dp/B0ABO123",
      }),
    );
    // ...but it is display-only: NO cart line is created for it (FR-064, ADR-027).
    expect(cartItemCreateMany).not.toHaveBeenCalled();
  });
});
