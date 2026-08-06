import { Module } from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { AdminNotificationsController, NotificationsController } from './notifications.controller';
import { InAppNotificationModule } from '../../infrastructure/notifications/in-app-notification.module';

@Module({
  imports: [InAppNotificationModule],
  controllers: [NotificationsController, AdminNotificationsController],
  providers: [NotificationsService],
  exports: [NotificationsService],
})
export class NotificationsModule {}
