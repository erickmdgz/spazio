import type { PrismaClient, Product } from "@prisma/client";
import { PILOT } from "../config.js";

/**
 * Minimal pilot matching (FEAT-005 subset; plan §1.5 step 3).
 *
 * Selects only SKUs that are real and purchasable: operator-approved (FR-016),
 * BR-1-complete (FR-019 via upstream curation, §0.1#7), in stock for ready-made
 * (FR-018), and style-matched when a style was chosen (FR-014). A greedy pass
 * keeps the running total within budget + the 10% tolerance (FR-021, ADR-008).
 *
 * Deliberately NOT here (deferred with their features): dimension-fit scoring,
 * FR-022/FR-023 disclose/alternative fallbacks (an empty result simply renders
 * with fewer items and the operator judges it at QA), and locality filtering
 * beyond the single seeded Bogotá zone (§0.1#6).
 */

export interface MatchInput {
  styleId: string | null;
  budgetMinCop: number | null;
  budgetMaxCop: number | null;
  /** Maximum items to compose into one render. */
  limit?: number;
}

export const DEFAULT_MATCH_LIMIT = 6;

export async function matchProducts(prisma: PrismaClient, input: MatchInput): Promise<Product[]> {
  const style = input.styleId
    ? await prisma.style.findUnique({ where: { id: input.styleId } })
    : null;

  const candidates = await prisma.product.findMany({
    where: {
      approvalStatus: "approved",
      completenessStatus: "complete",
      OR: [
        { classification: "ready_made", stock: { gt: 0 } },
        { classification: "made_to_order" },
      ],
      ...(style ? { styleAttributes: { has: style.code } } : {}),
    },
    orderBy: { priceCop: "asc" },
  });

  const limit = input.limit ?? DEFAULT_MATCH_LIMIT;
  const budgetCap =
    input.budgetMaxCop != null
      ? Math.floor(input.budgetMaxCop * (1 + PILOT.BUDGET_TOLERANCE))
      : null;

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
