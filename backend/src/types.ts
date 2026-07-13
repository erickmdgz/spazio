import type { PrismaClient } from "@prisma/client";
import type { AppConfig } from "./config.js";
import type { ObjectStorage } from "./services/storage.js";
import type { RenderPipeline } from "./services/render/pipeline.js";
import type { PaymentGateway } from "./services/payments.js";
import type { Queue, RenderJob } from "./jobs/queue.js";

/** Dependencies injected into the Fastify app factory (lets tests supply fakes). */
export interface AppDeps {
  config: AppConfig;
  prisma: PrismaClient;
  storage: ObjectStorage;
  renderPipeline: RenderPipeline;
  payments: PaymentGateway;
  queue: Queue<RenderJob>;
}

/** Standard typed stub body returned by not-yet-implemented handlers. */
export interface NotImplementedBody {
  error: "not_implemented";
  requirement: string;
  message: string;
}
