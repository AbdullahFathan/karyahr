import type { PaginationParams } from "../../../../shared/utils/pagination";
import type {
  EmployeePayrollProfile,
  EmployeeSalaryAssignment,
  PayrollEmployeeSnapshot,
  PayrollExport,
  PayrollExportKind,
  PayrollPeriodType,
  PayrollRun,
  PayrollRunSkip,
  PayrollRunStatus,
  Payslip,
  SalaryComponent,
} from "../entities/Payroll";
import type { StatutoryRates } from "../statutory/rates";

export type PayrollListResult<T> = {
  readonly items: readonly T[];
  readonly total: number;
};

export type ISalaryComponentRepository = {
  create(input: Omit<SalaryComponent, "id">): Promise<SalaryComponent>;
  update(id: string, input: Partial<Omit<SalaryComponent, "id" | "code">> & { readonly code?: string }): Promise<SalaryComponent>;
  findById(id: string): Promise<SalaryComponent | null>;
  findByCode(code: string): Promise<SalaryComponent | null>;
  list(): Promise<readonly SalaryComponent[]>;
};

export type IEmployeePayrollProfileRepository = {
  upsert(input: Omit<EmployeePayrollProfile, "id">): Promise<EmployeePayrollProfile>;
  findByEmployeeId(employeeId: string): Promise<EmployeePayrollProfile | null>;
  findByEmployeeIds(employeeIds: readonly string[]): Promise<readonly EmployeePayrollProfile[]>;
};

export type IEmployeeSalaryAssignmentRepository = {
  create(input: Omit<EmployeeSalaryAssignment, "id">): Promise<EmployeeSalaryAssignment>;
  listByEmployee(employeeId: string): Promise<readonly EmployeeSalaryAssignment[]>;
};

export type IStatutorySettingRepository = {
  getRates(): Promise<StatutoryRates>;
};

export type CreatePayrollRunInput = {
  readonly periodType: PayrollPeriodType;
  readonly periodStart: Date;
  readonly periodEnd: Date;
  readonly triggeredByUserId: string;
};

export type IPayrollRunRepository = {
  create(input: CreatePayrollRunInput): Promise<PayrollRun>;
  findById(id: string): Promise<PayrollRun | null>;
  list(pagination: PaginationParams): Promise<PayrollListResult<PayrollRun>>;
  markProcessing(id: string): Promise<PayrollRun | null>;
  complete(
    id: string,
    input: {
      readonly status: Extract<PayrollRunStatus, "COMPLETED" | "FAILED">;
      readonly processedCount: number;
      readonly skippedCount: number;
      readonly skipReasons: readonly PayrollRunSkip[];
      readonly errorMessage: string | null;
    },
  ): Promise<PayrollRun>;
};

export type IPayslipRepository = {
  create(input: Omit<Payslip, "id">): Promise<Payslip>;
  findById(id: string): Promise<Payslip | null>;
  findByRunAndEmployee(payrollRunId: string, employeeId: string): Promise<Payslip | null>;
  listByRun(payrollRunId: string): Promise<readonly Payslip[]>;
  listByRunPage(
    payrollRunId: string,
    pagination: PaginationParams,
  ): Promise<PayrollListResult<Payslip>>;
  listByEmployee(employeeId: string, from?: Date, to?: Date): Promise<readonly Payslip[]>;
  listByEmployeePage(
    employeeId: string,
    pagination: PaginationParams,
    from?: Date,
    to?: Date,
  ): Promise<PayrollListResult<Payslip>>;
  listByYear(year: number): Promise<readonly Payslip[]>;
  setPdfObjectKey(id: string, objectKey: string): Promise<Payslip>;
};

export type IPayrollExportRepository = {
  create(input: Omit<PayrollExport, "id">): Promise<PayrollExport>;
  findByRunAndKind(payrollRunId: string, kind: PayrollExportKind): Promise<PayrollExport | null>;
};

export type IPayrollEmployeeSource = {
  listEligible(periodStart: Date, periodEnd: Date): Promise<readonly PayrollEmployeeSnapshot[]>;
};

export type IAttendanceHoursLookup = {
  hasOpenInPeriod(employeeId: string, from: Date, to: Date): Promise<boolean>;
  sumOvertimeMinutes(employeeId: string, from: Date, to: Date): Promise<number>;
};

export type IApprovedLeaveDaysLookup = {
  countDays(employeeId: string, from: Date, to: Date): Promise<number>;
};

export type IPayrollJobQueue = {
  enqueueRun(payrollRunId: string): Promise<void>;
  enqueuePayslipPdf(payslipId: string): Promise<void>;
};
