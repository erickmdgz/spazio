import { randomUUID } from "node:crypto";
import type { FastifyPluginAsync } from "fastify";
import { projectOwnedByDevice, requireDeviceToken } from "./deviceScope.js";

interface CreateProjectBody {
  deviceToken: string;
}

interface PatchProjectBody {
  roomWidthCm?: number;
  roomLengthCm?: number;
  roomHeightCm?: number;
  styleId?: string;
  freeText?: string;
  budgetMinCop?: number;
  budgetMaxCop?: number;
}

// Room photos are uploaded as RAW IMAGE BYTES (FR-005 as-built). The accepted
// image content-types map to a stored file extension; anything else is 400.
const PHOTO_CONTENT_TYPES: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};
// Route-level cap for a room photo upload (~20 MB). The global bodyLimit is left
// untouched — only this route raises it (FR-005). Oversized bodies -> 413.
const PHOTO_BODY_LIMIT = 20 * 1024 * 1024;

/** Normalize a Content-Type header to its bare media type (drops any ;charset). */
function mediaTypeOf(request: { headers: Record<string, unknown> }): string {
  const raw = request.headers["content-type"];
  const value = Array.isArray(raw) ? raw[0] : raw;
  return typeof value === "string" ? value.split(";")[0]!.trim().toLowerCase() : "";
}

/**
 * Project lifecycle routes.
 *  - POST   /projects            bootstrap a project at first input (§0.1#3, FR-005 entry)
 *  - POST   /projects/:id/photos attach a room photo — raw image bytes (FR-005)
 *  - PATCH  /projects/:id        set dimensions (FR-011) + style/budget (FR-007/008/009)
 */
export const projectRoutes: FastifyPluginAsync = async (app) => {
  const { prisma, storage } = app.deps;

  // Parse raw image uploads into a Buffer (FR-005). Scoped to this plugin's
  // encapsulation, so the JSON parser still serves the other project routes.
  // No new dependency — Fastify's built-in buffer parser (NOT @fastify/multipart).
  app.addContentTypeParser(
    Object.keys(PHOTO_CONTENT_TYPES),
    { parseAs: "buffer" },
    (_request, body, done) => done(null, body),
  );

  // Bootstrap a project (FUNCTIONAL — §0.1#3).
  app.post<{ Body: CreateProjectBody }>(
    "/projects",
    {
      schema: {
        body: {
          type: "object",
          required: ["deviceToken"],
          properties: { deviceToken: { type: "string", minLength: 1 } },
        },
      },
    },
    async (request, reply) => {
      const project = await prisma.project.create({
        data: { deviceToken: request.body.deviceToken, status: "draft" },
      });
      return reply.code(201).send({
        id: project.id,
        deviceToken: project.deviceToken,
        status: project.status,
        createdAt: project.createdAt,
      });
    },
  );

  // Attach a room photo (FR-005). Ingests the RAW IMAGE BYTES: the request body
  // is the file itself (image/jpeg|png|webp), not JSON. The bytes are stored in
  // object storage and a RoomPhoto row is created pointing at that key. Room
  // dimensions stay on PATCH /projects/:id, not in this body.
  app.post<{ Params: { id: string }; Body: Buffer }>(
    "/projects/:id/photos",
    {
      bodyLimit: PHOTO_BODY_LIMIT,
      schema: {
        params: { type: "object", required: ["id"], properties: { id: { type: "string" } } },
      },
    },
    async (request, reply) => {
      // Device scoping first (NFR-007): a foreign/unknown device or an unowned
      // project answers 404 — no existence leak — before we look at the body.
      const token = await requireDeviceToken(request, reply);
      if (!token) return;
      if (!(await projectOwnedByDevice(prisma, request.params.id, token))) {
        return reply.code(404).send({ error: "not_found", message: "Project not found." });
      }

      // Only real image uploads are accepted (a JSON/other content-type body is
      // parsed by the inherited parser and is not a Buffer -> 400).
      const ext = PHOTO_CONTENT_TYPES[mediaTypeOf(request)];
      if (!ext) {
        return reply
          .code(400)
          .send({ error: "bad_request", message: "Body must be an image (jpeg, png or webp)." });
      }
      const bytes = request.body;
      if (!Buffer.isBuffer(bytes) || bytes.length === 0) {
        return reply.code(400).send({ error: "bad_request", message: "Empty image body." });
      }

      const storageKey = `rooms/${request.params.id}/${randomUUID()}.${ext}`;
      await storage.put(storageKey, bytes, mediaTypeOf(request));
      const photo = await prisma.roomPhoto.create({
        data: {
          projectId: request.params.id,
          storageKey,
          widthCm: null,
          heightCm: null,
          qualityStatus: "pending",
        },
      });
      return reply.code(201).send({ id: photo.id, storageKey });
    },
  );

  // Update project inputs (FR-011 dimensions + FR-007/008/009 style/budget).
  app.patch<{ Params: { id: string }; Body: PatchProjectBody }>(
    "/projects/:id",
    {
      schema: {
        params: { type: "object", required: ["id"], properties: { id: { type: "string" } } },
        body: {
          type: "object",
          additionalProperties: false,
          properties: {
            roomWidthCm: { type: "integer" },
            roomLengthCm: { type: "integer" },
            roomHeightCm: { type: "integer" },
            styleId: { type: "string" },
            freeText: { type: "string" },
            budgetMinCop: { type: "integer" },
            budgetMaxCop: { type: "integer" },
          },
        },
      },
    },
    async (request, reply) => {
      const token = await requireDeviceToken(request, reply);
      if (!token) return;
      if (!(await projectOwnedByDevice(prisma, request.params.id, token))) {
        return reply.code(404).send({ error: "not_found", message: "Project not found." });
      }
      const project = await prisma.project.update({
        where: { id: request.params.id },
        data: { ...request.body },
      });
      return reply.code(200).send({ id: project.id, status: project.status });
    },
  );
};
