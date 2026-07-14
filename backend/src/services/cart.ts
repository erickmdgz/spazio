import type { PrismaClient } from "@prisma/client";

/**
 * Auto-populate the project's cart from an approved render (FR-031, BR-31).
 * Called from the operator approval action (plan §1.5 step 7): the cart never
 * materializes from an unapproved render. Replaces the draft cart's lines with
 * the render's items; a cart the user already confirmed is left untouched.
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
