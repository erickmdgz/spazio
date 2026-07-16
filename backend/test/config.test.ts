import { describe, expect, it } from "vitest";
import { loadConfig } from "../src/config.js";

describe("config validation", () => {
  it("fails fast when DATABASE_URL is missing", () => {
    expect(() =>
      loadConfig({
        NODE_ENV: "test",
        OPERATOR_SESSION_SECRET: "test-session-secret-0123456789",
      } as NodeJS.ProcessEnv),
    ).toThrow(/DATABASE_URL/);
  });

  it("fails fast when OPERATOR_SESSION_SECRET is missing", () => {
    expect(() =>
      loadConfig({
        NODE_ENV: "test",
        DATABASE_URL: "postgresql://x",
      } as NodeJS.ProcessEnv),
    ).toThrow(/OPERATOR_SESSION_SECRET/);
  });

  it("fails fast when OPERATOR_SESSION_SECRET is too short to sign sessions", () => {
    expect(() =>
      loadConfig({
        NODE_ENV: "test",
        DATABASE_URL: "postgresql://x",
        OPERATOR_SESSION_SECRET: "short",
      } as NodeJS.ProcessEnv),
    ).toThrow(/OPERATOR_SESSION_SECRET/);
  });

  it("accepts a valid environment and applies pilot defaults", () => {
    const cfg = loadConfig({
      DATABASE_URL: "postgresql://x",
      OPERATOR_SESSION_SECRET: "test-session-secret-0123456789",
    } as NodeJS.ProcessEnv);
    expect(cfg.PORT).toBe(3000);
    expect(cfg.NODE_ENV).toBe("development");
    expect(cfg.STORAGE_DRIVER).toBe("local");
    expect(cfg.OPERATOR_CONSOLE_DIR).toBe("../operator/public");
  });

  // TC-141 (BUG-004): the render hard cap must clear a healthy worst-case render
  // (~10 min with 3 reference products on the M2 host), not just hangs. This test
  // pins the backend default only; the companion invariant — the web client's
  // CLIENT_TIMEOUT_MS (render/page.tsx) staying above this cap — lives in another
  // codebase and cannot be asserted from here (kept by inspection/review).
  it("defaults the render hard cap to 15 min, above a worst-case real render (TC-141)", () => {
    const cfg = loadConfig({
      DATABASE_URL: "postgresql://x",
      OPERATOR_SESSION_SECRET: "test-session-secret-0123456789",
    } as NodeJS.ProcessEnv);
    expect(cfg.RENDER_TIMEOUT_MS).toBe(900000);
  });
});
