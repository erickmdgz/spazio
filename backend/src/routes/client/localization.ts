import type { FastifyPluginAsync } from "fastify";
import { PILOT } from "../../config.js";

/**
 * GET /localization/resolve — fixed to Bogota / COP in the pilot (§0.1#6,
 * FR-012/013/020). A single market and delivery zone, so the response is constant.
 */
export const localizationRoutes: FastifyPluginAsync = async (app) => {
  app.get(
    "/localization/resolve",
    {
      schema: {
        response: {
          200: {
            type: "object",
            properties: {
              market: { type: "string" },
              countryCode: { type: "string" },
              currency: { type: "string" },
              deliveryZone: { type: "string" },
              deliveryAvailable: { type: "boolean" },
            },
            required: ["market", "countryCode", "currency", "deliveryZone", "deliveryAvailable"],
          },
        },
      },
    },
    async () => ({
      market: PILOT.MARKET_NAME,
      countryCode: PILOT.COUNTRY_CODE,
      currency: PILOT.CURRENCY,
      deliveryZone: PILOT.MARKET_NAME,
      deliveryAvailable: true,
    }),
  );
};
