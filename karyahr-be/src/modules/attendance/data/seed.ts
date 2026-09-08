import type { PrismaClient } from "../../../../prisma/generated/prisma/client";

const SHIFTS = [
  {
    code: "PAGI",
    name: "Pagi",
    startMinutes: 8 * 60,
    endMinutes: 17 * 60,
    graceMinutesLate: 15,
    graceMinutesEarly: 0,
    overtimeCapMinutes: 180,
    isFlexible: false,
  },
  {
    code: "SIANG",
    name: "Siang",
    startMinutes: 12 * 60,
    endMinutes: 21 * 60,
    graceMinutesLate: 15,
    graceMinutesEarly: 0,
    isFlexible: false,
  },
  {
    code: "MALAM",
    name: "Malam",
    startMinutes: 22 * 60,
    endMinutes: 6 * 60,
    graceMinutesLate: 15,
    graceMinutesEarly: 0,
    isFlexible: false,
  },
  {
    code: "FLEKSIBEL",
    name: "Fleksibel",
    startMinutes: 0,
    endMinutes: 23 * 60 + 59,
    graceMinutesLate: 0,
    graceMinutesEarly: 0,
    isFlexible: true,
  },
] as const;

/**
 * Upserts default shifts and assigns the HR admin employee to Fleksibel.
 */
export async function seedAttendance(prisma: PrismaClient): Promise<void> {
  await Promise.all(
    SHIFTS.map((shift) =>
      prisma.shift.upsert({
        where: { code: shift.code },
        update: {
          name: shift.name,
          startMinutes: shift.startMinutes,
          endMinutes: shift.endMinutes,
          graceMinutesLate: shift.graceMinutesLate,
          graceMinutesEarly: shift.graceMinutesEarly,
          overtimeCapMinutes: "overtimeCapMinutes" in shift ? shift.overtimeCapMinutes : 0,
          isFlexible: shift.isFlexible,
          isActive: true,
        },
        create: {
          ...shift,
          overtimeCapMinutes: "overtimeCapMinutes" in shift ? shift.overtimeCapMinutes : 0,
          isActive: true,
        },
      }),
    ),
  );

  const admin = await prisma.employee.findUnique({ where: { employeeNumber: "EMP-0001" } });
  const flexible = await prisma.shift.findUnique({ where: { code: "FLEKSIBEL" } });
  if (!admin || !flexible) {
    return;
  }

  const open = await prisma.shiftAssignment.findFirst({
    where: { employeeId: admin.id, effectiveTo: null },
  });
  if (open) {
    return;
  }

  await prisma.shiftAssignment.create({
    data: {
      employeeId: admin.id,
      shiftId: flexible.id,
      effectiveFrom: new Date("2020-01-01"),
    },
  });
}
