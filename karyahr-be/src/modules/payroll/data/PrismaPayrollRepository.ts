import type { Prisma, PrismaClient } from "../../../../prisma/generated/prisma/client";
import type {
  EmployeePayrollProfile,
  EmployeeSalaryAssignment,
  PayrollEmployeeSnapshot,
  PayrollExport,
  PayrollExportKind,
  PayrollRun,
  PayrollRunSkip,
  Payslip,
  PayslipLine,
  PayslipLineKind,
  SalaryComponent,
} from "../domain/entities/Payroll";
import { PAYSLIP_LINE_KINDS } from "../domain/entities/Payroll";
import type {
  CreatePayrollRunInput,
  IEmployeePayrollProfileRepository,
  IEmployeeSalaryAssignmentRepository,
  IPayrollEmployeeSource,
  IPayrollExportRepository,
  IPayrollRunRepository,
  IPayslipRepository,
  ISalaryComponentRepository,
  IStatutorySettingRepository,
} from "../domain/repositories/IPayrollRepository";
import { DEFAULT_STATUTORY_RATES, parseStatutoryRates } from "../domain/statutory/rates";
import type { StatutoryRates } from "../domain/statutory/rates";

function toComponent(row: {
  id: string;
  code: string;
  name: string;
  kind: SalaryComponent["kind"];
  isTaxable: boolean;
  isActive: boolean;
}): SalaryComponent {
  return {
    id: row.id,
    code: row.code,
    name: row.name,
    kind: row.kind,
    isTaxable: row.isTaxable,
    isActive: row.isActive,
  };
}

function toProfile(row: {
  id: string;
  employeeId: string;
  ptkpStatus: EmployeePayrollProfile["ptkpStatus"];
  taxMethod: EmployeePayrollProfile["taxMethod"];
  npwp: string | null;
  bankName: string;
  bankAccountNumber: string;
  bankAccountName: string;
  bpjsKesehatanEnrolled: boolean;
  bpjsTkEnrolled: boolean;
}): EmployeePayrollProfile {
  return {
    id: row.id,
    employeeId: row.employeeId,
    ptkpStatus: row.ptkpStatus,
    taxMethod: row.taxMethod,
    npwp: row.npwp,
    bankName: row.bankName,
    bankAccountNumber: row.bankAccountNumber,
    bankAccountName: row.bankAccountName,
    bpjsKesehatanEnrolled: row.bpjsKesehatanEnrolled,
    bpjsTkEnrolled: row.bpjsTkEnrolled,
  };
}

function toAssignment(row: {
  id: string;
  employeeId: string;
  componentId: string;
  amountRupiah: bigint;
  effectiveFrom: Date;
  effectiveTo: Date | null;
}): EmployeeSalaryAssignment {
  return {
    id: row.id,
    employeeId: row.employeeId,
    componentId: row.componentId,
    amountRupiah: row.amountRupiah,
    effectiveFrom: row.effectiveFrom,
    effectiveTo: row.effectiveTo,
  };
}

function parseSkips(value: Prisma.JsonValue | null): readonly PayrollRunSkip[] {
  if (!Array.isArray(value)) {
    return [];
  }
  return value.flatMap((item) => {
    if (!item || typeof item !== "object" || Array.isArray(item)) {
      return [];
    }
    const record = item as Record<string, unknown>;
    if (typeof record.employeeId !== "string" || typeof record.reason !== "string") {
      return [];
    }
    return [{ employeeId: record.employeeId, reason: record.reason }];
  });
}

function toRun(row: {
  id: string;
  periodType: PayrollRun["periodType"];
  periodStart: Date;
  periodEnd: Date;
  status: PayrollRun["status"];
  triggeredByUserId: string;
  errorMessage: string | null;
  processedCount: number;
  skippedCount: number;
  skipReasons: Prisma.JsonValue | null;
}): PayrollRun {
  return {
    id: row.id,
    periodType: row.periodType,
    periodStart: row.periodStart,
    periodEnd: row.periodEnd,
    status: row.status,
    triggeredByUserId: row.triggeredByUserId,
    errorMessage: row.errorMessage,
    processedCount: row.processedCount,
    skippedCount: row.skippedCount,
    skipReasons: parseSkips(row.skipReasons),
  };
}

