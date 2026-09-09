import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";
import { env } from "../../config/env";
import { EncryptionError } from "../errors/app-error";

const ALGORITHM = "aes-256-gcm";
const VERSION = 1;
const IV_LENGTH = 12;
const TAG_LENGTH = 16;
const KEY_LENGTH = 32;
const ENVELOPE_OVERHEAD = 1 + IV_LENGTH + TAG_LENGTH;

export type AesGcmCipher = {
  encryptUtf8(plain: string): string;
  decryptUtf8(envelope: string): string;
  encryptBytes(plain: Buffer): Buffer;
  decryptBytes(envelope: Buffer): Buffer;
  isUtf8Envelope(value: string): boolean;
  isBytesEnvelope(value: Buffer): boolean;
};

/**
 * Decodes and validates a 32-byte AES key from standard base64.
 */
export function parseEncryptionKey(base64: string): Buffer {
  const key = Buffer.from(base64, "base64");
  if (key.length !== KEY_LENGTH) {
    throw new EncryptionError("ENCRYPTION_KEY must decode to 32 bytes");
  }
  return key;
}

/**
 * Creates an AES-256-GCM cipher that uses the given 32-byte key.
 */
export function createAesGcmCipher(key: Buffer): AesGcmCipher {
  if (key.length !== KEY_LENGTH) {
    throw new EncryptionError("AES-256 key must be 32 bytes");
  }

  function encryptBytes(plain: Buffer): Buffer {
    const iv = randomBytes(IV_LENGTH);
    const cipher = createCipheriv(ALGORITHM, key, iv);
    const ciphertext = Buffer.concat([cipher.update(plain), cipher.final()]);
    const tag = cipher.getAuthTag();
    return Buffer.concat([Buffer.from([VERSION]), iv, ciphertext, tag]);
  }

  function isBytesEnvelope(value: Buffer): boolean {
    return value.length >= ENVELOPE_OVERHEAD && value[0] === VERSION;
  }

  function decryptBytes(envelope: Buffer): Buffer {
    if (!isBytesEnvelope(envelope)) {
      throw new EncryptionError("Ciphertext envelope is truncated or has an unsupported version");
    }
    const iv = envelope.subarray(1, 1 + IV_LENGTH);
    const tag = envelope.subarray(envelope.length - TAG_LENGTH);
    const ciphertext = envelope.subarray(1 + IV_LENGTH, envelope.length - TAG_LENGTH);
    const decipher = createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(tag);
    try {
      return Buffer.concat([decipher.update(ciphertext), decipher.final()]);
    } catch {
      throw new EncryptionError("Ciphertext authentication failed");
    }
  }

  function isUtf8Envelope(value: string): boolean {
    try {
      const trimmed = value.replace(/\s/g, "");
      if (!/^[A-Za-z0-9+/]+={0,2}$/.test(trimmed)) {
        return false;
      }
      const decoded = Buffer.from(trimmed, "base64");
      return decoded.length >= ENVELOPE_OVERHEAD && decoded[0] === VERSION;
    } catch {
      return false;
    }
  }

  return {
    encryptUtf8(plain: string): string {
      return encryptBytes(Buffer.from(plain, "utf8")).toString("base64");
    },
    decryptUtf8(envelope: string): string {
      let decoded: Buffer;
      try {
        decoded = Buffer.from(envelope, "base64");
      } catch {
        throw new EncryptionError("Ciphertext envelope is not valid base64");
      }
      return decryptBytes(decoded).toString("utf8");
    },
    encryptBytes,
    decryptBytes,
    isUtf8Envelope,
    isBytesEnvelope,
  };
}

/**
 * Creates a cipher from the validated ENCRYPTION_KEY environment variable.
 */
export function createAesGcmCipherFromEnv(): AesGcmCipher {
  return createAesGcmCipher(parseEncryptionKey(env().ENCRYPTION_KEY));
}
