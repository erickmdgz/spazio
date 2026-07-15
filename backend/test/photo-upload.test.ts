import { afterEach, describe, expect, it, vi } from "vitest";
import type { FastifyInstance } from "fastify";
import { buildTestApp } from "./helpers.js";
import type { ObjectStorage } from "../src/services/storage.js";

/**
 * FEAT-002 — real photo IN / real render OUT (hermetic; storage + prisma mocked).
 *
 *  TC-120  uploading image bytes stores them in object storage and creates a
 *          RoomPhoto with that key (FR-005).
 *  TC-121  a foreign device token is 404 on upload (NFR-007).
 *  TC-122  GET /renders/:id/image returns the stored bytes with an image
 *          content-type for the owning device (FR-015).
 *  TC-123  a foreign device is 404 on the render image (NFR-007).
 *  TC-124  GET render image for a render with no imageKey yet is 404 (still
 *          generating) so the client keeps polling (FR-015).
 *  + a non-image or empty upload body is 400 (FR-005).
 */

/** A spyable in-memory ObjectStorage faithful to LocalDiskStorage (get throws on miss). */
function makeStorage(seed: Map<string, Buffer> = new Map()): ObjectStorage {
  return {
    put: vi.fn(async (key: string, data: Buffer) => {
      seed.set(key, data);
      return key;
    }),
    get: vi.fn(async (key: string) => {
      const value = seed.get(key);
      if (value === undefined) throw new Error(`storage: no such key ${key}`);
      return value;
    }),
    delete: vi.fn(async () => undefined),
    getSignedUrl: vi.fn(async (key: string) => `local://${key}`),
  };
}

/** project.findFirst faithful to projectOwnedByDevice — only `owner` owns `id`. */
function ownedProject(owner: string) {
  return vi.fn(
    async ({ where }: { where: { id: string; deviceToken: string } }) =>
      where.deviceToken === owner ? { id: where.id } : null,
  );
}

const PNG_BYTES = Buffer.from("\x89PNG\r\n\x1a\nFAKE_ROOM_PHOTO_BYTES", "binary");

describe("POST /projects/:id/photos — raw image upload (FR-005)", () => {
  let app: FastifyInstance | undefined;
  afterEach(async () => {
    await app?.close();
  });

  it("TC-120: stores the uploaded bytes and creates a RoomPhoto with that key", async () => {
    const storage = makeStorage();
    const create = vi.fn().mockResolvedValue({ id: "photo_1", qualityStatus: "pending" });
    ({ app } = await buildTestApp(
      { project: { findFirst: ownedProject("device-A") }, roomPhoto: { create } },
      { storage },
    ));

    const res = await app.inject({
      method: "POST",
      url: "/api/v1/projects/prj_1/photos",
      headers: { "content-type": "image/png", "x-device-token": "device-A" },
      payload: PNG_BYTES,
    });

    expect(res.statusCode).toBe(201);
    const body = res.json();
    expect(body.id).toBe("photo_1");
    expect(body.storageKey).toMatch(/^rooms\/prj_1\/[0-9a-f-]+\.png$/);

    // Bytes were written to object storage under the returned key.
    expect(storage.put).toHaveBeenCalledTimes(1);
    const [putKey, putData] = (storage.put as unknown as { mock: { calls: unknown[][] } }).mock
      .calls[0]!;
    expect(putKey).toBe(body.storageKey);
    expect(Buffer.compare(putData as Buffer, PNG_BYTES)).toBe(0);

    // RoomPhoto row points at that same key with quality=pending.
    expect(create).toHaveBeenCalledWith({
      data: {
        projectId: "prj_1",
        storageKey: body.storageKey,
        widthCm: null,
        heightCm: null,
        qualityStatus: "pending",
      },
    });
  });

  it("TC-121: a foreign device token is 404 on upload (NFR-007)", async () => {
    const storage = makeStorage();
    const create = vi.fn();
    ({ app } = await buildTestApp(
      { project: { findFirst: ownedProject("device-A") }, roomPhoto: { create } },
      { storage },
    ));

    const res = await app.inject({
      method: "POST",
      url: "/api/v1/projects/prj_1/photos",
      headers: { "content-type": "image/png", "x-device-token": "device-B" },
      payload: PNG_BYTES,
    });

    expect(res.statusCode).toBe(404);
    expect(create).not.toHaveBeenCalled();
    expect(storage.put).not.toHaveBeenCalled();
  });

  it("rejects a non-image (JSON) body with 400", async () => {
    const storage = makeStorage();
    const create = vi.fn();
    ({ app } = await buildTestApp(
      { project: { findFirst: ownedProject("device-A") }, roomPhoto: { create } },
      { storage },
    ));

    const res = await app.inject({
      method: "POST",
      url: "/api/v1/projects/prj_1/photos",
      headers: { "x-device-token": "device-A" },
      payload: { storageKey: "not-allowed-anymore" },
    });

    expect(res.statusCode).toBe(400);
    expect(create).not.toHaveBeenCalled();
    expect(storage.put).not.toHaveBeenCalled();
  });

  it("rejects an empty image body with 400", async () => {
    const storage = makeStorage();
    const create = vi.fn();
    ({ app } = await buildTestApp(
      { project: { findFirst: ownedProject("device-A") }, roomPhoto: { create } },
      { storage },
    ));

    const res = await app.inject({
      method: "POST",
      url: "/api/v1/projects/prj_1/photos",
      headers: { "content-type": "image/png", "x-device-token": "device-A" },
      payload: Buffer.alloc(0),
    });

    expect(res.statusCode).toBe(400);
    expect(create).not.toHaveBeenCalled();
    expect(storage.put).not.toHaveBeenCalled();
  });
});

