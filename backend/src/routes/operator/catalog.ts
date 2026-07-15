import type { FastifyPluginAsync } from "fastify";
import type { Prisma, ProductClassification } from "@prisma/client";
import { completenessOf } from "../../services/completeness.js";
import { requireOperatorRole } from "../../auth/operator.js";

type CatalogFilter = "incomplete" | "unmapped" | "pending";

interface UpsertProductBody {
  supplierId: string;
  sku: string;
  name: string;
  category: string;
  photos: string[];
  colors: string[];
  materials: string[];
  styleAttributes: string[];
  widthCm?: number;
  depthCm?: number;
  heightCm?: number;
  priceCop: number;
  classification: ProductClassification;
  stock?: number;
  productionLeadTimeDays?: number;
  deliveryLeadTimeDays: number;
  warrantyTerms: string;
}

const productBodySchema = {
  type: "object",
  required: [
    "supplierId",
    "sku",
    "name",
    "category",
    "photos",
    "colors",
    "materials",
    "styleAttributes",
    "priceCop",
    "classification",
    "deliveryLeadTimeDays",
    "warrantyTerms",
  ],
  properties: {
    supplierId: { type: "string" },
    sku: { type: "string" },
    name: { type: "string" },
    category: { type: "string" },
    photos: { type: "array", items: { type: "string" } },
    colors: { type: "array", items: { type: "string" } },
    materials: { type: "array", items: { type: "string" } },
    styleAttributes: { type: "array", items: { type: "string" } },
    widthCm: { type: "integer" },
    depthCm: { type: "integer" },
    heightCm: { type: "integer" },
    priceCop: { type: "integer" },
    classification: { type: "string", enum: ["ready_made", "made_to_order"] },
    stock: { type: "integer" },
    productionLeadTimeDays: { type: "integer" },
    deliveryLeadTimeDays: { type: "integer" },
    warrantyTerms: { type: "string" },
  },
} as const;

// BR-1 completeness lives in services/completeness.ts (shared with the seed).

/**
 * Operator catalog curation (§0.1#5; FR-056..059). Registered under /api/v1/operator.
 *  - GET   /catalog/products?filter=incomplete|unmapped|pending
 *  - POST  /catalog/products
 *  - PATCH /catalog/products/:id
 *  - POST  /catalog/products/:id/approve
 *  - POST  /catalog/products/:id/reject
 */
export const operatorCatalogRoutes: FastifyPluginAsync = async (app) => {
  const { prisma } = app.deps;
  // Create/edit/approve/reject are curator actions (NFR-008); queue reads stay
  // open to any signed-in operator.
  const curatorOnly = requireOperatorRole("catalog_curator");

  app.get<{ Querystring: { filter?: CatalogFilter } }>(
    "/catalog/products",
    {
      schema: {
        querystring: {
          type: "object",
          properties: {
            filter: { type: "string", enum: ["incomplete", "unmapped", "pending"] },
          },
        },
      },
    },
    async (request, reply) => {
      // Curation is a supplier-only surface (ADR-027): source=public bootstrap
      // products are seeded approved+complete and bypass the catalog_curator/BR-1
      // gate, so they must not appear in (or be editable from) this console.
      const where: Prisma.ProductWhereInput = { source: "supplier" };
      switch (request.query.filter) {
        case "incomplete":
          where.completenessStatus = "incomplete";
          break;
        case "pending":
          where.approvalStatus = "pending";
          break;
        case "unmapped":
          where.styleAttributes = { isEmpty: true }; // not mapped to any style (ADR-005)
          break;
        default:
          break;
      }
      const products = await prisma.product.findMany({ where, orderBy: { createdAt: "desc" } });
      return reply.code(200).send({ products });
    },
  );

  app.post<{ Body: UpsertProductBody }>(
    "/catalog/products",
    { preHandler: curatorOnly, schema: { body: productBodySchema } },
    async (request, reply) => {
      const b = request.body;
      const product = await prisma.product.create({
        data: {
          supplierId: b.supplierId,
          sku: b.sku,
          name: b.name,
          category: b.category,
          photos: b.photos,
          colors: b.colors,
          materials: b.materials,
          styleAttributes: b.styleAttributes,
          widthCm: b.widthCm ?? null,
          depthCm: b.depthCm ?? null,
          heightCm: b.heightCm ?? null,
          priceCop: b.priceCop,
          classification: b.classification,
          stock: b.stock ?? null,
          productionLeadTimeDays: b.productionLeadTimeDays ?? null,
          deliveryLeadTimeDays: b.deliveryLeadTimeDays,
          warrantyTerms: b.warrantyTerms,
          completenessStatus: completenessOf(b),
          approvalStatus: "pending",
        },
      });
      return reply.code(201).send({ id: product.id, completenessStatus: product.completenessStatus });
    },
  );

  app.patch<{ Params: { id: string }; Body: Partial<UpsertProductBody> }>(
    "/catalog/products/:id",
    {
      preHandler: curatorOnly,
      schema: {
        params: { type: "object", required: ["id"], properties: { id: { type: "string" } } },
      },
    },
    async (request, reply) => {
      const existing = await prisma.product.findUnique({ where: { id: request.params.id } });
      if (!existing) {
        return reply.code(404).send({ error: "not_found", message: "Product not found." });
      }
      // Recompute BR-1 completeness from the merged row (FR-057) so fixing a
      // missing field actually flips the SKU to complete.
      const merged = { ...existing, ...request.body };
      const product = await prisma.product.update({
        where: { id: existing.id },
        data: {
          ...(request.body as Prisma.ProductUpdateInput),
          completenessStatus: completenessOf(merged),
        },
      });
      return reply
        .code(200)
        .send({ id: product.id, completenessStatus: product.completenessStatus });
    },
  );

  app.post<{ Params: { id: string } }>(
    "/catalog/products/:id/approve",
    {
      preHandler: curatorOnly,
      schema: {
        params: { type: "object", required: ["id"], properties: { id: { type: "string" } } },
      },
    },
    async (request, reply) => {
      const product = await prisma.product.findUnique({ where: { id: request.params.id } });
      if (!product) {
        return reply.code(404).send({ error: "not_found", message: "Product not found." });
      }
      // Only BR-1-complete SKUs are approvable into the renderable catalog
      // (ADR-014; operator-enforced completeness, §0.1#7).
      if (product.completenessStatus !== "complete") {
        return reply.code(409).send({
          error: "invalid_state",
          message: "SKU is incomplete (BR-1/ADR-014) — complete it before approving.",
        });
      }
      const updated = await prisma.product.update({
        where: { id: product.id },
        data: { approvalStatus: "approved" },
      });
      return reply.code(200).send({ id: updated.id, approvalStatus: updated.approvalStatus });
    },
  );

  app.post<{ Params: { id: string } }>(
    "/catalog/products/:id/reject",
    {
      preHandler: curatorOnly,
      schema: {
        params: { type: "object", required: ["id"], properties: { id: { type: "string" } } },
      },
    },
    async (request, reply) => {
      const product = await prisma.product.findUnique({ where: { id: request.params.id } });
      if (!product) {
        return reply.code(404).send({ error: "not_found", message: "Product not found." });
      }
      const updated = await prisma.product.update({
        where: { id: product.id },
        data: { approvalStatus: "rejected" },
      });
      return reply.code(200).send({ id: updated.id, approvalStatus: updated.approvalStatus });
    },
  );
};
