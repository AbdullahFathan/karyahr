import type { Request, Response } from "express";
import { PERMISSIONS } from "../../../../shared/auth/permissions";
import { UnauthorizedError } from "../../../../shared/errors/app-error";
import { asyncHandler } from "../../../../shared/middleware/async-handler";
import { parseWorkDate } from "../../../../shared/utils/jakarta-time";
import { routeParam } from "../../../../shared/utils/route-param";
import type {
  CreateSalaryComponentUseCase,
  ListSalaryComponentsUseCase,
  UpdateSalaryComponentUseCase,
} from "../../domain/usecases/SalaryComponent.usecase";
import type {
  AssignSalaryUseCase,
  GetPayrollProfileUseCase,
  ListSalaryAssignmentsUseCase,
  UpsertPayrollProfileUseCase,
} from "../../domain/usecases/PayrollProfile.usecase";
import type {
  GetPayrollRunUseCase,
  ListPayrollRunsUseCase,
  QueuePayrollRunUseCase,
} from "../../domain/usecases/QueuePayrollRun.usecase";
import type {
  GetPayslipPdfUseCase,
  GetPayslipUseCase,
  ListMyPayslipsUseCase,
  ListRunPayslipsUseCase,
} from "../../domain/usecases/PayslipQuery.usecase";
import type { GeneratePayrollExportUseCase } from "../../domain/usecases/GeneratePayrollExport.usecase";
import type { IObjectStorage } from "../../../../shared/storage/IObjectStorage";
import {
  assignSalarySchema,
  createPayrollRunSchema,
  createSalaryComponentSchema,
  exportYearQuerySchema,
  payslipRangeQuerySchema,
  updateSalaryComponentSchema,
  upsertPayrollProfileSchema,
} from "../schemas/payroll.schema";
import { serializePayroll } from "../serialize-payroll";

function actor(req: Request) {
  if (!req.auth) {
    throw new UnauthorizedError();
  }
  return {
    userId: req.auth.userId,
    employeeId: req.auth.employeeId,
    canReadAll: req.auth.permissionKeys.includes(PERMISSIONS.PAYROLL_RUNS_READ),
  };
}

/**
 * HTTP handlers for payroll master data, runs, payslips, and exports.
 */
