import type { PrismaClient } from "../../../../prisma/generated/prisma/client";
import type {
  IApprovedLeaveDaysLookup,
  IAttendanceHoursLookup,
} from "../domain/repositories/IPayrollRepository";

/**
 * Attendance hours and open-punch checks for payroll.
 */
export class PrismaAttendanceHoursLookup implements IAttendanceHoursLookup {
  constructor(private readonly prisma: PrismaClient) {}

  async hasOpenInPeriod(employeeId: string, from: Date, to: Date): Promise<boolean> {
    const count = await this.prisma.attendanceRecord.count({
      where: {
        employeeId,
        status: "OPEN",
        workDate: { gte: from, lte: to },
      },
    });
    return count > 0;
  }

  async sumOvertimeMinutes(employeeId: string, from: Date, to: Date): Promise<number> {
    const aggregate = await this.prisma.attendanceRecord.aggregate({
      where: {
        employeeId,
        status: "CLOSED",
        workDate: { gte: from, lte: to },
      },
      _sum: { overtimeMinutes: true },
    });
    return aggregate._sum.overtimeMinutes ?? 0;
  }
}

/**
 * Approved leave day counts for a payroll period.
 */
export class PrismaApprovedLeaveDaysLookup implements IApprovedLeaveDaysLookup {
  constructor(private readonly prisma: PrismaClient) {}

  async countDays(employeeId: string, from: Date, to: Date): Promise<number> {
    const rows = await this.prisma.leaveRequest.findMany({
      where: {
        employeeId,
        status: "APPROVED",
        startDate: { lte: to },
        endDate: { gte: from },
      },
      select: { startDate: true, endDate: true, days: true },
    });
    return rows.reduce((sum, row) => sum + row.days, 0);
  }
}
