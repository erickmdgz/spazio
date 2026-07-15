import Fastify, { type FastifyInstance, type FastifyError } from "fastify";
import fastifyCookie from "@fastify/cookie";
import type { AppDeps } from "./types.js";
import { healthRoutes } from "./routes/health.js";
import { projectRoutes } from "./routes/client/projects.js";
import { styleRoutes } from "./routes/client/styles.js";
import { localizationRoutes } from "./routes/client/localization.js";
import { renderRoutes } from "./routes/client/renders.js";
import { cartRoutes } from "./routes/client/cart.js";
import { checkoutRoutes } from "./routes/client/checkout.js";
import { operatorCatalogRoutes } from "./routes/operator/catalog.js";
import { operatorOrderRoutes } from "./routes/operator/orders.js";
import { operatorSessionRoutes } from "./routes/operator/session.js";
import { operatorConsoleRoutes } from "./routes/operator/console.js";
import { makeOperatorSessionGuard } from "./auth/operator.js";

// Expose injected dependencies to every handler via the Fastify instance.
declare module "fastify" {
  interface FastifyInstance {
    deps: AppDeps;
  }
}

const API_PREFIX = "/api/v1";

/** Build a fully wired Fastify app. Dependencies are injected (see AppDeps). */
export async function buildApp(deps: AppDeps): Promise<FastifyInstance> {
  const app = Fastify({
    logger: deps.config.NODE_ENV !== "test",
  });

  app.decorate("deps", deps);

  // Centralized error handler.
  app.setErrorHandler((error: FastifyError, request, reply) => {
    request.log.error(error);
    const status = error.statusCode ?? 500;
    void reply.code(status).send({
      error: status >= 500 ? "internal_error" : "request_error",
      message: status >= 500 ? "Internal server error." : error.message,
    });
  });

  // Cookies (operator session, see src/auth/operator.ts). The session token is
  // self-signed with HMAC, so the plugin needs no signing secret of its own.
  await app.register(fastifyCookie);

  // Health (unversioned).
  await app.register(healthRoutes);

  // Operator console shell (static, unversioned — plan §1.7).
  await app.register(operatorConsoleRoutes);

  // Client API (public in the pilot — no end-user accounts, ADR-022).
  await app.register(
    async (client) => {
      await client.register(projectRoutes);
      await client.register(styleRoutes);
      await client.register(localizationRoutes);
      await client.register(renderRoutes);
      await client.register(cartRoutes);
      await client.register(checkoutRoutes);
    },
    { prefix: API_PREFIX },
  );

  // Operator session endpoints (login/whoami/logout) — outside the guard.
  await app.register(operatorSessionRoutes, { prefix: `${API_PREFIX}/operator` });

  // Operator API (internal, behind the session guard — plan §1.7).
  const operatorGuard = makeOperatorSessionGuard(deps.config.OPERATOR_SESSION_SECRET);
  await app.register(
    async (operator) => {
      operator.addHook("preHandler", operatorGuard);
      await operator.register(operatorCatalogRoutes);
      await operator.register(operatorOrderRoutes);
    },
    { prefix: `${API_PREFIX}/operator` },
  );

  return app;
}
