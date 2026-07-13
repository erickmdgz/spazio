import { afterEach, describe, expect, it, vi } from "vitest";
import type { FastifyInstance } from "fastify";
import { buildTestApp } from "./helpers.js";

describe("POST /projects", () => {
  let app: FastifyInstance | undefined;

  afterEach(async () => {
    await app?.close();
  });

  it("bootstraps a Project (§0.1#3)", async () => {
    const create = vi.fn().mockResolvedValue({
      id: "prj_1",
      deviceToken: "dev-token-abc",
      status: "draft",
      createdAt: new Date("2026-07-10T00:00:00Z"),
    });

    ({ app } = await buildTestApp({ project: { create } }));

    const res = await app.inject({
      method: "POST",
      url: "/api/v1/projects",
      payload: { deviceToken: "dev-token-abc" },
    });

    expect(res.statusCode).toBe(201);
    expect(create).toHaveBeenCalledTimes(1);
    expect(create).toHaveBeenCalledWith({
      data: { deviceToken: "dev-token-abc", status: "draft" },
    });
    const body = res.json();
    expect(body.id).toBe("prj_1");
    expect(body.status).toBe("draft");
  });

  it("rejects a missing deviceToken", async () => {
    ({ app } = await buildTestApp({ project: { create: vi.fn() } }));
    const res = await app.inject({ method: "POST", url: "/api/v1/projects", payload: {} });
    expect(res.statusCode).toBe(400);
  });
});
