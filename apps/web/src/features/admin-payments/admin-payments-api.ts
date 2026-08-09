import { z } from 'zod';
import { apiRequest } from '@/lib/api-client';

const transactionSchema = z.object({
  id: z.string(),
  version: z.number(),
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

export const offlineDestinationSchema = z.object({
  id: z.string(), version: z.number(), accountOwner: z.string(), bankName: z.string(),
  cardNumber: z.string(), iban: z.string().nullable(), accountNumber: z.string().nullable(),
  instructions: z.string(), updatedAt: z.coerce.date(),
});
export type AdminOfflineDestination = z.infer<typeof offlineDestinationSchema>;

export async function getAdminOfflineDestination() {
  const response = await apiRequest<unknown>('/admin/payments/offline-destination', { cache: 'no-store' });
  return response.data === null ? null : offlineDestinationSchema.parse(response.data);
}

export async function configureOfflineDestination(input: {
  expectedVersion?: number; accountOwner: string; bankName: string; cardNumber: string;
  iban?: string; accountNumber?: string; instructions: string; confirmed: boolean;
}) {
  await apiRequest('/admin/payments/offline-destination', { method: 'POST', body: input });
}

export async function getAdminPayments(): Promise<{ payments: AdminPayment[] }> {
  const response = await apiRequest<unknown>('/admin/payments', {
    cache: 'no-store',
    timeoutMs: 8_000,
  });
  return { payments: paymentsSchema.parse(response.data) };
}

export async function approvePayment(submissionId: string, version: number): Promise<void> {
  await apiRequest(`/admin/payments/offline-submissions/${submissionId}/approve`, {
    method: 'POST',
    body: { version },
    timeoutMs: 5_000,
  });
}

export async function rejectPayment(submissionId: string, version: number, reason: string): Promise<void> {
  await apiRequest(`/admin/payments/offline-submissions/${submissionId}/reject`, {
    method: 'POST',
    body: { version, reason },
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
