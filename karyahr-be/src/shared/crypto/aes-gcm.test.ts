import { describe, expect, test } from "bun:test";
import { EncryptionError } from "../errors/app-error";
import { createAesGcmCipher, parseEncryptionKey } from "./aes-gcm";

const TEST_KEY = parseEncryptionKey("BwcHBwcHBwcHBwcHBwcHBwcHBwcHBwcHBwcHBwcHBwc=");

describe("aes-gcm", () => {
  test("round-trips utf8 strings", () => {
    const cipher = createAesGcmCipher(TEST_KEY);
    const envelope = cipher.encryptUtf8("8000000");
    expect(envelope).not.toContain("8000000");
    expect(cipher.decryptUtf8(envelope)).toBe("8000000");
  });

  test("round-trips binary buffers", () => {
    const cipher = createAesGcmCipher(TEST_KEY);
    const plain = Buffer.from([1, 2, 3, 4, 255]);
    const envelope = cipher.encryptBytes(plain);
    expect(envelope[0]).toBe(1);
    expect(Buffer.compare(envelope, plain)).not.toBe(0);
    expect(Buffer.compare(cipher.decryptBytes(envelope), plain)).toBe(0);
  });

  test("rejects tampered auth tags", () => {
    const cipher = createAesGcmCipher(TEST_KEY);
    const envelope = cipher.encryptBytes(Buffer.from("secret"));
    envelope[envelope.length - 1] ^= 0xff;
    expect(() => cipher.decryptBytes(envelope)).toThrow(EncryptionError);
  });

  test("rejects truncated envelopes", () => {
    const cipher = createAesGcmCipher(TEST_KEY);
    expect(() => cipher.decryptBytes(Buffer.from([1, 2, 3]))).toThrow(EncryptionError);
  });

  test("parseEncryptionKey rejects wrong lengths", () => {
    expect(() => parseEncryptionKey(Buffer.alloc(16).toString("base64"))).toThrow(EncryptionError);
  });
});
