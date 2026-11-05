import { Suspense } from 'react';
import { PaymentReturnResult } from '@/features/finance/payment-return-result';

export const metadata = { title: 'نتیجه پرداخت' };

export default function PaymentReturnPage() {
  return <Suspense fallback={<p>در حال بارگذاری…</p>}><PaymentReturnResult /></Suspense>;
}
