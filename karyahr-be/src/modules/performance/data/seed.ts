import type { PrismaClient } from "../../../../prisma/generated/prisma/client";

/**
 * Seeds a company OKR, a sample employee goal, and an open quarterly review cycle.
 */
export async function seedPerformance(prisma: PrismaClient): Promise<void> {
  const creator = await prisma.user.findFirst({ orderBy: { createdAt: "asc" } });
  const employee = creator
    ? await prisma.employee.findUnique({ where: { id: creator.employeeId } })
    : null;
  if (!creator || !employee) {
    return;
  }

  const companyGoal = await prisma.goal.findFirst({
    where: { level: "COMPANY", title: "Deliver KaryaHR platform" },
  });
  const parent =
    companyGoal ??
    (await prisma.goal.create({
      data: {
        level: "COMPANY",
        ownerUserId: creator.id,
        status: "ACTIVE",
        title: "Deliver KaryaHR platform",
        description: "Ship the remaining HRIS modules on the 2026 roadmap.",
        progressPercent: 80,
        keyResults: {
          create: [
            {
              title: "Backend phases complete",
              targetValue: 6,
              currentValue: 5,
              weight: 100,
            },
          ],
        },
      },
    }));

  const existingEmployeeGoal = await prisma.goal.findFirst({
    where: { employeeId: employee.id, title: "Close performance module" },
  });
  if (!existingEmployeeGoal) {
    await prisma.goal.create({
      data: {
        level: "EMPLOYEE",
        parentGoalId: parent.id,
        employeeId: employee.id,
        ownerUserId: creator.id,
        status: "ACTIVE",
        title: "Close performance module",
        description: "Goals, reviews, and dashboard APIs ready for frontend.",
        progressPercent: 100,
        keyResults: {
          create: [{ title: "Phase 5 APIs", targetValue: 1, currentValue: 1, weight: 100 }],
        },
      },
    });
  }

  const existingCycle = await prisma.performanceCycle.findFirst({
    where: { name: "FY2026-Q3" },
  });
  if (existingCycle) {
    return;
  }

  const actives = await prisma.employee.findMany({
    where: { status: { in: ["ACTIVE", "PROBATION"] } },
    select: { id: true },
  });
  await prisma.performanceCycle.create({
    data: {
      name: "FY2026-Q3",
      periodType: "QUARTERLY",
      startsAt: new Date("2026-07-01"),
      endsAt: new Date("2026-09-30"),
      status: "OPEN",
      reviews: {
        create: actives.map((item) => ({ employeeId: item.id })),
      },
    },
  });
}
