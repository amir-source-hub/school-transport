import { z } from 'zod';
import { apiRequest } from '@/lib/api-client';
export const feedbackSchema = z.object({
  id: z.string(),
  senderType: z.string().optional(),
  contactName: z.string().nullable().optional(),
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
export async function getManagerFeedback() {
  const r = await apiRequest<unknown>('/manager/feedback?page=1&pageSize=50', {
    cache: 'no-store',
  });
  return z.array(feedbackSchema).parse(r.data);
}
export async function getAdminFeedback(
  params: { q?: string; status?: string; senderType?: string } = {},
) {
  const query = new URLSearchParams({ page: '1', pageSize: '50' });
  if (params.q) query.set('q', params.q);
  if (params.status) query.set('status', params.status);
  if (params.senderType) query.set('senderType', params.senderType);
  const r = await apiRequest<unknown>(`/admin/feedback?${query}`, { cache: 'no-store' });
  return z.array(feedbackSchema).parse(r.data);
}
export async function getPublicContactMessages(q?: string) {
  const query = new URLSearchParams({ page: '1', pageSize: '50', senderType: 'PUBLIC' });
  if (q) query.set('q', q);
  const r = await apiRequest<unknown>(`/admin/feedback?${query}`, {
    cache: 'no-store',
  });
  return z.array(feedbackSchema).parse(r.data);
}
export async function createPublicContactMessage(body: {
  name: string;
  topic: string;
  message: string;
}) {
  await apiRequest('/public/contact-messages', { method: 'POST', body });
}
export async function createFeedback(body: { category: string; subject: string; message: string }) {
  await apiRequest('/feedback', { method: 'POST', body });
}
export async function createManagerFeedback(body: {
  category: string;
  subject: string;
  message: string;
}) {
  await apiRequest('/manager/feedback', { method: 'POST', body });
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
