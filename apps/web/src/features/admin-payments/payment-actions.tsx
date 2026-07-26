'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogTrigger } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { configureInstallments, approvePayment, rejectPayment } from '@/features/admin-payments/admin-payments-api';

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

export function ConfigureInstallmentsDialog({ planId }: { planId: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>();
  const [items, setItems] = useState([{ amount: '', dueDate: '' }]);
  const update = (index: number, key: 'amount' | 'dueDate', value: string) =>
    setItems((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, [key]: value } : item));
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild><Button variant="secondary">تنظیم اقساط</Button></DialogTrigger>
      <DialogContent title="برنامه اقساط" description="تعداد، مبلغ و تاریخ هر قسط را تعیین کنید. پیش‌پرداخت ۴ میلیون تومان ثابت می‌ماند.">
        <div className="max-h-[65vh] space-y-4 overflow-y-auto">
          {items.map((item, index) => (
            <div key={index} className="grid grid-cols-[auto_1fr_1fr] items-end gap-3 rounded-xl bg-surface-muted p-3">
              <span className="pb-3 text-sm font-black">قسط {(index + 1).toLocaleString('fa-IR')}</span>
              <label className="text-xs font-bold">مبلغ (ریال)<Input inputMode="numeric" value={item.amount} onChange={(event) => update(index, 'amount', event.target.value.replace(/\D/g, ''))} /></label>
              <label className="text-xs font-bold">سررسید<Input type="date" value={item.dueDate} onChange={(event) => update(index, 'dueDate', event.target.value)} /></label>
            </div>
          ))}
          <div className="flex gap-2">
            {items.length < 12 && <Button size="sm" variant="ghost" onClick={() => setItems((current) => [...current, { amount: '', dueDate: '' }])}>افزودن قسط</Button>}
            {items.length > 1 && <Button size="sm" variant="ghost" onClick={() => setItems((current) => current.slice(0, -1))}>حذف قسط آخر</Button>}
          </div>
          {error && <p className="text-sm text-danger">{error}</p>}
          <Button
            className="w-full"
            loading={loading}
            disabled={items.some((item) => !item.amount || !item.dueDate)}
            onClick={async () => {
              setLoading(true); setError(undefined);
              try {
                await configureInstallments(planId, items.map((item) => ({ amount: Number(item.amount), dueDate: item.dueDate })));
                setOpen(false); router.refresh();
              } catch (caught) {
                setError(caught instanceof Error ? caught.message : 'خطا در ذخیره برنامه اقساط');
              } finally { setLoading(false); }
            }}
          >ذخیره برنامه اقساط</Button>
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
