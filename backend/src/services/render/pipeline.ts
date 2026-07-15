/**
 * RenderPipeline — render-engine abstraction.
 *
 * The render engine is self-hosted FLUX.2 Klein 4B, run locally via the mflux CLI
 * as a child process (ADR-026, which supersedes only ADR-002's hosted-generative-
 * image-API clause; ADR-002's "no custom-trained model" rule still holds — Klein
 * is pretrained open weights). See MfluxRenderPipeline below.
 *
 * Hard rule (BR-6 / BR-14 / FR-016): every rendered item must map to a real,
 * in-stock SKU; the pipeline never fabricates products. It only ever composites
 * the images of the matched candidate SKUs it is given. Renders are published
 * immediately on generation success (ADR-025).
 *
 * FakeRenderPipeline stays the default/test/CI implementation so the suite is
 * hermetic (no mflux, MLX, or Apple-Silicon dependency in CI). MfluxRenderPipeline
 * is selected only when RENDER_ENGINE=mflux is configured (see config.ts /
 * server.ts).
 */

import { spawn as nodeSpawn } from "node:child_process";
import { access, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { extname, join, resolve as resolvePath } from "node:path";
import type { PrismaClient } from "@prisma/client";
import type { ObjectStorage } from "../storage.js";

export interface RenderPipelineInput {
  renderId: string;
  photoStorageKey: string;
  styleId?: string | null;
  freeText?: string | null;
  budgetMinCop?: number | null;
  budgetMaxCop?: number | null;
  /** Real, in-stock, approved candidate SKUs the render may compose (BR-6/BR-14). */
  candidateProductIds: string[];
}

export interface RenderPipelineItem {
  productId: string;
  tagPosition: { x: number; y: number };
  priceCopSnapshot: number;
}

export interface RenderPipelineResult {
  imageKey: string;
  items: RenderPipelineItem[];
}

export interface RenderPipeline {
  generate(input: RenderPipelineInput): Promise<RenderPipelineResult>;
}

/**
 * Fake pipeline for the pilot/dev. Deterministic, no external calls. It only ever
 * references SKUs passed in candidateProductIds (conceptually enforcing "real
 * in-stock SKUs only"); it does not invent products.
 */
export class FakeRenderPipeline implements RenderPipeline {
  async generate(input: RenderPipelineInput): Promise<RenderPipelineResult> {
    const items: RenderPipelineItem[] = input.candidateProductIds.map((productId, i) => ({
      productId,
      tagPosition: { x: (i + 1) * 0.1, y: (i + 1) * 0.1 },
      // Snapshot price is filled by the caller from the real Product row; the
      // fake pipeline has no price knowledge, so it returns 0 as a placeholder.
      priceCopSnapshot: 0,
    }));
    return {
      imageKey: `renders/${input.renderId}/composite.png`,
      items,
    };
  }
}

/** Tunables for the mflux CLI child process (from config; see config.ts). */
export interface MfluxOptions {
  /** Path (or bare name on PATH) of the mflux edit binary. */
  editBin: string;
  /** Model to pin — must stay flux2-klein-4b for the Apache-2.0 (commercial) weights. */
  model: string;
  /** Diffusion steps. */
  steps: number;
  /** Quantization bits passed as -q. */
  quantize: number;
}

/** Minimal child-process surface MfluxRenderPipeline needs (lets tests inject a fake). */
export interface MfluxChildProcess {
  stderr: { on(event: "data", listener: (chunk: Buffer | string) => void): unknown } | null;
  on(event: "close", listener: (code: number | null) => void): unknown;
  on(event: "error", listener: (err: Error) => void): unknown;
}

export type MfluxSpawner = (command: string, args: string[]) => MfluxChildProcess;

/**
 * Self-hosted render engine: FLUX.2 Klein 4B via the mflux CLI (ADR-026).
 *
 * Per render it: fetches the room photo bytes from ObjectStorage by
 * photoStorageKey; resolves the matched candidate SKUs' curated product images
 * (skipping any SKU with no local image file — the room-only edit is the floor);
 * writes the room photo to a temp file; spawns `mflux-generate-flux2-edit`
 * (node:child_process, no new npm deps) to composite the product image(s) into
 * the room; stores the output under renders/<renderId>/composite.png; and returns
 * that key plus one item per candidate.
 *
 * Real-SKU-only invariant (BR-6 / BR-14 / FR-016) is preserved: it only ever
 * composites the images of the matched candidate SKUs and never invents products.
 * The worker's fabrication guard still filters items against the matched set and
 * fills real price snapshots. Klein returns no tag coordinates, so tagPositions
 * use the same deterministic placeholders the fake pipeline does. On any failure
 * it throws, and the worker marks the render request `failed`.
 */
export class MfluxRenderPipeline implements RenderPipeline {
  /** Cap on product images composited into a single edit ("up to a few"). */
  private static readonly MAX_PRODUCT_IMAGES = 3;

  private readonly spawner: MfluxSpawner;

  constructor(
    private readonly storage: ObjectStorage,
    private readonly prisma: PrismaClient,
    private readonly options: MfluxOptions,
    spawner?: MfluxSpawner,
  ) {
    this.spawner = spawner ?? ((command, args) => nodeSpawn(command, args));
  }

  async generate(input: RenderPipelineInput): Promise<RenderPipelineResult> {
    if (!input.photoStorageKey) {
      throw new Error("MfluxRenderPipeline requires a room photo (photoStorageKey is empty).");
    }

    const roomBytes = await this.storage.get(input.photoStorageKey);
    const workDir = await mkdtemp(join(tmpdir(), `spazio-render-${input.renderId}-`));

    try {
      const roomPath = join(workDir, "room.png");
      await writeFile(roomPath, roomBytes);

      const productPaths = await this.resolveProductImagePaths(input.candidateProductIds, workDir);
      const outPath = join(workDir, "composite.png");

      const args = [
        "--model",
        this.options.model,
        "-q",
        String(this.options.quantize),
        "--image-paths",
        roomPath,
        ...productPaths,
        "--prompt",
        await this.buildPrompt(input),
        "--steps",
        String(this.options.steps),
        "--output",
        outPath,
      ];

      await this.runMflux(this.options.editBin, args);

      const outBytes = await readFile(outPath);
      const imageKey = `renders/${input.renderId}/composite.png`;
      await this.storage.put(imageKey, outBytes, "image/png");

      // Klein returns no coordinates; reuse the fake pipeline's deterministic
      // placeholder positions. priceCopSnapshot stays 0 — the worker overwrites
      // it with the real Product price.
      const items: RenderPipelineItem[] = input.candidateProductIds.map((productId, i) => ({
        productId,
        tagPosition: { x: (i + 1) * 0.1, y: (i + 1) * 0.1 },
        priceCopSnapshot: 0,
      }));

      return { imageKey, items };
    } finally {
      await rm(workDir, { recursive: true, force: true }).catch(() => undefined);
    }
  }

  /**
   * Resolve up to MAX_PRODUCT_IMAGES image files for the matched SKUs, writing each
   * into workDir as a real local file mflux can read.
   *
   * A Product's photos[0] is an ObjectStorage KEY (BR-33 / NFR-007): the render
   * worker's own composites and the FEAT-017 public-catalog images (catalog/public/
   * <sku>.jpg) both live in storage. So we first try ObjectStorage.get(key) and
   * materialize the bytes into workDir — this is what fixes the FEAT-005 room-only
   * limitation, where curated SKUs had no readable image file. If the reference is
   * not a storage key (e.g. a legacy on-disk/web asset path), we fall back to
   * treating it as a local filesystem path. A SKU with no resolvable image is
   * skipped (room-only edit is the graceful floor). Never adds a SKU not already in
   * candidateProductIds (BR-6/BR-14 real-SKU-only invariant preserved).
   */
  private async resolveProductImagePaths(
    candidateProductIds: string[],
    workDir: string,
  ): Promise<string[]> {
    if (candidateProductIds.length === 0) return [];

    const products = await this.prisma.product.findMany({
      where: { id: { in: candidateProductIds } },
      select: { id: true, photos: true },
    });
    const photosById = new Map(products.map((p) => [p.id, p.photos]));

    const paths: string[] = [];
    for (const id of candidateProductIds) {
      if (paths.length >= MfluxRenderPipeline.MAX_PRODUCT_IMAGES) break;
      const ref = photosById.get(id)?.[0];
      if (!ref) continue;

      const ext = extname(ref) || ".jpg";
      const localCopy = join(workDir, `product-${paths.length}${ext}`);

      // Preferred path: the reference is an ObjectStorage key — fetch the bytes.
      try {
        const bytes = await this.storage.get(ref);
        await writeFile(localCopy, bytes);
        paths.push(localCopy);
        continue;
      } catch {
        // Not a storage key (or missing in storage) — try a legacy on-disk path.
      }

      const filePath = resolvePath(ref);
      try {
        await access(filePath);
        paths.push(filePath);
      } catch {
        // No resolvable image for this SKU — skip it (room-only edit is the floor).
      }
    }
    return paths;
  }

  private async buildPrompt(input: RenderPipelineInput): Promise<string> {
    const parts = [
      "Composite the provided real furniture product image(s) into the room photo at a believable scale, placement, and perspective, keeping the room's architecture and lighting intact.",
    ];
    if (input.styleId) {
      const style = await this.prisma.style.findUnique({
        where: { id: input.styleId },
        select: { name: true, code: true },
      });
      parts.push(`Design style: ${style?.name ?? style?.code ?? input.styleId}.`);
    }
    if (input.freeText) parts.push(input.freeText);
    return parts.join(" ");
  }

  private runMflux(command: string, args: string[]): Promise<void> {
    return new Promise<void>((resolvePromise, rejectPromise) => {
      const child = this.spawner(command, args);
      let stderr = "";
      child.stderr?.on("data", (chunk) => {
        stderr += chunk.toString();
      });
      child.on("error", (err) => {
        rejectPromise(new Error(`mflux failed to start (${command}): ${err.message}`));
      });
      child.on("close", (code) => {
        if (code === 0) {
          resolvePromise();
        } else {
          rejectPromise(
            new Error(`mflux exited with code ${code}${stderr ? `: ${stderr.trim()}` : ""}`),
          );
        }
      });
    });
  }
}
