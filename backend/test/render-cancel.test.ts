import { afterEach, describe, expect, it, vi } from "vitest";
import type { FastifyInstance } from "fastify";
import { buildTestApp } from "./helpers.js";
import { register, unregister } from "../src/services/render/registry.js";

/**
 * TC-137 (BUG-002 / NFR-004 graceful degradation / NFR-007 device scoping):
 * POST /renders/:id/cancel stops an in-flight render.
 *
 *  - The owning device: SIGKILLs any registered in-flight child (via the render
 *    registry) and marks a still-running RenderRequest `failed`; responds 200.
 *  - A foreign/unknown device or unknown render: 404 (no existence leak), nothing
 *    killed, nothing updated.
 *  - Cancelling an already-terminal render is idempotent: 200 with no status write.
 *
 * The route + prisma are exercised through the injected mock (no DB, no live
 * render). The registry is the real module singleton — cancel() must reach a
 * registered kill callback.
 */
describe("POST /renders/:id/cancel (TC-137)", () => {
  let app: FastifyInstance | undefined;

  afterEach(async () => {
    await app?.close();
    // Leave no kill callbacks behind between cases (real singleton registry).
    unregister("r1");
  });

  it("owning device: kills the in-flight child and marks the render failed", async () => {
    const kill = vi.fn();
    register("r1", kill);
    const update = vi.fn().mockResolvedValue({ id: "rr1", status: "failed" });
    ({ app } = await buildTestApp({
      render: {
        findUnique: vi.fn().mockResolvedValue({
          renderRequestId: "rr1",
          project: { deviceToken: "device-A" },
          renderRequest: { status: "processing" },
        }),
      },
      renderRequest: { update },
    }));

    const response = await app.inject({
      method: "POST",
      url: "/api/v1/renders/r1/cancel",
      headers: { "x-device-token": "device-A" },
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({ status: "failed" });
    // The live child was SIGKILLed via the registry.
    expect(kill).toHaveBeenCalledTimes(1);
    // A still-processing request is flipped to failed.
    expect(update).toHaveBeenCalledWith({ where: { id: "rr1" }, data: { status: "failed" } });
  });

  it("foreign device: 404, no kill, no status write (NFR-007)", async () => {
    const kill = vi.fn();
    register("r1", kill);
    const update = vi.fn();
    ({ app } = await buildTestApp({
      render: {
        findUnique: vi.fn().mockResolvedValue({
          renderRequestId: "rr1",
          project: { deviceToken: "device-A" },
          renderRequest: { status: "processing" },
        }),
      },
      renderRequest: { update },
    }));

    const response = await app.inject({
      method: "POST",
      url: "/api/v1/renders/r1/cancel",
      headers: { "x-device-token": "device-B" },
    });

    expect(response.statusCode).toBe(404);
    expect(kill).not.toHaveBeenCalled();
    expect(update).not.toHaveBeenCalled();
  });

  it("unknown render: 404 (no existence leak)", async () => {
    const update = vi.fn();
    ({ app } = await buildTestApp({
      render: { findUnique: vi.fn().mockResolvedValue(null) },
      renderRequest: { update },
    }));

    const response = await app.inject({
      method: "POST",
      url: "/api/v1/renders/does-not-exist/cancel",
      headers: { "x-device-token": "device-A" },
    });

    expect(response.statusCode).toBe(404);
    expect(update).not.toHaveBeenCalled();
  });

  it("no device token: 401", async () => {
    ({ app } = await buildTestApp());
    const response = await app.inject({ method: "POST", url: "/api/v1/renders/r1/cancel" });
    expect(response.statusCode).toBe(401);
  });

  it("already-terminal render: idempotent 200 with no status write", async () => {
    const update = vi.fn();
    ({ app } = await buildTestApp({
      render: {
        findUnique: vi.fn().mockResolvedValue({
          renderRequestId: "rr1",
          project: { deviceToken: "device-A" },
          renderRequest: { status: "completed" },
        }),
      },
      renderRequest: { update },
    }));

    const response = await app.inject({
      method: "POST",
      url: "/api/v1/renders/r1/cancel",
      headers: { "x-device-token": "device-A" },
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({ status: "failed" });
    // Terminal request is left untouched (no redundant write).
    expect(update).not.toHaveBeenCalled();
  });
});
