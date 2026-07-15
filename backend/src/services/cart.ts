import type { PrismaClient } from "@prisma/client";

/**
 * Auto-populate the project's cart from a render (FR-031, BR-31).
 * Called from the render worker on generation success (ADR-025 — the operator
 * approval trigger is retired). Replaces the draft cart's lines with the
 * render's items; a cart the user already confirmed is left untouched.
 */
export async function populateCartFromRender(
  prisma: PrismaClient,
  render: { id: string; projectId: string },
): Promise<void> {
  const renderItems = await prisma.renderItem.findMany({ where: { renderId: render.id } });

  await prisma.$transaction(async (tx) => {
    const cart = await tx.cart.upsert({
      where: { projectId: render.projectId },
      create: { projectId: render.projectId, status: "draft" },
      update: {},
    });
    if (cart.status === "confirmed") return;

    await tx.cartItem.deleteMany({ where: { cartId: cart.id } });
    if (renderItems.length > 0) {
      await tx.cartItem.createMany({
        data: renderItems.map((item) => ({
          cartId: cart.id,
          productId: item.productId,
          priceCopSnapshot: item.priceCopSnapshot,
        })),
      });
    }
  });
}
