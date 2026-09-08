import type { Request, Response } from "express";
import { asyncHandler } from "../../../../shared/middleware/async-handler";
import { UnauthorizedError } from "../../../../shared/errors/app-error";
import { PERMISSIONS } from "../../../../shared/auth/permissions";
import { routeParam } from "../../../../shared/utils/route-param";
import { parseWorkDate } from "../../../../shared/utils/jakarta-time";
import type {
  CreateLeavePolicyUseCase,
  CreateLeaveTypeUseCase,
  ListLeavePoliciesUseCase,
  ListLeaveTypesUseCase,
  UpdateLeavePolicyUseCase,
  UpdateLeaveTypeUseCase,
} from "../../domain/usecases/LeaveCatalog.usecase";
import type {
  ApproveLeaveRequestUseCase,
  CreateLeaveRequestUseCase,
  ListLeaveInboxUseCase,
  ListMyLeaveBalancesUseCase,
  ListMyLeaveRequestsUseCase,
  RejectLeaveRequestUseCase,
} from "../../domain/usecases/LeaveRequest.usecase";
import {
  createLeavePolicySchema,
  createLeaveRequestSchema,
  createLeaveTypeSchema,
  reviewLeaveSchema,
  updateLeavePolicySchema,
  updateLeaveTypeSchema,
} from "../schemas/leave.schema";

function actor(req: Request) {
  if (!req.auth) {
    throw new UnauthorizedError();
  }
  return {
    userId: req.auth.userId,
    employeeId: req.auth.employeeId,
    isHr: req.auth.permissionKeys.includes(PERMISSIONS.LEAVE_REQUESTS_READ),
  };
}

/**
 * HTTP handlers for leave types, policies, requests, and balances.
 */
export function createLeaveController(deps: {
  readonly createType: CreateLeaveTypeUseCase;
  readonly updateType: UpdateLeaveTypeUseCase;
  readonly listTypes: ListLeaveTypesUseCase;
  readonly createPolicy: CreateLeavePolicyUseCase;
  readonly updatePolicy: UpdateLeavePolicyUseCase;
  readonly listPolicies: ListLeavePoliciesUseCase;
  readonly createRequest: CreateLeaveRequestUseCase;
  readonly listMine: ListMyLeaveRequestsUseCase;
  readonly listInbox: ListLeaveInboxUseCase;
  readonly listBalances: ListMyLeaveBalancesUseCase;
  readonly approve: ApproveLeaveRequestUseCase;
  readonly reject: RejectLeaveRequestUseCase;
}) {
  const listTypes = asyncHandler(async (_req: Request, res: Response) => {
    res.status(200).json({ data: await deps.listTypes.execute() });
  });

  const createType = asyncHandler(async (req: Request, res: Response) => {
    const item = await deps.createType.execute(createLeaveTypeSchema.parse(req.body), actor(req).userId);
    res.status(201).json({ data: item });
  });

  const updateType = asyncHandler(async (req: Request, res: Response) => {
    const item = await deps.updateType.execute(
      routeParam(req.params.id, "id"),
      updateLeaveTypeSchema.parse(req.body),
      actor(req).userId,
    );
    res.status(200).json({ data: item });
  });

  const listPolicies = asyncHandler(async (_req: Request, res: Response) => {
    res.status(200).json({ data: await deps.listPolicies.execute() });
  });

  const createPolicy = asyncHandler(async (req: Request, res: Response) => {
    const body = createLeavePolicySchema.parse(req.body);
    const item = await deps.createPolicy.execute(
      {
        leaveTypeId: body.leaveTypeId,
        departmentId: body.departmentId ?? null,
        positionId: body.positionId ?? null,
        annualAllowanceDays: body.annualAllowanceDays,
        approvalLevelCount: body.approvalLevelCount,
        accrualPerMonth: body.accrualPerMonth,
      },
      actor(req).userId,
    );
    res.status(201).json({ data: item });
  });

  const updatePolicy = asyncHandler(async (req: Request, res: Response) => {
    const item = await deps.updatePolicy.execute(
      routeParam(req.params.id, "id"),
      updateLeavePolicySchema.parse(req.body),
      actor(req).userId,
    );
    res.status(200).json({ data: item });
  });

  const createRequest = asyncHandler(async (req: Request, res: Response) => {
    const body = createLeaveRequestSchema.parse(req.body);
    const file = req.file;
    const item = await deps.createRequest.execute(actor(req), {
      leaveTypeId: body.leaveTypeId,
      startDate: parseWorkDate(body.startDate),
      endDate: parseWorkDate(body.endDate),
      reason: body.reason,
      file: file
        ? {
            buffer: file.buffer,
            fileName: file.originalname,
            contentType: file.mimetype,
          }
        : undefined,
    });
    res.status(201).json({ data: item });
  });

  const listMine = asyncHandler(async (req: Request, res: Response) => {
    res.status(200).json({ data: await deps.listMine.execute(actor(req).employeeId) });
  });

  const listInbox = asyncHandler(async (req: Request, res: Response) => {
    res.status(200).json({ data: await deps.listInbox.execute(actor(req)) });
  });

  const listBalances = asyncHandler(async (req: Request, res: Response) => {
    res.status(200).json({ data: await deps.listBalances.execute(actor(req).employeeId) });
  });

  const approve = asyncHandler(async (req: Request, res: Response) => {
    const body = reviewLeaveSchema.parse(req.body ?? {});
    const item = await deps.approve.execute(
      actor(req),
      routeParam(req.params.id, "id"),
      body.comment ?? null,
    );
    res.status(200).json({ data: item });
  });

  const reject = asyncHandler(async (req: Request, res: Response) => {
    const body = reviewLeaveSchema.parse(req.body ?? {});
    const item = await deps.reject.execute(
      actor(req),
      routeParam(req.params.id, "id"),
      body.comment ?? null,
    );
    res.status(200).json({ data: item });
  });

  return {
    listTypes,
    createType,
    updateType,
    listPolicies,
    createPolicy,
    updatePolicy,
    createRequest,
    listMine,
    listInbox,
    listBalances,
    approve,
    reject,
  };
}
