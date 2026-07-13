import type { PrismaClient } from "@prisma/client";

/**
 * NFR-006 event trail. The pilot emits six events; each emit() writes an Event row.
 * Emit points are wired where the route exists (§0.1#8):
 *   - render_created     -> POST /renders
 *   - render_approved    -> POST /operator/renders/:id/approve
 *   - render_viewed      -> GET /renders/:id/items
 *   - cart_confirmed     -> POST /cart/confirm
 *   - checkout_started   -> POST /checkout (before capture)
 *   - purchase_completed -> POST /checkout (after capture)
 */
export const EVENTS = {
  RENDER_CREATED: "render_created",
  RENDER_APPROVED: "render_approved",
  RENDER_VIEWED: "render_viewed",
  CART_CONFIRMED: "cart_confirmed",
  CHECKOUT_STARTED: "checkout_started",
  PURCHASE_COMPLETED: "purchase_completed",
} as const;

export type EventType = (typeof EVENTS)[keyof typeof EVENTS];

export interface EmitInput {
  type: EventType;
  projectId?: string | null;
  metadata?: Record<string, unknown>;
}

/** Write an Event row. Best-effort: emitting must never break the primary flow. */
export async function emit(prisma: PrismaClient, input: EmitInput): Promise<void> {
  await prisma.event.create({
    data: {
      type: input.type,
      projectId: input.projectId ?? null,
      metadata: (input.metadata ?? {}) as object,
    },
  });
}
