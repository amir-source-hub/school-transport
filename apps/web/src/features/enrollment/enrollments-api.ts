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

export type GuidedEnrollmentInput = {
  student: {
    id?: string;
    firstName: string;
    lastName: string;
    nationalId: string;
    birthDate?: string;
    gender?: string;
  };
  father: { firstName: string; lastName: string; nationalId: string; phoneNumber: string };
  mother: { firstName: string; lastName: string; nationalId: string; phoneNumber: string };
  emergencyContact: { firstName: string; lastName: string; relationship: string; phoneNumber: string };
  address: { title: string; province: string; city: string; district?: string; streetAddress: string; postalCode: string; latitude: number; longitude: number };
  school: { schoolId: string; educationLevel: string; grade: string };
  service: {
    serviceType: string;
    paymentPlanType: 'FULL' | 'INSTALLMENTS';
    parentNotes?: string;
  };
};

const guidedResultSchema = z.object({
  registrationId: z.string(),
  studentId: z.string(),
  contractId: z.string(),
  scheduleItemId: z.string(),
  prepaymentAmount: z.number(),
  contractText: z.string(),
});

export type GuidedEnrollmentResult = z.infer<typeof guidedResultSchema>;

export type EnrollmentMode = 'panel' | 'onboarding';

const enrollmentBase = (mode: EnrollmentMode, suffix: string) =>
  mode === 'onboarding' ? `/onboarding/enrollments${suffix}` : `/enrollments${suffix}`;

const contractBase = (mode: EnrollmentMode, suffix: string) =>
  mode === 'onboarding' ? `/onboarding/contracts${suffix}` : `/contracts${suffix}`;

const paymentBase = (mode: EnrollmentMode, suffix: string) =>
  mode === 'onboarding' ? `/onboarding/payments${suffix}` : `/payments${suffix}`;

export async function createGuidedEnrollment(input: GuidedEnrollmentInput, mode: EnrollmentMode = 'panel') {
  const response = await apiRequest<unknown>(enrollmentBase(mode, '/guided'), {
    method: 'POST',
    body: input,
  });
  return guidedResultSchema.parse(response.data);
}

export async function acceptGuidedContract(contractId: string, mode: EnrollmentMode = 'panel') {
  await apiRequest(contractBase(mode, `/${contractId}/accept`), { method: 'POST' });
}

export async function payGuidedPrepayment(
  scheduleItemId: string,
  mode: EnrollmentMode = 'panel',
) {
  const idempotencyKey = crypto.randomUUID();
  const started = await apiRequest<{ id: string; amount: number }>(
    paymentBase(mode, `/${scheduleItemId}/online/start`),
    { method: 'POST', headers: { 'Idempotency-Key': idempotencyKey } },
  );
  const gatewayTransactionId = `mock:${started.data.amount}:enrollment-${started.data.id}`;
  await apiRequest(paymentBase(mode, `/${started.data.id}/online/verify`), {
    method: 'POST',
    body: { gatewayTransactionId },
  });
}

export async function finalizeOnboarding() {
  await apiRequest<unknown>('/auth/onboarding/finalize', {
    method: 'POST',
    body: { rememberMe: false },
  });
}

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
