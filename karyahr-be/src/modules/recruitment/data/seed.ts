import type { PrismaClient } from "../../../../prisma/generated/prisma/client";

/**
 * Seeds a sample OPEN job posting and a default onboarding template.
 */
export async function seedRecruitment(prisma: PrismaClient): Promise<void> {
  const department = await prisma.department.findUnique({ where: { code: "ROOT" } });
  const position = await prisma.position.findUnique({ where: { code: "HR-ADMIN" } });
  const creator = await prisma.user.findFirst({ orderBy: { createdAt: "asc" } });
  if (!department || !position || !creator) {
    return;
  }

  const existingTemplate = await prisma.onboardingTemplate.findFirst({
    where: { positionId: position.id },
  });
  if (!existingTemplate) {
    await prisma.onboardingTemplate.create({
      data: {
        name: "Default onboarding",
        positionId: position.id,
        items: {
          create: [
            {
              title: "Upload KTP and NPWP",
              description: "New hire uploads identity documents",
              assigneeKind: "NEW_HIRE",
              sortOrder: 0,
            },
            {
              title: "Create email and laptop request",
              description: "IT provisions access",
              assigneeKind: "IT",
              sortOrder: 1,
            },
            {
              title: "Payroll profile setup",
              description: "Finance collects bank details",
              assigneeKind: "FINANCE",
              sortOrder: 2,
            },
            {
              title: "Welcome meeting",
              description: "Manager meets the new hire",
              assigneeKind: "MANAGER",
              sortOrder: 3,
            },
            {
              title: "HR contract signing",
              description: "HR files the employment contract",
              assigneeKind: "HR",
              sortOrder: 4,
            },
          ],
        },
      },
    });
  }

  const existingJob = await prisma.jobPosting.findUnique({ where: { slug: "software-engineer" } });
  if (existingJob) {
    return;
  }

  await prisma.jobPosting.create({
    data: {
      slug: "software-engineer",
      title: "Software Engineer",
      description: "Build and maintain KaryaHR backend services.",
      qualifications: "TypeScript, PostgreSQL, and interest in HR domain.",
      departmentId: department.id,
      positionId: position.id,
      headcount: 1,
      maxApplicants: 50,
      status: "OPEN",
      createdByUserId: creator.id,
      stages: {
        create: [
          { name: "Screening", sortOrder: 0, isTerminal: false },
          { name: "Interview", sortOrder: 1, isTerminal: false },
          { name: "Offering", sortOrder: 2, isTerminal: false },
        ],
      },
    },
  });
}
