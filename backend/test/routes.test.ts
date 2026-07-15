import { afterEach, describe, expect, it } from "vitest";
import type { FastifyInstance, HTTPMethods } from "fastify";
import { buildTestApp } from "./helpers.js";

/** Every pilot route that must be registered (method + url pattern). */
const EXPECTED_ROUTES: Array<{ method: HTTPMethods; url: string }> = [
  { method: "GET", url: "/health" },
  // Client
  { method: "POST", url: "/api/v1/projects" },
  { method: "POST", url: "/api/v1/projects/:id/photos" },
  { method: "PATCH", url: "/api/v1/projects/:id" },
  { method: "GET", url: "/api/v1/styles" },
  { method: "GET", url: "/api/v1/localization/resolve" },
  { method: "POST", url: "/api/v1/renders" },
  { method: "GET", url: "/api/v1/renders/:id" },
  { method: "GET", url: "/api/v1/renders/:id/items" },
  { method: "GET", url: "/api/v1/cart" },
  { method: "PUT", url: "/api/v1/cart/items/:id" },
  { method: "DELETE", url: "/api/v1/cart/items/:id" },
  { method: "POST", url: "/api/v1/cart/confirm" },
  { method: "GET", url: "/api/v1/cart/estimates" },
  { method: "POST", url: "/api/v1/checkout" },
  { method: "GET", url: "/api/v1/orders/:id" },
  // Operator session (plan §1.7 auth)
  { method: "POST", url: "/api/v1/operator/session" },
  { method: "GET", url: "/api/v1/operator/session" },
  { method: "DELETE", url: "/api/v1/operator/session" },
  // Operator console shell (plan §1.7, served by the backend)
  { method: "GET", url: "/operator/console" },
  { method: "GET", url: "/operator/console/app.js" },
  { method: "GET", url: "/operator/console/styles.css" },
  // Operator
  { method: "GET", url: "/api/v1/operator/catalog/products" },
  { method: "POST", url: "/api/v1/operator/catalog/products" },
  { method: "PATCH", url: "/api/v1/operator/catalog/products/:id" },
  { method: "POST", url: "/api/v1/operator/catalog/products/:id/approve" },
  { method: "POST", url: "/api/v1/operator/catalog/products/:id/reject" },
  { method: "GET", url: "/api/v1/operator/orders" },
  { method: "POST", url: "/api/v1/operator/orders/:id/forward" },
];

describe("router registration", () => {
  let app: FastifyInstance | undefined;

  afterEach(async () => {
    await app?.close();
  });

  it("registers every pilot route", async () => {
    ({ app } = await buildTestApp());
    for (const route of EXPECTED_ROUTES) {
      expect(app.hasRoute(route), `${route.method} ${route.url} should be registered`).toBe(true);
    }
  });

  it("does NOT register POST /cart/items (FR-030 deferred, §0.1#2)", async () => {
    ({ app } = await buildTestApp());
    expect(app.hasRoute({ method: "POST", url: "/api/v1/cart/items" })).toBe(false);
  });

  it("does NOT register the operator render-review routes (retired — ADR-025)", async () => {
    ({ app } = await buildTestApp());
    expect(app.hasRoute({ method: "GET", url: "/api/v1/operator/renders" })).toBe(false);
    expect(app.hasRoute({ method: "POST", url: "/api/v1/operator/renders/:id/approve" })).toBe(
      false,
    );
    expect(app.hasRoute({ method: "POST", url: "/api/v1/operator/renders/:id/reject" })).toBe(
      false,
    );
  });
});
