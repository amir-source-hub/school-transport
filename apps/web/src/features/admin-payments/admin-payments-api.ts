import { z } from 'zod';
import { apiRequest } from '@/lib/api-client';

export const paymentSchema = z.object({
  id: z.string(),
  studentName: z.string(),
  familyName: z.string(),
  invoice: z.string(),
  expectedAmount: z.number(),
  submittedAmount: z.number(),
  reference: z.string(),
  paidAt: z.string(),
  status: z.string(),
});

export const paymentsSchema = z.array(paymentSchema);

export type AdminPayment = z.infer<typeof paymentSchema>;

export async function getAdminPayments(): Promise<{ payments: AdminPayment[] }> {
  const response = await apiRequest<unknown>('/admin/payments', {
    cache: 'no-store',
    timeoutMs: 8_000,
  });
  return { payments: paymentsSchema.parse(response.data) };
}

export async function approvePayment(txId: string): Promise<void> {
  await apiRequest(`/admin/payments/${txId}/approve`, {
    method: 'POST',
    timeoutMs: 5_000,
  });
}

export async function rejectPayment(txId: string): Promise<void> {
  await apiRequest(`/admin/payments/${txId}/reject`, {
    method: 'POST',
    timeoutMs: 5_000,
  });
}

export function getPaymentTone(status: string) {
  if (status === 'تأییدشده') return 'success' as const;
  if (status === 'ردشده') return 'danger' as const;
  return 'warning' as const;
}
