import { Global, Module } from '@nestjs/common';
import { ConfigService } from '../../config/config.service';
import { S3Client } from './s3.client';
import { S3_CLIENT } from './s3-storage.port';
import { UnconfiguredS3Storage } from './unconfigured.s3-storage';

@Global()
@Module({
  providers: [
    S3Client,
    UnconfiguredS3Storage,
    {
      provide: S3_CLIENT,
      inject: [ConfigService, S3Client, UnconfiguredS3Storage],
      useFactory: (config: ConfigService, client: S3Client, unconfigured: UnconfiguredS3Storage) =>
        config.studentPhotosConfigured ? client : unconfigured,
    },
  ],
  exports: [S3_CLIENT],
})
export class S3Module {}
