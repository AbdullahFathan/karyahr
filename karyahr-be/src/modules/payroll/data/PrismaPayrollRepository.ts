import type { Prisma, PrismaClient } from "../../../../prisma/generated/prisma/client";
import type { AesGcmCipher } from "../../../shared/crypto/aes-gcm";
import type { PaginationParams } from "../../../shared/utils/pagination";
import type {
  EmployeePayrollProfile,
  EmployeeSalaryAssignment,
  PayrollEmployeeSnapshot,
  PayrollExport,
  PayrollExportKind,
  PayrollRun,
  PayrollRunSkip,
  Payslip,
  SalaryComponent,
} from "../domain/entities/Payroll";
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
  PayrollListResult,
} from "../domain/repositories/IPayrollRepository";
import { DEFAULT_STATUTORY_RATES, parseStatutoryRates } from "../domain/statutory/rates";
import type { StatutoryRates } from "../domain/statutory/rates";
import {
  decryptOptionalUtf8Field,
  decryptPayslipLines,
  decryptRupiah,
  decryptUtf8Field,
  encryptOptionalUtf8Field,
  encryptPayslipLines,
  encryptRupiah,
  encryptUtf8Field,
} from "./payroll-field-crypto";

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

function toProfile(
  row: {
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
  },
  cipher: AesGcmCipher,
): EmployeePayrollProfile {
  return {
    id: row.id,
    employeeId: row.employeeId,
    ptkpStatus: row.ptkpStatus,
    taxMethod: row.taxMethod,
    npwp: decryptOptionalUtf8Field(cipher, row.npwp),
    bankName: row.bankName,
    bankAccountNumber: decryptUtf8Field(cipher, row.bankAccountNumber),
    bankAccountName: row.bankAccountName,
    bpjsKesehatanEnrolled: row.bpjsKesehatanEnrolled,
    bpjsTkEnrolled: row.bpjsTkEnrolled,
  };
}

