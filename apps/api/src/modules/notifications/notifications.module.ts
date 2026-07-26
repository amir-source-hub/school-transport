import { Module } from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { AdminNotificationsController, NotificationsController } from './notifications.controller';

@Module({
  controllers: [NotificationsController, AdminNotificationsController],
  providers: [NotificationsService],
  exports: [NotificationsService],
})
export class NotificationsModule {}
