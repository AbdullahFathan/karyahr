import type {
  PayrollEmployeeSnapshot,
  PayslipLine,
  SalaryComponentKind,
} from "../entities/Payroll";
import { computeBpjs, computeOvertimePay, resolvePph21 } from "./compute";
import type { StatutoryRates } from "./rates";

export type AssembledPayslip = {
  readonly grossRupiah: bigint;
  readonly statutoryRupiah: bigint;
  readonly netRupiah: bigint;
  readonly lines: readonly PayslipLine[];
};

function earningKind(kind: SalaryComponentKind): "EARNING" | "DEDUCTION" {
  return kind === "DEDUCTION" ? "DEDUCTION" : "EARNING";
}

/**
 * Builds immutable payslip totals and lines for one employee period.
 */
export function assemblePayslip(input: {
  readonly employee: PayrollEmployeeSnapshot;
  readonly overtimeMinutes: number;
  readonly rates: StatutoryRates;
}): AssembledPayslip {
  const lines: PayslipLine[] = [];
  let basicFixed = 0n;
  let taxableEarnings = 0n;
  let earnings = 0n;
  let componentDeductions = 0n;

  for (const assignment of input.employee.assignments) {
    const { component, amountRupiah } = assignment;
    if (component.kind === "BASIC" || component.kind === "ALLOWANCE_FIXED") {
      basicFixed += amountRupiah;
    }
    if (component.kind === "DEDUCTION") {
      componentDeductions += amountRupiah;
      lines.push({
        code: component.code,
        name: component.name,
        kind: "DEDUCTION",
        amountRupiah,
      });
      continue;
    }
    earnings += amountRupiah;
    if (component.isTaxable) {
      taxableEarnings += amountRupiah;
    }
    lines.push({
      code: component.code,
      name: component.name,
      kind: earningKind(component.kind),
      amountRupiah,
    });
  }

  const hourlyRate =
    input.rates.overtimeDivisorHours > 0n ? basicFixed / input.rates.overtimeDivisorHours : 0n;
  const overtimePay = computeOvertimePay(hourlyRate, input.overtimeMinutes);
  if (overtimePay > 0n) {
    earnings += overtimePay;
    taxableEarnings += overtimePay;
    lines.push({
      code: "OVERTIME",
      name: "Lembur",
      kind: "OVERTIME",
      amountRupiah: overtimePay,
    });
  }

  const bpjs = computeBpjs({
    baseRupiah: basicFixed,
    rates: input.rates,
    kesehatanEnrolled: input.employee.profile.bpjsKesehatanEnrolled,
    tkEnrolled: input.employee.profile.bpjsTkEnrolled,
  });
  if (bpjs.employeeKesehatan > 0n) {
    lines.push({
      code: "BPJS_KES_EE",
      name: "BPJS Kesehatan (karyawan)",
      kind: "BPJS_EMPLOYEE",
      amountRupiah: bpjs.employeeKesehatan,
    });
  }
  if (bpjs.employeeJht > 0n) {
    lines.push({
      code: "BPJS_JHT_EE",
      name: "BPJS JHT (karyawan)",
      kind: "BPJS_EMPLOYEE",
      amountRupiah: bpjs.employeeJht,
    });
  }
  if (bpjs.employeeJp > 0n) {
    lines.push({
      code: "BPJS_JP_EE",
      name: "BPJS JP (karyawan)",
      kind: "BPJS_EMPLOYEE",
      amountRupiah: bpjs.employeeJp,
    });
  }
  if (bpjs.employerTotal > 0n) {
    lines.push({
      code: "BPJS_ER",
      name: "BPJS (perusahaan)",
      kind: "BPJS_EMPLOYER",
      amountRupiah: bpjs.employerTotal,
    });
  }

  const pph = resolvePph21({
    taxableEarnings,
    ptkpStatus: input.employee.profile.ptkpStatus,
    taxMethod: input.employee.profile.taxMethod,
    rates: input.rates,
  });
  if (pph.grossUpAllowance > 0n) {
    earnings += pph.grossUpAllowance;
    lines.push({
      code: "GROSS_UP",
      name: "Tunjangan PPh 21",
      kind: "GROSS_UP_ALLOWANCE",
      amountRupiah: pph.grossUpAllowance,
    });
  }
  if (pph.withheld > 0n) {
    lines.push({
      code: "PPH21",
      name: "PPh 21",
      kind: "PPH21",
      amountRupiah: pph.withheld,
    });
  }
  if (pph.employerPph > 0n) {
    lines.push({
      code: "PPH21_ER",
      name: "PPh 21 (ditanggung perusahaan)",
      kind: "PPH21_EMPLOYER",
      amountRupiah: pph.employerPph,
    });
  }

  const grossRupiah = earnings;
  const statutoryRupiah = bpjs.employeeTotal + pph.withheld;
  const netRupiah = grossRupiah - statutoryRupiah - componentDeductions;
  return {
    grossRupiah,
    statutoryRupiah,
    netRupiah: netRupiah < 0n ? 0n : netRupiah,
    lines,
  };
}
