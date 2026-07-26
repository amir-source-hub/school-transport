import { z } from 'zod';
import { apiRequest } from '@/lib/api-client';

export const enrollmentSchema = z.object({
  id: z.string(),
  studentId: z.string(),
  academicYear: z.string(),
  serviceType: z.string(),
  registrationStatus: z.string(),
  requestedStartDate: z.coerce.date().nullable(),
  parentNotes: z.string().nullable(),
  rejectionReason: z.string().nullable(),
});

export const priceSchema = z.object({
  id: z.string(),
  registrationId: z.string(),
  totalAmount: z.number(),
  currency: z.string(),
  fullPaymentAllowed: z.boolean(),
  installmentPaymentAllowed: z.boolean(),
  prepaymentAmount: z.number(),
  installmentCount: z.number(),
  priceStatus: z.string(),
});

export type Enrollment = z.infer<typeof enrollmentSchema>;
export type EnrollmentPrice = z.infer<typeof priceSchema>;

export async function getEnrollments() {
  const response = await apiRequest<unknown>('/enrollments', { cache: 'no-store' });
  return z.array(enrollmentSchema).parse(response.data);
}

export async function createEnrollment(input: {
  studentId: string;
  academicYear: string;
  serviceType: string;
  requestedStartDate?: string;
  parentNotes?: string;
}) {
  const response = await apiRequest<unknown>('/enrollments', { method: 'POST', body: input });
  return enrollmentSchema.parse(response.data);
}

export async function submitEnrollment(id: string) {
  const response = await apiRequest<unknown>(`/enrollments/${id}/submit`, { method: 'POST' });
  return enrollmentSchema.parse(response.data);
}

export async function cancelEnrollment(id: string) {
  await apiRequest(`/enrollments/${id}/cancel`, { method: 'POST' });
}

export async function getEnrollmentPrices(id: string) {
  const response = await apiRequest<unknown>(`/enrollments/${id}/pricing`, { cache: 'no-store' });
  return z.array(priceSchema).parse(response.data);
}

export async function acceptEnrollmentPrice(
  enrollmentId: string,
  priceId: string,
  planType: 'FULL' | 'PREPAYMENT_PLUS_FOUR_INSTALLMENTS',
) {
  await apiRequest(`/enrollments/${enrollmentId}/pricing/${priceId}/accept`, {
    method: 'POST',
    body: { planType },
  });
}
