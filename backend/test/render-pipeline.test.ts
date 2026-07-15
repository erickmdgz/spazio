import { EventEmitter } from "node:events";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import {
  MfluxRenderPipeline,
  type MfluxSpawner,
  type RenderPipelineInput,
} from "../src/services/render/pipeline.js";
import type { ObjectStorage } from "../src/services/storage.js";

/**
 * MfluxRenderPipeline unit tests (ADR-026). child_process and storage are MOCKED
 * — no real mflux binary, no MLX, no Apple-Silicon dependency runs in CI. Assert
 * the pipeline invokes the binary with the room + product image paths and stores
 * the bytes the child produced.
 */

const ROOM_BYTES = Buffer.from("ROOM_PHOTO_BYTES");
const OUTPUT_BYTES = "FAKE_COMPOSITE_PNG";

interface Recorded {
  command?: string;
  args?: string[];
}

/**
 * Fake spawner: records the invocation, writes fake output bytes to the --output
 * path, then emits `close` with the given exit code. Models the ChildProcess
 * surface MfluxRenderPipeline uses (stderr 'data', 'close', 'error').
 */
function makeFakeSpawner(recorded: Recorded, exitCode = 0, stderr = ""): MfluxSpawner {
  return (command, args) => {
    recorded.command = command;
    recorded.args = args;
    const child = new EventEmitter() as EventEmitter & {
      stderr: EventEmitter;
    };
    child.stderr = new EventEmitter();
    setImmediate(async () => {
      if (stderr) child.stderr.emit("data", Buffer.from(stderr));
      if (exitCode === 0) {
        const outPath = args[args.indexOf("--output") + 1]!;
        await writeFile(outPath, Buffer.from(OUTPUT_BYTES));
      }
      child.emit("close", exitCode);
    });
    return child as unknown as ReturnType<MfluxSpawner>;
  };
}

// Faithful to LocalDiskStorage: get() throws on a missing key. The pipeline now
// tries storage.get(ref) for each product image (FEAT-017 / FEAT-005 fix), so a
// stub that returned bytes for every key would mask the storage-key vs FS-fallback
// branches. Callers pre-seed the room photo (and any product keys) into `stored`.
function makeStorage(stored: Map<string, Buffer>): ObjectStorage {
  return {
    get: vi.fn(async (key: string) => {
      const value = stored.get(key);
      if (value === undefined) throw new Error(`storage: no such key ${key}`);
      return value;
    }),
    put: vi.fn(async (key: string, data: Buffer) => {
      stored.set(key, data);
      return key;
    }),
    delete: vi.fn(async () => undefined),
    getSignedUrl: vi.fn(async (key: string) => `local://${key}`),
  };
}

const ROOM_KEY = "photos/room.png";

function makePrisma(photosById: Record<string, string[]>) {
  return {
    product: {
      findMany: vi.fn(async ({ where }: { where: { id: { in: string[] } } }) =>
        where.id.in
          .filter((id) => id in photosById)
          .map((id) => ({ id, photos: photosById[id] })),
      ),
    },
    style: { findUnique: vi.fn(async () => null) },
  } as unknown as ConstructorParameters<typeof MfluxRenderPipeline>[1];
}

const OPTIONS = {
  editBin: "mflux-generate-flux2-edit",
  model: "flux2-klein-4b",
  steps: 8,
  quantize: 8,
};

function baseInput(overrides: Partial<RenderPipelineInput> = {}): RenderPipelineInput {
  return {
    renderId: "render-1",
    photoStorageKey: "photos/room.png",
    styleId: null,
    freeText: null,
    budgetMinCop: null,
    budgetMaxCop: null,
    candidateProductIds: [],
    ...overrides,
  };
}

