import { Readable } from "node:stream";
import type { AesGcmCipher } from "../crypto/aes-gcm";
import type { IObjectStorage, StoredObject } from "./IObjectStorage";

async function readStreamToBuffer(stream: Readable): Promise<Buffer> {
  const chunks: Buffer[] = [];
  for await (const chunk of stream) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }
  return Buffer.concat(chunks);
}

/**
 * Encrypts object bodies at rest via AES-256-GCM before delegating to storage.
 */
export class EncryptingObjectStorage implements IObjectStorage {
  constructor(
    private readonly inner: IObjectStorage,
    private readonly cipher: AesGcmCipher,
  ) {}

  async putObject(key: string, body: Buffer, contentType: string): Promise<void> {
    const encrypted = this.cipher.encryptBytes(body);
    await this.inner.putObject(key, encrypted, contentType);
  }

  async getObject(key: string): Promise<StoredObject> {
    const stored = await this.inner.getObject(key);
    const raw = await readStreamToBuffer(stored.stream);
    const plain = this.cipher.isBytesEnvelope(raw) ? this.cipher.decryptBytes(raw) : raw;
    return {
      stream: Readable.from(plain),
      contentType: stored.contentType,
      contentLength: plain.length,
    };
  }

  async deleteObject(key: string): Promise<void> {
    await this.inner.deleteObject(key);
  }
}
