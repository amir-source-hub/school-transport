import { AppError } from '../../common/errors';
import type { S3Storage } from './s3-storage.port';

export class UnconfiguredS3Storage implements S3Storage {
  private unavailable(): never {
    throw new AppError(
      'PHOTO_STORAGE_UNAVAILABLE',
      'Student photo storage is not configured. Complete the ARVAN_S3_* settings and restart.',
      503,
    );
  }

  presignPut(): string {
    return this.unavailable();
  }

  presignGet(): string {
    return this.unavailable();
  }

  headObject(): Promise<{ size: number; etag: string }> {
    return this.unavailable();
  }

  getObject(): Promise<Buffer> {
    return this.unavailable();
  }

  putObject(): Promise<void> {
    return this.unavailable();
  }

  deleteObject(): Promise<void> {
    return this.unavailable();
  }
}
