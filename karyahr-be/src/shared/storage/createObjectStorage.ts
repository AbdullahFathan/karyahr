import { createAesGcmCipherFromEnv } from "../crypto/aes-gcm";
import { EncryptingObjectStorage } from "./EncryptingObjectStorage";
import type { IObjectStorage } from "./IObjectStorage";
import { MinioObjectStorage } from "./MinioObjectStorage";

/**
 * Builds the default object storage stack (MinIO + AES-256-GCM at rest).
 */
export function createObjectStorage(): IObjectStorage {
  return new EncryptingObjectStorage(new MinioObjectStorage(), createAesGcmCipherFromEnv());
}
