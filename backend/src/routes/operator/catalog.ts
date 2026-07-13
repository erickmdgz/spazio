import type { FastifyPluginAsync } from "fastify";
import type { Prisma, ProductClassification } from "@prisma/client";

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

/** Derive completeness from BR-1 fields (operator-enforced, ADR-014). */
function completenessOf(input: UpsertProductBody): "complete" | "incomplete" {
  const hasCore =
    input.photos.length > 0 &&
    input.colors.length > 0 &&
    input.materials.length > 0 &&
    input.styleAttributes.length > 0 &&
    input.priceCop > 0 &&
    input.deliveryLeadTimeDays >= 0 &&
    input.warrantyTerms.length > 0 &&
    input.widthCm != null &&
    input.depthCm != null &&
    input.heightCm != null;
  const classOk =
    input.classification === "ready_made"
      ? input.stock != null
      : input.productionLeadTimeDays != null;
  return hasCore && classOk ? "complete" : "incomplete";
}

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
      const where: Prisma.ProductWhereInput = {};
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
    { schema: { body: productBodySchema } },
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
      schema: {
        params: { type: "object", required: ["id"], properties: { id: { type: "string" } } },
      },
    },
    async (request, reply) => {
      const product = await prisma.product.update({
        where: { id: request.params.id },
        data: request.body as Prisma.ProductUpdateInput,
      });
      return reply.code(200).send({ id: product.id });
    },
  );

  app.post<{ Params: { id: string } }>(
    "/catalog/products/:id/approve",
    {
      schema: {
        params: { type: "object", required: ["id"], properties: { id: { type: "string" } } },
      },
    },
    async (request, reply) => {
      const product = await prisma.product.update({
        where: { id: request.params.id },
        data: { approvalStatus: "approved" },
      });
      return reply.code(200).send({ id: product.id, approvalStatus: product.approvalStatus });
    },
  );

  app.post<{ Params: { id: string } }>(
    "/catalog/products/:id/reject",
    {
      schema: {
        params: { type: "object", required: ["id"], properties: { id: { type: "string" } } },
      },
    },
    async (request, reply) => {
      const product = await prisma.product.update({
        where: { id: request.params.id },
        data: { approvalStatus: "rejected" },
      });
      return reply.code(200).send({ id: product.id, approvalStatus: product.approvalStatus });
    },
  );
};
