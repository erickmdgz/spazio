import { describe, expect, it, vi } from "vitest";
import { InMemoryQueue } from "../src/jobs/queue.js";

// TC-142 (BUG-005 / NFR-004): render jobs must run strictly serialized. Two
// concurrent mflux children (~20 GB MLX peak each) would exhaust the render
// host's memory — before the drain guard, an enqueue() landing while a job was
// awaited started a second concurrent drain.
describe("InMemoryQueue serialization (TC-142)", () => {
  it("never overlaps two jobs — one enqueued mid-run waits for the first", async () => {
    const queue = new InMemoryQueue<{ id: number }>();
    let active = 0;
    let maxActive = 0;
    const finished: number[] = [];
    let releaseFirst = () => {};
    const firstGate = new Promise<void>((resolve) => {
      releaseFirst = resolve;
    });

    queue.process(async ({ id }) => {
      active += 1;
      maxActive = Math.max(maxActive, active);
      if (id === 1) await firstGate;
      finished.push(id);
      active -= 1;
    });

    await queue.enqueue({ id: 1 });
    await vi.waitUntil(() => active === 1); // job 1 in-flight, blocked on the gate
    await queue.enqueue({ id: 2 }); // lands while job 1 is awaited — the regression case
    await new Promise((resolve) => setTimeout(resolve, 20));
    expect(finished).toEqual([]); // job 2 must not have started past job 1

    releaseFirst();
    await vi.waitUntil(() => finished.length === 2);
    expect(finished).toEqual([1, 2]);
    expect(maxActive).toBe(1);
  });
});
