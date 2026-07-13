import { mkdir, readFile, unlink, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";

/**
 * ObjectStorage — private storage for room photos and renders (BR-33 / NFR-007).
 * No real vendor is wired in the pilot; the dev implementation writes to local disk.
 * A production impl (S3-compatible) implements the same interface later.
 */
export interface ObjectStorage {
  /** Store bytes under a key and return that key. */
  put(key: string, data: Buffer, contentType?: string): Promise<string>;
  get(key: string): Promise<Buffer>;
  delete(key: string): Promise<void>;
  /**
   * Return an access-controlled reference for a key. In the pilot this is an
   * internal path; a real impl returns a short-lived signed URL.
   */
  getSignedUrl(key: string, expiresInSeconds?: number): Promise<string>;
}

/** Local-disk implementation for development. Files are kept under a base dir. */
export class LocalDiskStorage implements ObjectStorage {
  private readonly baseDir: string;

  constructor(baseDir: string) {
    this.baseDir = resolve(baseDir);
  }

  private pathFor(key: string): string {
    // Prevent path traversal outside the base dir.
    const full = resolve(join(this.baseDir, key));
    if (!full.startsWith(this.baseDir)) {
      throw new Error(`Invalid storage key: ${key}`);
    }
    return full;
  }

  async put(key: string, data: Buffer, _contentType?: string): Promise<string> {
    const full = this.pathFor(key);
    await mkdir(dirname(full), { recursive: true });
    await writeFile(full, data);
    return key;
  }

  async get(key: string): Promise<Buffer> {
    return readFile(this.pathFor(key));
  }

  async delete(key: string): Promise<void> {
    await unlink(this.pathFor(key)).catch(() => undefined);
  }

  async getSignedUrl(key: string, _expiresInSeconds = 900): Promise<string> {
    // Pilot: an internal, access-controlled reference (not a public URL).
    return `local://${key}`;
  }
}
