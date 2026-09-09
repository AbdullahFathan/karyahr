import type { AesGcmCipher } from "../../../shared/crypto/aes-gcm";
import type { PayslipLine, PayslipLineKind } from "../domain/entities/Payroll";
import { PAYSLIP_LINE_KINDS } from "../domain/entities/Payroll";

const DIGIT_RE = /^-?\d+$/;

/**
 * Encrypts a rupiah amount for storage.
 */
export function encryptRupiah(cipher: AesGcmCipher, amount: bigint): string {
  return cipher.encryptUtf8(amount.toString());
}

/**
 * Decrypts a stored rupiah amount, accepting legacy plaintext digits.
 */
export function decryptRupiah(cipher: AesGcmCipher, stored: string): bigint {
  if (DIGIT_RE.test(stored)) {
    return BigInt(stored);
  }
  return BigInt(cipher.decryptUtf8(stored));
}

/**
 * Encrypts a required UTF-8 PII field.
 */
export function encryptUtf8Field(cipher: AesGcmCipher, value: string): string {
  return cipher.encryptUtf8(value);
}

/**
 * Decrypts a required UTF-8 field, accepting legacy plaintext.
 */
export function decryptUtf8Field(cipher: AesGcmCipher, stored: string): string {
  if (!cipher.isUtf8Envelope(stored)) {
    return stored;
  }
  return cipher.decryptUtf8(stored);
}

/**
 * Encrypts an optional UTF-8 PII field. Empty values stay null.
 */
export function encryptOptionalUtf8Field(
  cipher: AesGcmCipher,
  value: string | null,
): string | null {
  if (value === null || value === "") {
    return null;
  }
  return cipher.encryptUtf8(value);
}

/**
 * Decrypts an optional UTF-8 field, accepting legacy plaintext.
 */
export function decryptOptionalUtf8Field(
  cipher: AesGcmCipher,
  stored: string | null,
): string | null {
  if (stored === null) {
    return null;
  }
  return decryptUtf8Field(cipher, stored);
}

type LineJson = {
  readonly code: string;
  readonly name: string;
  readonly kind: PayslipLineKind;
  readonly amountRupiah: string;
};

/**
 * Serializes payslip lines and encrypts the JSON blob.
 */
export function encryptPayslipLines(cipher: AesGcmCipher, lines: readonly PayslipLine[]): string {
  const payload: LineJson[] = lines.map((line) => ({
    code: line.code,
    name: line.name,
    kind: line.kind,
    amountRupiah: line.amountRupiah.toString(),
  }));
  return cipher.encryptUtf8(JSON.stringify(payload));
}

/**
 * Decrypts payslip lines, accepting a legacy plaintext JSON array.
 */
export function decryptPayslipLines(cipher: AesGcmCipher, stored: string): readonly PayslipLine[] {
  const json = stored.trimStart().startsWith("[") ? stored : cipher.decryptUtf8(stored);
  return parseLineJson(json);
}

function parseLineJson(json: string): readonly PayslipLine[] {
  let parsed: unknown;
  try {
    parsed = JSON.parse(json) as unknown;
  } catch {
    return [];
  }
  if (!Array.isArray(parsed)) {
    return [];
  }
  return parsed.flatMap((item) => {
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
