import { ValidationError } from "../../../../shared/errors/app-error";
import type { PtkpStatus } from "../entities/Payroll";

export type TerBracket = {
  readonly upToRupiah: bigint | null;
  readonly rateBps: bigint;
};

export type StatutoryRates = {
  readonly overtimeDivisorHours: bigint;
  readonly bpjs: {
    readonly kesehatanEmployeeBps: bigint;
    readonly kesehatanEmployerBps: bigint;
    readonly kesehatanCapRupiah: bigint;
    readonly jhtEmployeeBps: bigint;
    readonly jhtEmployerBps: bigint;
    readonly jpEmployeeBps: bigint;
    readonly jpEmployerBps: bigint;
    readonly jpCapRupiah: bigint;
    readonly jkkEmployerBps: bigint;
    readonly jkmEmployerBps: bigint;
  };
  readonly pph21: {
    readonly terCategoryByPtkp: Readonly<Record<PtkpStatus, "A" | "B" | "C">>;
    readonly ter: Readonly<Record<"A" | "B" | "C", readonly TerBracket[]>>;
  };
};

/**
 * Default statutory tables (integer basis points; 100 bps = 1%).
 */
export const DEFAULT_STATUTORY_RATES: StatutoryRates = {
  overtimeDivisorHours: 173n,
  bpjs: {
    kesehatanEmployeeBps: 100n,
    kesehatanEmployerBps: 400n,
    kesehatanCapRupiah: 12_000_000n,
    jhtEmployeeBps: 200n,
    jhtEmployerBps: 370n,
    jpEmployeeBps: 100n,
    jpEmployerBps: 200n,
    jpCapRupiah: 10_547_400n,
    jkkEmployerBps: 24n,
    jkmEmployerBps: 30n,
  },
  pph21: {
    terCategoryByPtkp: {
      TK_0: "A",
      TK_1: "A",
      K_0: "A",
      TK_2: "B",
      TK_3: "B",
      K_1: "B",
      K_2: "B",
      K_3: "C",
    },
    ter: {
      A: [
        { upToRupiah: 5_400_000n, rateBps: 0n },
        { upToRupiah: 5_650_000n, rateBps: 25n },
        { upToRupiah: 6_300_000n, rateBps: 50n },
        { upToRupiah: 6_750_000n, rateBps: 75n },
        { upToRupiah: 7_500_000n, rateBps: 100n },
        { upToRupiah: 8_550_000n, rateBps: 125n },
        { upToRupiah: 9_650_000n, rateBps: 150n },
        { upToRupiah: 10_050_000n, rateBps: 175n },
        { upToRupiah: 10_350_000n, rateBps: 200n },
        { upToRupiah: 11_650_000n, rateBps: 225n },
        { upToRupiah: 12_500_000n, rateBps: 250n },
        { upToRupiah: 13_750_000n, rateBps: 300n },
        { upToRupiah: 15_100_000n, rateBps: 350n },
        { upToRupiah: 16_950_000n, rateBps: 400n },
        { upToRupiah: 19_750_000n, rateBps: 450n },
        { upToRupiah: 24_150_000n, rateBps: 500n },
        { upToRupiah: 26_450_000n, rateBps: 600n },
        { upToRupiah: 28_000_000n, rateBps: 700n },
        { upToRupiah: 30_050_000n, rateBps: 800n },
        { upToRupiah: 32_400_000n, rateBps: 900n },
        { upToRupiah: 35_400_000n, rateBps: 1000n },
        { upToRupiah: 39_100_000n, rateBps: 1100n },
        { upToRupiah: 43_850_000n, rateBps: 1200n },
        { upToRupiah: 47_800_000n, rateBps: 1300n },
        { upToRupiah: 51_400_000n, rateBps: 1400n },
        { upToRupiah: 56_300_000n, rateBps: 1500n },
        { upToRupiah: 62_200_000n, rateBps: 1600n },
        { upToRupiah: 68_600_000n, rateBps: 1700n },
        { upToRupiah: 77_500_000n, rateBps: 1800n },
        { upToRupiah: 89_000_000n, rateBps: 1900n },
        { upToRupiah: 103_000_000n, rateBps: 2000n },
        { upToRupiah: 125_000_000n, rateBps: 2200n },
        { upToRupiah: 157_000_000n, rateBps: 2400n },
        { upToRupiah: 206_000_000n, rateBps: 2600n },
        { upToRupiah: 337_000_000n, rateBps: 2800n },
        { upToRupiah: 454_000_000n, rateBps: 3000n },
        { upToRupiah: 550_000_000n, rateBps: 3100n },
        { upToRupiah: 695_000_000n, rateBps: 3200n },
        { upToRupiah: 910_000_000n, rateBps: 3300n },
        { upToRupiah: 1_400_000_000n, rateBps: 3400n },
        { upToRupiah: null, rateBps: 3500n },
      ],
      B: [
        { upToRupiah: 6_200_000n, rateBps: 0n },
        { upToRupiah: 6_500_000n, rateBps: 25n },
        { upToRupiah: 6_850_000n, rateBps: 50n },
        { upToRupiah: 7_300_000n, rateBps: 75n },
        { upToRupiah: 9_200_000n, rateBps: 100n },
        { upToRupiah: 10_750_000n, rateBps: 150n },
        { upToRupiah: 11_250_000n, rateBps: 200n },
        { upToRupiah: 12_000_000n, rateBps: 250n },
        { upToRupiah: 13_750_000n, rateBps: 300n },
        { upToRupiah: 15_100_000n, rateBps: 350n },
        { upToRupiah: 16_950_000n, rateBps: 400n },
        { upToRupiah: 19_750_000n, rateBps: 450n },
        { upToRupiah: 24_150_000n, rateBps: 500n },
        { upToRupiah: 26_450_000n, rateBps: 600n },
        { upToRupiah: 28_000_000n, rateBps: 700n },
        { upToRupiah: 30_050_000n, rateBps: 800n },
        { upToRupiah: 32_400_000n, rateBps: 900n },
        { upToRupiah: 35_400_000n, rateBps: 1000n },
        { upToRupiah: 39_100_000n, rateBps: 1100n },
        { upToRupiah: 43_850_000n, rateBps: 1200n },
        { upToRupiah: 47_800_000n, rateBps: 1300n },
        { upToRupiah: 51_400_000n, rateBps: 1400n },
        { upToRupiah: 56_300_000n, rateBps: 1500n },
        { upToRupiah: 62_200_000n, rateBps: 1600n },
        { upToRupiah: 68_600_000n, rateBps: 1700n },
        { upToRupiah: 77_500_000n, rateBps: 1800n },
        { upToRupiah: 89_000_000n, rateBps: 1900n },
        { upToRupiah: 103_000_000n, rateBps: 2000n },
        { upToRupiah: 125_000_000n, rateBps: 2200n },
        { upToRupiah: 157_000_000n, rateBps: 2400n },
        { upToRupiah: 206_000_000n, rateBps: 2600n },
        { upToRupiah: 337_000_000n, rateBps: 2800n },
        { upToRupiah: 454_000_000n, rateBps: 3000n },
        { upToRupiah: 550_000_000n, rateBps: 3100n },
        { upToRupiah: 695_000_000n, rateBps: 3200n },
        { upToRupiah: 910_000_000n, rateBps: 3300n },
        { upToRupiah: 1_400_000_000n, rateBps: 3400n },
        { upToRupiah: null, rateBps: 3500n },
      ],
      C: [
        { upToRupiah: 6_600_000n, rateBps: 0n },
        { upToRupiah: 6_950_000n, rateBps: 25n },
        { upToRupiah: 7_350_000n, rateBps: 50n },
        { upToRupiah: 7_800_000n, rateBps: 75n },
        { upToRupiah: 8_850_000n, rateBps: 100n },
        { upToRupiah: 9_800_000n, rateBps: 125n },
        { upToRupiah: 10_990_000n, rateBps: 150n },
        { upToRupiah: 11_230_000n, rateBps: 175n },
        { upToRupiah: 12_060_000n, rateBps: 200n },
        { upToRupiah: 12_150_000n, rateBps: 225n },
        { upToRupiah: 12_950_000n, rateBps: 250n },
        { upToRupiah: 13_100_000n, rateBps: 275n },
        { upToRupiah: 14_100_000n, rateBps: 300n },
        { upToRupiah: 15_100_000n, rateBps: 350n },
        { upToRupiah: 16_950_000n, rateBps: 400n },
        { upToRupiah: 19_750_000n, rateBps: 450n },
        { upToRupiah: 24_150_000n, rateBps: 500n },
        { upToRupiah: 26_450_000n, rateBps: 600n },
        { upToRupiah: 28_000_000n, rateBps: 700n },
        { upToRupiah: 30_050_000n, rateBps: 800n },
        { upToRupiah: 32_400_000n, rateBps: 900n },
        { upToRupiah: 35_400_000n, rateBps: 1000n },
        { upToRupiah: 39_100_000n, rateBps: 1100n },
        { upToRupiah: 43_850_000n, rateBps: 1200n },
        { upToRupiah: 47_800_000n, rateBps: 1300n },
        { upToRupiah: 51_400_000n, rateBps: 1400n },
        { upToRupiah: 56_300_000n, rateBps: 1500n },
        { upToRupiah: 62_200_000n, rateBps: 1600n },
        { upToRupiah: 68_600_000n, rateBps: 1700n },
        { upToRupiah: 77_500_000n, rateBps: 1800n },
        { upToRupiah: 89_000_000n, rateBps: 1900n },
        { upToRupiah: 103_000_000n, rateBps: 2000n },
        { upToRupiah: 125_000_000n, rateBps: 2200n },
        { upToRupiah: 157_000_000n, rateBps: 2400n },
        { upToRupiah: 206_000_000n, rateBps: 2600n },
        { upToRupiah: 337_000_000n, rateBps: 2800n },
        { upToRupiah: 454_000_000n, rateBps: 3000n },
        { upToRupiah: 550_000_000n, rateBps: 3100n },
        { upToRupiah: 695_000_000n, rateBps: 3200n },
        { upToRupiah: 910_000_000n, rateBps: 3300n },
        { upToRupiah: 1_400_000_000n, rateBps: 3400n },
        { upToRupiah: null, rateBps: 3500n },
      ],
    },
  },
};

