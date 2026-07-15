import type { Product, ProductSource, Supplier } from "@prisma/client";
import { attributionOf, type Attribution } from "./attribution.js";

/**
 * The product fields client surfaces need to display a tag or cart line
 * (FR-028/FR-029/FR-032: name, price, supplier, listing data). Kept small on
 * purpose — the full catalog stays operator-only.
 *
 * Provenance (ADR-027; FR-063/FR-065): every summary carries `source`. A
 * source=public product is DISPLAY-ONLY ("not sold by Spazio"): the client shows
 * the `notSoldBySpazio` label, a "View at retailer" `outboundUrl`, and the CC BY
 * 4.0 `attribution` instead of an add-to-cart affordance (FR-064). Supplier
 * products keep source=supplier with null attribution/outboundUrl — unchanged.
 */
export interface ProductSummary {
  productId: string;
  sku: string;
  name: string;
  category: string;
  priceCop: number;
  photos: string[];
  classification: string;
  deliveryLeadTimeDays: number;
  productionLeadTimeDays: number | null;
  supplierName: string | null;
  // FEAT-017 provenance / attribution (ADR-027).
  source: ProductSource;
  notSoldBySpazio: boolean;
  outboundUrl: string | null;
  attribution: Attribution | null;
}

export function productSummary(product: Product & { supplier?: Supplier | null }): ProductSummary {
  const isPublic = product.source === "public";
  return {
    productId: product.id,
    sku: product.sku,
    name: product.name,
    category: product.category,
    priceCop: product.priceCop,
    photos: product.photos,
    classification: product.classification,
    deliveryLeadTimeDays: product.deliveryLeadTimeDays,
    productionLeadTimeDays: product.productionLeadTimeDays,
    supplierName: product.supplier?.name ?? null,
    source: product.source,
    // "not sold by Spazio" label for the display-only public track (FR-063).
    notSoldBySpazio: isPublic,
    // "View at retailer" outbound link shown instead of add-to-cart (FR-064).
    outboundUrl: isPublic ? (product.sourceUrl ?? null) : null,
    // CC BY 4.0 attribution surfaced on the product (FR-065); null for supplier.
    attribution: isPublic ? attributionOf(product) : null,
  };
}
