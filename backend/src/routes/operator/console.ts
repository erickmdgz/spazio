import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import type { FastifyPluginAsync } from "fastify";

/**
 * Serves the operator console shell (plan §1.7 — "served by/alongside the one
 * backend service, no second backend"). The shell is static and carries no data;
 * everything it shows comes from the session-guarded /api/v1/operator API, so the
 * files themselves are served unauthenticated (the login screen must load).
 *
 * Exact-match allowlist — no directory listing, no wildcard, no traversal surface.
 */
const CONSOLE_FILES: Record<string, { file: string; contentType: string }> = {
  "/operator/console": { file: "index.html", contentType: "text/html; charset=utf-8" },
  "/operator/console/app.js": { file: "app.js", contentType: "text/javascript; charset=utf-8" },
  "/operator/console/styles.css": { file: "styles.css", contentType: "text/css; charset=utf-8" },
};

export const operatorConsoleRoutes: FastifyPluginAsync = async (app) => {
  const consoleDir = resolve(process.cwd(), app.deps.config.OPERATOR_CONSOLE_DIR);
  for (const [routePath, entry] of Object.entries(CONSOLE_FILES)) {
    app.get(routePath, async (_request, reply) => {
      const body = await readFile(resolve(consoleDir, entry.file));
      return reply
        .code(200)
        .header("content-type", entry.contentType)
        .header("cache-control", "no-store")
        .send(body);
    });
  }
};
