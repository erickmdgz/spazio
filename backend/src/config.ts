import { z } from "zod";

/**
 * Environment validation (fail fast on missing/invalid required env).
 *
 * Storage / render / payment / queue vendors are represented as *placeholders*
 * only — the pilot ships local/fake dev implementations (see src/services and
 * src/jobs). No real vendor SDK is wired in. The interfaces live next to their
 * implementations; the config only carries the selector + placeholder fields.
 */

const numberFromString = (fallback: number) =>
  z
    .string()
    .optional()
    .transform((v) => (v === undefined || v === "" ? fallback : Number(v)))
    .pipe(z.number().int().positive());

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: numberFromString(3000),

  // Required: database (ADR-001).
  DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),

  // Required: operator session-signing key (plan §1.8) — signs the console
  // session cookie (see src/auth/operator.ts). Replaces the interim
  // OPERATOR_API_SECRET shared-secret header from the PR #21 scaffold.
  OPERATOR_SESSION_SECRET: z
    .string()
    .min(16, "OPERATOR_SESSION_SECRET is required (min 16 characters)"),

  // Operator console shell location, served at /operator/console (plan §1.7).
  // Resolved relative to the backend working directory.
  OPERATOR_CONSOLE_DIR: z.string().default("../operator/public"),

  // Object storage (private photos/renders). Placeholder vendor fields.
  STORAGE_DRIVER: z.enum(["local"]).default("local"),
  STORAGE_LOCAL_DIR: z.string().default(".storage"),
  STORAGE_BUCKET: z.string().optional(),
  STORAGE_ENDPOINT: z.string().optional(),
  STORAGE_ACCESS_KEY: z.string().optional(),
  STORAGE_SECRET_KEY: z.string().optional(),

  // Render pipeline (hosted generative image API, ADR-002). Placeholder vendor fields.
  RENDER_DRIVER: z.enum(["fake"]).default("fake"),
  RENDER_API_URL: z.string().optional(),
  RENDER_API_KEY: z.string().optional(),

  // Payments (single COP capture, ADR-003/004). Placeholder vendor fields.
  PAYMENT_DRIVER: z.enum(["fake"]).default("fake"),
  PAYMENT_API_URL: z.string().optional(),
  PAYMENT_API_KEY: z.string().optional(),

  // Queue for async render jobs. Placeholder vendor field.
  QUEUE_DRIVER: z.enum(["memory"]).default("memory"),
  QUEUE_URL: z.string().optional(),
});

export type AppConfig = z.infer<typeof envSchema>;

/** Pilot business constants (decided values). */
export const PILOT = {
  MARKET_NAME: "Bogota",
  COUNTRY_CODE: "CO",
  CURRENCY: "COP",
  COMMISSION_RATE: 0.1, // 10% (ADR-007)
  BUDGET_TOLERANCE: 0.1, // 10% (ADR-008)
} as const;

/**
 * Parse and validate process.env. Throws (fail fast) on invalid config.
 * Accepts an override map so tests can validate without touching process.env.
 */
export function loadConfig(source: NodeJS.ProcessEnv = process.env): AppConfig {
  const parsed = envSchema.safeParse(source);
  if (!parsed.success) {
    const issues = parsed.error.issues
      .map((i) => `  - ${i.path.join(".") || "(root)"}: ${i.message}`)
      .join("\n");
    throw new Error(`Invalid environment configuration:\n${issues}`);
  }
  return parsed.data;
}
