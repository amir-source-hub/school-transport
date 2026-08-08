'use client';

import { useCallback, useEffect, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { getApiErrorFeedback } from '@/lib/api-error-feedback';
import {
  createLimitRequest,
  getLimitRequests,
  getStudentCapacity,
  type LimitRequest,
  type StudentCapacity,
} from './students-api';

const statusLabels: Record<string, { label: string; tone: 'info' | 'success' | 'danger' }> = {
  PENDING: { label: 'در انتظار بررسی', tone: 'info' },
  APPROVED: { label: 'تأیید شده', tone: 'success' },
  REJECTED: { label: 'رد شده', tone: 'danger' },
};

export function StudentCapacityCard() {
  const [capacity, setCapacity] = useState<StudentCapacity>();
  const [requests, setRequests] = useState<LimitRequest[]>([]);
  const [reason, setReason] = useState('');
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string>();

  const refresh = useCallback(async () => {
    const [nextCapacity, nextRequests] = await Promise.all([
      getStudentCapacity(),
      getLimitRequests(),
    ]);
    setCapacity(nextCapacity);
    setRequests(nextRequests);
  }, []);

  useEffect(() => {
    let cancelled = false;
    Promise.all([getStudentCapacity(), getLimitRequests()])
      .then(([nextCapacity, nextRequests]) => {
        if (cancelled) return;
        setCapacity(nextCapacity);
        setRequests(nextRequests);
      })
      .catch(() => {
        if (!cancelled) setCapacity(undefined);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const latest = requests[0] ?? undefined;
  const hasPending = requests.some((request) => request.status === 'PENDING');

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (pending || !reason.trim()) return;
    setPending(true);
    setError(undefined);
    try {
      await createLimitRequest(reason.trim());
      setReason('');
      await refresh();
    } catch (caught) {
      setError(getApiErrorFeedback(caught).message);
    } finally {
      setPending(false);
    }
  }

  if (!capacity) {
    return (
      <Card>
        <p className="text-muted">وضعیت ظرفیت حساب در دسترس نیست.</p>
      </Card>
    );
  }

  const pct = capacity.studentLimit > 0 ? (capacity.activeStudentCount / capacity.studentLimit) * 100 : 100;

  return (
    <Card>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-black">ظرفیت حساب خانواده</h2>
          <p className="mt-1 text-sm text-muted">
            {capacity.activeStudentCount.toLocaleString('fa-IR')} از{' '}
            {capacity.studentLimit.toLocaleString('fa-IR')} دانش‌آموز فعال
          </p>
        </div>
        {latest && (
          <Badge tone={statusLabels[latest.status]?.tone ?? 'info'}>
            {statusLabels[latest.status]?.label ?? latest.status}
          </Badge>
        )}
      </div>
      <div className="mt-4 h-2 overflow-hidden rounded-full bg-surface-muted" aria-hidden="true">
        <div
          className="h-full rounded-full bg-primary"
          style={{ width: `${Math.min(100, Math.max(0, pct))}%` }}
        />
      </div>

      {latest && (
        <div className="mt-4 space-y-2 text-sm leading-7">
          <p className="text-muted">
            درخواست افزایش ظرفیت به {latest.requestedLimit.toLocaleString('fa-IR')} دانش‌آموز:
          </p>
          <p className="rounded-lg bg-surface-muted px-3 py-2">{latest.reason}</p>
          {latest.status === 'REJECTED' && latest.rejectionReason && (
            <p className="text-danger">
              دلیل رد: {latest.rejectionReason}
            </p>
          )}
        </div>
      )}

      {!hasPending && capacity.remaining === 0 && (
        <form onSubmit={submit} className="mt-5 space-y-3 border-t border-border pt-5">
          <p className="font-bold">درخواست افزایش ظرفیت</p>
          <label className="text-sm font-bold">
            دلیل نیاز به دانش‌آموز بیشتر
            <Textarea
              className="mt-2"
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              placeholder="مثلاً فرزند دیگری به خانواده اضافه شده است."
            />
          </label>
          <Button type="submit" loading={pending} disabled={!reason.trim()}>
            ثبت درخواست افزایش ظرفیت
          </Button>
          {error && <p role="alert" className="text-sm text-danger">{error}</p>}
        </form>
      )}
    </Card>
  );
}
