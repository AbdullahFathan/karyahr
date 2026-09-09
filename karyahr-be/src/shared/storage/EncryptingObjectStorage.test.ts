import { describe, expect, test } from "bun:test";
import { Readable } from "node:stream";
import { createAesGcmCipher, parseEncryptionKey } from "../crypto/aes-gcm";
import { EncryptingObjectStorage } from "./EncryptingObjectStorage";
import type { IObjectStorage, StoredObject } from "./IObjectStorage";

class MemoryObjectStorage implements IObjectStorage {
  readonly objects = new Map<string, Buffer>();

  async putObject(key: string, body: Buffer, _contentType: string): Promise<void> {
    this.objects.set(key, Buffer.from(body));
  }

  async getObject(key: string): Promise<StoredObject> {
    const body = this.objects.get(key);
    if (!body) {
      throw new Error(`missing ${key}`);
    }
    return { stream: Readable.from(body), contentLength: body.length };
  }

  async deleteObject(key: string): Promise<void> {
    this.objects.delete(key);
  }
}

const cipher = createAesGcmCipher(parseEncryptionKey("BwcHBwcHBwcHBwcHBwcHBwcHBwcHBwcHBwcHBwcHBwc="));

describe("EncryptingObjectStorage", () => {
  test("round-trips object bytes and stores ciphertext", async () => {
    const inner = new MemoryObjectStorage();
    const storage = new EncryptingObjectStorage(inner, cipher);
    const plain = Buffer.from("payslip-pdf-bytes");

    await storage.putObject("payroll/payslips/1.pdf", plain, "application/pdf");
    const stored = inner.objects.get("payroll/payslips/1.pdf");
    expect(stored).toBeDefined();
    expect(Buffer.compare(stored!, plain)).not.toBe(0);
    expect(stored!.includes(plain)).toBe(false);

    const got = await storage.getObject("payroll/payslips/1.pdf");
    const chunks: Buffer[] = [];
    for await (const chunk of got.stream) {
      chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
    }
    expect(Buffer.compare(Buffer.concat(chunks), plain)).toBe(0);
  });

  test("reads legacy plaintext objects without envelope", async () => {
    const inner = new MemoryObjectStorage();
    const storage = new EncryptingObjectStorage(inner, cipher);
    const legacy = Buffer.from("%PDF-legacy");
    await inner.putObject("employees/1/doc", legacy, "application/pdf");

    const got = await storage.getObject("employees/1/doc");
    const chunks: Buffer[] = [];
    for await (const chunk of got.stream) {
      chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
    }
    expect(Buffer.compare(Buffer.concat(chunks), legacy)).toBe(0);
  });
});
