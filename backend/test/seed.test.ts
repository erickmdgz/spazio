import { describe, expect, it } from "vitest";
import { SEED_PRODUCTS } from "../prisma/seed.js";
import { completenessOf } from "../src/services/completeness.js";

/**
 * The catalog cold-start risk (plan §2.6 #2) is a seed SKU silently failing the
 * BR-1 gate and emptying every render. Every seeded SKU must be complete, and
 * the pilot needs made-to-order SKUs so the production-estimate path is real
 * (§0.1#9 / TC-065).
 */
describe("catalog seed (FEAT-015 minimal)", () => {
  it("every seed SKU passes BR-1 completeness (ADR-014)", () => {
    for (const product of SEED_PRODUCTS) {
      expect(completenessOf(product), product.sku).toBe("complete");
    }
  });

  it("includes made-to-order SKUs with production lead times (§0.1#9)", () => {
    const madeToOrder = SEED_PRODUCTS.filter((p) => p.classification === "made_to_order");
    expect(madeToOrder.length).toBeGreaterThanOrEqual(1);
    for (const product of madeToOrder) {
      expect(product.productionLeadTimeDays, product.sku).not.toBeNull();
    }
  });

  it("ready-made SKUs carry stock (FR-018 matching gate)", () => {
    for (const product of SEED_PRODUCTS.filter((p) => p.classification === "ready_made")) {
      expect(product.stock, product.sku).toBeGreaterThan(0);
    }
  });

  it("skus are unique and style tags match the seeded style codes", () => {
    const skus = new Set(SEED_PRODUCTS.map((p) => p.sku));
    expect(skus.size).toBe(SEED_PRODUCTS.length);
    const styleCodes = new Set(["mediterranean", "minimalist", "scandinavian"]);
    for (const product of SEED_PRODUCTS) {
      expect(product.styleAttributes.length, product.sku).toBeGreaterThan(0);
      for (const tag of product.styleAttributes) {
        expect(styleCodes.has(tag), `${product.sku}: ${tag}`).toBe(true);
      }
    }
  });
});
