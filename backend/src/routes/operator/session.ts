import type { FastifyPluginAsync } from "fastify";
import { DUMMY_PASSWORD_HASH, verifyPassword } from "../../auth/passwords.js";
import {
  OPERATOR_SESSION_COOKIE,
  SESSION_TTL_SECONDS,
  issueSessionToken,
  verifySessionToken,
} from "../../auth/operator.js";

interface LoginBody {
  email: string;
  password: string;
}

/**
 * Operator session endpoints (plan §1.7 auth). Registered under /api/v1/operator
 * OUTSIDE the session guard — login must be reachable unauthenticated.
 *  - POST   /session  email + password -> session cookie
 *  - GET    /session  whoami for the console shell
 *  - DELETE /session  logout (clears the cookie)
 */
export const operatorSessionRoutes: FastifyPluginAsync = async (app) => {
  const { prisma, config } = app.deps;

  const cookieOptions = {
    path: "/",
    httpOnly: true,
    sameSite: "strict",
    secure: config.NODE_ENV === "production",
    maxAge: SESSION_TTL_SECONDS,
  } as const;

  app.post<{ Body: LoginBody }>(
    "/session",
    {
      schema: {
        body: {
          type: "object",
          required: ["email", "password"],
          properties: {
            email: { type: "string", minLength: 1 },
            password: { type: "string", minLength: 1 },
          },
        },
      },
    },
    async (request, reply) => {
      const operator = await prisma.operator.findUnique({
        where: { email: request.body.email },
      });
      // Always run one hash verification so unknown emails cost the same time.
      const passwordOk = await verifyPassword(
        request.body.password,
        operator?.passwordHash ?? DUMMY_PASSWORD_HASH,
      );
      if (!operator || !passwordOk || operator.status !== "active") {
        return reply.code(401).send({ error: "unauthorized", message: "Invalid credentials." });
      }

      const session = {
        operatorId: operator.id,
        name: operator.name,
        role: operator.role,
        exp: Math.floor(Date.now() / 1000) + SESSION_TTL_SECONDS,
      };
      const token = issueSessionToken(session, config.OPERATOR_SESSION_SECRET);
      return reply
        .setCookie(OPERATOR_SESSION_COOKIE, token, cookieOptions)
        .code(200)
        .send({
          operator: {
            id: operator.id,
            name: operator.name,
            email: operator.email,
            role: operator.role,
          },
        });
    },
  );

  app.get("/session", async (request, reply) => {
    const token = request.cookies[OPERATOR_SESSION_COOKIE];
    const session = token ? verifySessionToken(token, config.OPERATOR_SESSION_SECRET) : null;
    if (!session) {
      return reply.code(401).send({ error: "unauthorized", message: "Operator sign-in required." });
    }
    return reply.code(200).send({
      operator: { id: session.operatorId, name: session.name, role: session.role },
    });
  });

  app.delete("/session", async (_request, reply) => {
    return reply.clearCookie(OPERATOR_SESSION_COOKIE, { path: "/" }).code(204).send();
  });
};
