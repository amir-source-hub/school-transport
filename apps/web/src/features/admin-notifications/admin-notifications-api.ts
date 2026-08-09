import { z } from 'zod';
import { apiRequest } from '@/lib/api-client';

export const adminNotificationSchema = z.object({
  id: z.string(),
  eventId: z.string().nullable(),
  notificationType: z.string(),
  title: z.string(),
  message: z.string(),
  notificationStatus: z.string(),
  eventTime: z.coerce.date(),
  route: z.string().nullable(),
});
export type AdminNotification = z.infer<typeof adminNotificationSchema>;

const listSchema = z.object({
  items: z.array(adminNotificationSchema),
  total: z.number(),
  pageSize: z.number(),
  snapshotAt: z.string().datetime(),
  nextCursor: z.string().nullable(),
});
export type AdminNotificationList = z.infer<typeof listSchema>;

export async function getAdminNotifications(
  params: {
    pageSize?: number;
    cursor?: string;
    snapshotAt?: string;
    type?: string;
    status?: string;
    dateFrom?: string;
    dateTo?: string;
  } = {},
) {
  const query = new URLSearchParams();
  if (params.pageSize) query.set('pageSize', String(params.pageSize));
  if (params.cursor) query.set('cursor', params.cursor);
  if (params.snapshotAt) query.set('snapshotAt', params.snapshotAt);
  if (params.type) query.set('type', params.type);
  if (params.status) query.set('status', params.status);
  if (params.dateFrom) query.set('dateFrom', params.dateFrom);
  if (params.dateTo) query.set('dateTo', params.dateTo);
  const suffix = query.size > 0 ? `?${query.toString()}` : '';
  const response = await apiRequest<unknown>(`/admin/notifications${suffix}`, {
    cache: 'no-store',
  });
  return listSchema.parse(response.data);
}
