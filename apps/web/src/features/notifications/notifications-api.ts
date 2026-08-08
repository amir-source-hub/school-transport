import { z } from 'zod';
import { apiRequest } from '@/lib/api-client';

export const notificationSchema = z.object({
  id: z.string(), title: z.string(), message: z.string(), notificationType: z.string(),
  notificationStatus: z.string(), createdAt: z.coerce.date(),
});
export type Notification = z.infer<typeof notificationSchema>;
export async function getNotifications() {
  const response = await apiRequest<unknown>('/notifications', { cache: 'no-store' });
  return z.array(notificationSchema).parse(response.data);
}
export async function markNotificationRead(id: string) {
  await apiRequest(`/notifications/${id}/read`, { method: 'PATCH' });
}
export async function markAllNotificationsRead() {
  await apiRequest('/notifications/read-all', { method: 'POST' });
}

const settingsSchema = z.object({
  textVersion: z.string(),
  consentText: z.string(),
  serviceNotices: z.object({ inApp: z.boolean(), sms: z.boolean(), configurable: z.boolean() }),
  optionalUpdates: z.object({ inApp: z.boolean(), sms: z.boolean() }),
});
export type NotificationSettings = z.infer<typeof settingsSchema>;

export async function getNotificationSettings() {
  const response = await apiRequest<unknown>('/notifications/settings', { cache: 'no-store' });
  return settingsSchema.parse(response.data);
}

export async function updateNotificationConsent(
  channel: 'IN_APP' | 'SMS',
  granted: boolean,
  source: 'ONBOARDING' | 'SETTINGS',
) {
  await apiRequest('/notifications/settings', {
    method: 'PATCH',
    body: { channel, purpose: 'OPTIONAL_UPDATES', granted, source },
  });
}
