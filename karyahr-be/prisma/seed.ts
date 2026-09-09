import { getPrisma, disconnectPrisma } from "../src/shared/database/prisma";
import { seedAuth } from "../src/modules/auth/data/seed";
import { seedAttendance } from "../src/modules/attendance/data/seed";
import { seedLeave } from "../src/modules/leave/data/seed";
import { seedPayroll } from "../src/modules/payroll/data/seed";
import { seedRecruitment } from "../src/modules/recruitment/data/seed";

/**
 * Seed aggregator. Per-module seeds live in `src/modules/<feature>/data/seed.ts`.
 */
async function main(): Promise<void> {
  const prisma = getPrisma();
  await seedAuth(prisma);
  await Promise.all([seedAttendance(prisma), seedLeave(prisma), seedPayroll(prisma), seedRecruitment(prisma)]);
}

main()
  .catch((error: unknown) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await disconnectPrisma();
  });
