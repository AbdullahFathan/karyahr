import { describe, expect, test } from "bun:test";
import { computeBpjs, computeOvertimePay, computePph21Monthly, resolvePph21 } from "./compute";
import { assemblePayslip } from "./assemblePayslip";
import { DEFAULT_STATUTORY_RATES } from "./rates";
import type { PayrollEmployeeSnapshot } from "../entities/Payroll";

describe("computeOvertimePay", () => {
  test("pays 1.5x for the first hour", () => {
    const hourly = 10_000n;
    expect(computeOvertimePay(hourly, 60)).toBe(15_000n);
  });

  test("pays 2x after the first hour", () => {
    const hourly = 10_000n;
    expect(computeOvertimePay(hourly, 90)).toBe(15_000n + 10_000n);
  });
});

describe("computeBpjs", () => {
  test("applies the kesehatan cap", () => {
    const result = computeBpjs({
      baseRupiah: 20_000_000n,
      rates: DEFAULT_STATUTORY_RATES,
      kesehatanEnrolled: true,
      tkEnrolled: false,
    });
    expect(result.employeeKesehatan).toBe(120_000n);
    expect(result.employeeJht).toBe(0n);
  });
});

describe("computePph21Monthly", () => {
  test("applies TER category A at 5%", () => {
    const tax = computePph21Monthly({
      taxableGross: 24_150_000n,
      ptkpStatus: "TK_0",
      rates: DEFAULT_STATUTORY_RATES,
    });
    expect(tax).toBe((24_150_000n * 500n) / 10_000n);
  });
});

describe("resolvePph21", () => {
  test("GROSS_UP net of tax equals taxable earnings", () => {
    const taxable = 10_000_000n;
    const resolved = resolvePph21({
      taxableEarnings: taxable,
      ptkpStatus: "TK_0",
      taxMethod: "GROSS_UP",
      rates: DEFAULT_STATUTORY_RATES,
    });
    expect(resolved.taxBase - resolved.withheld).toBe(taxable);
    expect(resolved.grossUpAllowance).toBe(resolved.withheld);
  });

  test("NETT does not withhold from the employee", () => {
    const resolved = resolvePph21({
      taxableEarnings: 10_000_000n,
      ptkpStatus: "TK_0",
      taxMethod: "NETT",
      rates: DEFAULT_STATUTORY_RATES,
    });
    expect(resolved.withheld).toBe(0n);
    expect(resolved.employerPph > 0n).toBe(true);
  });
});

function snapshot(taxMethod: "GROSS" | "GROSS_UP" | "NETT"): PayrollEmployeeSnapshot {
  return {
    employeeId: "e1",
    userId: "u1",
    fullName: "Ada",
    employeeNumber: "EMP-1",
    profile: {
      id: "p1",
      employeeId: "e1",
      ptkpStatus: "TK_0",
      taxMethod,
      npwp: null,
      bankName: "BCA",
      bankAccountNumber: "1",
      bankAccountName: "Ada",
      bpjsKesehatanEnrolled: true,
      bpjsTkEnrolled: true,
    },
    assignments: [
      {
        component: {
          id: "c1",
          code: "BASIC",
          name: "Gaji pokok",
          kind: "BASIC",
          isTaxable: true,
          isActive: true,
        },
        amountRupiah: 8_000_000n,
      },
    ],
  };
}

describe("assemblePayslip", () => {
  test("GROSS slip deducts BPJS and PPh 21", () => {
    const slip = assemblePayslip({
      employee: snapshot("GROSS"),
      overtimeMinutes: 60,
      rates: DEFAULT_STATUTORY_RATES,
    });
    expect(slip.grossRupiah > 8_000_000n).toBe(true);
    expect(slip.statutoryRupiah > 0n).toBe(true);
    expect(slip.netRupiah).toBe(slip.grossRupiah - slip.statutoryRupiah);
    expect(slip.lines.some((line) => line.kind === "OVERTIME")).toBe(true);
    expect(slip.lines.some((line) => line.kind === "PPH21")).toBe(true);
  });
});
