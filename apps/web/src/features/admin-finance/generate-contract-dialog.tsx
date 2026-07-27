'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogTrigger } from '@/components/ui/dialog';
import { generateContract } from '@/features/admin-finance/admin-contracts-api';
import { getApiErrorFeedback } from '@/lib/api-error-feedback';

export function GenerateContractDialog({
  enrollmentId,
  label,
}: {
  enrollmentId: string;
  label: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handle = async () => {
    setLoading(true);
    setError(null);
    try {
      await generateContract(enrollmentId);
      setOpen(false);
      router.refresh();
    } catch (e) {
      setError(getApiErrorFeedback(e).message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="secondary" className="w-full">
          {label}
        </Button>
      </DialogTrigger>
      <DialogContent
        title="ایجاد قرارداد"
        description="با تأیید، قرارداد بر اساس آخرین قیمت ثبت‌شده صادر می‌شود. این اقدام قابل بازگشت نیست."
      >
        <div className="space-y-4">
          {error && <p className="text-xs text-danger">{error}</p>}
          <div className="flex gap-3">
            <Button variant="ghost" onClick={() => setOpen(false)}>
              انصراف
            </Button>
            <Button loading={loading} onClick={handle}>
              تأیید و ایجاد قرارداد
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
