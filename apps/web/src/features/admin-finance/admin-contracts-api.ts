import { z } from 'zod';
import { apiRequest } from '@/lib/api-client';
import { getAdminPricingEnrollments } from './admin-pricing-api';

export const contractSchema = z.object({
  id: z.string(),
  studentName: z.string(),
  enrollmentId: z.string(),
  price: z.number().nullable(),
  priceStatus: z.string().nullable(),
  status: z.string(),
  version: z.number().optional(),
  issuedAt: z.string().optional(),
  acceptedAt: z.string().nullable().optional(),
});
export type Contract = z.infer<typeof contractSchema>;
const rawContractSchema = z.object({
  id: z.string(),
  registrationId: z.string(),
  contractStatus: z.string(),
  versionNumber: z.number(),
  generatedAt: z.coerce.date().nullable(),
  acceptedAt: z.coerce.date().nullable(),
});

export async function getAdminContracts() {
  const [{ enrollments }, response] = await Promise.all([
    getAdminPricingEnrollments(),
    apiRequest<unknown>('/admin/contracts', { cache: 'no-store' }),
  ]);
  const contracts = z.array(rawContractSchema).parse(response.data);
  return {
    contracts: enrollments.map((enrollment) => {
      const contract = contracts.find(({ registrationId }) => registrationId === enrollment.id);
      return {
        id: contract?.id ?? enrollment.id,
        studentName: enrollment.studentName,
        enrollmentId: enrollment.id,
        price: enrollment.price,
        priceStatus: enrollment.priceStatus,
        status: contract?.contractStatus ?? 'بدون قرارداد',
        version: contract?.versionNumber,
        issuedAt: contract?.generatedAt?.toLocaleDateString('fa-IR'),
        acceptedAt: contract?.acceptedAt?.toLocaleDateString('fa-IR') ?? null,
      };
    }),
  };
}
export async function generateContract(enrollmentId: string) {
  await apiRequest(`/admin/enrollments/${enrollmentId}/contracts`, { method: 'POST' });
}
export function getContractTone(status: string) {
  if (status === 'ACCEPTED') return 'success' as const;
  if (status === 'GENERATED') return 'warning' as const;
  return 'neutral' as const;
}
export function getContractActionLabel(
  status: string,
  price: number | null,
  priceStatus?: string | null,
) {
  if (price === null) return { label: 'در انتظار قیمت' };
  if (priceStatus !== 'ACCEPTED') return { label: 'در انتظار پذیرش قیمت توسط خانواده' };
  if (status === 'ACCEPTED') return { label: 'پذیرفته شده' };
  if (status === 'GENERATED') return { label: 'قرارداد صادرشده' };
  return { label: 'ایجاد قرارداد' };
}