function toAssignment(
  row: {
    id: string;
    employeeId: string;
    componentId: string;
    amountRupiah: string;
    effectiveFrom: Date;
    effectiveTo: Date | null;
  },
  cipher: AesGcmCipher,
): EmployeeSalaryAssignment {
  return {
    id: row.id,
    employeeId: row.employeeId,
    componentId: row.componentId,
    amountRupiah: decryptRupiah(cipher, row.amountRupiah),
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

function toPayslip(
  row: {
    id: string;
    payrollRunId: string;
    employeeId: string;
    grossRupiah: string;
    statutoryRupiah: string;
    netRupiah: string;
    lines: string;
    pdfObjectKey: string | null;
  },
  cipher: AesGcmCipher,
): Payslip {
  return {
    id: row.id,
    payrollRunId: row.payrollRunId,
    employeeId: row.employeeId,
    grossRupiah: decryptRupiah(cipher, row.grossRupiah),
    statutoryRupiah: decryptRupiah(cipher, row.statutoryRupiah),
    netRupiah: decryptRupiah(cipher, row.netRupiah),
    lines: decryptPayslipLines(cipher, row.lines),
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
  constructor(
    private readonly prisma: PrismaClient,
    private readonly cipher: AesGcmCipher,
  ) {}

  async upsert(input: Omit<EmployeePayrollProfile, "id">): Promise<EmployeePayrollProfile> {
    const npwp = encryptOptionalUtf8Field(this.cipher, input.npwp);
    const bankAccountNumber = encryptUtf8Field(this.cipher, input.bankAccountNumber);
    const row = await this.prisma.employeePayrollProfile.upsert({
      where: { employeeId: input.employeeId },
      create: {
        employeeId: input.employeeId,
        ptkpStatus: input.ptkpStatus,
        taxMethod: input.taxMethod,
        npwp,
        bankName: input.bankName,
        bankAccountNumber,
        bankAccountName: input.bankAccountName,
        bpjsKesehatanEnrolled: input.bpjsKesehatanEnrolled,
        bpjsTkEnrolled: input.bpjsTkEnrolled,
      },
      update: {
        ptkpStatus: input.ptkpStatus,
        taxMethod: input.taxMethod,
        npwp,
        bankName: input.bankName,
        bankAccountNumber,
        bankAccountName: input.bankAccountName,
        bpjsKesehatanEnrolled: input.bpjsKesehatanEnrolled,
        bpjsTkEnrolled: input.bpjsTkEnrolled,
      },
    });
    return toProfile(row, this.cipher);
  }

  async findByEmployeeId(employeeId: string): Promise<EmployeePayrollProfile | null> {
    const row = await this.prisma.employeePayrollProfile.findUnique({ where: { employeeId } });
    return row ? toProfile(row, this.cipher) : null;
  }

  async findByEmployeeIds(employeeIds: readonly string[]): Promise<readonly EmployeePayrollProfile[]> {
    if (employeeIds.length === 0) {
      return [];
    }
    const rows = await this.prisma.employeePayrollProfile.findMany({
      where: { employeeId: { in: [...employeeIds] } },
    });
    return rows.map((row) => toProfile(row, this.cipher));
  }
}

/**
 * Employee salary assignment persistence.
 */
export class PrismaEmployeeSalaryAssignmentRepository implements IEmployeeSalaryAssignmentRepository {
  constructor(
    private readonly prisma: PrismaClient,
    private readonly cipher: AesGcmCipher,
  ) {}

  async create(input: Omit<EmployeeSalaryAssignment, "id">): Promise<EmployeeSalaryAssignment> {
    return toAssignment(
      await this.prisma.employeeSalaryAssignment.create({
        data: {
          employeeId: input.employeeId,
          componentId: input.componentId,
          amountRupiah: encryptRupiah(this.cipher, input.amountRupiah),
          effectiveFrom: input.effectiveFrom,
          effectiveTo: input.effectiveTo,
        },
      }),
      this.cipher,
    );
  }

  async listByEmployee(employeeId: string): Promise<readonly EmployeeSalaryAssignment[]> {
    const rows = await this.prisma.employeeSalaryAssignment.findMany({
      where: { employeeId },
      orderBy: { effectiveFrom: "desc" },
    });
    return rows.map((row) => toAssignment(row, this.cipher));
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

  async list(pagination: PaginationParams): Promise<PayrollListResult<PayrollRun>> {
    const [total, rows] = await Promise.all([
      this.prisma.payrollRun.count(),
      this.prisma.payrollRun.findMany({
        orderBy: { createdAt: "desc" },
        skip: pagination.skip,
        take: pagination.take,
      }),
    ]);
    return { total, items: rows.map(toRun) };
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
  constructor(
    private readonly prisma: PrismaClient,
    private readonly cipher: AesGcmCipher,
  ) {}

  async create(input: Omit<Payslip, "id">): Promise<Payslip> {
    return toPayslip(
      await this.prisma.payslip.create({
        data: {
          payrollRunId: input.payrollRunId,
          employeeId: input.employeeId,
          grossRupiah: encryptRupiah(this.cipher, input.grossRupiah),
          statutoryRupiah: encryptRupiah(this.cipher, input.statutoryRupiah),
          netRupiah: encryptRupiah(this.cipher, input.netRupiah),
          lines: encryptPayslipLines(this.cipher, input.lines),
          pdfObjectKey: input.pdfObjectKey,
        },
      }),
      this.cipher,
    );
  }

  async findById(id: string): Promise<Payslip | null> {
    const row = await this.prisma.payslip.findUnique({ where: { id } });
    return row ? toPayslip(row, this.cipher) : null;
  }

  async findByRunAndEmployee(payrollRunId: string, employeeId: string): Promise<Payslip | null> {
    const row = await this.prisma.payslip.findUnique({
      where: { payrollRunId_employeeId: { payrollRunId, employeeId } },
    });
    return row ? toPayslip(row, this.cipher) : null;
  }

  async listByRun(payrollRunId: string): Promise<readonly Payslip[]> {
    const rows = await this.prisma.payslip.findMany({
      where: { payrollRunId },
      orderBy: { employeeId: "asc" },
    });
    return rows.map((row) => toPayslip(row, this.cipher));
  }

  async listByRunPage(
    payrollRunId: string,
    pagination: PaginationParams,
  ): Promise<PayrollListResult<Payslip>> {
    const where = { payrollRunId };
    const [total, rows] = await Promise.all([
      this.prisma.payslip.count({ where }),
      this.prisma.payslip.findMany({
        where,
        orderBy: { employeeId: "asc" },
        skip: pagination.skip,
        take: pagination.take,
      }),
    ]);
    return { total, items: rows.map((row) => toPayslip(row, this.cipher)) };
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
    return rows.map((row) => toPayslip(row, this.cipher));
  }

  async listByEmployeePage(
    employeeId: string,
    pagination: PaginationParams,
    from?: Date,
    to?: Date,
  ): Promise<PayrollListResult<Payslip>> {
    const where = {
      employeeId,
      run:
        from && to
          ? {
              periodStart: { gte: from },
              periodEnd: { lte: to },
            }
          : undefined,
    };
    const [total, rows] = await Promise.all([
      this.prisma.payslip.count({ where }),
      this.prisma.payslip.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: pagination.skip,
        take: pagination.take,
      }),
    ]);
    return { total, items: rows.map((row) => toPayslip(row, this.cipher)) };
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
    return rows.map((row) => toPayslip(row, this.cipher));
  }

  async setPdfObjectKey(id: string, objectKey: string): Promise<Payslip> {
    return toPayslip(
      await this.prisma.payslip.update({ where: { id }, data: { pdfObjectKey: objectKey } }),
      this.cipher,
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
  constructor(
    private readonly prisma: PrismaClient,
    private readonly cipher: AesGcmCipher,
  ) {}

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
          profile: toProfile(row.payrollProfile, this.cipher),
          assignments: [...latestByComponent.values()].map((assignment) => ({
            component: toComponent(assignment.component),
            amountRupiah: decryptRupiah(this.cipher, assignment.amountRupiah),
          })),
        },
      ];
    });
  }
}
