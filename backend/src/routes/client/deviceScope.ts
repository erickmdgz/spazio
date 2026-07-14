import type { FastifyReply, FastifyRequest } from "fastify";
import type { PrismaClient } from "@prisma/client";

/**
 * Anonymous device scoping (NFR-007; plan §1.1/§1.8): a project's photos,
 * renders, cart and orders are visible only to the device token that created
 * the project. Not a login (ADR-022) — an opaque per-install token the client
 * sends as a header. Ownership misses answer 404 so resource existence is not
 * leaked to other devices.
 */
export const DEVICE_TOKEN_HEADER = "x-device-token";

export function deviceTokenFrom(request: FastifyRequest): string | null {
  const value = request.headers[DEVICE_TOKEN_HEADER];
  const token = Array.isArray(value) ? value[0] : value;
  return token && token.length > 0 ? token : null;
}

/** Returns the token, or replies 401 and returns null when the header is missing. */
export async function requireDeviceToken(
  request: FastifyRequest,
  reply: FastifyReply,
): Promise<string | null> {
  const token = deviceTokenFrom(request);
  if (!token) {
    await reply
      .code(401)
      .send({ error: "unauthorized", message: `${DEVICE_TOKEN_HEADER} header required.` });
    return null;
  }
  return token;
}

/** True when the project exists AND belongs to this device. */
export async function projectOwnedByDevice(
  prisma: PrismaClient,
  projectId: string,
  deviceToken: string,
): Promise<boolean> {
  const project = await prisma.project.findFirst({
    where: { id: projectId, deviceToken },
    select: { id: true },
  });
  return project !== null;
}
