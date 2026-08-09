import {
  notificationPurpose,
  notificationSmsMessage,
  type NotificationPurpose,
} from '../../infrastructure/notifications/notification.catalog';

export type { NotificationPurpose };

export function smsPurposeFor(notificationType: string): NotificationPurpose {
  return notificationPurpose(notificationType);
}

export function safeSmsMessage(notificationType: string): string {
  return notificationSmsMessage(notificationType);
}
