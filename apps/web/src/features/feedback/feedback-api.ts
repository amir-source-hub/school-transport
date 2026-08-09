import { z } from 'zod';
import { apiRequest } from '@/lib/api-client';
export const feedbackSchema = z.object({
  id: z.string(),
  studentId: z.string().nullable(),
  category: z.string(),
  subject: z.string(),
  message: z.string(),
  status: z.string(),
  priority: z.string(),
  assigneeId: z.string().nullable(),
  response: z.string().nullable(),
  version: z.number(),
  createdAt: z.coerce.date(),
  respondedAt: z.coerce.date().nullable(),
});
export type Feedback = z.infer<typeof feedbackSchema>;
export async function getMyFeedback() {
  const r = await apiRequest<unknown>('/feedback?page=1&pageSize=50', { cache: 'no-store' });
  return z.array(feedbackSchema).parse(r.data);
}
export async function getAdminFeedback() {
  const r = await apiRequest<unknown>('/admin/feedback?page=1&pageSize=50', { cache: 'no-store' });
  return z.array(feedbackSchema).parse(r.data);
}
export async function createFeedback(body: { category: string; subject: string; message: string }) {
  await apiRequest('/feedback', { method: 'POST', body });
}
export async function feedbackAction(
  item: Feedback,
  action: 'read' | 'close' | 'respond',
  response?: string,
) {
  await apiRequest(`/admin/feedback/${item.id}/${action}`, {
    method: 'PATCH',
    body: action === 'respond' ? { version: item.version, response } : { version: item.version },
  });
}
