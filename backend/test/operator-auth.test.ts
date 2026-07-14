import { afterEach, describe, expect, it, vi } from "vitest";
import type { FastifyInstance } from "fastify";
import { buildTestApp, operatorSessionCookie, testConfig } from "./helpers.js";
import { hashPassword, verifyPassword, DUMMY_PASSWORD_HASH } from "../src/auth/passwords.js";
import {
  OPERATOR_SESSION_COOKIE,
  issueSessionToken,
  verifySessionToken,
} from "../src/auth/operator.js";

const SECRET = testConfig().OPERATOR_SESSION_SECRET;

describe("password hashing (scrypt)", () => {
  it("verifies a hashed password and rejects a wrong one", async () => {
    const stored = await hashPassword("correct horse battery");
    expect(stored.startsWith("scrypt:")).toBe(true);
    expect(await verifyPassword("correct horse battery", stored)).toBe(true);
    expect(await verifyPassword("wrong password", stored)).toBe(false);
  });

  it("rejects malformed stored hashes instead of throwing", async () => {
    expect(await verifyPassword("x", "not-a-hash")).toBe(false);
    expect(await verifyPassword("x", "scrypt::")).toBe(false);
    expect(await verifyPassword("x", DUMMY_PASSWORD_HASH)).toBe(false);
  });
});

describe("session tokens", () => {
  const session = {
    operatorId: "op_1",
    name: "Ana",
    role: null,
    exp: Math.floor(Date.now() / 1000) + 60,
  };

  it("round-trips a valid token", () => {
    const token = issueSessionToken(session, SECRET);
    expect(verifySessionToken(token, SECRET)).toMatchObject({ operatorId: "op_1" });
  });

  it("rejects a tampered payload", () => {
    const token = issueSessionToken(session, SECRET);
    const [, signature] = token.split(".");
    const forged =
      Buffer.from(JSON.stringify({ ...session, operatorId: "op_evil" })).toString("base64url") +
      "." +
      signature;
    expect(verifySessionToken(forged, SECRET)).toBeNull();
  });

  it("rejects a token signed with a different secret", () => {
    const token = issueSessionToken(session, "another-secret-0123456789");
    expect(verifySessionToken(token, SECRET)).toBeNull();
  });

  it("rejects an expired token", () => {
    const token = issueSessionToken({ ...session, exp: session.exp - 120 }, SECRET);
    expect(verifySessionToken(token, SECRET)).toBeNull();
  });

  it("rejects garbage", () => {
    expect(verifySessionToken("garbage", SECRET)).toBeNull();
    expect(verifySessionToken("a.b", SECRET)).toBeNull();
  });
});

describe("operator session endpoints", () => {
  let app: FastifyInstance | undefined;

  afterEach(async () => {
    await app?.close();
  });

  async function appWithOperator(overrides: Partial<Record<string, unknown>> = {}) {
    const passwordHash = await hashPassword("pilot-password-1");
    const operatorRow = {
      id: "op_1",
      name: "Ana",
      email: "ana@spazio.example",
      passwordHash,
      role: "render_reviewer",
      status: "active",
      createdAt: new Date(),
      ...overrides,
    };
    const findUnique = vi.fn(async ({ where }: { where: { email: string } }) =>
      where.email === operatorRow.email ? operatorRow : null,
    );
    const built = await buildTestApp({ operator: { findUnique } });
    app = built.app;
    return { findUnique };
  }

  it("logs in with valid credentials and sets an httpOnly session cookie", async () => {
    await appWithOperator();
    const response = await app!.inject({
      method: "POST",
      url: "/api/v1/operator/session",
      payload: { email: "ana@spazio.example", password: "pilot-password-1" },
    });
    expect(response.statusCode).toBe(200);
    expect(response.json().operator).toMatchObject({ email: "ana@spazio.example" });
    const cookie = response.headers["set-cookie"] as string;
    expect(cookie).toContain(`${OPERATOR_SESSION_COOKIE}=`);
    expect(cookie).toContain("HttpOnly");
    expect(cookie).toContain("SameSite=Strict");
  });

  it("rejects a wrong password with 401", async () => {
    await appWithOperator();
    const response = await app!.inject({
      method: "POST",
      url: "/api/v1/operator/session",
      payload: { email: "ana@spazio.example", password: "wrong" },
    });
    expect(response.statusCode).toBe(401);
    expect(response.headers["set-cookie"]).toBeUndefined();
  });

  it("rejects an unknown email with 401 (same shape as wrong password)", async () => {
    await appWithOperator();
    const response = await app!.inject({
      method: "POST",
      url: "/api/v1/operator/session",
      payload: { email: "nobody@spazio.example", password: "pilot-password-1" },
    });
    expect(response.statusCode).toBe(401);
  });

  it("rejects an inactive operator with 401", async () => {
    await appWithOperator({ status: "inactive" });
    const response = await app!.inject({
      method: "POST",
      url: "/api/v1/operator/session",
      payload: { email: "ana@spazio.example", password: "pilot-password-1" },
    });
    expect(response.statusCode).toBe(401);
  });

  it("whoami returns the session operator and 401 without a session", async () => {
    await appWithOperator();
    const withCookie = await app!.inject({
      method: "GET",
      url: "/api/v1/operator/session",
      headers: { cookie: operatorSessionCookie({ name: "Ana" }) },
    });
    expect(withCookie.statusCode).toBe(200);
    expect(withCookie.json().operator).toMatchObject({ name: "Ana" });

    const withoutCookie = await app!.inject({ method: "GET", url: "/api/v1/operator/session" });
    expect(withoutCookie.statusCode).toBe(401);
  });

  it("logout clears the session cookie", async () => {
    await appWithOperator();
    const response = await app!.inject({ method: "DELETE", url: "/api/v1/operator/session" });
    expect(response.statusCode).toBe(204);
    expect(response.headers["set-cookie"]).toContain(`${OPERATOR_SESSION_COOKIE}=;`);
  });
});

