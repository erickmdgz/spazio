import { createHmac, timingSafeEqual } from "node:crypto";
import type { FastifyReply, FastifyRequest } from "fastify";
import type { OperatorRole } from "@prisma/client";

/**
 * Operator console sessions (plan §1.7 — the pilot's only authenticated surface).
 * Operators sign in with email + password (hashed, see passwords.ts) and receive a
 * stateless HMAC-signed session cookie; every /api/v1/operator route (except the
 * session endpoints themselves) requires a valid session. This replaces the
 * interim shared-secret header from the PR #21 scaffold.
 *
 * The token is payload.signature, both base64url: HMAC-SHA256 over the payload
 * with OPERATOR_SESSION_SECRET (plan §1.8 "operator session-signing key"). It is
 * deliberately stateless — no session table; revocation before expiry means
 * rotating the signing key, which is acceptable for the pilot's 2-3 operators.
 */

export const OPERATOR_SESSION_COOKIE = "spazio_operator_session";
export const SESSION_TTL_SECONDS = 12 * 60 * 60; // one operator shift

export interface OperatorSession {
  operatorId: string;
  name: string;
  role: OperatorRole | null;
  exp: number; // unix seconds
}

function sign(payload: string, secret: string): string {
  return createHmac("sha256", secret).update(payload).digest("base64url");
}

export function issueSessionToken(session: OperatorSession, secret: string): string {
  const payload = Buffer.from(JSON.stringify(session), "utf8").toString("base64url");
  return `${payload}.${sign(payload, secret)}`;
}

export function verifySessionToken(
  token: string,
  secret: string,
  nowSeconds: number = Math.floor(Date.now() / 1000),
): OperatorSession | null {
  const [payload, signature] = token.split(".");
  if (!payload || !signature) return null;
  const provided = Buffer.from(signature, "utf8");
  const expected = Buffer.from(sign(payload, secret), "utf8");
  if (provided.length !== expected.length || !timingSafeEqual(provided, expected)) return null;
  try {
    const session = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as OperatorSession;
    if (typeof session.operatorId !== "string" || typeof session.exp !== "number") return null;
    if (session.exp <= nowSeconds) return null;
    return session;
  } catch {
    return null;
  }
}

declare module "fastify" {
  interface FastifyRequest {
    /** Set by the operator session guard on authenticated operator routes. */
    operator?: OperatorSession;
  }
}

export function makeOperatorSessionGuard(secret: string) {
  return async function operatorSessionGuard(
    request: FastifyRequest,
    reply: FastifyReply,
  ): Promise<void> {
    const token = request.cookies[OPERATOR_SESSION_COOKIE];
    const session = token ? verifySessionToken(token, secret) : null;
    if (!session) {
      await reply.code(401).send({ error: "unauthorized", message: "Operator sign-in required." });
      return;
    }
    request.operator = session;
  };
}
