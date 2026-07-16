import type { PrismaClient, Product, ProductSource, Supplier } from "@prisma/client";
import { hasRequiredAttribution } from "./attribution.js";
import { resolveStyleCode } from "./matching.js";

/**
 * Browse-and-select catalog service (ADR-028; FR-066..069). Backs the user-curated
 * flow that inverts the auto-furnish matching (PRD §8): the user browses the real
 * catalog for a source + style, picks up to 3 real products, and renders exactly
 * those. Two concerns live here:
 *
 *  - browseCatalog: the renderable products of one source (supplier | public)
 *    filtered by style (and, for supplier, an optional price cap). Reuses the same
 *    style id->code mapping and the same renderable gates matching.ts applies, so
 *    what the user can browse is exactly what a render could composite.
 *  - selectProductsByIds: validates a user's selection against those same gates
 *    before it reaches the render worker (existence + approval + renderability +
 *    source-specific stock/attribution). The <=3 cap is enforced at the route
 *    (400 too_many_products, FR-067); this returns only the valid products.
 *
 * Source gates (kept identical to matching.ts):
 *   - supplier: approvalStatus=approved, completenessStatus=complete, in stock when
 *     ready_made (made_to_order needs no stock, BR-4/FR-018).
 *   - public: approved + complete + full CC BY 4.0 attribution (FR-065). No stock
 *     gate (FR-018 carve-out) and no budget cap (price is informational for these
 *     display-only items — ADR-027).
 */

export type ProductWithSupplier = Product & { supplier: Supplier | null };

export interface BrowseInput {
  source: ProductSource;
  styleId: string | null;
  /** Optional inclusive price cap in COP; applied to the supplier track only. */
  budgetMaxCop: number | null;
}

export async function browseCatalog(
  prisma: PrismaClient,
  input: BrowseInput,
): Promise<ProductWithSupplier[]> {
  const styleCode = await resolveStyleCode(prisma, input.styleId);
  const styleFilter = styleCode ? { styleAttributes: { has: styleCode } } : {};

  if (input.source === "public") {
    // Display-only public track (ADR-027): full CC BY 4.0 attribution required
    // (FR-065), no stock gate, no budget cap.
    const products = await prisma.product.findMany({
      where: {
        source: "public",
        approvalStatus: "approved",
        completenessStatus: "complete",
        ...styleFilter,
        sourceName: { not: null },
        sourceUrl: { not: null },
        sourceImageUrl: { not: null },
        imageLicense: { not: null },
      },
      include: { supplier: true },
      orderBy: { priceCop: "asc" },
    });
    // Authoritative attribution check — the same predicate matching / productSummary
    // use, closing the empty-string gap the DB `{ not: null }` filter admits.
    return products.filter(hasRequiredAttribution);
  }

  // Purchasable supplier track (FR-016): real, approved, in-stock-if-ready_made.
  return prisma.product.findMany({
    where: {
      source: "supplier",
      approvalStatus: "approved",
      completenessStatus: "complete",
      OR: [
        { classification: "ready_made", stock: { gt: 0 } },
        { classification: "made_to_order" },
      ],
      ...styleFilter,
      ...(input.budgetMaxCop != null ? { priceCop: { lte: input.budgetMaxCop } } : {}),
    },
    include: { supplier: true },
    orderBy: { priceCop: "asc" },
  });
}

/**
 * Validate a user's product selection for a render (FR-068). Returns only the
 * products that exist, are approved + complete (renderable), and pass their
 * source-specific gate (supplier: in stock if ready_made; public: full CC BY 4.0
 * attribution). Input order is preserved so the render composites the user's
 * chosen order. The <=3 hard cap is enforced upstream at the route.
 */
export async function selectProductsByIds(
  prisma: PrismaClient,
  productIds: string[],
): Promise<Product[]> {
  if (productIds.length === 0) return [];

  const products = await prisma.product.findMany({
    where: {
      id: { in: productIds },
      approvalStatus: "approved",
      completenessStatus: "complete",
    },
  });
  const byId = new Map(products.map((product) => [product.id, product]));

  const selected: Product[] = [];
  // De-duplicate while preserving order: a non-conforming client could send the
  // same id more than once (the web /select toggle prevents it, but the cap is a
  // length check upstream). Compositing/carting one product twice would over-count
  // it at checkout, so each distinct id yields at most one item.
  const seen = new Set<string>();
  for (const id of productIds) {
    if (seen.has(id)) continue;
    seen.add(id);
    const product = byId.get(id);
    if (!product) continue; // does not exist / not approved / not complete
    if (product.source === "public") {
      // Display-only public product: renderable only with full CC BY attribution.
      if (hasRequiredAttribution(product)) selected.push(product);
    } else if (product.classification === "ready_made") {
      // Ready-made supplier SKU must be in stock (FR-018).
      if ((product.stock ?? 0) > 0) selected.push(product);
    } else {
      // made_to_order supplier SKU — no stock gate.
      selected.push(product);
    }
  }
  return selected;
}
