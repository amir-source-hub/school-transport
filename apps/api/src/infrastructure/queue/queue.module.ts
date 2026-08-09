import { Global, Module } from '@nestjs/common';
import { QueueService } from './queue.service';
import { InAppNotificationModule } from '../notifications/in-app-notification.module';
import { StudentPhotosModule } from '../../modules/student-images/student-photos.module';

@Global()
@Module({
  imports: [InAppNotificationModule, StudentPhotosModule],
  providers: [QueueService],
  exports: [QueueService],
})
export class QueueModule {}
