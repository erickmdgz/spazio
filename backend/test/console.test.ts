import { afterEach, describe, expect, it } from "vitest";
import type { FastifyInstance } from "fastify";
import { buildTestApp } from "./helpers.js";

/**
 * The console shell (operator/public) is served by the backend from an
 * exact-match allowlist (plan §1.7 — no second backend). Tests read the real
 * files, so a missing or renamed console asset fails CI.
 */
describe("operator console shell", () => {
  let app: FastifyInstance | undefined;

  afterEach(async () => {
    await app?.close();
  });

  it("serves the console page", async () => {
    ({ app } = await buildTestApp());
    const response = await app.inject({ method: "GET", url: "/operator/console" });
    expect(response.statusCode).toBe(200);
    expect(response.headers["content-type"]).toContain("text/html");
    expect(response.body).toContain("Spazio operator console");
  });

  it("serves the console assets with their content types", async () => {
    ({ app } = await buildTestApp());
    const js = await app.inject({ method: "GET", url: "/operator/console/app.js" });
    expect(js.statusCode).toBe(200);
    expect(js.headers["content-type"]).toContain("text/javascript");

    const css = await app.inject({ method: "GET", url: "/operator/console/styles.css" });
    expect(css.statusCode).toBe(200);
    expect(css.headers["content-type"]).toContain("text/css");
  });

  it("does not serve anything outside the allowlist", async () => {
    ({ app } = await buildTestApp());
    for (const url of [
      "/operator/console/secret.txt",
      "/operator/console/../../backend/package.json",
      "/operator/console/%2e%2e/%2e%2e/etc/passwd",
    ]) {
      const response = await app.inject({ method: "GET", url });
      expect(response.statusCode, url).toBe(404);
    }
  });
});