describe("GET /renders/:id/image — serve stored render bytes (FR-015)", () => {
  let app: FastifyInstance | undefined;
  afterEach(async () => {
    await app?.close();
  });

  const RENDER_KEY = "renders/r1/composite.png";
  const RENDER_BYTES = Buffer.from("\x89PNG\r\n\x1a\nFAKE_COMPOSITE_BYTES", "binary");

  it("TC-122: returns the stored bytes with an image content-type for the owning device", async () => {
    const storage = makeStorage(new Map([[RENDER_KEY, RENDER_BYTES]]));
    ({ app } = await buildTestApp(
      {
        render: {
          findUnique: vi.fn().mockResolvedValue({
            imageKey: RENDER_KEY,
            project: { deviceToken: "device-A" },
          }),
        },
      },
      { storage },
    ));

    const res = await app.inject({
      method: "GET",
      url: "/api/v1/renders/r1/image",
      headers: { "x-device-token": "device-A" },
    });

    expect(res.statusCode).toBe(200);
    expect(res.headers["content-type"]).toMatch(/^image\/png/);
    expect(Buffer.compare(res.rawPayload, RENDER_BYTES)).toBe(0);
    expect(storage.get).toHaveBeenCalledWith(RENDER_KEY);
  });

  it("TC-123: a foreign device is 404 on the render image (NFR-007)", async () => {
    const storage = makeStorage(new Map([[RENDER_KEY, RENDER_BYTES]]));
    ({ app } = await buildTestApp(
      {
        render: {
          findUnique: vi.fn().mockResolvedValue({
            imageKey: RENDER_KEY,
            project: { deviceToken: "device-A" },
          }),
        },
      },
      { storage },
    ));

    const res = await app.inject({
      method: "GET",
      url: "/api/v1/renders/r1/image",
      headers: { "x-device-token": "device-B" },
    });

    expect(res.statusCode).toBe(404);
    expect(storage.get).not.toHaveBeenCalled();
  });

  it("TC-124: a render with no imageKey yet is 404 so the client keeps polling", async () => {
    const storage = makeStorage();
    ({ app } = await buildTestApp(
      {
        render: {
          findUnique: vi.fn().mockResolvedValue({
            imageKey: null,
            project: { deviceToken: "device-A" },
          }),
        },
      },
      { storage },
    ));

    const res = await app.inject({
      method: "GET",
      url: "/api/v1/renders/r1/image",
      headers: { "x-device-token": "device-A" },
    });

    expect(res.statusCode).toBe(404);
    expect(storage.get).not.toHaveBeenCalled();
  });
});
