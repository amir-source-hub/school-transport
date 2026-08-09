import { z } from 'zod';
import { apiRequest } from '@/lib/api-client';

export const notificationSchema = z.object({
  id: z.string(),
  eventId: z.string().nullable(),
  notificationType: z.string(),
  channel: z.string(),
  purpose: z.string().nullable(),
  title: z.string(),
  message: z.string(),
  relatedEntityType: z.string().nullable(),
  relatedEntityId: z.string().nullable(),
  notificationStatus: z.string(),
  readAt: z.coerce.date().nullable(),
  sentAt: z.coerce.date().nullable(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
  route: z.string().nullable(),
});
export type Notification = z.infer<typeof notificationSchema>;

export const notificationListSchema = z.object({
  items: z.array(notificationSchema),
  total: z.number(),
  page: z.number(),
  pageSize: z.number(),
});
export type NotificationList = z.infer<typeof notificationListSchema>;

export async function getNotifications(page = 1, pageSize = 20) {
  const response = await apiRequest<unknown>(`/notifications?page=${page}&pageSize=${pageSize}`, {
    cache: 'no-store',
  });
  return notificationListSchema.parse(response.data);
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