function parseLines(value: Prisma.JsonValue): readonly PayslipLine[] {
  if (!Array.isArray(value)) {
    return [];
  }
  return value.flatMap((item) => {
    if (!item || typeof item !== "object" || Array.isArray(item)) {
      return [];
    }
    const record = item as Record<string, unknown>;
    const kind = record.kind;
    if (
      typeof record.code !== "string" ||
      typeof record.name !== "string" ||
      typeof kind !== "string" ||
      !(PAYSLIP_LINE_KINDS as readonly string[]).includes(kind) ||
      (typeof record.amountRupiah !== "string" && typeof record.amountRupiah !== "number")
    ) {
      return [];
    }
    return [
      {
        code: record.code,
        name: record.name,
        kind: kind as PayslipLineKind,
        amountRupiah: BigInt(record.amountRupiah),
      },
    ];
  });
}

function linesToJson(lines: readonly PayslipLine[]): Prisma.InputJsonValue {
  return lines.map((line) => ({
    code: line.code,
    name: line.name,
    kind: line.kind,
    amountRupiah: line.amountRupiah.toString(),
  }));
}

function toPayslip(row: {
  id: string;
  payrollRunId: string;
  employeeId: string;
  grossRupiah: bigint;
  statutoryRupiah: bigint;
  netRupiah: bigint;
  lines: Prisma.JsonValue;
  pdfObjectKey: string | null;
}): Payslip {
  return {
    id: row.id,
    payrollRunId: row.payrollRunId,
    employeeId: row.employeeId,
    grossRupiah: row.grossRupiah,
    statutoryRupiah: row.statutoryRupiah,
    netRupiah: row.netRupiah,
    lines: parseLines(row.lines),
    pdfObjectKey: row.pdfObjectKey,
  };
}

/**
 * Salary component catalog persistence.
 */
export class PrismaSalaryComponentRepository implements ISalaryComponentRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async create(input: Omit<SalaryComponent, "id">): Promise<SalaryComponent> {
    return toComponent(await this.prisma.salaryComponent.create({ data: input }));
  }

  async update(
    id: string,
    input: Partial<Omit<SalaryComponent, "id" | "code">> & { readonly code?: string },
  ): Promise<SalaryComponent> {
    return toComponent(await this.prisma.salaryComponent.update({ where: { id }, data: input }));
  }

  async findById(id: string): Promise<SalaryComponent | null> {
    const row = await this.prisma.salaryComponent.findUnique({ where: { id } });
    return row ? toComponent(row) : null;
  }

  async findByCode(code: string): Promise<SalaryComponent | null> {
    const row = await this.prisma.salaryComponent.findUnique({ where: { code } });
    return row ? toComponent(row) : null;
  }

  async list(): Promise<readonly SalaryComponent[]> {
    const rows = await this.prisma.salaryComponent.findMany({ orderBy: { code: "asc" } });
    return rows.map(toComponent);
  }
}

/**
 * Employee payroll profile persistence.
 */
export class PrismaEmployeePayrollProfileRepository implements IEmployeePayrollProfileRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async upsert(input: Omit<EmployeePayrollProfile, "id">): Promise<EmployeePayrollProfile> {
    const row = await this.prisma.employeePayrollProfile.upsert({
      where: { employeeId: input.employeeId },
      create: input,
      update: {
        ptkpStatus: input.ptkpStatus,
        taxMethod: input.taxMethod,
        npwp: input.npwp,
        bankName: input.bankName,
        bankAccountNumber: input.bankAccountNumber,
        bankAccountName: input.bankAccountName,
        bpjsKesehatanEnrolled: input.bpjsKesehatanEnrolled,
        bpjsTkEnrolled: input.bpjsTkEnrolled,
      },
    });
    return toProfile(row);
  }

  async findByEmployeeId(employeeId: string): Promise<EmployeePayrollProfile | null> {
    const row = await this.prisma.employeePayrollProfile.findUnique({ where: { employeeId } });
    return row ? toProfile(row) : null;
  }
}