function toBigInt(value: unknown, path: string): bigint {
  if (typeof value === "bigint") {
    return value;
  }
  if (typeof value === "number" && Number.isFinite(value)) {
    return BigInt(Math.trunc(value));
  }
  if (typeof value === "string" && /^-?\d+$/.test(value)) {
    return BigInt(value);
  }
  throw new ValidationError(`Invalid statutory number at ${path}`);
}

/**
 * Parses statutory JSON from storage into typed integer rates.
 */
export function parseStatutoryRates(payload: unknown): StatutoryRates {
  if (!payload || typeof payload !== "object") {
    throw new ValidationError("Statutory payload must be an object");
  }
  const root = payload as Record<string, unknown>;
  const bpjsRaw = root.bpjs;
  const pphRaw = root.pph21;
  if (!bpjsRaw || typeof bpjsRaw !== "object" || !pphRaw || typeof pphRaw !== "object") {
    throw new ValidationError("Statutory payload is missing bpjs or pph21");
  }
  const bpjs = bpjsRaw as Record<string, unknown>;
  const pph = pphRaw as Record<string, unknown>;
  const terRaw = pph.ter;
  const catRaw = pph.terCategoryByPtkp;
  if (!terRaw || typeof terRaw !== "object" || !catRaw || typeof catRaw !== "object") {
    throw new ValidationError("Statutory pph21 TER tables are missing");
  }
  const terObj = terRaw as Record<string, unknown>;
  const parseBrackets = (key: "A" | "B" | "C"): TerBracket[] => {
    const rows = terObj[key];
    if (!Array.isArray(rows) || rows.length === 0) {
      throw new ValidationError(`TER category ${key} is empty`);
    }
    return rows.map((row, index) => {
      if (!row || typeof row !== "object") {
        throw new ValidationError(`Invalid TER bracket ${key}[${index}]`);
      }
      const item = row as Record<string, unknown>;
      return {
        upToRupiah: item.upToRupiah === null ? null : toBigInt(item.upToRupiah, `${key}.upTo`),
        rateBps: toBigInt(item.rateBps, `${key}.rateBps`),
      };
    });
  };
  const cats = catRaw as Record<string, unknown>;
  const mapCategory = (status: PtkpStatus): "A" | "B" | "C" => {
    const value = cats[status];
    if (value === "A" || value === "B" || value === "C") {
      return value;
    }
    throw new ValidationError(`Invalid TER category for ${status}`);
  };
  return {
    overtimeDivisorHours: toBigInt(root.overtimeDivisorHours, "overtimeDivisorHours"),
    bpjs: {
      kesehatanEmployeeBps: toBigInt(bpjs.kesehatanEmployeeBps, "kesehatanEmployeeBps"),
      kesehatanEmployerBps: toBigInt(bpjs.kesehatanEmployerBps, "kesehatanEmployerBps"),
      kesehatanCapRupiah: toBigInt(bpjs.kesehatanCapRupiah, "kesehatanCapRupiah"),
      jhtEmployeeBps: toBigInt(bpjs.jhtEmployeeBps, "jhtEmployeeBps"),
      jhtEmployerBps: toBigInt(bpjs.jhtEmployerBps, "jhtEmployerBps"),
      jpEmployeeBps: toBigInt(bpjs.jpEmployeeBps, "jpEmployeeBps"),
      jpEmployerBps: toBigInt(bpjs.jpEmployerBps, "jpEmployerBps"),
      jpCapRupiah: toBigInt(bpjs.jpCapRupiah, "jpCapRupiah"),
      jkkEmployerBps: toBigInt(bpjs.jkkEmployerBps, "jkkEmployerBps"),
      jkmEmployerBps: toBigInt(bpjs.jkmEmployerBps, "jkmEmployerBps"),
    },
    pph21: {
      terCategoryByPtkp: {
        TK_0: mapCategory("TK_0"),
        TK_1: mapCategory("TK_1"),
        TK_2: mapCategory("TK_2"),
        TK_3: mapCategory("TK_3"),
        K_0: mapCategory("K_0"),
        K_1: mapCategory("K_1"),
        K_2: mapCategory("K_2"),
        K_3: mapCategory("K_3"),
      },
      ter: {
        A: parseBrackets("A"),
        B: parseBrackets("B"),
        C: parseBrackets("C"),
      },
    },
  };
}

