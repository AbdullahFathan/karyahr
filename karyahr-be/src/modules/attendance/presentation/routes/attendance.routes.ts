import { Router } from "express";
import { PrismaAuditLogRepository } from "../../../../shared/audit/PrismaAuditLogRepository";
import { getPrisma } from "../../../../shared/database/prisma";
import { requireAuth } from "../../../../shared/middleware/require-auth";
import { requirePermission } from "../../../../shared/middleware/require-permission";
import { PERMISSIONS } from "../../../../shared/auth/permissions";
import { PrismaEmployeeRepository } from "../../../employees/data/PrismaEmployeeRepository";
import { PrismaApprovedLeaveLookup } from "../../../leave/data/PrismaApprovedLeaveLookup";
import {
  PrismaAttendanceRecordRepository,
  PrismaShiftAssignmentRepository,
  PrismaShiftRepository,
} from "../../data/PrismaAttendanceRepository";
import {
  ExportAttendanceCsvUseCase,
  GetAttendanceDashboardUseCase,
  GetAttendanceSummaryUseCase,
  ListMyAttendanceUseCase,
} from "../../domain/usecases/AttendanceQuery.usecase";
import { CheckInUseCase, CheckOutUseCase } from "../../domain/usecases/Punch.usecase";
import {
  AssignShiftUseCase,
  ListShiftAssignmentsUseCase,
} from "../../domain/usecases/ShiftAssignment.usecase";
import {
  CreateShiftUseCase,
  GetShiftByIdUseCase,
  ListShiftsUseCase,
  UpdateShiftUseCase,
} from "../../domain/usecases/Shift.usecase";
import { createAttendanceController } from "../controllers/attendance.controller";

/**
 * Registers attendance punch, shift, summary, and dashboard routes.
 */
export function createAttendanceRouter(): Router {
  const prisma = getPrisma();
  const shifts = new PrismaShiftRepository(prisma);
  const assignments = new PrismaShiftAssignmentRepository(prisma);
  const records = new PrismaAttendanceRecordRepository(prisma);
  const employees = new PrismaEmployeeRepository(prisma);
  const leave = new PrismaApprovedLeaveLookup(prisma);
  const audit = new PrismaAuditLogRepository(prisma);

  const controller = createAttendanceController({
    createShift: new CreateShiftUseCase(shifts, audit),
    updateShift: new UpdateShiftUseCase(shifts, audit),
    listShifts: new ListShiftsUseCase(shifts),
    getShift: new GetShiftByIdUseCase(shifts),
    assignShift: new AssignShiftUseCase(employees, shifts, assignments, audit),
    listAssignments: new ListShiftAssignmentsUseCase(employees, assignments),
    checkIn: new CheckInUseCase(assignments, shifts, records, leave),
    checkOut: new CheckOutUseCase(assignments, shifts, records),
    listMine: new ListMyAttendanceUseCase(records),
    summary: new GetAttendanceSummaryUseCase(employees, records),
    dashboard: new GetAttendanceDashboardUseCase(employees, records, leave),
    exportCsv: new ExportAttendanceCsvUseCase(records),
  });

  const router = Router();
  router.post(
    "/attendance/check-in",
    requireAuth,
    requirePermission(PERMISSIONS.ATTENDANCE_ME_PUNCH),
    controller.checkIn,
  );
  router.post(
    "/attendance/check-out",
    requireAuth,
    requirePermission(PERMISSIONS.ATTENDANCE_ME_PUNCH),
    controller.checkOut,
  );
  router.get(
    "/attendance/me",
    requireAuth,
    requirePermission(PERMISSIONS.ATTENDANCE_ME_READ),
    controller.listMine,
  );
  router.get(
    "/attendance/summary",
    requireAuth,
    requirePermission(PERMISSIONS.ATTENDANCE_ME_READ),
    controller.summary,
  );
  router.get(
    "/attendance/dashboard",
    requireAuth,
    requirePermission(PERMISSIONS.ATTENDANCE_DASHBOARD),
    controller.dashboard,
  );
  router.get(
    "/attendance/export",
    requireAuth,
    requirePermission(PERMISSIONS.ATTENDANCE_EXPORT),
    controller.exportCsv,
  );
  router.get(
    "/attendance/shifts",
    requireAuth,
    requirePermission(PERMISSIONS.ATTENDANCE_READ),
    controller.listShifts,
  );
  router.post(
    "/attendance/shifts",
    requireAuth,
    requirePermission(PERMISSIONS.ATTENDANCE_SHIFTS_WRITE),
    controller.createShift,
  );
  router.get(
    "/attendance/shifts/:id",
    requireAuth,
    requirePermission(PERMISSIONS.ATTENDANCE_READ),
    controller.getShift,
  );
  router.patch(
    "/attendance/shifts/:id",
    requireAuth,
    requirePermission(PERMISSIONS.ATTENDANCE_SHIFTS_WRITE),
    controller.updateShift,
  );
  router.post(
    "/attendance/shifts/:id/assignments",
    requireAuth,
    requirePermission(PERMISSIONS.ATTENDANCE_SHIFTS_WRITE),
    controller.assignShift,
  );
  router.get(
    "/attendance/employees/:employeeId/assignments",
    requireAuth,
    requirePermission(PERMISSIONS.ATTENDANCE_READ),
    controller.listAssignments,
  );
  return router;
}
