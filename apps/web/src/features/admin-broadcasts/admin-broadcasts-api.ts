import { z } from 'zod';
import { apiRequest } from '@/lib/api-client';

export const broadcastInputSchema = z.object({
  name: z.string().min(3).max(120),
  smsContent: z.string().min(2).max(500),
  inAppTitle: z.string().max(200).optional(),
  inAppContent: z.string().max(1000).optional(),
  scheduledAt: z.string(),
  expiresAt: z.string(),
  featureEnabled: z.boolean(),
});
export type BroadcastInput = z.infer<typeof broadcastInputSchema>;

const campaignSchema = z.object({
  id: z.string(),
  name: z.string(),
  smsContent: z.string(),
  inAppTitle: z.string().nullable(),
  inAppContent: z.string().nullable(),
  status: z.string(),
  featureEnabled: z.boolean(),
  segmentCount: z.number(),
  estimatedRecipients: z.number(),
  estimatedCostRial: z.number(),
  creatorId: z.string(),
  approverId: z.string().nullable(),
  scheduledAt: z.coerce.date(),
  expiresAt: z.coerce.date(),
  createdAt: z.coerce.date(),
  deliveryCounts: z.record(z.string(), z.number()),
});
export type BroadcastCampaign = z.infer<typeof campaignSchema>;

const estimateSchema = z.object({
  segmentCount: z.number(),
  estimatedRecipients: z.number(),
  estimatedCostRial: z.number(),
});
export type BroadcastEstimate = z.infer<typeof estimateSchema>;

export async function getBroadcasts() {
  const response = await apiRequest<unknown>('/admin/broadcasts', { cache: 'no-store' });
  return z.array(campaignSchema).parse(response.data);
}

export async function previewBroadcast(input: BroadcastInput) {
  const response = await apiRequest<unknown>('/admin/broadcasts/preview', {
    method: 'POST',
    body: input,
  });
  return estimateSchema.parse(response.data);
}

export async function createBroadcast(input: BroadcastInput) {
  await apiRequest('/admin/broadcasts', { method: 'POST', body: input });
}

export async function broadcastAction(
  id: string,
  action: 'approve' | 'pause' | 'resume' | 'cancel',
) {
  await apiRequest(`/admin/broadcasts/${id}/${action}`, { method: 'POST' });
}

export async function testBroadcast(id: string, phoneNumber: string) {
  await apiRequest(`/admin/broadcasts/${id}/test`, { method: 'POST', body: { phoneNumber } });
}
