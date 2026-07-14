/**
 * Load ./.env into process.env using Node 22's native loader (no dependency).
 * Prisma's CLI reads .env by itself, but the server and the tsx scripts do not
 * — call this before loadConfig(). A missing .env is fine (CI, tests, real
 * deployments use actual environment variables).
 */
export function loadDotEnv(): void {
  try {
    process.loadEnvFile();
  } catch {
    // no .env file — environment variables come from the process
  }
}