export function createPayrollController(deps: {
  readonly createComponent: CreateSalaryComponentUseCase;
  readonly updateComponent: UpdateSalaryComponentUseCase;
  readonly listComponents: ListSalaryComponentsUseCase;
  readonly upsertProfile: UpsertPayrollProfileUseCase;
  readonly getProfile: GetPayrollProfileUseCase;
  readonly assignSalary: AssignSalaryUseCase;
  readonly listAssignments: ListSalaryAssignmentsUseCase;
  readonly queueRun: QueuePayrollRunUseCase;
  readonly getRun: GetPayrollRunUseCase;
  readonly listRuns: ListPayrollRunsUseCase;
  readonly listMyPayslips: ListMyPayslipsUseCase;
  readonly getPayslip: GetPayslipUseCase;
  readonly listRunPayslips: ListRunPayslipsUseCase;
  readonly getPayslipPdf: GetPayslipPdfUseCase;
  readonly generateExport: GeneratePayrollExportUseCase;
  readonly storage: IObjectStorage;
}) {
  const listComponents = asyncHandler(async (_req: Request, res: Response) => {
    res.status(200).json({ data: serializePayroll(await deps.listComponents.execute()) });
  });

  const createComponent = asyncHandler(async (req: Request, res: Response) => {
    const item = await deps.createComponent.execute(
      createSalaryComponentSchema.parse(req.body),
      actor(req).userId,
    );
    res.status(201).json({ data: serializePayroll(item) });
  });

  const updateComponent = asyncHandler(async (req: Request, res: Response) => {
    const item = await deps.updateComponent.execute(
      routeParam(req.params.id, "id"),
      updateSalaryComponentSchema.parse(req.body),
      actor(req).userId,
    );
    res.status(200).json({ data: serializePayroll(item) });
  });

  const upsertProfile = asyncHandler(async (req: Request, res: Response) => {
    const body = upsertPayrollProfileSchema.parse(req.body);
    const item = await deps.upsertProfile.execute(
      { ...body, npwp: body.npwp ?? null },
      actor(req).userId,
    );
    res.status(200).json({ data: serializePayroll(item) });
  });

  const getProfile = asyncHandler(async (req: Request, res: Response) => {
    const item = await deps.getProfile.execute(routeParam(req.params.employeeId, "employeeId"));
    res.status(200).json({ data: serializePayroll(item) });
  });

  const assignSalary = asyncHandler(async (req: Request, res: Response) => {
    const body = assignSalarySchema.parse(req.body);
    const item = await deps.assignSalary.execute(
      {
        employeeId: body.employeeId,
        componentId: body.componentId,
        amountRupiah: BigInt(body.amountRupiah),
        effectiveFrom: parseWorkDate(body.effectiveFrom),
        effectiveTo: body.effectiveTo ? parseWorkDate(body.effectiveTo) : null,
      },
      actor(req).userId,
    );
    res.status(201).json({ data: serializePayroll(item) });
  });

  const listAssignments = asyncHandler(async (req: Request, res: Response) => {
    const items = await deps.listAssignments.execute(routeParam(req.params.employeeId, "employeeId"));
    res.status(200).json({ data: serializePayroll(items) });
  });

  const queueRun = asyncHandler(async (req: Request, res: Response) => {
    const body = createPayrollRunSchema.parse(req.body);
    const run = await deps.queueRun.execute(
      {
        periodType: body.periodType,
        periodStart: parseWorkDate(body.periodStart),
        periodEnd: parseWorkDate(body.periodEnd),
      },
      actor(req).userId,
    );
    res.status(202).json({ data: serializePayroll(run) });
  });

  const listRuns = asyncHandler(async (_req: Request, res: Response) => {
    res.status(200).json({ data: serializePayroll(await deps.listRuns.execute()) });
  });

  const getRun = asyncHandler(async (req: Request, res: Response) => {
    const run = await deps.getRun.execute(routeParam(req.params.id, "id"));
    res.status(200).json({ data: serializePayroll(run) });
  });

  const listRunPayslips = asyncHandler(async (req: Request, res: Response) => {
    const items = await deps.listRunPayslips.execute(routeParam(req.params.id, "id"));
    res.status(200).json({ data: serializePayroll(items) });
  });

  const listMyPayslips = asyncHandler(async (req: Request, res: Response) => {
    const query = payslipRangeQuerySchema.parse(req.query);
    const items = await deps.listMyPayslips.execute(
      actor(req).employeeId,
      query.from ? parseWorkDate(query.from) : undefined,
      query.to ? parseWorkDate(query.to) : undefined,
    );
    res.status(200).json({ data: serializePayroll(items) });
  });

  const getPayslip = asyncHandler(async (req: Request, res: Response) => {
    const current = actor(req);
    const item = await deps.getPayslip.execute(routeParam(req.params.id, "id"), current);
    res.status(200).json({ data: serializePayroll(item) });
  });

  const getPayslipPdf = asyncHandler(async (req: Request, res: Response) => {
    const file = await deps.getPayslipPdf.execute(routeParam(req.params.id, "id"), actor(req));
    res.setHeader("Content-Type", file.contentType);
    res.setHeader("Content-Disposition", `attachment; filename="${file.fileName}"`);
    file.stream.pipe(res);
  });

  const downloadExport = (kind: "ACCOUNTING" | "PPH21_MONTHLY" | "PPH21_1721_A1" | "BANK_TRANSFER") =>
    asyncHandler(async (req: Request, res: Response) => {
      const query = exportYearQuerySchema.parse(req.query);
      const exported = await deps.generateExport.execute({
        payrollRunId: routeParam(req.params.id, "id"),
        kind,
        year: query.year,
      });
      const object = await deps.storage.getObject(exported.objectKey);
      res.setHeader("Content-Type", object.contentType ?? "text/csv");
      res.setHeader("Content-Disposition", `attachment; filename="${kind.toLowerCase()}.csv"`);
      object.stream.pipe(res);
    });

  return {
    listComponents,
    createComponent,
    updateComponent,
    upsertProfile,
    getProfile,
    assignSalary,
    listAssignments,
    queueRun,
    listRuns,
    getRun,
    listRunPayslips,
    listMyPayslips,
    getPayslip,
    getPayslipPdf,
    exportAccounting: downloadExport("ACCOUNTING"),
    exportPph21: downloadExport("PPH21_MONTHLY"),
    export1721: downloadExport("PPH21_1721_A1"),
    exportBank: downloadExport("BANK_TRANSFER"),
  };
}
