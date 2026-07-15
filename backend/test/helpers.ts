import { vi } from "vitest";
import type { PrismaClient } from "@prisma/client";
import { buildApp } from "../src/app.js";
import { loadConfig } from "../src/config.js";
import {
  OPERATOR_SESSION_COOKIE,
  issueSessionToken,
  type OperatorSession,
} from "../src/auth/operator.js";
import { LocalDiskStorage } from "../src/services/storage.js";
import { FakeRenderPipeline } from "../src/services/render/pipeline.js";
import { FakePaymentGateway } from "../src/services/payments.js";
import { InMemoryQueue, type RenderJob } from "../src/jobs/queue.js";
import type { AppDeps } from "../src/types.js";

/** A minimal valid test config (no real env needed). */
export function testConfig() {
  return loadConfig({
    NODE_ENV: "test",
    DATABASE_URL: "postgresql://test:test@localhost:5432/test",
    OPERATOR_SESSION_SECRET: "test-session-secret-0123456789",
  });
}

/** A valid operator session cookie for authenticated operator-route tests. */
export function operatorSessionCookie(overrides: Partial<OperatorSession> = {}): string {
  const session: OperatorSession = {
    operatorId: "op_test_1",
    name: "Test Operator",
    role: null,
    exp: Math.floor(Date.now() / 1000) + 3600,
    ...overrides,
  };
  const token = issueSessionToken(session, testConfig().OPERATOR_SESSION_SECRET);
  return `${OPERATOR_SESSION_COOKIE}=${token}`;
}

/**
 * Build a Fastify app with an injected Prisma mock so the suite never needs a live
 * database. Pass overrides to shape specific model method return values / spies.
 */
export async function buildTestApp(
  prismaOverrides: Partial<Record<string, unknown>> = {},
  depsOverrides: Partial<AppDeps> = {},
) {
  const prisma = {
    $disconnect: vi.fn().mockResolvedValue(undefined),
    event: { create: vi.fn().mockResolvedValue({ id: "evt_1" }) },
    ...prismaOverrides,
  } as unknown as PrismaClient;

  const deps: AppDeps = {
    config: testConfig(),
    prisma,
    storage: new LocalDiskStorage(".storage-test"),
    renderPipeline: new FakeRenderPipeline(),
    payments: new FakePaymentGateway(),
    queue: new InMemoryQueue<RenderJob>(),
    ...depsOverrides,
  };

  const app = await buildApp(deps);
  await app.ready();
  return { app, prisma };
}
