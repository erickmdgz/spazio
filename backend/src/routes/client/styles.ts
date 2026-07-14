import type { FastifyPluginAsync } from "fastify";

/**
 * GET /styles — the 1–2 predefined visual styles (FR-007, ADR-005; plan §1.4).
 * Client uses the row id when submitting a render; `code` is the stable tag the
 * catalog's styleAttributes reference.
 */
export const styleRoutes: FastifyPluginAsync = async (app) => {
  const { prisma } = app.deps;

  app.get("/styles", async (_request, reply) => {
    const styles = await prisma.style.findMany({
      where: { status: "active" },
      orderBy: { code: "asc" },
    });
    return reply.code(200).send({
      styles: styles.map((style) => ({
        id: style.id,
        code: style.code,
        name: style.name,
        description: style.description,
      })),
    });
  });
};
