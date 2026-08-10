'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { getApiErrorFeedback } from '@/lib/api-error-feedback';
import {
  approveAdminLimitRequest,
  rejectAdminLimitRequest,
  type AdminLimitRequest,
} from './admin-students-api';

const statusLabels: Record<
  string,
  { label: string; tone: 'info' | 'success' | 'danger' | 'neutral' }
> = {
  PENDING: { label: 'در انتظار بررسی', tone: 'info' },
  APPROVED: { label: 'تأیید شده', tone: 'success' },
  REJECTED: { label: 'رد شده', tone: 'danger' },
};

function formatTimestamp(value: string | null) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return new Intl.DateTimeFormat('fa-IR', {
    dateStyle: 'short',
    timeStyle: 'short',
  }).format(date);
}

export function AdminLimitRequestSection({
  initialRequests,
}: {
  initialRequests: AdminLimitRequest[];
}) {
  const router = useRouter();
  const [rejectingId, setRejectingId] = useState<string>();
  const [rejectReason, setRejectReason] = useState('');
  const [pendingId, setPendingId] = useState<string>();
  const [error, setError] = useState<string>();

  const requests = initialRequests;
  const pendingCount = requests.filter((request) => request.status === 'PENDING').length;

  async function approve(requestId: string) {
    if (pendingId) return;
    setPendingId(requestId);
    setError(undefined);
    try {
      await approveAdminLimitRequest(requestId);
      setRejectingId(undefined);
      router.refresh();
    } catch (caught) {
      setError(getApiErrorFeedback(caught).message);
    } finally {
      setPendingId(undefined);
    }
  }

  async function reject(requestId: string) {
    if (pendingId) return;
    if (!rejectReason.trim()) {
      setError('برای رد درخواست، دلیل را وارد کنید.');
      return;
    }
    setPendingId(requestId);
    setError(undefined);
    try {
      await rejectAdminLimitRequest(requestId, rejectReason.trim());
      setRejectingId(undefined);
      setRejectReason('');
      router.refresh();
    } catch (caught) {
      setError(getApiErrorFeedback(caught).message);
    } finally {
      setPendingId(undefined);
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-lg font-black">درخواست‌های افزایش ظرفیت</h2>
        <Badge tone={pendingCount > 0 ? 'info' : 'neutral'}>
          {pendingCount.toLocaleString('fa-IR')} در انتظار
        </Badge>
      </div>
      {requests.length === 0 && (
        <Card>
          <p className="text-muted">درخواستی ثبت نشده است.</p>
        </Card>
      )}
      {requests.map((request) => (
        <Card key={request.id}>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="font-black">
                {request.familyName} ({request.username})
              </p>
              <p className="mt-1 text-sm text-muted">
                افزایش ظرفیت از {request.currentLimit.toLocaleString('fa-IR')} به{' '}
                {request.requestedLimit.toLocaleString('fa-IR')} دانش‌آموز
              </p>
            </div>
            <Badge tone={statusLabels[request.status]?.tone ?? 'neutral'}>
              {statusLabels[request.status]?.label ?? request.status}
            </Badge>
          </div>
          <p className="mt-3 rounded-lg bg-surface-muted px-3 py-2 text-sm leading-7">
            {request.reason}
          </p>
          {request.status === 'REJECTED' && request.rejectionReason && (
            <p className="mt-2 text-sm text-danger">دلیل رد: {request.rejectionReason}</p>
          )}
          {request.reviewedAt && (
            <p className="mt-2 text-xs text-muted">
              بررسی‌شده در {formatTimestamp(request.reviewedAt)}
            </p>
          )}
          {request.status === 'PENDING' && (
            <div className="mt-4 space-y-2 border-t border-border pt-4">
              <div className="flex flex-wrap gap-2">
                <Button
                  size="sm"
                  loading={pendingId === request.id}
                  disabled={Boolean(pendingId) && pendingId !== request.id}
                  onClick={() => void approve(request.id)}
                >
                  تأیید و افزایش ظرفیت
                </Button>
                <Button
                  size="sm"
                  variant="danger"
                  onClick={() =>
                    setRejectingId((current) => (current === request.id ? undefined : request.id))
                  }
                >
                  رد درخواست
                </Button>
              </div>
              {rejectingId === request.id && (
                <div className="flex flex-col gap-2 sm:flex-row">
                  <Input
                    value={rejectReason}
                    onChange={(event) => setRejectReason(event.target.value)}
                    placeholder="دلیل رد درخواست (برای خانواده نمایش داده می‌شود)"
                    aria-label="دلیل رد درخواست"
                  />
                  <Button
                    size="sm"
                    variant="danger"
                    loading={pendingId === request.id}
                    disabled={!rejectReason.trim()}
                    onClick={() => void reject(request.id)}
                  >
                    ثبت رد
                  </Button>
                </div>
              )}
            </div>
          )}
        </Card>
      ))}
      {error && (
        <p role="alert" className="text-sm text-danger">
          {error}
        </p>
      )}
    </div>
  );
}
