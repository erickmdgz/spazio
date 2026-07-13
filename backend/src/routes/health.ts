import type { FastifyPluginAsync } from "fastify";

/** GET /health — liveness probe. */
export const healthRoutes: FastifyPluginAsync = async (app) => {
  app.get(
    "/health",
    {
      schema: {
        response: {
          200: {
            type: "object",
            properties: {
              status: { type: "string" },
              service: { type: "string" },
            },
            required: ["status", "service"],
          },
        },
      },
    },
    async () => ({ status: "ok", service: "spazio-backend" }),
  );
};
