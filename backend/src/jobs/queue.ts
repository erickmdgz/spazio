/**
 * Queue — async job abstraction for render jobs (rendering is slow, ADR-013).
 * No real broker in the pilot; the dev implementation runs handlers in-process.
 */

export interface RenderJob {
  renderId: string;
  /**
   * The user's curated product selection (ADR-028/FR-068): up to 3 productIds the
   * render must composite EXACTLY (after the worker re-validates them). Omitted for
   * the backward-compatible auto-match flow, where the worker falls back to
   * matchProducts(). Carried on the job payload (no schema change) — each render /
   * iteration is its own job with its own selection.
   */
  productIds?: string[];
}

export type JobHandler<T> = (payload: T) => Promise<void>;

export interface Queue<T = RenderJob> {
  /** Enqueue a job payload. */
  enqueue(payload: T): Promise<void>;
  /** Register the handler that processes jobs. */
  process(handler: JobHandler<T>): void;
}

/**
 * In-memory queue for development. Jobs are dispatched on the next microtask so
 * enqueue() returns immediately (mimicking async processing). Failures are logged
 * and swallowed so a bad job cannot crash the request that enqueued it.
 */
export class InMemoryQueue<T = RenderJob> implements Queue<T> {
  private handler: JobHandler<T> | undefined;
  private readonly pending: T[] = [];

  enqueue(payload: T): Promise<void> {
    this.pending.push(payload);
    queueMicrotask(() => void this.drain());
    return Promise.resolve();
  }

  process(handler: JobHandler<T>): void {
    this.handler = handler;
    queueMicrotask(() => void this.drain());
  }

  private async drain(): Promise<void> {
    if (!this.handler) return;
    while (this.pending.length > 0) {
      const payload = this.pending.shift() as T;
      try {
        await this.handler(payload);
      } catch (err) {
        // eslint-disable-next-line no-console
        console.error("[queue] job failed", err);
      }
    }
  }
}
