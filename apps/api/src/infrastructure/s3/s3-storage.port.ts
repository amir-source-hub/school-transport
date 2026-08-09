export const S3_CLIENT = Symbol('S3_CLIENT');

export interface S3Storage {
  presignPut(key: string, contentType: string, expiresInSeconds: number): string;
  presignGet(key: string, expiresInSeconds: number): string;
  headObject(key: string): Promise<{ size: number; etag: string }>;
  getObject(key: string): Promise<Buffer>;
  putObject(key: string, body: Buffer, contentType: string): Promise<void>;
  deleteObject(key: string): Promise<void>;
}
