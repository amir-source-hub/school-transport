import { z } from 'zod';
import { apiRequest } from '@/lib/api-client';

export const pricingEnrollmentSchema = z.object({
  id: z.string(),
  studentName: z.string(),
  registrationStatus: z.string(),
  price: z.number().nullable(),
  contractStatus: z.string(),
  paymentStarted: z.boolean(),
});

export const pricingEnrollmentsSchema = z.array(pricingEnrollmentSchema);

export type PricingEnrollment = z.infer<typeof pricingEnrollmentSchema>;

const fallbackEnrollments: PricingEnrollment[] = [
  { id: 'price-001', studentName: 'سارا احمدی', registrationStatus: 'تأییدشده', price: null, contractStatus: 'بدون قرارداد', paymentStarted: false },
  { id: 'price-002', studentName: 'امیر حسینی', registrationStatus: 'تأییدشده', price: 120_000_000, contractStatus: 'صادرشده', paymentStarted: false },
  { id: 'price-003', studentName: 'نرگس محمدی', registrationStatus: 'تأییدشده', price: 150_000_000, contractStatus: 'پذیرفته‌شده', paymentStarted: true },
];

export async function getAdminPricingEnrollments(): Promise<{ enrollments: PricingEnrollment[] }> {
  try {
    const response = await apiRequest<unknown>('/admin/pricing', {
      cache: 'no-store',
      timeoutMs: 5_000,
    });
    return { enrollments: pricingEnrollmentsSchema.parse(response.data) };
  } catch {
    return { enrollments: fallbackEnrollments };
  }
}

export async function setPrice(enrollmentId: string, amount: number): Promise<void> {
  await apiRequest(`/admin/enrollments/${enrollmentId}/pricing`, {
    method: 'POST',
    body: { amount },
    timeoutMs: 5_000,
  });
}

export function getPriceAction(record: PricingEnrollment) {
  if (record.contractStatus === 'پذیرفته‌شده' || record.paymentStarted) {
    return { allowed: false, label: 'قیمت قفل است' };
  }
  return { allowed: true, label: record.price === null ? 'ثبت قیمت' : 'ویرایش قیمت' };
}
