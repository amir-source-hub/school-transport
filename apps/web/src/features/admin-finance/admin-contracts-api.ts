import { z } from 'zod';
import { apiRequest } from '@/lib/api-client';

export const contractSchema = z.object({
  id: z.string(),
  studentName: z.string(),
  enrollmentId: z.string(),
  price: z.number().nullable(),
  status: z.string(),
  version: z.number().optional(),
  issuedAt: z.string().optional(),
  acceptedAt: z.string().nullable().optional(),
});

export const contractsSchema = z.array(contractSchema);

export type Contract = z.infer<typeof contractSchema>;

const fallbackContracts: Contract[] = [
  { id: 'contract-001', studentName: 'سارا احمدی', enrollmentId: 'price-001', price: null, status: 'بدون قرارداد', version: 1 },
  { id: 'contract-002', studentName: 'امیر حسینی', enrollmentId: 'price-002', price: 120_000_000, status: 'صادرشده', version: 1, issuedAt: '۱۴۰۴/۰۲/۱۵' },
  { id: 'contract-003', studentName: 'نرگس محمدی', enrollmentId: 'price-003', price: 150_000_000, status: 'پذیرفته‌شده', version: 1, issuedAt: '۱۴۰۴/۰۱/۲۰', acceptedAt: '۱۴۰۴/۰۲/۰۱' },
];

export async function getAdminContracts(): Promise<{ contracts: Contract[] }> {
  try {
    const response = await apiRequest<unknown>('/admin/contracts', {
      cache: 'no-store',
      timeoutMs: 5_000,
    });
    return { contracts: contractsSchema.parse(response.data) };
  } catch {
    return { contracts: fallbackContracts };
  }
}

export async function generateContract(enrollmentId: string): Promise<void> {
  await apiRequest(`/admin/enrollments/${enrollmentId}/contracts`, {
    method: 'POST',
    timeoutMs: 5_000,
  });
}

export function getContractTone(status: string) {
  if (status === 'پذیرفته‌شده') return 'success' as const;
  if (status === 'صادرشده') return 'warning' as const;
  return 'neutral' as const;
}

export function getContractActionLabel(status: string, price: number | null) {
  if (price === null) return { label: 'در انتظار قیمت' };
  if (status === 'پذیرفته‌شده') return { label: 'پذیرفته شده' };
  if (status === 'صادرشده') return { label: 'صدور مجدد' };
  return { label: 'ایجاد قرارداد' };
}
