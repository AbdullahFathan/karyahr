import type { PrismaClient } from "../../../../prisma/generated/prisma/client";
import type { IApprovedLeaveLookup } from "../../attendance/domain/ports/IApprovedLeaveLookup";

/**
 * Looks up approved leave covering a work date for attendance rules.
 */
export class PrismaApprovedLeaveLookup implements IApprovedLeaveLookup {
  constructor(private readonly prisma: PrismaClient) {}

  async hasApprovedLeave(employeeId: string, workDate: Date): Promise<boolean> {
    const count = await this.prisma.leaveRequest.count({
      where: {
        employeeId,
        status: "APPROVED",
        startDate: { lte: workDate },
        endDate: { gte: workDate },
      },
    });
    return count > 0;
  }

  async listEmployeeIdsOnLeave(
    workDate: Date,
    employeeIds: readonly string[],
  ): Promise<readonly string[]> {
    if (employeeIds.length === 0) {
      return [];
    }
    const rows = await this.prisma.leaveRequest.findMany({
      where: {
        employeeId: { in: [...employeeIds] },
        status: "APPROVED",
        startDate: { lte: workDate },
        endDate: { gte: workDate },
      },
      select: { employeeId: true },
    });
    return [...new Set(rows.map((row) => row.employeeId))];
  }
}