/**
 * Serializes rates for Prisma JSON (numbers stay within JS safe integer range for caps).
 */
export function statutoryRatesToJson(rates: StatutoryRates): Record<string, unknown> {
  const brackets = (rows: readonly TerBracket[]) =>
    rows.map((row) => ({
      upToRupiah: row.upToRupiah === null ? null : Number(row.upToRupiah),
      rateBps: Number(row.rateBps),
    }));
  return {
    overtimeDivisorHours: Number(rates.overtimeDivisorHours),
    bpjs: {
      kesehatanEmployeeBps: Number(rates.bpjs.kesehatanEmployeeBps),
      kesehatanEmployerBps: Number(rates.bpjs.kesehatanEmployerBps),
      kesehatanCapRupiah: Number(rates.bpjs.kesehatanCapRupiah),
      jhtEmployeeBps: Number(rates.bpjs.jhtEmployeeBps),
      jhtEmployerBps: Number(rates.bpjs.jhtEmployerBps),
      jpEmployeeBps: Number(rates.bpjs.jpEmployeeBps),
      jpEmployerBps: Number(rates.bpjs.jpEmployerBps),
      jpCapRupiah: Number(rates.bpjs.jpCapRupiah),
      jkkEmployerBps: Number(rates.bpjs.jkkEmployerBps),
      jkmEmployerBps: Number(rates.bpjs.jkmEmployerBps),
    },
    pph21: {
      terCategoryByPtkp: rates.pph21.terCategoryByPtkp,
      ter: {
        A: brackets(rates.pph21.ter.A),
        B: brackets(rates.pph21.ter.B),
        C: brackets(rates.pph21.ter.C),
      },
    },
  };
}
