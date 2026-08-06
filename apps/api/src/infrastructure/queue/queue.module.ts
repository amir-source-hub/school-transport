import { Global, Module } from '@nestjs/common';
import { QueueService } from './queue.service';
import { InAppNotificationModule } from '../notifications/in-app-notification.module';

@Global()
@Module({
  imports: [InAppNotificationModule],
  providers: [QueueService],
  exports: [QueueService],
})
export class QueueModule {}
