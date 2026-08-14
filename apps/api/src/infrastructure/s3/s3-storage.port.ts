export const S3_CLIENT = Symbol('S3_CLIENT');

export interface S3Storage {
  presignPut(key: string, contentType: string, expiresInSeconds: number): string;
  presignGet(key: string, expiresInSeconds: number): string;
  headObject(key: string): Promise<{ size: number; etag: string }>;
  getObject(key: string, maxBytes?: number): Promise<Buffer>;
  putObject(key: string, body: Buffer, contentType: string): Promise<void>;
  deleteObject(key: string): Promise<void>;
}

export async function getObjectAfterWrite(
  storage: S3Storage,
  key: string,
  maxBytes: number,
  attempts = 4,
): Promise<Buffer | null> {
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    try {
      const object = await storage.getObject(key, maxBytes);
      if (Buffer.isBuffer(object)) return object;
    } catch {
      // S3-compatible providers can acknowledge PUT before the read path is ready.
    }
    if (attempt < attempts - 1) {
      await new Promise((resolve) => setTimeout(resolve, 150 * 2 ** attempt));
    }
  }
  return null;
}
