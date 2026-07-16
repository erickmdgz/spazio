/**
 * In-flight render registry (BUG-002).
 *
 * A tiny in-process map of renderId -> "kill" callback for renders that are
 * currently running in the render worker. The MfluxRenderPipeline registers a
 * callback that SIGKILLs its child process while the child is alive, and
 * unregisters it as soon as the child settles. The cancel route
 * (POST /renders/:id/cancel) calls cancel(renderId) to stop an in-flight render
 * immediately — so leaving the /render page (or the client's own timeout) frees
 * the render host's memory now, rather than waiting for the backend hard cap.
 *
 * Scope: single-process only (the pilot runs one worker in-process, ADR-013).
 * This carries no state beyond the map and has no global side effects. It is NOT
 * the source of truth for render status — that stays on the RenderRequest row;
 * this only reaches the live child process, which a database cannot do.
 */

/** renderId -> callback that terminates the in-flight render's child process. */
const inFlight = new Map<string, () => void>();

/** Register the kill callback for an in-flight render. Overwrites any prior one. */
export function register(renderId: string, kill: () => void): void {
  inFlight.set(renderId, kill);
}

/** Drop the render's kill callback (call on settle — success, failure, timeout). */
export function unregister(renderId: string): void {
  inFlight.delete(renderId);
}

/**
 * Cancel an in-flight render: run its kill callback (SIGKILL the child) if one is
 * registered, then drop it. Returns true when a live render was killed, false
 * when nothing was in flight (already settled / never started). Idempotent and
 * never throws — a failing kill callback is swallowed so cancellation always
 * completes.
 */
export function cancel(renderId: string): boolean {
  const kill = inFlight.get(renderId);
  if (!kill) return false;
  inFlight.delete(renderId);
  try {
    kill();
  } catch {
    // Best-effort: the child may have exited between lookup and kill.
  }
  return true;
}
