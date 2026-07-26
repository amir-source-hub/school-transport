import { z } from 'zod';
import { apiRequest } from '@/lib/api-client';

export const pricingEnrollmentSchema = z.object({
  id: z.string(), studentName: z.string(), registrationStatus: z.string(),
  price: z.number().nullable(), contractStatus: z.string(), paymentStarted: z.boolean(),
});
export type PricingEnrollment = z.infer<typeof pricingEnrollmentSchema>;

const registrationSchema = z.object({
  id: z.string(), studentName: z.string(), registrationStatus: z.string(),
});
const priceSchema = z.object({ totalAmount: z.number(), priceStatus: z.string() });
const contractSchema = z.object({
  registrationId: z.string(), contractStatus: z.string(), paymentPlanId: z.string().nullable(),
});

export async function getAdminPricingEnrollments() {
  const [registrationsResponse, contractsResponse] = await Promise.all([
    apiRequest<unknown>('/admin/enrollments', { cache: 'no-store' }),
    apiRequest<unknown>('/admin/contracts', { cache: 'no-store' }),
  ]);
  const registrations = z.array(registrationSchema).parse(registrationsResponse.data);
  const contracts = z.array(contractSchema).parse(contractsResponse.data);
  const enrollments = await Promise.all(registrations.map(async (registration) => {
    const response = await apiRequest<unknown>(`/admin/enrollments/${registration.id}/pricing`, { cache: 'no-store' });
    const prices = z.array(priceSchema).parse(response.data);
    const current = prices.findLast(({ priceStatus }) => priceStatus !== 'REPLACED') ?? null;
    const contract = contracts.find(({ registrationId }) => registrationId === registration.id);
    return {
      id: registration.id,
      studentName: registration.studentName,
      registrationStatus: registration.registrationStatus,
      price: current?.totalAmount ?? null,
      contractStatus: contract?.contractStatus ?? 'بدون قرارداد',
      paymentStarted: Boolean(contract?.paymentPlanId),
    };
  }));
  return { enrollments };
}

export async function setPrice(enrollmentId: string, amount: number) {
  await apiRequest(`/admin/enrollments/${enrollmentId}/pricing`, {
    method: 'POST',
    body: {
      totalAmount: amount,
      prepaymentAmount: Math.round(amount / 3),
      installmentPaymentAllowed: true,
      installmentCount: 4,
    },
  });
}

export function getPriceAction(record: PricingEnrollment) {
  if (record.contractStatus === 'ACCEPTED' || record.paymentStarted) return { allowed: false, label: 'قیمت قفل است' };
  return { allowed: true, label: record.price === null ? 'ثبت قیمت' : 'ویرایش قیمت' };
}
