import { fileURLToPath } from "node:url";
import { dirname } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Pin the tracing root to this app so a parent-directory lockfile does not
  // confuse Next's workspace-root inference.
  outputFileTracingRoot: __dirname,
  // Proxy the Spazio backend so the app is same-origin with /api/v1 (no CORS).
  // Run the backend on :3001 (cd backend && PORT=3001 npm run dev) or set
  // BACKEND_ORIGIN.
  async rewrites() {
    const backend = process.env.BACKEND_ORIGIN ?? "http://localhost:3001";
    return [{ source: "/api/v1/:path*", destination: `${backend}/api/v1/:path*` }];
  },
};

export default nextConfig;
