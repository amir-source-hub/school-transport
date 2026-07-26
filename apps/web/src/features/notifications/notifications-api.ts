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
