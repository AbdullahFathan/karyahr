import { NotFoundError } from "../../../../shared/errors/app-error";
import type { IObjectStorage } from "../../../../shared/storage/IObjectStorage";
import type { IEmployeeRepository } from "../../../employees/domain/repositories/IEmployeeRepository";
import type { PayrollExport, PayrollExportKind, Payslip } from "../entities/Payroll";
import type {
  IEmployeePayrollProfileRepository,
  IPayrollExportRepository,
  IPayrollRunRepository,
  IPayslipRepository,
} from "../repositories/IPayrollRepository";

function csvEscape(value: string): string {
  if (value.includes(",") || value.includes("\"") || value.includes("\n")) {
    return `"${value.replaceAll("\"", "\"\"")}"`;
  }
  return value;
}

function toCsv(headers: readonly string[], rows: readonly (readonly string[])[]): string {
  return [headers.join(","), ...rows.map((row) => row.map(csvEscape).join(","))].join("\n");
}

function lineAmount(payslip: Payslip, kind: Payslip["lines"][number]["kind"]): bigint {
  return payslip.lines
    .filter((line) => line.kind === kind)
    .reduce((sum, line) => sum + line.amountRupiah, 0n);
}

/**
 * Builds CSV payroll artifacts and stores them in object storage.
 */
export class GeneratePayrollExportUseCase {
  constructor(
    private readonly runs: IPayrollRunRepository,
    private readonly payslips: IPayslipRepository,
    private readonly exports: IPayrollExportRepository,
    private readonly employees: IEmployeeRepository,
    private readonly profiles: IEmployeePayrollProfileRepository,
    private readonly storage: IObjectStorage,
  ) {}

  async execute(input: {
    readonly payrollRunId: string;
    readonly kind: PayrollExportKind;
    readonly year?: number;
  }): Promise<PayrollExport> {
    const run = await this.runs.findById(input.payrollRunId);
    if (!run) {
      throw new NotFoundError("Payroll run not found");
    }
    const existing = await this.exports.findByRunAndKind(input.payrollRunId, input.kind);
    if (existing && input.kind !== "PPH21_1721_A1") {
      return existing;
    }
    const slips =
      input.kind === "PPH21_1721_A1"
        ? await this.payslips.listByYear(input.year ?? run.periodStart.getUTCFullYear())
        : await this.payslips.listByRun(run.id);

    let csv: string;
    if (input.kind === "BANK_TRANSFER") {
      csv = await this.bankCsv(slips);
    } else if (input.kind === "PPH21_MONTHLY") {
      csv = this.pphCsv(slips);
    } else if (input.kind === "PPH21_1721_A1") {
      csv = this.annualCsv(slips, input.year ?? run.periodStart.getUTCFullYear());
    } else {
      csv = this.accountingCsv(slips);
    }
    const objectKey = `payroll/exports/${run.id}/${input.kind.toLowerCase()}.csv`;
    await this.storage.putObject(objectKey, Buffer.from(csv, "utf8"), "text/csv");
    if (existing) {
      return existing;
    }
    return this.exports.create({
      payrollRunId: run.id,
      kind: input.kind,
      objectKey,
    });
  }

  private accountingCsv(slips: readonly Payslip[]): string {
    const rows = slips.flatMap((slip) =>
      slip.lines.map((line) => [
        slip.employeeId,
        slip.id,
        line.code,
        line.name,
        line.kind,
        line.amountRupiah.toString(),
      ]),
    );
    return toCsv(["employeeId", "payslipId", "code", "name", "kind", "amountRupiah"], rows);
  }

  private pphCsv(slips: readonly Payslip[]): string {
    const rows = slips.map((slip) => [
      slip.employeeId,
      slip.grossRupiah.toString(),
      (lineAmount(slip, "PPH21") + lineAmount(slip, "PPH21_EMPLOYER")).toString(),
      slip.netRupiah.toString(),
    ]);
    return toCsv(["employeeId", "grossRupiah", "pph21Rupiah", "netRupiah"], rows);
  }

  private annualCsv(slips: readonly Payslip[], year: number): string {
    const totals = new Map<string, { gross: bigint; pph: bigint; net: bigint }>();
    for (const slip of slips) {
      const current = totals.get(slip.employeeId) ?? { gross: 0n, pph: 0n, net: 0n };
      current.gross += slip.grossRupiah;
      current.pph += lineAmount(slip, "PPH21") + lineAmount(slip, "PPH21_EMPLOYER");
      current.net += slip.netRupiah;
      totals.set(slip.employeeId, current);
    }
    const rows = [...totals.entries()].map(([employeeId, total]) => [
      String(year),
      employeeId,
      total.gross.toString(),
      total.pph.toString(),
      total.net.toString(),
    ]);
    return toCsv(["year", "employeeId", "grossRupiah", "pph21Rupiah", "netRupiah"], rows);
  }

  private async bankCsv(slips: readonly Payslip[]): Promise<string> {
    const employeeIds = [...new Set(slips.map((slip) => slip.employeeId))];
    const [employees, profiles] = await Promise.all([
      this.employees.findByIds(employeeIds),
      this.profiles.findByEmployeeIds(employeeIds),
    ]);
    const employeeById = new Map(employees.map((item) => [item.id, item]));
    const profileByEmployeeId = new Map(profiles.map((item) => [item.employeeId, item]));
    const rows: string[][] = [];
    for (const slip of slips) {
      const employee = employeeById.get(slip.employeeId);
      const profile = profileByEmployeeId.get(slip.employeeId);
      rows.push([
        profile?.bankAccountNumber ?? "",
        profile?.bankAccountName ?? employee?.fullName ?? "",
        profile?.bankName ?? "",
        slip.netRupiah.toString(),
        `Gaji ${slip.payrollRunId}`,
      ]);
    }
    return toCsv(["accountNumber", "accountName", "bankName", "amountRupiah", "description"], rows);
  }
}
