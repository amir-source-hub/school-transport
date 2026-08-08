'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { formatJalaliDateTime } from '@/lib/formatters';
import { getApiErrorFeedback } from '@/lib/api-error-feedback';
import { broadcastAction, testBroadcast, type BroadcastCampaign } from './admin-broadcasts-api';

const statusLabel: Record<string, string> = {
  PENDING_APPROVAL: 'در انتظار تأیید',
  SCHEDULED: 'زمان‌بندی‌شده',
  PROCESSING: 'در حال ارسال',
  PAUSED: 'متوقف',
  CANCELLED: 'لغوشده',
  EXPIRED: 'منقضی',
  COMPLETED: 'تمام‌شده',
};

export function BroadcastList({ campaigns }: { campaigns: BroadcastCampaign[] }) {
  const router = useRouter();
  const [pending, setPending] = useState<string>();
  const [testNumbers, setTestNumbers] = useState<Record<string, string>>({});
  const [message, setMessage] = useState<string>();

  async function act(
    campaign: BroadcastCampaign,
    action: 'approve' | 'pause' | 'resume' | 'cancel' | 'test',
  ) {
    setPending(`${campaign.id}:${action}`);
    setMessage(undefined);
    try {
      if (action === 'test') await testBroadcast(campaign.id, testNumbers[campaign.id] ?? '');
      else await broadcastAction(campaign.id, action);
      setMessage('عملیات با موفقیت انجام شد.');
      router.refresh();
    } catch (error) {
      setMessage(getApiErrorFeedback(error).message);
    } finally {
      setPending(undefined);
    }
  }

  if (!campaigns.length) return <p className="text-sm text-muted">هنوز کمپینی ثبت نشده است.</p>;
  return (
    <div className="space-y-4">
      {campaigns.map((campaign) => (
        <Card key={campaign.id} padding="md">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h3 className="font-black">{campaign.name}</h3>
              <p className="mt-1 text-sm leading-7 text-muted">{campaign.smsContent}</p>
            </div>
            <Badge
              tone={
                campaign.status === 'COMPLETED'
                  ? 'success'
                  : campaign.status === 'CANCELLED' || campaign.status === 'EXPIRED'
                    ? 'warning'
                    : 'info'
              }
            >
              {statusLabel[campaign.status] ?? campaign.status}
            </Badge>
          </div>
          <dl className="mt-4 grid gap-2 text-xs text-muted sm:grid-cols-4">
            <div>
              <dt>زمان ارسال</dt>
              <dd className="font-bold text-foreground">
                {formatJalaliDateTime(campaign.scheduledAt.toISOString())}
              </dd>
            </div>
            <div>
              <dt>گیرنده برآوردی</dt>
              <dd className="font-bold text-foreground">
                {campaign.estimatedRecipients.toLocaleString('fa-IR')}
              </dd>
            </div>
            <div>
              <dt>قطعه</dt>
              <dd className="font-bold text-foreground">{campaign.segmentCount}</dd>
            </div>
            <div>
              <dt>هزینه برآوردی</dt>
              <dd className="font-bold text-foreground">
                {campaign.estimatedCostRial.toLocaleString('fa-IR')} ریال
              </dd>
            </div>
          </dl>
          <div className="mt-3 flex flex-wrap gap-2 text-xs">
            {Object.entries(campaign.deliveryCounts).map(([status, value]) => (
              <span key={status} className="rounded-full bg-surface-muted px-3 py-1">
                {status}: {value.toLocaleString('fa-IR')}
              </span>
            ))}
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            {campaign.status === 'PENDING_APPROVAL' && (
              <Button
                size="sm"
                loading={pending === `${campaign.id}:approve`}
                onClick={() => act(campaign, 'approve')}
              >
                تأیید مدیر دوم
              </Button>
            )}
            {['SCHEDULED', 'PROCESSING'].includes(campaign.status) && (
              <Button size="sm" variant="secondary" onClick={() => act(campaign, 'pause')}>
                توقف
              </Button>
            )}
            {campaign.status === 'PAUSED' && (
              <Button size="sm" variant="secondary" onClick={() => act(campaign, 'resume')}>
                ادامه
              </Button>
            )}
            {['PENDING_APPROVAL', 'SCHEDULED', 'PROCESSING', 'PAUSED'].includes(
              campaign.status,
            ) && (
              <Button size="sm" variant="danger" onClick={() => act(campaign, 'cancel')}>
                لغو
              </Button>
            )}
          </div>
          <div className="mt-4 flex max-w-md gap-2">
            <Input
              inputMode="numeric"
              placeholder="شماره آزمایشی مجاز"
              value={testNumbers[campaign.id] ?? ''}
              onChange={(event) =>
                setTestNumbers({ ...testNumbers, [campaign.id]: event.target.value })
              }
            />
            <Button
              size="sm"
              variant="ghost"
              disabled={!testNumbers[campaign.id]}
              onClick={() => act(campaign, 'test')}
            >
              ارسال آزمایشی
            </Button>
          </div>
        </Card>
      ))}
      {message && (
        <p role="status" className="text-sm text-muted">
          {message}
        </p>
      )}
    </div>
  );
}
