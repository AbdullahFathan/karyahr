import { Router } from "express";
import { PrismaAuditLogRepository } from "../../../../shared/audit/PrismaAuditLogRepository";
import { PERMISSIONS } from "../../../../shared/auth/permissions";
import { createAesGcmCipherFromEnv } from "../../../../shared/crypto/aes-gcm";
import { getPrisma } from "../../../../shared/database/prisma";
import { requireAuth } from "../../../../shared/middleware/require-auth";
import { requirePermission } from "../../../../shared/middleware/require-permission";
import { createObjectStorage } from "../../../../shared/storage/createObjectStorage";
import { PrismaEmployeeRepository } from "../../../employees/data/PrismaEmployeeRepository";
import { QueuePayrollJobs } from "../../data/QueuePayrollJobs";
import {
  PrismaEmployeePayrollProfileRepository,
  PrismaEmployeeSalaryAssignmentRepository,
  PrismaPayrollExportRepository,
  PrismaPayrollRunRepository,
  PrismaPayslipRepository,
  PrismaSalaryComponentRepository,
} from "../../data/PrismaPayrollRepository";
import { createPayrollController } from "../controllers/payroll.controller";
import { GeneratePayrollExportUseCase } from "../../domain/usecases/GeneratePayrollExport.usecase";
import {
  GetPayslipPdfUseCase,
  GetPayslipUseCase,
  ListMyPayslipsUseCase,
  ListRunPayslipsUseCase,
} from "../../domain/usecases/PayslipQuery.usecase";
import {
  AssignSalaryUseCase,
  GetPayrollProfileUseCase,
  ListSalaryAssignmentsUseCase,
  UpsertPayrollProfileUseCase,
} from "../../domain/usecases/PayrollProfile.usecase";
import {
  GetPayrollRunUseCase,
  ListPayrollRunsUseCase,
  QueuePayrollRunUseCase,
} from "../../domain/usecases/QueuePayrollRun.usecase";
import {
  CreateSalaryComponentUseCase,
  ListSalaryComponentsUseCase,
  UpdateSalaryComponentUseCase,
} from "../../domain/usecases/SalaryComponent.usecase";

/**
 * Registers payroll catalog, run, payslip, and export routes.
 */
export function createPayrollRouter(): Router {
  const prisma = getPrisma();
  const cipher = createAesGcmCipherFromEnv();
  const audit = new PrismaAuditLogRepository(prisma);
  const employees = new PrismaEmployeeRepository(prisma);
  const components = new PrismaSalaryComponentRepository(prisma);
  const profiles = new PrismaEmployeePayrollProfileRepository(prisma, cipher);
  const assignments = new PrismaEmployeeSalaryAssignmentRepository(prisma, cipher);
  const runs = new PrismaPayrollRunRepository(prisma);
  const payslips = new PrismaPayslipRepository(prisma, cipher);
  const exports = new PrismaPayrollExportRepository(prisma);
  const storage = createObjectStorage();
  const jobs = new QueuePayrollJobs();

  const controller = createPayrollController({
    createComponent: new CreateSalaryComponentUseCase(components, audit),
    updateComponent: new UpdateSalaryComponentUseCase(components, audit),
    listComponents: new ListSalaryComponentsUseCase(components),
    upsertProfile: new UpsertPayrollProfileUseCase(employees, profiles, audit),
    getProfile: new GetPayrollProfileUseCase(profiles),
    assignSalary: new AssignSalaryUseCase(employees, components, assignments, audit),
    listAssignments: new ListSalaryAssignmentsUseCase(assignments),
    queueRun: new QueuePayrollRunUseCase(runs, jobs, audit),
    getRun: new GetPayrollRunUseCase(runs),
    listRuns: new ListPayrollRunsUseCase(runs),
    listMyPayslips: new ListMyPayslipsUseCase(payslips),
    getPayslip: new GetPayslipUseCase(payslips),
    listRunPayslips: new ListRunPayslipsUseCase(runs, payslips),
    getPayslipPdf: new GetPayslipPdfUseCase(payslips, storage),
    generateExport: new GeneratePayrollExportUseCase(
      runs,
      payslips,
      exports,
      employees,
      profiles,
      storage,
    ),
    storage,
  });

  const router = Router();
  router.get(
    "/payroll/components",
    requireAuth,
    requirePermission(PERMISSIONS.PAYROLL_COMPONENTS_WRITE),
    controller.listComponents,
  );
  router.post(
    "/payroll/components",
    requireAuth,
    requirePermission(PERMISSIONS.PAYROLL_COMPONENTS_WRITE),
    controller.createComponent,
  );
  router.patch(
    "/payroll/components/:id",
    requireAuth,
    requirePermission(PERMISSIONS.PAYROLL_COMPONENTS_WRITE),
    controller.updateComponent,
  );
  router.put(
    "/payroll/profiles",
    requireAuth,
    requirePermission(PERMISSIONS.PAYROLL_PROFILE_WRITE),
    controller.upsertProfile,
  );
  router.get(
    "/payroll/profiles/:employeeId",
    requireAuth,
    requirePermission(PERMISSIONS.PAYROLL_PROFILE_WRITE),
    controller.getProfile,
  );
  router.post(
    "/payroll/assignments",
    requireAuth,
    requirePermission(PERMISSIONS.PAYROLL_PROFILE_WRITE),
    controller.assignSalary,
  );
  router.get(
    "/payroll/assignments/:employeeId",
    requireAuth,
    requirePermission(PERMISSIONS.PAYROLL_PROFILE_WRITE),
    controller.listAssignments,
  );
  router.post(
    "/payroll/runs",
    requireAuth,
    requirePermission(PERMISSIONS.PAYROLL_RUNS_WRITE),
    controller.queueRun,
  );
  router.get("/payroll/runs", requireAuth, requirePermission(PERMISSIONS.PAYROLL_RUNS_READ), controller.listRuns);
  router.get("/payroll/runs/:id", requireAuth, requirePermission(PERMISSIONS.PAYROLL_RUNS_READ), controller.getRun);
  router.get(
    "/payroll/runs/:id/payslips",
    requireAuth,
    requirePermission(PERMISSIONS.PAYROLL_RUNS_READ),
    controller.listRunPayslips,
  );
  router.get(
    "/payroll/runs/:id/exports/accounting",
    requireAuth,
    requirePermission(PERMISSIONS.PAYROLL_EXPORT),
    controller.exportAccounting,
  );
  router.get(
    "/payroll/runs/:id/exports/pph21",
    requireAuth,
    requirePermission(PERMISSIONS.PAYROLL_EXPORT),
    controller.exportPph21,
  );
  router.get(
    "/payroll/runs/:id/exports/1721-a1",
    requireAuth,
    requirePermission(PERMISSIONS.PAYROLL_EXPORT),
    controller.export1721,
  );
  router.get(
    "/payroll/runs/:id/exports/bank",
    requireAuth,
    requirePermission(PERMISSIONS.PAYROLL_EXPORT),
    controller.exportBank,
  );
  router.get("/payslips/me", requireAuth, requirePermission(PERMISSIONS.PAYSLIPS_ME), controller.listMyPayslips);
  router.get("/payslips/:id", requireAuth, requirePermission(PERMISSIONS.PAYSLIPS_ME), controller.getPayslip);
  router.get("/payslips/:id/pdf", requireAuth, requirePermission(PERMISSIONS.PAYSLIPS_ME), controller.getPayslipPdf);
  return router;
}
