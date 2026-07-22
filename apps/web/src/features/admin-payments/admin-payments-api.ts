import { z } from 'zod';
import { apiRequest } from '@/lib/api-client';

export const paymentSchema = z.object({
  id: z.string(),
  studentName: z.string(),
  familyName: z.string(),
  invoice: z.string(),
  expectedAmount: z.number(),
  submittedAmount: z.number(),
  reference: z.string(),
  paidAt: z.string(),
  status: z.string(),
});

export const paymentsSchema = z.array(paymentSchema);

export type AdminPayment = z.infer<typeof paymentSchema>;

const fallbackPayments: AdminPayment[] = [
  { id: 'pay-001', studentName: 'سارا احمدی', familyName: 'خانواده احمدی', invoice: 'قسط ماه دوم', expectedAmount: 25_000_000, submittedAmount: 25_000_000, reference: 'TRX-۱۴۰۴-۱۰۰۱', paidAt: '۱۴۰۴/۰۳/۱۲', status: 'در انتظار بررسی' },
  { id: 'pay-002', studentName: 'امیر حسینی', familyName: 'خانواده حسینی', invoice: 'پیش‌پرداخت', expectedAmount: 40_000_000, submittedAmount: 40_000_000, reference: 'TRX-۱۴۰۴-۱۰۰۲', paidAt: '۱۴۰۴/۰۲/۲۸', status: 'تأییدشده' },
  { id: 'pay-003', studentName: 'نرگس محمدی', familyName: 'خانواده محمدی', invoice: 'قسط ماه اول', expectedAmount: 30_000_000, submittedAmount: 30_000_000, reference: 'TRX-۱۴۰۴-۱۰۰۳', paidAt: '۱۴۰۴/۰۱/۱۵', status: 'تأییدشده' },
];

export async function getAdminPayments(): Promise<{ payments: AdminPayment[] }> {
  try {
    const response = await apiRequest<unknown>('/admin/payments', {
      cache: 'no-store',
      timeoutMs: 5_000,
    });
    return { payments: paymentsSchema.parse(response.data) };
  } catch {
    return { payments: fallbackPayments };
  }
}

export async function approvePayment(txId: string): Promise<void> {
  await apiRequest(`/admin/payments/${txId}/approve`, {
    method: 'POST',
    timeoutMs: 5_000,
  });
}

export async function rejectPayment(txId: string): Promise<void> {
  await apiRequest(`/admin/payments/${txId}/reject`, {
    method: 'POST',
    timeoutMs: 5_000,
  });
}

export function getPaymentTone(status: string) {
  if (status === 'تأییدشده') return 'success' as const;
  if (status === 'ردشده') return 'danger' as const;
  return 'warning' as const;
}
