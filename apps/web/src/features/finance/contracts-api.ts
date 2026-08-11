import { z } from 'zod';
import { apiRequest } from '@/lib/api-client';

export const contractSchema = z.object({
  id: z.string(),
  registrationId: z.string(),
  registrationPriceId: z.string(),
  paymentPlanId: z.string().nullable(),
  contractNumber: z.string(),
  contractStatus: z.string(),
  contractDataSnapshot: z.string().nullable(),
  versionNumber: z.number(),
  generatedAt: z.coerce.date().nullable(),
  acceptedAt: z.coerce.date().nullable(),
  studentName: z.string(),
  studentLastName: z.string(),
  academicYear: z.string(),
  serviceType: z.string(),
  totalAmount: z.number(),
  prepaymentAmount: z.number().optional(),
});

const planSchema = z.object({
  plan: z.object({
    id: z.string(),
    totalAmount: z.number(),
    prepaymentAmount: z.number(),
    remainingInstallmentAmount: z.number(),
    planStatus: z.string(),
    planType: z.string(),
  }),
  items: z.array(
    z.object({
      id: z.string(),
      itemType: z.string(),
      sequenceNumber: z.number(),
      amount: z.number(),
      dueDate: z.coerce.date().nullable(),
      itemStatus: z.string(),
      paidAmount: z.number(),
    }),
  ),
});

export type Contract = z.infer<typeof contractSchema>;
export type PaymentPlan = z.infer<typeof planSchema>;

export async function getContracts() {
  const response = await apiRequest<unknown>('/contracts', { cache: 'no-store' });
  return z.array(contractSchema.omit({ prepaymentAmount: true })).parse(response.data);
}

export async function getContract(id: string) {
  const response = await apiRequest<unknown>(`/contracts/${id}`, { cache: 'no-store' });
  return contractSchema.parse(response.data);
}

export async function acceptContract(id: string, templateHash: string, reviewedPages: number[]) {
  await apiRequest(`/contracts/${id}/accept`, {
    method: 'POST',
    body: JSON.stringify({ templateHash, reviewedPages }),
  });
}

export async function rejectContract(id: string) {
  await apiRequest(`/contracts/${id}/reject`, { method: 'POST' });
}

export async function getPaymentPlan(id: string) {
  const response = await apiRequest<unknown>(`/installments/plan/${id}`, { cache: 'no-store' });
  return planSchema.parse(response.data);
}
