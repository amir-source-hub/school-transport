'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { normalizeDigits } from '@/features/enrollment/national-id';
import { getApiErrorFeedback } from '@/lib/api-error-feedback';
import { updateStudentPrepayment } from './admin-payments-api';

export function StudentPrepaymentDialog({ planId, currentAmount }: { planId: string; currentAmount: number }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [amount, setAmount] = useState(String(currentAmount));
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string>();
  const value = Number(amount);
  return <Dialog open={open} onOpenChange={setOpen}>
    <DialogTrigger asChild><Button size="sm" variant="secondary">تغییر پیش‌پرداخت این دانش‌آموز</Button></DialogTrigger>
    <DialogContent title="تغییر پیش‌پرداخت" description="تا پیش از پذیرش قرارداد و هر تلاش پرداخت می‌توانید مبلغ را تغییر دهید. قرارداد و مبلغ پرداخت به‌روز می‌شوند.">
      <form className="space-y-4" onSubmit={async (event) => {
        event.preventDefault(); setError(undefined); setPending(true);
        try { await updateStudentPrepayment(planId, value); setOpen(false); router.refresh(); }
        catch (caught) { setError(getApiErrorFeedback(caught).message); }
        finally { setPending(false); }
      }}>
        <label className="block text-sm font-bold">مبلغ جدید (ریال)
          <Input className="mt-2" inputMode="numeric" dir="ltr" value={amount ? value.toLocaleString('en-US') : ''}
            onChange={(event) => setAmount(normalizeDigits(event.target.value).replace(/\D/g, ''))} />
        </label>
        {error && <p role="alert" className="text-sm text-danger">{error}</p>}
        <Button type="submit" loading={pending} disabled={!Number.isInteger(value) || value <= 0 || value % 10 !== 0}>ذخیره مبلغ دانش‌آموز</Button>
      </form>
    </DialogContent>
  </Dialog>;
}
