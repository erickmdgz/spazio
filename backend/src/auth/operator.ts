import type { FastifyReply, FastifyRequest } from "fastify";

/**
 * Minimal operator auth guard for the pilot: a shared secret sent in a header.
 * This is deliberately simple — it hardens later (real operator accounts / SSO,
 * see ADR-022 note on operator access). NOT suitable beyond the pilot.
 */
export const OPERATOR_HEADER = "x-operator-secret";

export function makeOperatorGuard(expectedSecret: string) {
  return async function operatorGuard(
    request: FastifyRequest,
    reply: FastifyReply,
  ): Promise<void> {
    const provided = request.headers[OPERATOR_HEADER];
    const value = Array.isArray(provided) ? provided[0] : provided;
    if (!value || value !== expectedSecret) {
      await reply.code(401).send({ error: "unauthorized", message: "Operator secret required." });
    }
  };
}
