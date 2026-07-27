import { Global, Module } from '@nestjs/common';
import { InAppNotificationService } from './in-app-notification.service';

@Global()
@Module({
  providers: [InAppNotificationService],
  exports: [InAppNotificationService],
})
export class InAppNotificationModule {}
