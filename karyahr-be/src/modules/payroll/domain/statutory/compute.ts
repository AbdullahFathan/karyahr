import type { PtkpStatus, TaxMethod } from "../entities/Payroll";
import type { StatutoryRates, TerBracket } from "./rates";

/**
 * Applies a basis-point rate to a rupiah amount (100 bps = 1%).
 */
export function applyBps(amount: bigint, bps: bigint): bigint {
  if (amount <= 0n || bps <= 0n) {
    return 0n;
  }
  return (amount * bps) / 10_000n;
}

function cap(amount: bigint, max: bigint): bigint {
  return amount > max ? max : amount < 0n ? 0n : amount;
}

/**
 * Weekday overtime: 1.5x first 60 minutes, 2x thereafter.
 */
export function computeOvertimePay(hourlyRate: bigint, overtimeMinutes: number): bigint {
  if (hourlyRate <= 0n || overtimeMinutes <= 0) {
    return 0n;
  }
  const first = Math.min(60, overtimeMinutes);
  const rest = Math.max(0, overtimeMinutes - first);
  const firstPay = (hourlyRate * 3n * BigInt(first)) / 120n;
  const restPay = (hourlyRate * 2n * BigInt(rest)) / 60n;
  return firstPay + restPay;
}

export type BpjsResult = {
  readonly employeeKesehatan: bigint;
  readonly employeeJht: bigint;
  readonly employeeJp: bigint;
  readonly employeeTotal: bigint;
  readonly employerKesehatan: bigint;
  readonly employerJht: bigint;
  readonly employerJp: bigint;
  readonly employerJkk: bigint;
  readonly employerJkm: bigint;
  readonly employerTotal: bigint;
};

/**
 * Computes BPJS Kesehatan and Ketenagakerjaan using configurable rates and caps.
 */
export function computeBpjs(input: {
  readonly baseRupiah: bigint;
  readonly rates: StatutoryRates;
  readonly kesehatanEnrolled: boolean;
  readonly tkEnrolled: boolean;
}): BpjsResult {
  const kesehatanBase = cap(input.baseRupiah, input.rates.bpjs.kesehatanCapRupiah);
  const jpBase = cap(input.baseRupiah, input.rates.bpjs.jpCapRupiah);
  const employeeKesehatan = input.kesehatanEnrolled
    ? applyBps(kesehatanBase, input.rates.bpjs.kesehatanEmployeeBps)
    : 0n;
  const employerKesehatan = input.kesehatanEnrolled
    ? applyBps(kesehatanBase, input.rates.bpjs.kesehatanEmployerBps)
    : 0n;
  const employeeJht = input.tkEnrolled ? applyBps(input.baseRupiah, input.rates.bpjs.jhtEmployeeBps) : 0n;
  const employerJht = input.tkEnrolled ? applyBps(input.baseRupiah, input.rates.bpjs.jhtEmployerBps) : 0n;
  const employeeJp = input.tkEnrolled ? applyBps(jpBase, input.rates.bpjs.jpEmployeeBps) : 0n;
  const employerJp = input.tkEnrolled ? applyBps(jpBase, input.rates.bpjs.jpEmployerBps) : 0n;
  const employerJkk = input.tkEnrolled ? applyBps(input.baseRupiah, input.rates.bpjs.jkkEmployerBps) : 0n;
  const employerJkm = input.tkEnrolled ? applyBps(input.baseRupiah, input.rates.bpjs.jkmEmployerBps) : 0n;
  return {
    employeeKesehatan,
    employeeJht,
    employeeJp,
    employeeTotal: employeeKesehatan + employeeJht + employeeJp,
    employerKesehatan,
    employerJht,
    employerJp,
    employerJkk,
    employerJkm,
    employerTotal: employerKesehatan + employerJht + employerJp + employerJkk + employerJkm,
  };
}

function terRateBps(brackets: readonly TerBracket[], taxable: bigint): bigint {
  for (const bracket of brackets) {
    if (bracket.upToRupiah === null || taxable <= bracket.upToRupiah) {
      return bracket.rateBps;
    }
  }
  return 0n;
}

/**
 * Monthly TER withholding on a taxable gross amount.
 */
export function computePph21Monthly(input: {
  readonly taxableGross: bigint;
  readonly ptkpStatus: PtkpStatus;
  readonly rates: StatutoryRates;
}): bigint {
  if (input.taxableGross <= 0n) {
    return 0n;
  }
  const category = input.rates.pph21.terCategoryByPtkp[input.ptkpStatus];
  const rate = terRateBps(input.rates.pph21.ter[category], input.taxableGross);
  return applyBps(input.taxableGross, rate);
}

/**
 * Resolves PPh 21 for GROSS, GROSS_UP, and NETT methods.
 */
export function resolvePph21(input: {
  readonly taxableEarnings: bigint;
  readonly ptkpStatus: PtkpStatus;
  readonly taxMethod: TaxMethod;
  readonly rates: StatutoryRates;
}): { readonly withheld: bigint; readonly taxBase: bigint; readonly grossUpAllowance: bigint; readonly employerPph: bigint } {
  if (input.taxMethod === "NETT") {
    const employerPph = computePph21Monthly({
      taxableGross: input.taxableEarnings,
      ptkpStatus: input.ptkpStatus,
      rates: input.rates,
    });
    return { withheld: 0n, taxBase: input.taxableEarnings, grossUpAllowance: 0n, employerPph };
  }
  if (input.taxMethod === "GROSS") {
    const withheld = computePph21Monthly({
      taxableGross: input.taxableEarnings,
      ptkpStatus: input.ptkpStatus,
      rates: input.rates,
    });
    return { withheld, taxBase: input.taxableEarnings, grossUpAllowance: 0n, employerPph: 0n };
  }
  let taxBase = input.taxableEarnings;
  let withheld = 0n;
  for (let index = 0; index < 40; index += 1) {
    withheld = computePph21Monthly({
      taxableGross: taxBase,
      ptkpStatus: input.ptkpStatus,
      rates: input.rates,
    });
    const next = input.taxableEarnings + withheld;
    if (next === taxBase) {
      break;
    }
    taxBase = next;
  }
  const grossUpAllowance = taxBase > input.taxableEarnings ? taxBase - input.taxableEarnings : 0n;
  return { withheld, taxBase, grossUpAllowance, employerPph: 0n };
}
