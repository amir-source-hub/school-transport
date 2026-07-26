import { z } from 'zod';
import { apiRequest } from '@/lib/api-client';

const overviewSchema = z.array(z.object({
  plan: z.object({
    id: z.string(),
    totalAmount: z.number(),
    prepaymentAmount: z.number(),
    remainingInstallmentAmount: z.number(),
    installmentCount: z.number(),
    planStatus: z.string(),
    planType: z.string(),
  }),
  studentId: z.string(),
  studentFirstName: z.string(),
  studentLastName: z.string(),
  items: z.array(z.object({
    id: z.string(),
    itemType: z.string(),
    sequenceNumber: z.number(),
    amount: z.number(),
    dueDate: z.coerce.date().nullable(),
    itemStatus: z.string(),
    paidAmount: z.number(),
  })),
  transactions: z.array(z.object({
    id: z.string(),
    paymentScheduleItemId: z.string(),
    amount: z.number(),
    paymentMethod: z.string(),
    gatewayTransactionId: z.string().nullable(),
    transactionStatus: z.string(),
    requestedAt: z.coerce.date(),
    failureMessage: z.string().nullable(),
  })),
}));

export type PaymentOverview = z.infer<typeof overviewSchema>[number];

export async function getPayments() {
  const response = await apiRequest<unknown>('/payments', { cache: 'no-store' });
  return overviewSchema.parse(response.data);
}

export async function submitOfflinePayment(scheduleItemId: string, input: { paidAt: string; referenceNumber: string; description?: string }) {
  await apiRequest(`/payments/${scheduleItemId}/offline-submissions`, { method: 'POST', body: input });
}

export async function startOnlinePayment(scheduleItemId: string) {
  const response = await apiRequest<{ id: string }>(`/payments/${scheduleItemId}/online/start`, {
    method: 'POST',
    headers: { 'Idempotency-Key': crypto.randomUUID() },
  });
  return response.data;
}
