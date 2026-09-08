import type { Readable } from "node:stream";

export type StoredObject = {
  readonly stream: Readable;
  readonly contentType?: string;
  readonly contentLength?: number;
};

/**
 * Object storage port used by employee document use cases.
 */
export type IObjectStorage = {
  putObject(key: string, body: Buffer, contentType: string): Promise<void>;
  getObject(key: string): Promise<StoredObject>;
  deleteObject(key: string): Promise<void>;
};
