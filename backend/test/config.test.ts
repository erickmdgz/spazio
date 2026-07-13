import { describe, expect, it } from "vitest";
import { loadConfig } from "../src/config.js";

describe("config validation", () => {
  it("fails fast when DATABASE_URL is missing", () => {
    expect(() =>
      loadConfig({ NODE_ENV: "test", OPERATOR_API_SECRET: "s" } as NodeJS.ProcessEnv),
    ).toThrow(/DATABASE_URL/);
  });

  it("fails fast when OPERATOR_API_SECRET is missing", () => {
    expect(() =>
      loadConfig({
        NODE_ENV: "test",
        DATABASE_URL: "postgresql://x",
      } as NodeJS.ProcessEnv),
    ).toThrow(/OPERATOR_API_SECRET/);
  });

  it("accepts a valid environment and applies pilot defaults", () => {
    const cfg = loadConfig({
      DATABASE_URL: "postgresql://x",
      OPERATOR_API_SECRET: "s",
    } as NodeJS.ProcessEnv);
    expect(cfg.PORT).toBe(3000);
    expect(cfg.NODE_ENV).toBe("development");
    expect(cfg.STORAGE_DRIVER).toBe("local");
  });
});
