import { z } from 'zod';
import { apiRequest } from '@/lib/api-client';

export const notificationSchema = z.object({
  id: z.string(), title: z.string(), message: z.string(), type: z.string(),
  readAt: z.string().nullable(), createdAt: z.string(),
});
export type AdminNotification = z.infer<typeof notificationSchema>;

const rawSchema = z.object({
  id: z.string(), title: z.string(), message: z.string(), notificationType: z.string(),
  notificationStatus: z.string(), sentAt: z.coerce.date().nullable(), createdAt: z.coerce.date(),
});

export async function getAdminNotifications() {
  const response = await apiRequest<unknown>('/admin/notifications', { cache: 'no-store' });
  const notifications = z.array(rawSchema).parse(response.data).map((item) => ({
    id: item.id,
    title: item.title,
    message: item.message,
    type: item.notificationType.includes('PAYMENT') ? 'warning' : 'info',
    readAt: item.notificationStatus === 'PENDING' ? null : item.sentAt?.toISOString() ?? item.createdAt.toISOString(),
    createdAt: item.createdAt.toLocaleString('fa-IR'),
  }));
  return { notifications };
}
