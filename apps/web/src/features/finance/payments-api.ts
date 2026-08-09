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

const offlineDestinationSchema = z.object({
  id: z.string(),
  version: z.number(),
  accountOwner: z.string(),
  bankName: z.string(),
  cardNumber: z.string(),
  iban: z.string().nullable(),
  accountNumber: z.string().nullable(),
  instructions: z.string(),
});

export type OfflineDestination = z.infer<typeof offlineDestinationSchema>;

export async function getPayments() {
  const response = await apiRequest<unknown>('/payments', { cache: 'no-store' });
  return overviewSchema.parse(response.data);
}

export async function getOfflineDestination(mode: 'panel' | 'onboarding' = 'panel') {
  const prefix = mode === 'onboarding' ? '/onboarding/payments' : '/payments';
  const response = await apiRequest<unknown>(`${prefix}/offline-destination`, { cache: 'no-store' });
  return offlineDestinationSchema.parse(response.data);
}

export async function getOfflineSubmissions(mode: 'panel' | 'onboarding' = 'panel') {
  const prefix = mode === 'onboarding' ? '/onboarding/payments' : '/payments';
  const response = await apiRequest<unknown>(`${prefix}/offline-submissions`, { cache: 'no-store' });
  return z.array(z.object({
    id: z.string(),
    paymentScheduleItemId: z.string(),
    status: z.string(),
    rejectionReason: z.string().nullable(),
    submittedAt: z.coerce.date(),
  })).parse(response.data);
}

export async function submitOfflinePayment(scheduleItemId: string, input: { paidAt: string; referenceNumber: string; description?: string; payerName?: string; sourceCardLastFour?: string }, mode: 'panel' | 'onboarding' = 'panel', idempotencyKey = crypto.randomUUID()) {
  const prefix = mode === 'onboarding' ? '/onboarding/payments' : '/payments';
  const response = await apiRequest<{ submissionId: string }>(`${prefix}/${scheduleItemId}/offline-submissions`, { method: 'POST', body: input, headers: { 'Idempotency-Key': idempotencyKey } });
  return response.data.submissionId;
}

export async function authorizeReceiptUpload(submissionId: string, file: File, mode: 'panel' | 'onboarding') {
  const prefix = mode === 'onboarding' ? '/onboarding/payments' : '/payments';
  const response = await apiRequest<{ uploadUrl: string }>(`${prefix}/offline-submissions/${submissionId}/receipt/authorize`, {
    method: 'POST', body: { declaredMime: file.type, declaredSize: file.size },
  });
  return response.data.uploadUrl;
}

export async function completeReceiptUpload(submissionId: string, mode: 'panel' | 'onboarding') {
  const prefix = mode === 'onboarding' ? '/onboarding/payments' : '/payments';
  await apiRequest(`${prefix}/offline-submissions/${submissionId}/receipt/complete`, { method: 'POST' });
}

export async function startOnlinePayment(scheduleItemId: string) {
  const response = await apiRequest<{ id: string }>(`/payments/${scheduleItemId}/online/start`, {
    method: 'POST',
    headers: { 'Idempotency-Key': crypto.randomUUID() },
  });
  return response.data;
}

export async function verifyOnlinePayment(
  transactionId: string,
  gatewayTransactionId: string,
) {
  await apiRequest(`/payments/${transactionId}/online/verify`, {
    method: 'POST',
    body: { gatewayTransactionId },
  });
}
