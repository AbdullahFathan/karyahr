import type { PrismaClient } from "../../../../prisma/generated/prisma/client";

const LEAVE_TYPES = [
  { code: "ANNUAL", name: "Cuti tahunan", requiresBalance: true, requiresAttachment: false },
  { code: "SICK", name: "Cuti sakit", requiresBalance: false, requiresAttachment: true },
  { code: "MATERNITY", name: "Cuti melahirkan", requiresBalance: false, requiresAttachment: true },
  { code: "MARRIAGE", name: "Cuti menikah", requiresBalance: false, requiresAttachment: true },
  { code: "BEREAVEMENT", name: "Cuti berduka", requiresBalance: false, requiresAttachment: false },
] as const;

/**
 * Upserts leave types and a global annual policy (12 days, 1 day/month, two-step approval).
 */
export async function seedLeave(prisma: PrismaClient): Promise<void> {
  await Promise.all(
    LEAVE_TYPES.map((item) =>
      prisma.leaveType.upsert({
        where: { code: item.code },
        update: {
          name: item.name,
          requiresBalance: item.requiresBalance,
          requiresAttachment: item.requiresAttachment,
          isActive: true,
        },
        create: { ...item, isActive: true },
      }),
    ),
  );

  const annual = await prisma.leaveType.findUnique({ where: { code: "ANNUAL" } });
  if (!annual) {
    return;
  }

  const existing = await prisma.leavePolicy.findFirst({
    where: { leaveTypeId: annual.id, departmentId: null, positionId: null },
  });
  if (existing) {
    await prisma.leavePolicy.update({
      where: { id: existing.id },
      data: {
        annualAllowanceDays: 12,
        approvalLevelCount: 2,
        accrualPerMonth: 1,
      },
    });
    return;
  }

  await prisma.leavePolicy.create({
    data: {
      leaveTypeId: annual.id,
      annualAllowanceDays: 12,
      approvalLevelCount: 2,
      accrualPerMonth: 1,
    },
  });
}