/**
 * Employee salary assignment persistence.
 */
export class PrismaEmployeeSalaryAssignmentRepository implements IEmployeeSalaryAssignmentRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async create(input: Omit<EmployeeSalaryAssignment, "id">): Promise<EmployeeSalaryAssignment> {
    return toAssignment(await this.prisma.employeeSalaryAssignment.create({ data: input }));
  }

  async listByEmployee(employeeId: string): Promise<readonly EmployeeSalaryAssignment[]> {
    const rows = await this.prisma.employeeSalaryAssignment.findMany({
      where: { employeeId },
      orderBy: { effectiveFrom: "desc" },
    });
    return rows.map(toAssignment);
  }
}

/**
 * Statutory rate settings persistence.
 */
export class PrismaStatutorySettingRepository implements IStatutorySettingRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async getRates(): Promise<StatutoryRates> {
    const row = await this.prisma.statutorySetting.findUnique({ where: { key: "default" } });
    if (!row) {
      return DEFAULT_STATUTORY_RATES;
    }
    return parseStatutoryRates(row.payload);
  }
}

/**
 * Payroll run persistence.
 */
export class PrismaPayrollRunRepository implements IPayrollRunRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async create(input: CreatePayrollRunInput): Promise<PayrollRun> {
    return toRun(await this.prisma.payrollRun.create({ data: input }));
  }

  async findById(id: string): Promise<PayrollRun | null> {
    const row = await this.prisma.payrollRun.findUnique({ where: { id } });
    return row ? toRun(row) : null;
  }

  async list(): Promise<readonly PayrollRun[]> {
    const rows = await this.prisma.payrollRun.findMany({ orderBy: { createdAt: "desc" } });
    return rows.map(toRun);
  }

  async markProcessing(id: string): Promise<PayrollRun | null> {
    const updated = await this.prisma.payrollRun.updateMany({
      where: { id, status: "PENDING" },
      data: { status: "PROCESSING" },
    });
    if (updated.count === 0) {
      return null;
    }
    const row = await this.prisma.payrollRun.findUnique({ where: { id } });
    return row ? toRun(row) : null;
  }

  async complete(
    id: string,
    input: {
      readonly status: "COMPLETED" | "FAILED";
      readonly processedCount: number;
      readonly skippedCount: number;
      readonly skipReasons: readonly PayrollRunSkip[];
      readonly errorMessage: string | null;
    },
  ): Promise<PayrollRun> {
    return toRun(
      await this.prisma.payrollRun.update({
        where: { id },
        data: {
          status: input.status,
          processedCount: input.processedCount,
          skippedCount: input.skippedCount,
          skipReasons: input.skipReasons.map((item) => ({ ...item })),
          errorMessage: input.errorMessage,
        },
      }),
    );
  }
}

/**
 * Payslip persistence.
 */
