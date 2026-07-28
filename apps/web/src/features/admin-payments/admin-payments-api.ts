import { z } from 'zod';
import { apiRequest } from '@/lib/api-client';

const transactionSchema = z.object({
  id: z.string(),
  submittedAmount: z.number(),
  reference: z.string(),
  submittedAt: z.string(),
  status: z.string(),
});

const scheduleItemSchema = z.object({
  id: z.string(),
  type: z.string(),
  sequenceNumber: z.number(),
  amount: z.number(),
  dueDate: z.string().nullable(),
  paidAmount: z.number(),
  paidAt: z.string().nullable(),
  paid: z.boolean(),
  transaction: transactionSchema.nullable(),
});

export const paymentSchema = z.object({
  studentId: z.string(),
  planId: z.string(),
  planType: z.string(),
  planStatus: z.string(),
  planConfigured: z.boolean(),
  studentName: z.string(),
  familyName: z.string(),
  totalAmount: z.number(),
  prepayment: scheduleItemSchema,
  installments: z.array(scheduleItemSchema),
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

export async function configureInstallments(planId: string, items: { amount: number; dueDate: string }[]) {
  await apiRequest(`/admin/payments/plans/${planId}/installments`, {
    method: 'POST',
    body: { items },
  });
}

export function getPaymentTone(status: string) {
  if (status === 'تأییدشده') return 'success' as const;
  if (status === 'ردشده') return 'danger' as const;
  return 'warning' as const;
}
