import type { Request, Response } from "express";
import { asyncHandler } from "../../../../shared/middleware/async-handler";
import { UnauthorizedError, ValidationError } from "../../../../shared/errors/app-error";
import { PERMISSIONS } from "../../../../shared/auth/permissions";
import { routeParam } from "../../../../shared/utils/route-param";
import { parsePagination } from "../../../../shared/utils/pagination";
import { parseWorkDate } from "../../domain/jakarta-time";
import type {
  ExportAttendanceCsvUseCase,
  GetAttendanceDashboardUseCase,
  GetAttendanceSummaryUseCase,
  ListMyAttendanceUseCase,
} from "../../domain/usecases/AttendanceQuery.usecase";
import type { CheckInUseCase, CheckOutUseCase } from "../../domain/usecases/Punch.usecase";
import type {
  AssignShiftUseCase,
  ListShiftAssignmentsUseCase,
} from "../../domain/usecases/ShiftAssignment.usecase";
import type {
  CreateShiftUseCase,
  GetShiftByIdUseCase,
  ListShiftsUseCase,
  UpdateShiftUseCase,
} from "../../domain/usecases/Shift.usecase";
import {
  assignShiftSchema,
  attendanceDashboardQuerySchema,
  attendanceRangeQuerySchema,
  attendanceSummaryQuerySchema,
  createShiftSchema,
  updateShiftSchema,
} from "../schemas/attendance.schema";

function actor(req: Request): { userId: string; employeeId: string; permissionKeys: readonly string[] } {
  if (!req.auth) {
    throw new UnauthorizedError();
  }
  return req.auth;
}

function scopeFrom(req: Request) {
  const auth = actor(req);
  return {
    actorEmployeeId: auth.employeeId,
    isHr: auth.permissionKeys.includes(PERMISSIONS.ATTENDANCE_READ),
    isManager: auth.permissionKeys.includes(PERMISSIONS.ATTENDANCE_DASHBOARD),
  };
}

/**
 * HTTP handlers for attendance, shifts, and dashboard.
 */
export function createAttendanceController(deps: {
  readonly createShift: CreateShiftUseCase;
  readonly updateShift: UpdateShiftUseCase;
  readonly listShifts: ListShiftsUseCase;
  readonly getShift: GetShiftByIdUseCase;
  readonly assignShift: AssignShiftUseCase;
  readonly listAssignments: ListShiftAssignmentsUseCase;
  readonly checkIn: CheckInUseCase;
  readonly checkOut: CheckOutUseCase;
  readonly listMine: ListMyAttendanceUseCase;
  readonly summary: GetAttendanceSummaryUseCase;
  readonly dashboard: GetAttendanceDashboardUseCase;
  readonly exportCsv: ExportAttendanceCsvUseCase;
}) {
  const listShifts = asyncHandler(async (_req: Request, res: Response) => {
    res.status(200).json({ data: await deps.listShifts.execute() });
  });

  const createShift = asyncHandler(async (req: Request, res: Response) => {
    const body = createShiftSchema.parse(req.body);
    const item = await deps.createShift.execute(body, actor(req).userId);
    res.status(201).json({ data: item });
  });

  const getShift = asyncHandler(async (req: Request, res: Response) => {
    const item = await deps.getShift.execute(routeParam(req.params.id, "id"));
    res.status(200).json({ data: item });
  });

  const updateShift = asyncHandler(async (req: Request, res: Response) => {
    const body = updateShiftSchema.parse(req.body);
    const item = await deps.updateShift.execute(routeParam(req.params.id, "id"), body, actor(req).userId);
    res.status(200).json({ data: item });
  });

  const assignShift = asyncHandler(async (req: Request, res: Response) => {
    const body = assignShiftSchema.parse(req.body);
    const item = await deps.assignShift.execute(
      {
        employeeId: body.employeeId,
        shiftId: routeParam(req.params.id, "id"),
        effectiveFrom: parseWorkDate(body.effectiveFrom),
      },
      actor(req).userId,
    );
    res.status(201).json({ data: item });
  });

  const listAssignments = asyncHandler(async (req: Request, res: Response) => {
    const items = await deps.listAssignments.execute(routeParam(req.params.employeeId, "employeeId"));
    res.status(200).json({ data: items });
  });

  const checkIn = asyncHandler(async (req: Request, res: Response) => {
    const item = await deps.checkIn.execute(actor(req).employeeId);
    res.status(201).json({ data: item });
  });

  const checkOut = asyncHandler(async (req: Request, res: Response) => {
    const item = await deps.checkOut.execute(actor(req).employeeId);
    res.status(200).json({ data: item });
  });

  const listMine = asyncHandler(async (req: Request, res: Response) => {
    const query = attendanceRangeQuerySchema.parse(req.query);
    const items = await deps.listMine.execute(
      actor(req).employeeId,
      parseWorkDate(query.from),
      parseWorkDate(query.to),
    );
    res.status(200).json({ data: items });
  });

  const summary = asyncHandler(async (req: Request, res: Response) => {
    const query = attendanceSummaryQuerySchema.parse(req.query);
    if ((query.from && !query.to) || (!query.from && query.to)) {
      throw new ValidationError("from and to must be provided together");
    }
    const item = await deps.summary.execute(scopeFrom(req), {
      employeeId: query.employeeId,
      period: query.period,
      from: query.from ? parseWorkDate(query.from) : undefined,
      to: query.to ? parseWorkDate(query.to) : undefined,
    });
    res.status(200).json({ data: item });
  });

  const dashboard = asyncHandler(async (req: Request, res: Response) => {
    const query = attendanceDashboardQuerySchema.parse(req.query);
    const pagination = parsePagination(query);
    const item = await deps.dashboard.execute(scopeFrom(req), {
      pagination,
      departmentId: query.departmentId,
    });
    res.status(200).json({ data: item, meta: item.meta });
  });

  const exportCsv = asyncHandler(async (req: Request, res: Response) => {
    const query = attendanceRangeQuerySchema.parse(req.query);
    const csv = await deps.exportCsv.execute(parseWorkDate(query.from), parseWorkDate(query.to));
    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.status(200).send(csv);
  });

  return {
    listShifts,
    createShift,
    getShift,
    updateShift,
    assignShift,
    listAssignments,
    checkIn,
    checkOut,
    listMine,
    summary,
    dashboard,
    exportCsv,
  };
}
