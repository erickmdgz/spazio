import type { PrismaClient, Product } from "@prisma/client";
import { PILOT } from "../config.js";
import { hasRequiredAttribution } from "./attribution.js";

/**
 * Minimal pilot matching (FEAT-005 subset; plan §1.5 step 3) + the FEAT-017
 * public-catalog bootstrap fallback (ADR-027; FR-062).
 *
 * Supplier track (unchanged): selects only SKUs that are real and purchasable —
 * operator-approved (FR-016), BR-1-complete (FR-019 via upstream curation,
 * §0.1#7), in stock for ready-made (FR-018), and style-matched when a style was
 * chosen (FR-014). A greedy pass keeps the running total within budget + the 10%
 * tolerance (FR-021, ADR-008).
 *
 * Public fallback (FR-062, ADR-027): when NO eligible supplier SKU satisfies the
 * request — i.e. there is no supplier candidate at all (empty supplier catalog for
 * the constraints) — matching draws DISPLAY-ONLY `source=public` products from the
 * seeded Amazon Berkeley Objects subset (CC BY 4.0) instead. If any supplier
 * candidate exists the supplier track is used and the public fallback is NOT
 * activated (FR-062/TC-111) — so the supplier budget/greedy behaviour is unchanged
 * (an over-budget supplier catalog still renders fewer supplier items, never public
 * ones). Public products have no live stock feed (FR-018 carve-out) and their price
 * is informational (display-only), so the stock gate and budget cap are not applied
 * to them; a public product missing required CC BY attribution is excluded
 * (FR-065/TC-118). Returned products carry their `source` so every downstream
 * context can distinguish and label them (FR-063).
 *
 * Deliberately NOT here (deferred with their features): dimension-fit scoring,
 * FR-022/FR-023 disclose/alternative fallbacks (an empty supplier result simply
 * renders with fewer items and the operator judges it at QA), and locality
 * filtering beyond the single seeded Bogotá zone (§0.1#6).
 */

export interface MatchInput {
  styleId: string | null;
  budgetMinCop: number | null;
  budgetMaxCop: number | null;
  /** Maximum items to compose into one render. */
  limit?: number;
}

export const DEFAULT_MATCH_LIMIT = 6;

/**
 * Resolve a styleId to its stable style `code` (or null when no style is chosen,
 * or the id does not resolve). The catalog's `styleAttributes` reference this code,
 * so every style-aware query (matching AND the browse/select catalog surface,
 * ADR-028/FR-066) must map id -> code the same way. Shared here so the style logic
 * is not duplicated.
 */
export async function resolveStyleCode(
  prisma: PrismaClient,
  styleId: string | null,
): Promise<string | null> {
  if (!styleId) return null;
  const style = await prisma.style.findUnique({ where: { id: styleId } });
  return style?.code ?? null;
}

/** Greedy budget pass (FR-021, ADR-008): cheapest-first within budget + tolerance. */
function selectWithinBudget(
  candidates: Product[],
  budgetMaxCop: number | null,
  limit: number,
): Product[] {
  const budgetCap =
    budgetMaxCop != null ? Math.floor(budgetMaxCop * (1 + PILOT.BUDGET_TOLERANCE)) : null;

  const selected: Product[] = [];
  let totalCop = 0;
  for (const product of candidates) {
    if (selected.length >= limit) break;
    if (budgetCap != null && totalCop + product.priceCop > budgetCap) continue;
    selected.push(product);
    totalCop += product.priceCop;
  }
  return selected;
}

export async function matchProducts(prisma: PrismaClient, input: MatchInput): Promise<Product[]> {
  const styleCode = await resolveStyleCode(prisma, input.styleId);

  const limit = input.limit ?? DEFAULT_MATCH_LIMIT;

  // Supplier track (FR-016 real, purchasable SKUs) — behaviour unchanged.
  const supplierCandidates = await prisma.product.findMany({
    where: {
      source: "supplier",
      approvalStatus: "approved",
      completenessStatus: "complete",
      OR: [
        { classification: "ready_made", stock: { gt: 0 } },
        { classification: "made_to_order" },
      ],
      ...(styleCode ? { styleAttributes: { has: styleCode } } : {}),
    },
    orderBy: { priceCop: "asc" },
  });

  // A supplier catalog satisfies the request -> use it; the public fallback is not
  // activated (FR-062/TC-111). Budget/greedy stays exactly as before.
  if (supplierCandidates.length > 0) {
    return selectWithinBudget(supplierCandidates, input.budgetMaxCop, limit);
  }

  // Public-catalog bootstrap fallback (FR-062, ADR-027): no supplier SKU satisfied
  // the request. Draw display-only source=public products. No stock gate (FR-018
  // carve-out) and no budget cap (price is informational for display-only items).
  // A public product missing required CC BY 4.0 attribution is excluded from the
  // candidate set (FR-065/TC-118).
  const publicCandidates = await prisma.product.findMany({
    where: {
      source: "public",
      approvalStatus: "approved",
      completenessStatus: "complete",
      ...(styleCode ? { styleAttributes: { has: styleCode } } : {}),
      // DB-level attribution pre-filter (FR-065/TC-110): exclude rows missing any
      // CC BY 4.0 field.
      sourceName: { not: null },
      sourceUrl: { not: null },
      sourceImageUrl: { not: null },
      imageLicense: { not: null },
    },
    orderBy: { priceCop: "asc" },
  });

  // Authoritative attribution check: the SAME predicate the render worker and
  // productSummary use, so a product can never pass matching yet be dropped later.
  // The Prisma `{ not: null }` clause above admits empty strings that
  // hasRequiredAttribution rejects — this closes that gap (FR-065/TC-118).
  return publicCandidates.filter(hasRequiredAttribution).slice(0, limit);
}
