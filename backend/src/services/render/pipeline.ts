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
import { register, unregister } from "./registry.js";

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
  /**
   * Longest-edge cap (px) applied to every input image before it reaches mflux.
   * Real phone photos are ~24 MP and crash the Metal backend with OOM at full
   * resolution (BUG-001); ~1280 px renders fine (the output is ~1024 px anyway).
   * 0 disables downscaling (used by the hermetic tests).
   */
  maxImageEdge: number;
  /**
   * Python interpreter used for the Pillow downscale (exif_transpose + resize).
   * Pillow ships with the mflux venv, so this is that venv's python — NO new
   * dependency. Derived from editBin's directory when not set explicitly.
   */
  pythonBin: string;
  /**
   * Hard cap (ms) on a single mflux run (BUG-002 / NFR-004). If the child hangs —
   * e.g. the render host is out of RAM and the model never finishes loading — it
   * would otherwise never exit, so the RenderRequest would stay 'processing'
   * forever and orphan a memory-thrashing child even after the browser closes.
   * On timeout the child is SIGKILLed and the render rejects (worker marks it
   * 'failed'), self-healing without any client. From config RENDER_TIMEOUT_MS.
   */
  timeoutMs: number;
}

/** Minimal child-process surface MfluxRenderPipeline needs (lets tests inject a fake). */
export interface MfluxChildProcess {
  stderr: { on(event: "data", listener: (chunk: Buffer | string) => void): unknown } | null;
  on(event: "close", listener: (code: number | null) => void): unknown;
  on(event: "error", listener: (err: Error) => void): unknown;
  /** Terminate the child. Used by the hard timeout and the cancel registry (BUG-002). */
  kill(signal?: "SIGKILL"): boolean;
}

export type MfluxSpawner = (command: string, args: string[]) => MfluxChildProcess;

/**
 * Pillow snippet (run via the mflux venv's python) that bakes EXIF orientation
 * and downscales an image to a max longest edge, re-encoding as JPEG. Pillow is
 * already a mflux dependency, so this adds nothing new. argv: <src> <dst> <maxEdge>.
 * exif_transpose is essential — iPhone photos carry a rotation flag, and without
 * baking it the render comes out sideways.
 */
