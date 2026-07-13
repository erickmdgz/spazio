import { PrismaClient } from "@prisma/client";

/**
 * Prisma client singleton. The app factory (src/app.ts) accepts a PrismaClient
 * so tests can inject a mock without a live database.
 */
let prisma: PrismaClient | undefined;

export function getPrisma(): PrismaClient {
  if (!prisma) {
    prisma = new PrismaClient();
  }
  return prisma;
}

export type { PrismaClient };
