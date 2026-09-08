import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../../../prisma/generated/prisma/client";
import { env } from "../../config/env";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

/**
 * Returns the shared Prisma client (PostgreSQL driver adapter).
 */
export function getPrisma(): PrismaClient {
  if (globalForPrisma.prisma) {
    return globalForPrisma.prisma;
  }

  const adapter = new PrismaPg({
    connectionString: env().DATABASE_URL,
    connectionTimeoutMillis: 5000,
  });

  const prisma = new PrismaClient({ adapter });
  if (env().NODE_ENV !== "production") {
    globalForPrisma.prisma = prisma;
  }
  return prisma;
}

/**
 * Disconnects the Prisma client.
 */
export async function disconnectPrisma(): Promise<void> {
  if (globalForPrisma.prisma) {
    await globalForPrisma.prisma.$disconnect();
    globalForPrisma.prisma = undefined;
  }
}
