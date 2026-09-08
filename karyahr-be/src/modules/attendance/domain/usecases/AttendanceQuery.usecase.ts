import { ForbiddenError } from "../../../../shared/errors/app-error";
import type { IEmployeeRepository } from "../../../employees/domain/repositories/IEmployeeRepository";
import type { AttendanceRecord } from "../entities/Attendance";
import { addWorkDays, formatWorkDate, workDateFromInstant } from "../jakarta-time";
import type { IApprovedLeaveLookup } from "../ports/IApprovedLeaveLookup";
import type { IAttendanceRecordRepository } from "../repositories/IAttendanceRepository";

const ACTIVE_STATUSES = ["ACTIVE", "PROBATION"] as const;

export type AttendanceScope = {
  readonly actorEmployeeId: string;
  readonly isHr: boolean;
  readonly isManager: boolean;
};

export type AttendanceSummary = {
  readonly from: Date;
  readonly to: Date;
  readonly presentDays: number;
  readonly lateDays: number;
  readonly earlyLeaveDays: number;
  readonly records: readonly AttendanceRecord[];
};

export type DashboardRow = {
  readonly employeeId: string;
  readonly fullName: string;
  readonly employeeNumber: string;
};

export type AttendanceDashboard = {
  readonly workDate: Date;
  readonly present: readonly DashboardRow[];
  readonly late: readonly DashboardRow[];
  readonly absent: readonly DashboardRow[];
  readonly onLeave: readonly DashboardRow[];
};

function periodRange(
  period: "day" | "week" | "month",
  now: Date,
): { from: Date; to: Date } {
  const today = workDateFromInstant(now);
  if (period === "day") {
    return { from: today, to: today };
  }
  if (period === "week") {
    const weekday = today.getUTCDay();
    const mondayOffset = weekday === 0 ? -6 : 1 - weekday;
    const from = addWorkDays(today, mondayOffset);
    return { from, to: addWorkDays(from, 6) };
  }
  const from = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), 1));
  const to = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth() + 1, 0));
  return { from, to };
}

/**
 * Lists the caller's attendance records in a date range.
 */
export class ListMyAttendanceUseCase {
  constructor(private readonly records: IAttendanceRecordRepository) {}

  execute(employeeId: string, from: Date, to: Date): Promise<readonly AttendanceRecord[]> {
    return this.records.listByEmployee(employeeId, from, to);
  }
}

/**
 * Summarizes attendance for self, a report, or any employee when HR.
 */
export class GetAttendanceSummaryUseCase {
  constructor(
    private readonly employees: IEmployeeRepository,
    private readonly records: IAttendanceRecordRepository,
    private readonly clock: () => Date = () => new Date(),
  ) {}

  async execute(
    scope: AttendanceScope,
    input: {
      readonly employeeId?: string;
      readonly period: "day" | "week" | "month";
      readonly from?: Date;
      readonly to?: Date;
    },
  ): Promise<AttendanceSummary> {
    const targetId = input.employeeId ?? scope.actorEmployeeId;
    if (targetId !== scope.actorEmployeeId && !scope.isHr) {
      if (!scope.isManager) {
        throw new ForbiddenError();
      }
      const target = await this.employees.findById(targetId);
      if (!target || target.managerId !== scope.actorEmployeeId) {
        throw new ForbiddenError();
      }
    }
    const range =
      input.from && input.to ? { from: input.from, to: input.to } : periodRange(input.period, this.clock());
    const rows = await this.records.listByEmployee(targetId, range.from, range.to);
    return {
      from: range.from,
      to: range.to,
      presentDays: rows.length,
      lateDays: rows.filter((row) => row.lateMinutes > 0).length,
      earlyLeaveDays: rows.filter((row) => row.earlyLeaveMinutes > 0).length,
      records: rows,
    };
  }
}

/**
 * Builds today's attendance dashboard for HR or a manager's direct reports.
 */
export class GetAttendanceDashboardUseCase {
  constructor(
    private readonly employees: IEmployeeRepository,
    private readonly records: IAttendanceRecordRepository,
    private readonly leave: IApprovedLeaveLookup,
    private readonly clock: () => Date = () => new Date(),
  ) {}

  async execute(scope: AttendanceScope): Promise<AttendanceDashboard> {
    if (!scope.isHr && !scope.isManager) {
      throw new ForbiddenError();
    }
    const workDate = workDateFromInstant(this.clock());
    const directory = await this.employees.listDirectory({
      managerId: scope.isHr ? undefined : scope.actorEmployeeId,
      statuses: ACTIVE_STATUSES,
    });
    const ids = directory.map((item) => item.id);
    const [rows, onLeaveIds] = await Promise.all([
      ids.length > 0 ? this.records.listOnWorkDate(workDate, ids) : Promise.resolve([]),
      ids.length > 0 ? this.leave.listEmployeeIdsOnLeave(workDate, ids) : Promise.resolve([]),
    ]);
    const byEmployee = new Map(rows.map((row) => [row.employeeId, row]));
    const onLeave = new Set(onLeaveIds);
    const present: DashboardRow[] = [];
    const late: DashboardRow[] = [];
    const absent: DashboardRow[] = [];
    const leaveRows: DashboardRow[] = [];

    for (const employee of directory) {
      const row: DashboardRow = {
        employeeId: employee.id,
        fullName: employee.fullName,
        employeeNumber: employee.employeeNumber,
      };
      const record = byEmployee.get(employee.id);
      if (onLeave.has(employee.id) && !record) {
        leaveRows.push(row);
        continue;
      }
      if (!record) {
        absent.push(row);
        continue;
      }
      if (record.lateMinutes > 0) {
        late.push(row);
      } else {
        present.push(row);
      }
    }

    return { workDate, present, late, absent, onLeave: leaveRows };
  }
}

/**
 * Builds a CSV of attendance records for HR export.
 */
export class ExportAttendanceCsvUseCase {
  constructor(private readonly records: IAttendanceRecordRepository) {}

  async execute(from: Date, to: Date): Promise<string> {
    const rows = await this.records.list({ from, to });
    const header = [
      "employeeId",
      "workDate",
      "status",
      "checkedInAt",
      "checkedOutAt",
      "workedMinutes",
      "lateMinutes",
      "earlyLeaveMinutes",
    ];
    const lines = rows.map((row) =>
      [
        row.employeeId,
        formatWorkDate(row.workDate),
        row.status,
        row.checkedInAt.toISOString(),
        row.checkedOutAt?.toISOString() ?? "",
        row.workedMinutes ?? "",
        row.lateMinutes,
        row.earlyLeaveMinutes,
      ].join(","),
    );
    return [header.join(","), ...lines].join("\n");
  }
}
