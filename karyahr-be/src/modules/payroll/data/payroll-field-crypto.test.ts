import { describe, expect, test } from "bun:test";
import { createAesGcmCipher, parseEncryptionKey } from "../../../shared/crypto/aes-gcm";
import {
  decryptPayslipLines,
  decryptRupiah,
  decryptUtf8Field,
  encryptPayslipLines,
  encryptRupiah,
  encryptUtf8Field,
} from "./payroll-field-crypto";

const cipher = createAesGcmCipher(parseEncryptionKey("BwcHBwcHBwcHBwcHBwcHBwcHBwcHBwcHBwcHBwcHBwc="));

describe("payroll-field-crypto", () => {
  test("encrypted rupiah dump does not contain plaintext amount", () => {
    const stored = encryptRupiah(cipher, 8_000_000n);
    expect(stored).not.toContain("8000000");
    expect(decryptRupiah(cipher, stored)).toBe(8_000_000n);
  });

  test("dual-reads legacy plaintext digit amounts", () => {
    expect(decryptRupiah(cipher, "8000000")).toBe(8_000_000n);
  });

  test("encrypts and decrypts bank account names without leaking plaintext", () => {
    const stored = encryptUtf8Field(cipher, "Siti Rahma");
    expect(stored).not.toContain("Siti");
    expect(decryptUtf8Field(cipher, stored)).toBe("Siti Rahma");
    expect(decryptUtf8Field(cipher, "Siti Rahma")).toBe("Siti Rahma");
  });

  test("encrypts and decrypts bank account numbers", () => {
    const stored = encryptUtf8Field(cipher, "1234567890");
    expect(stored).not.toBe("1234567890");
    expect(decryptUtf8Field(cipher, stored)).toBe("1234567890");
    expect(decryptUtf8Field(cipher, "1234567890")).toBe("1234567890");
  });

  test("encrypts payslip lines as one blob without leaking amounts", () => {
    const stored = encryptPayslipLines(cipher, [
      { code: "BASIC", name: "Gaji pokok", kind: "EARNING", amountRupiah: 8_000_000n },
    ]);
    expect(stored).not.toContain("8000000");
    expect(stored.trimStart().startsWith("[")).toBe(false);
    const lines = decryptPayslipLines(cipher, stored);
    expect(lines).toHaveLength(1);
    expect(lines[0]?.amountRupiah).toBe(8_000_000n);
  });

  test("dual-reads legacy plaintext payslip line JSON", () => {
    const legacy = JSON.stringify([
      { code: "BASIC", name: "Gaji pokok", kind: "EARNING", amountRupiah: "8000000" },
    ]);
    const lines = decryptPayslipLines(cipher, legacy);
    expect(lines[0]?.amountRupiah).toBe(8_000_000n);
  });
});
