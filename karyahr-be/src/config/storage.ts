import { Client } from "minio";
import { env } from "./env";

let client: Client | undefined;

/**
 * Returns the shared MinIO client.
 */
export function getMinio(): Client {
  if (client) {
    return client;
  }
  const config = env();
  client = new Client({
    endPoint: config.MINIO_ENDPOINT,
    port: config.MINIO_PORT,
    useSSL: config.MINIO_USE_SSL,
    accessKey: config.MINIO_ACCESS_KEY,
    secretKey: config.MINIO_SECRET_KEY,
  });
  return client;
}

/**
 * Creates the application bucket when it does not exist.
 */
export async function ensureBucket(): Promise<void> {
  const minio = getMinio();
  const bucket = env().MINIO_BUCKET;
  const exists = await minio.bucketExists(bucket);
  if (!exists) {
    await minio.makeBucket(bucket);
  }
}
