import { loadDotEnv } from "./env.js";
import { buildApp } from "./app.js";
import { loadConfig } from "./config.js";
import { getPrisma } from "./db.js";
import { LocalDiskStorage } from "./services/storage.js";
import { FakeRenderPipeline } from "./services/render/pipeline.js";
import { FakePaymentGateway } from "./services/payments.js";
import { InMemoryQueue, type RenderJob } from "./jobs/queue.js";
import { registerRenderWorker } from "./jobs/renderWorker.js";
import type { AppDeps } from "./types.js";

async function main(): Promise<void> {
  loadDotEnv();
  const config = loadConfig();

  const prisma = getPrisma();
  const storage = new LocalDiskStorage(config.STORAGE_LOCAL_DIR);
  const renderPipeline = new FakeRenderPipeline();
  const payments = new FakePaymentGateway();
  const queue = new InMemoryQueue<RenderJob>();

  // Wire the async render worker (queue -> pipeline -> persist; operator QA gates it).
  registerRenderWorker(queue, prisma, renderPipeline);

  const deps: AppDeps = { config, prisma, storage, renderPipeline, payments, queue };
  const app = await buildApp(deps);

  try {
    await app.listen({ port: config.PORT, host: "0.0.0.0" });
  } catch (err) {
    app.log.error(err);
    await prisma.$disconnect();
    process.exit(1);
  }
}

void main();