const DOWNSCALE_PY = [
  "import sys",
  "from PIL import Image, ImageOps",
  "src, dst, m = sys.argv[1], sys.argv[2], int(sys.argv[3])",
  "im = ImageOps.exif_transpose(Image.open(src))",
  "im.thumbnail((m, m))",
  "im.convert('RGB').save(dst, 'JPEG', quality=90)",
].join("\n");

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

      // Downscale every input image (baking EXIF orientation) before mflux, so a
      // large phone photo (~24 MP) cannot exhaust GPU memory and crash Metal with
      // OOM (BUG-001). Best-effort: a failed downscale falls back to the original.
      const imagePaths = await this.downscaleInputs([roomPath, ...productPaths], workDir);

      const args = [
        "--model",
        this.options.model,
        "-q",
        String(this.options.quantize),
        "--image-paths",
        ...imagePaths,
        "--prompt",
        await this.buildPrompt(input),
        "--steps",
        String(this.options.steps),
        "--output",
        outPath,
      ];

      await this.runMflux(this.options.editBin, args, input.renderId);

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

  /**
   * Downscale each input image to options.maxImageEdge (longest edge), baking EXIF
   * orientation, before it reaches mflux (BUG-001 — large photos OOM the Metal
   * backend). Uses Pillow from the mflux venv (no new dependency). Best-effort:
   * if a downscale fails, the original path is used unchanged (no regression).
   */
  private async downscaleInputs(paths: string[], workDir: string): Promise<string[]> {
    if (this.options.maxImageEdge <= 0) return paths;
    const out: string[] = [];
    for (let i = 0; i < paths.length; i++) {
      const dest = join(workDir, `scaled-${i}.jpg`);
      const ok = await this.downscaleImage(paths[i]!, dest);
      out.push(ok ? dest : paths[i]!);
    }
    return out;
  }

  private downscaleImage(src: string, dest: string): Promise<boolean> {
    return new Promise<boolean>((resolvePromise) => {
      const child = this.spawner(this.options.pythonBin, [
        "-c",
        DOWNSCALE_PY,
        src,
        dest,
        String(this.options.maxImageEdge),
      ]);
      child.stderr?.on("data", () => undefined);
      child.on("error", () => resolvePromise(false));
      child.on("close", (code) => resolvePromise(code === 0));
    });
  }

  /**
   * Spawn the mflux child and await its exit, guarded by two BUG-002 safeguards:
   *
   *  1. Hard timeout (options.timeoutMs, NFR-004 graceful degradation): a hung
   *     child (e.g. OOM, model never loads) never emits 'close', which would leave
   *     the RenderRequest 'processing' forever and orphan a memory-thrashing
   *     process. When the timer fires we SIGKILL the child and reject with a clear
   *     'render timed out' error; the worker marks the request 'failed'. This
   *     self-heals even if the browser is gone — no orphan survives past the cap.
   *  2. Cancel registry: while the child is alive its SIGKILL is registered under
   *     renderId so POST /renders/:id/cancel can stop it immediately (frees memory
   *     now, not at the cap). Unregistered — and the timer cleared — on settle.
   *
   * A killed child (timeout or cancel) still emits 'close' with a non-zero/null
   * code, but `settled` guards against a double-settle so the timeout error wins.
   */
  private runMflux(command: string, args: string[], renderId: string): Promise<void> {
    return new Promise<void>((resolvePromise, rejectPromise) => {
      // The spawned command is otherwise unrecorded (BUG-005) — without it a
      // failed render can't be reproduced by hand. Each arg is quoted so the
      // logged line is copy-paste runnable (the prompt contains spaces).
      // eslint-disable-next-line no-console
      console.log(
        `[render] ${renderId}: spawning ${[command, ...args].map((a) => JSON.stringify(a)).join(" ")}`,
      );
      const child = this.spawner(command, args);
      let stderr = "";
      let settled = false;

      const timer = setTimeout(() => {
        child.kill("SIGKILL");
        settle(() => {
          // Include what the child said before the SIGKILL (BUG-005): a bare
          // "timed out" left the BUG-004 incident undiagnosable — the stderr
          // collected up to the kill is the only record of how far mflux got.
          const tail = stderr.trim().slice(-2000);
          rejectPromise(
            new Error(
              `render timed out after ${Math.round(this.options.timeoutMs / 1000)}s${
                tail ? ` — mflux output tail: ${tail}` : " — no mflux output captured"
              }`,
            ),
          );
        });
      }, this.options.timeoutMs);

      // Run the given resolution exactly once, then release the timer + registry.
      function settle(finish: () => void): void {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        unregister(renderId);
        finish();
      }

      // Let a cancel request SIGKILL this child mid-flight (BUG-002).
      register(renderId, () => child.kill("SIGKILL"));

      child.stderr?.on("data", (chunk) => {
        // Keep only a bounded tail (BUG-005): enough to diagnose, and it cannot
        // grow in memory for the whole (up to 15-min) life of the child.
        stderr = (stderr + chunk.toString()).slice(-8192);
      });
      child.on("error", (err) => {
        settle(() =>
          rejectPromise(new Error(`mflux failed to start (${command}): ${err.message}`)),
        );
      });
      child.on("close", (code) => {
        settle(() => {
          if (code === 0) {
            resolvePromise();
          } else {
            rejectPromise(
              new Error(
                `mflux exited with code ${code}${stderr ? `: ${stderr.trim().slice(-2000)}` : ""}`,
              ),
            );
          }
        });
      });
    });
  }
}