describe("operator session guard", () => {
  let app: FastifyInstance | undefined;

  afterEach(async () => {
    await app?.close();
  });

  it("rejects operator API calls without a session", async () => {
    ({ app } = await buildTestApp());
    const response = await app.inject({ method: "GET", url: "/api/v1/operator/renders" });
    expect(response.statusCode).toBe(401);
  });

  it("rejects a tampered session cookie", async () => {
    ({ app } = await buildTestApp());
    const response = await app.inject({
      method: "GET",
      url: "/api/v1/operator/renders",
      headers: { cookie: `${OPERATOR_SESSION_COOKIE}=forged.token` },
    });
    expect(response.statusCode).toBe(401);
  });

  it("accepts a valid session and lets the queue read through", async () => {
    const findMany = vi.fn().mockResolvedValue([]);
    ({ app } = await buildTestApp({ render: { findMany } }));
    const response = await app.inject({
      method: "GET",
      url: "/api/v1/operator/renders",
      headers: { cookie: operatorSessionCookie() },
    });
    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({ renders: [] });
  });

  it("stamps reviewedById from the session on render approval (FR-027)", async () => {
    const update = vi.fn().mockResolvedValue({
      id: "r1",
      projectId: "p1",
      reviewStatus: "approved",
    });
    // Approval also auto-populates the cart (FR-031) — stub what that path needs.
    const txStub = {
      cart: { upsert: vi.fn().mockResolvedValue({ id: "cart_1", status: "draft" }) },
      cartItem: {
        deleteMany: vi.fn().mockResolvedValue({ count: 0 }),
        createMany: vi.fn().mockResolvedValue({ count: 0 }),
      },
    };
    ({ app } = await buildTestApp({
      render: { update },
      renderItem: { findMany: vi.fn().mockResolvedValue([]) },
      $transaction: vi.fn(async (fn: (t: typeof txStub) => Promise<void>) => fn(txStub)),
    }));
    const response = await app.inject({
      method: "POST",
      url: "/api/v1/operator/renders/r1/approve",
      headers: { cookie: operatorSessionCookie({ operatorId: "op_reviewer" }) },
    });
    expect(response.statusCode).toBe(200);
    expect(update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ reviewedById: "op_reviewer" }),
      }),
    );
  });

  it("stamps forwardedById from the session on order forward (FR-061)", async () => {
    const updateMany = vi.fn().mockResolvedValue({ count: 1 });
    const update = vi.fn().mockResolvedValue({ id: "o1", status: "forwarded" });
    const $transaction = vi.fn(async (operations: unknown[]) => Promise.all(operations));
    ({ app } = await buildTestApp({
      purchaseOrder: { updateMany },
      order: { update },
      $transaction,
    }));
    const response = await app.inject({
      method: "POST",
      url: "/api/v1/operator/orders/o1/forward",
      headers: { cookie: operatorSessionCookie({ operatorId: "op_handler" }) },
    });
    expect(response.statusCode).toBe(200);
    expect(updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ forwardedById: "op_handler" }),
      }),
    );
  });
});
