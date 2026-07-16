import type { FastifyPluginAsync } from "fastify";
import type { ProductSource } from "@prisma/client";
import { productSummary } from "../../services/productSummary.js";
import { browseCatalog } from "../../services/catalog.js";
import { extname } from "node:path";

/**
 * Browse-and-select catalog surface (ADR-028; FR-066/FR-069). Powers the
 * user-curated flow: the client picks a SOURCE + STYLE, browses the REAL catalog,
 * and selects up to 3 products to render (the render itself is POST /renders with
 * productIds — see renders.ts). Two endpoints:
 *
 *  - GET /catalog?source&styleId&budgetMaxCop  renderable products of that source,
 *      style-filtered (FR-066). Each carries the ProductSummary fields plus an
 *      `imageUrl`: source=public -> the served image endpoint below; source=supplier
 *      -> the product's web-asset path (photos[0]).
 *  - GET /catalog/products/:id/image           streams the product's stored image
 *      (source=public images live in ObjectStorage under catalog/public/<sku>.jpg).
 *      404 when the product or its stored image is absent.
 *
 * INTENTIONALLY UNAUTHENTICATED (no device token): the catalog is public data, like
 * GET /styles. Device scoping (NFR-007) stays on the project/render/cart routes.
 * Provenance handling is unchanged (ADR-027): a source=public product is display-only
 * — productSummary already carries `notSoldBySpazio`, the "View at retailer"
 * `outboundUrl`, and the CC BY 4.0 `attribution`; it is never carted/checked out.
 */

/** Content type for a stored image key, from its extension (public images are JPEG). */
function contentTypeFor(key: string): string {
  switch (extname(key).toLowerCase()) {
    case ".jpg":
    case ".jpeg":
      return "image/jpeg";
    case ".png":
      return "image/png";
    case ".webp":
      return "image/webp";
    case ".svg":
      return "image/svg+xml";
    default:
      return "application/octet-stream";
  }
}

interface BrowseQuery {
  source: ProductSource;
  styleId?: string;
  budgetMaxCop?: number;
}

export const catalogRoutes: FastifyPluginAsync = async (app) => {
  const { prisma, storage } = app.deps;

  app.get<{ Querystring: BrowseQuery }>(
    "/catalog",
    {
      schema: {
        querystring: {
          type: "object",
          required: ["source"],
          properties: {
            source: { type: "string", enum: ["supplier", "public"] },
            styleId: { type: "string" },
            budgetMaxCop: { type: "integer", minimum: 0 },
          },
        },
      },
    },
    async (request, reply) => {
      const { source, styleId, budgetMaxCop } = request.query;
      const products = await browseCatalog(prisma, {
        source,
        styleId: styleId ?? null,
        budgetMaxCop: budgetMaxCop ?? null,
      });
      return reply.code(200).send({
        products: products.map((product) => ({
          ...productSummary(product),
          // Where the client fetches the image. Public images are served (they live
          // in private object storage); supplier images are web assets (photos[0]).
          imageUrl:
            product.source === "public"
              ? `/api/v1/catalog/products/${product.id}/image`
              : (product.photos[0] ?? null),
        })),
      });
    },
  );

  app.get<{ Params: { id: string } }>(
    "/catalog/products/:id/image",
    {
      schema: {
        params: { type: "object", required: ["id"], properties: { id: { type: "string" } } },
      },
    },
    async (request, reply) => {
      // Resolved by id alone — the API contract for this endpoint only requires
      // "404 if the product has no stored image or does not exist", so approval/
      // source gating is intentionally NOT applied here. No private data leaks: the
      // query touches only prisma.product, supplier web-asset paths and any
      // non-storage key 404 via the storage.get catch below, and browse never
      // surfaces unapproved ids anyway. (Deliberate — do not tighten without cause.)
      const product = await prisma.product.findUnique({
        where: { id: request.params.id },
        select: { photos: true },
      });
      const key = product?.photos[0];
      // 404 when the product does not exist or has no stored image (API contract).
      if (!key) {
        return reply.code(404).send({ error: "not_found", message: "Product image not found." });
      }
      let bytes: Buffer;
      try {
        bytes = await storage.get(key);
      } catch {
        // photos[0] is not a stored object (e.g. a supplier web-asset path) or is
        // missing in storage — no bytes to serve here.
        return reply.code(404).send({ error: "not_found", message: "Product image not found." });
      }
      return reply
        .code(200)
        .header("Content-Type", contentTypeFor(key))
        .header("Cache-Control", "public, max-age=3600")
        .send(bytes);
    },
  );
};
