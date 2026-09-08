import { env } from "../../config/env";
import { getMinio } from "../../config/storage";
import type { IObjectStorage, StoredObject } from "./IObjectStorage";

/**
 * MinIO implementation of object storage.
 */
export class MinioObjectStorage implements IObjectStorage {
  async putObject(key: string, body: Buffer, contentType: string): Promise<void> {
    const bucket = env().MINIO_BUCKET;
    await getMinio().putObject(bucket, key, body, body.length, {
      "Content-Type": contentType,
    });
  }

  async getObject(key: string): Promise<StoredObject> {
    const bucket = env().MINIO_BUCKET;
    const stream = await getMinio().getObject(bucket, key);
    return { stream };
  }

  async deleteObject(key: string): Promise<void> {
    const bucket = env().MINIO_BUCKET;
    await getMinio().removeObject(bucket, key);
  }
}