export class PrismaPayslipRepository implements IPayslipRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async create(input: Omit<Payslip, "id">): Promise<Payslip> {
    return toPayslip(
      await this.prisma.payslip.create({
        data: {
          payrollRunId: input.payrollRunId,
          employeeId: input.employeeId,
          grossRupiah: input.grossRupiah,
          statutoryRupiah: input.statutoryRupiah,
          netRupiah: input.netRupiah,
          lines: linesToJson(input.lines),
          pdfObjectKey: input.pdfObjectKey,
        },
      }),
    );
  }

  async findById(id: string): Promise<Payslip | null> {
    const row = await this.prisma.payslip.findUnique({ where: { id } });
    return row ? toPayslip(row) : null;
  }

  async findByRunAndEmployee(payrollRunId: string, employeeId: string): Promise<Payslip | null> {
    const row = await this.prisma.payslip.findUnique({
      where: { payrollRunId_employeeId: { payrollRunId, employeeId } },
    });
    return row ? toPayslip(row) : null;
  }

  async listByRun(payrollRunId: string): Promise<readonly Payslip[]> {
    const rows = await this.prisma.payslip.findMany({
      where: { payrollRunId },
      orderBy: { employeeId: "asc" },
    });
    return rows.map(toPayslip);
  }

  async listByEmployee(employeeId: string, from?: Date, to?: Date): Promise<readonly Payslip[]> {
    const rows = await this.prisma.payslip.findMany({
      where: {
        employeeId,
        run:
          from && to
            ? {
                periodStart: { gte: from },
                periodEnd: { lte: to },
              }
            : undefined,
      },
      orderBy: { createdAt: "desc" },
    });
    return rows.map(toPayslip);
  }

  async listByYear(year: number): Promise<readonly Payslip[]> {
    const start = new Date(Date.UTC(year, 0, 1));
    const end = new Date(Date.UTC(year, 11, 31));
    const rows = await this.prisma.payslip.findMany({
      where: {
        run: {
          status: "COMPLETED",
          periodStart: { gte: start },
          periodEnd: { lte: end },
        },
      },
    });
    return rows.map(toPayslip);
  }

  async setPdfObjectKey(id: string, objectKey: string): Promise<Payslip> {
    return toPayslip(
      await this.prisma.payslip.update({ where: { id }, data: { pdfObjectKey: objectKey } }),
    );
  }
}

/**
 * Payroll export metadata persistence.
 */
export class PrismaPayrollExportRepository implements IPayrollExportRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async create(input: Omit<PayrollExport, "id">): Promise<PayrollExport> {
    const row = await this.prisma.payrollExport.create({ data: input });
    return {
      id: row.id,
      payrollRunId: row.payrollRunId,
      kind: row.kind,
      objectKey: row.objectKey,
    };
  }

  async findByRunAndKind(payrollRunId: string, kind: PayrollExportKind): Promise<PayrollExport | null> {
    const row = await this.prisma.payrollExport.findFirst({
      where: { payrollRunId, kind },
      orderBy: { createdAt: "desc" },
    });
    if (!row) {
      return null;
    }
    return {
      id: row.id,
      payrollRunId: row.payrollRunId,
      kind: row.kind,
      objectKey: row.objectKey,
    };
  }
}

function assignmentOverlaps(from: Date, to: Date) {
  return {
    effectiveFrom: { lte: to },
    OR: [{ effectiveTo: null }, { effectiveTo: { gte: from } }],
  };
}

/**
 * Loads employees eligible for a payroll period.
 */
export class PrismaPayrollEmployeeSource implements IPayrollEmployeeSource {
  constructor(private readonly prisma: PrismaClient) {}

  async listEligible(periodStart: Date, periodEnd: Date): Promise<readonly PayrollEmployeeSnapshot[]> {
    const rows = await this.prisma.employee.findMany({
      where: {
        status: { in: ["ACTIVE", "PROBATION"] },
        payrollProfile: { isNot: null },
      },
      include: {
        user: { select: { id: true } },
        payrollProfile: true,
        salaryAssignments: {
          where: assignmentOverlaps(periodStart, periodEnd),
          include: { component: true },
          orderBy: { effectiveFrom: "desc" },
        },
      },
    });
    return rows.flatMap((row) => {
      if (!row.payrollProfile) {
        return [];
      }
      const latestByComponent = new Map<string, (typeof row.salaryAssignments)[number]>();
      for (const assignment of row.salaryAssignments) {
        if (!assignment.component.isActive) {
          continue;
        }
        if (!latestByComponent.has(assignment.componentId)) {
          latestByComponent.set(assignment.componentId, assignment);
        }
      }
      return [
        {
          employeeId: row.id,
          userId: row.user?.id ?? null,
          fullName: row.fullName,
          employeeNumber: row.employeeNumber,
          profile: toProfile(row.payrollProfile),
          assignments: [...latestByComponent.values()].map((assignment) => ({
            component: toComponent(assignment.component),
            amountRupiah: assignment.amountRupiah,
          })),
        },
      ];
    });
  }
}
