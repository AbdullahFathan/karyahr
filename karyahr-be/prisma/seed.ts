import { getPrisma, disconnectPrisma } from "../src/shared/database/prisma";
import { seedAuth } from "../src/modules/auth/data/seed";

/**
 * Seed aggregator. Per-module seeds live in `src/modules/<feature>/data/seed.ts`.
 */
async function main(): Promise<void> {
  const prisma = getPrisma();
  await seedAuth(prisma);
}

main()
  .catch((error: unknown) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await disconnectPrisma();
  });
