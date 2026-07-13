import type { FastifyPluginAsync } from "fastify";

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

interface CreatePhotoBody {
  storageKey: string;
  widthCm?: number;
  heightCm?: number;
}

/**
 * Project lifecycle routes.
 *  - POST   /projects            bootstrap a project at first input (§0.1#3, FR-005 entry)
 *  - POST   /projects/:id/photos attach a room photo (FR-005)
 *  - PATCH  /projects/:id        set dimensions (FR-011) + style/budget (FR-007/008/009)
 */
export const projectRoutes: FastifyPluginAsync = async (app) => {
  const { prisma } = app.deps;

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

  // Attach a room photo (FR-005). Scaffold: persists the storage key + quality=pending.
  app.post<{ Params: { id: string }; Body: CreatePhotoBody }>(
    "/projects/:id/photos",
    {
      schema: {
        params: { type: "object", required: ["id"], properties: { id: { type: "string" } } },
        body: {
          type: "object",
          required: ["storageKey"],
          properties: {
            storageKey: { type: "string", minLength: 1 },
            widthCm: { type: "integer" },
            heightCm: { type: "integer" },
          },
        },
      },
    },
    async (request, reply) => {
      const photo = await prisma.roomPhoto.create({
        data: {
          projectId: request.params.id,
          storageKey: request.body.storageKey,
          widthCm: request.body.widthCm ?? null,
          heightCm: request.body.heightCm ?? null,
          qualityStatus: "pending",
        },
      });
      return reply.code(201).send({ id: photo.id, qualityStatus: photo.qualityStatus });
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
      const project = await prisma.project.update({
        where: { id: request.params.id },
        data: { ...request.body },
      });
      return reply.code(200).send({ id: project.id, status: project.status });
    },
  );
};