describe("MfluxRenderPipeline", () => {
  let assetDir: string;
  let productImagePath: string;

  beforeAll(async () => {
    assetDir = await mkdtemp(join(tmpdir(), "spazio-mflux-test-"));
    productImagePath = join(assetDir, "sofa.png");
    await writeFile(productImagePath, Buffer.from("PRODUCT_IMAGE_BYTES"));
  });

  afterAll(async () => {
    await rm(assetDir, { recursive: true, force: true });
  });

  it("spawns the binary with room + product image paths and stores the output bytes", async () => {
    const recorded: Recorded = {};
    const stored = new Map<string, Buffer>([[ROOM_KEY, ROOM_BYTES]]);
    const storage = makeStorage(stored);
    // photos[0] is an on-disk path here (not a storage key): exercises the legacy
    // FS-fallback branch — storage.get(path) throws, then the file resolves on disk.
    const prisma = makePrisma({ "prod-1": [productImagePath] });

    const pipeline = new MfluxRenderPipeline(storage, prisma, OPTIONS, makeFakeSpawner(recorded));
    const result = await pipeline.generate(
      baseInput({ candidateProductIds: ["prod-1"] }),
    );

    // Correct binary + pinned model/quantize/steps.
    expect(recorded.command).toBe("mflux-generate-flux2-edit");
    const args = recorded.args ?? [];
    expect(args[args.indexOf("--model") + 1]).toBe("flux2-klein-4b");
    expect(args[args.indexOf("-q") + 1]).toBe("8");
    expect(args[args.indexOf("--steps") + 1]).toBe("8");

    // --image-paths carries the room file first, then the resolved product image.
    const ipIndex = args.indexOf("--image-paths");
    expect(ipIndex).toBeGreaterThanOrEqual(0);
    expect(args[ipIndex + 1]).toMatch(/room\.png$/);
    expect(args).toContain(productImagePath);

    // Room photo was fetched from storage by its key.
    expect(storage.get).toHaveBeenCalledWith("photos/room.png");

    // Output bytes the child produced are stored under the render key.
    expect(result.imageKey).toBe("renders/render-1/composite.png");
    expect(storage.put).toHaveBeenCalledWith(
      "renders/render-1/composite.png",
      expect.any(Buffer),
      "image/png",
    );
    expect(stored.get("renders/render-1/composite.png")?.toString()).toBe(OUTPUT_BYTES);

    // One item per candidate; deterministic tag; price left 0 for the worker.
    expect(result.items).toEqual([
      { productId: "prod-1", tagPosition: { x: 0.1, y: 0.1 }, priceCopSnapshot: 0 },
    ]);
  });

  it("resolves a product image from object storage by key (FEAT-017 / FEAT-005 fix)", async () => {
    const recorded: Recorded = {};
    const productKey = "catalog/public/abo-sofa.jpg";
    const stored = new Map<string, Buffer>([
      [ROOM_KEY, ROOM_BYTES],
      [productKey, Buffer.from("ABO_PRODUCT_IMAGE_BYTES")],
    ]);
    const storage = makeStorage(stored);
    // photos[0] is an ObjectStorage key (as FEAT-017 seeds public products and the
    // worker stores curated images) — the pipeline fetches the bytes from storage.
    const prisma = makePrisma({ "prod-1": [productKey] });

    const pipeline = new MfluxRenderPipeline(storage, prisma, OPTIONS, makeFakeSpawner(recorded));
    await pipeline.generate(baseInput({ candidateProductIds: ["prod-1"] }));

    // The product image was fetched from storage by its key...
    expect(storage.get).toHaveBeenCalledWith(productKey);
    // ...and materialized into the work dir as a real file handed to mflux.
    const args = recorded.args ?? [];
    const ipIndex = args.indexOf("--image-paths");
    const productArg = args.slice(ipIndex + 2).find((a) => /product-0\.jpg$/.test(a));
    expect(productArg).toBeDefined();
    // The composite is still stored under the render key.
    expect(stored.get("renders/render-1/composite.png")?.toString()).toBe(OUTPUT_BYTES);
  });

  it("skips SKUs with no resolvable image and still composites (room-only floor)", async () => {
    const recorded: Recorded = {};
    const stored = new Map<string, Buffer>([[ROOM_KEY, ROOM_BYTES]]);
    const storage = makeStorage(stored);
    // Neither a storage key nor an on-disk file — resolves to nothing, is skipped.
    const prisma = makePrisma({ "prod-missing": ["/no/such/file.png"] });

    const pipeline = new MfluxRenderPipeline(storage, prisma, OPTIONS, makeFakeSpawner(recorded));
    const result = await pipeline.generate(
      baseInput({ candidateProductIds: ["prod-missing"] }),
    );

    const args = recorded.args ?? [];
    const ipIndex = args.indexOf("--image-paths");
    // Only the room path follows --image-paths (next token is a flag, --prompt).
    expect(args[ipIndex + 1]).toMatch(/room\.png$/);
    expect(args[ipIndex + 2]).toBe("--prompt");
    // The render still succeeds and stores output.
    expect(stored.get("renders/render-1/composite.png")?.toString()).toBe(OUTPUT_BYTES);
    // Item is still emitted for the candidate (worker's guard decides inclusion).
    expect(result.items).toHaveLength(1);
  });

  it("throws when the mflux child exits non-zero", async () => {
    const recorded: Recorded = {};
    const storage = makeStorage(new Map([[ROOM_KEY, ROOM_BYTES]]));
    const prisma = makePrisma({});

    const pipeline = new MfluxRenderPipeline(
      storage,
      prisma,
      OPTIONS,
      makeFakeSpawner(recorded, 1, "out of memory"),
    );

    await expect(pipeline.generate(baseInput({ candidateProductIds: [] }))).rejects.toThrow(
      /mflux exited with code 1: out of memory/,
    );
  });

  it("throws when no room photo key is provided", async () => {
    const storage = makeStorage(new Map());
    const prisma = makePrisma({});
    const spawner = vi.fn();

    const pipeline = new MfluxRenderPipeline(
      storage,
      prisma,
      OPTIONS,
      spawner as unknown as MfluxSpawner,
    );

    await expect(
      pipeline.generate(baseInput({ photoStorageKey: "" })),
    ).rejects.toThrow(/requires a room photo/);
    expect(spawner).not.toHaveBeenCalled();
    expect(storage.get).not.toHaveBeenCalled();
  });
});
