'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { setPrice } from '@/features/admin-finance/admin-pricing-api';

export function SetPriceDialog({
  enrollmentId,
  currentPrice,
}: {
  enrollmentId: string;
  currentPrice: number | null;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [amount, setAmount] = useState(currentPrice ? String(currentPrice) : '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handle = async () => {
    const numeric = Number(amount.replace(/,/g, ''));
    if (!numeric || numeric <= 0) {
      setError('مبلغ معتبر وارد کنید');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      await setPrice(enrollmentId, numeric);
      setOpen(false);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'خطا در ثبت قیمت');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="secondary">{currentPrice === null ? 'ثبت قیمت' : 'ویرایش قیمت'}</Button>
      </DialogTrigger>
      <DialogContent
        title={currentPrice === null ? 'ثبت قیمت' : 'ویرایش قیمت'}
        description="مبلغ را به ریال وارد کنید. قیمت نهایی پس از تأیید سرور ثبت می‌شود."
      >
        <div className="space-y-4">
          <div>
            <label htmlFor="price-amount" className="text-sm font-bold">
              مبلغ (ریال)
            </label>
            <Input
              id="price-amount"
              type="text"
              inputMode="numeric"
              value={amount}
              onChange={(e) => setAmount(e.target.value.replace(/[^0-9]/g, ''))}
              placeholder="مثلاً ۱۵۰۰۰۰۰۰۰"
              className="mt-2 ltr text-left"
              dir="ltr"
            />
          </div>
          {error && <p className="text-xs text-danger">{error}</p>}
          <div className="flex gap-3">
            <Button variant="ghost" onClick={() => setOpen(false)}>
              انصراف
            </Button>
            <Button loading={loading} disabled={!amount || Number(amount) <= 0} onClick={handle}>
              ثبت قیمت
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
