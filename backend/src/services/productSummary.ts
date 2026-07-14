import type { Product, Supplier } from "@prisma/client";

/**
 * The product fields client surfaces need to display a tag or cart line
 * (FR-028/FR-029/FR-032: name, price, supplier, listing data). Kept small on
 * purpose — the full catalog stays operator-only.
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
}

export function productSummary(product: Product & { supplier?: Supplier | null }): ProductSummary {
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
  };
}
