'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogTrigger } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { startReview, approveEnrollment, rejectEnrollment, requestCorrection } from '@/features/admin-registrations/admin-registrations-api';

export function StartReviewButton({ enrollmentId }: { enrollmentId: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handle = async () => {
    setLoading(true);
    setError(null);
    try {
      await startReview(enrollmentId);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'خطا در شروع بررسی');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <Button loading={loading} onClick={handle}>شروع بررسی</Button>
      {error && <p className="mt-2 text-xs text-danger">{error}</p>}
    </div>
  );
}

export function ApproveButton({ enrollmentId }: { enrollmentId: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handle = async () => {
    setLoading(true);
    setError(null);
    try {
      await approveEnrollment(enrollmentId);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'خطا در تأیید درخواست');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <Button loading={loading} onClick={handle}>تأیید درخواست</Button>
      {error && <p className="mt-2 text-xs text-danger">{error}</p>}
    </div>
  );
}

export function RejectButton({ enrollmentId }: { enrollmentId: string }) {
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
      await rejectEnrollment(enrollmentId, reason.trim());
      setOpen(false);
      setReason('');
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'خطا در رد درخواست');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="secondary">رد درخواست با دلیل</Button>
      </DialogTrigger>
      <DialogContent title="رد درخواست" description="دلیل رد را وارد کنید. این دلیل برای خانواده قابل مشاهده است.">
        <div className="space-y-4">
          <div>
            <label htmlFor="reject-reason" className="text-sm font-bold">دلیل رد</label>
            <Textarea id="reject-reason" value={reason} onChange={(e) => setReason(e.target.value)} placeholder="دلیل رد را شرح دهید..." className="mt-2" />
          </div>
          {error && <p className="text-xs text-danger">{error}</p>}
          <div className="flex gap-3">
            <Button variant="ghost" onClick={() => { setOpen(false); setReason(''); }}>انصراف</Button>
            <Button variant="danger" loading={loading} disabled={!reason.trim()} onClick={handle}>تأیید و رد</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export function RequestCorrectionButton({ enrollmentId }: { enrollmentId: string }) {
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
      await requestCorrection(enrollmentId, reason.trim());
      setOpen(false);
      setReason('');
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'خطا در ثبت درخواست اصلاح');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="secondary">درخواست اصلاح با دلیل</Button>
      </DialogTrigger>
      <DialogContent title="درخواست اصلاح" description="توضیح دهید چه مواردی نیاز به اصلاح دارد. خانواده پس از مشاهده می‌تواند درخواست را ویرایش کند.">
        <div className="space-y-4">
          <div>
            <label htmlFor="correction-reason" className="text-sm font-bold">دلیل اصلاح</label>
            <Textarea id="correction-reason" value={reason} onChange={(e) => setReason(e.target.value)} placeholder="موارد اصلاحی را شرح دهید..." className="mt-2" />
          </div>
          {error && <p className="text-xs text-danger">{error}</p>}
          <div className="flex gap-3">
            <Button variant="ghost" onClick={() => { setOpen(false); setReason(''); }}>انصراف</Button>
            <Button variant="primary" loading={loading} disabled={!reason.trim()} onClick={handle}>ثبت درخواست اصلاح</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
