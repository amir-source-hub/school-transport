'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogTrigger } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { approvePayment, rejectPayment } from '@/features/admin-payments/admin-payments-api';

export function ApprovePaymentDialog({ paymentId }: { paymentId: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handle = async () => {
    setLoading(true);
    setError(null);
    try {
      await approvePayment(paymentId);
      setOpen(false);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'خطا در تأیید پرداخت');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>تأیید پرداخت</Button>
      </DialogTrigger>
      <DialogContent title="تأیید پرداخت" description="پس از تأیید، مبلغ به حساب مدرسه واریز شده محسوب می‌شود.">
        <div className="space-y-4">
          {error && <p className="text-xs text-danger">{error}</p>}
          <div className="flex gap-3">
            <Button variant="ghost" onClick={() => setOpen(false)}>انصراف</Button>
            <Button loading={loading} onClick={handle}>تأیید پرداخت</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export function RejectPaymentDialog({ paymentId }: { paymentId: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handle = async () => {
    if (!reason.trim()) return;
    setLoading(true);
    setError(null);
    try {
      await rejectPayment(paymentId);
      setOpen(false);
      setReason('');
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'خطا در رد پرداخت');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="secondary">رد پرداخت</Button>
      </DialogTrigger>
      <DialogContent title="رد پرداخت" description="دلیل رد را وارد کنید.">
        <div className="space-y-4">
          <div>
            <label htmlFor="pay-reject-reason" className="text-sm font-bold">دلیل رد</label>
            <Textarea id="pay-reject-reason" value={reason} onChange={(e) => setReason(e.target.value)} placeholder="دلیل رد را شرح دهید..." className="mt-2" />
          </div>
          {error && <p className="text-xs text-danger">{error}</p>}
          <div className="flex gap-3">
            <Button variant="ghost" onClick={() => { setOpen(false); setReason(''); }}>انصراف</Button>
            <Button variant="danger" loading={loading} disabled={!reason.trim()} onClick={handle}>رد پرداخت</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
