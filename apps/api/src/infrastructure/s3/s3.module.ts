import { Global, Module } from '@nestjs/common';
import { ConfigService } from '../../config/config.service';
import { S3Client } from './s3.client';
import { S3_CLIENT } from './s3-storage.port';
import { UnconfiguredS3Storage } from './unconfigured.s3-storage';

@Global()
@Module({
  providers: [
    UnconfiguredS3Storage,
    {
      provide: S3_CLIENT,
      inject: [ConfigService, UnconfiguredS3Storage],
      useFactory: (config: ConfigService, unconfigured: UnconfiguredS3Storage) =>
        config.studentPhotosConfigured
          ? new S3Client({
              endpoint: config.arvanS3Endpoint!,
              region: config.arvanS3Region!,
              bucket: config.arvanS3Bucket!,
              accessKey: config.arvanS3AccessKey!,
              secretKey: config.arvanS3SecretKey!,
            })
          : unconfigured,
    },
  ],
  exports: [S3_CLIENT],
})
export class S3Module {}
