'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Select } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { getApiErrorFeedback } from '@/lib/api-error-feedback';
import {
  approveAdminPhoto,
  getAdminPhotoViewUrl,
  rejectAdminPhoto,
  type AdminPhoto,
} from './admin-student-photos-api';

const rejectionOptions = [
  ['BLURRED', 'تار یا خارج از فوکوس'],
  ['CROPPED_FACE', 'برش نامناسب چهره'],
  ['GLASSES_GLARE', 'بازتاب عینک'],
  ['FILTER_OR_EDITING', 'فیلتر یا ویرایش تصویر'],
  ['GROUP_OR_MULTIPLE_PEOPLE', 'وجود چند نفر در تصویر'],
  ['NOT_A_RECENT_COLOR_PHOTO', 'عکس قدیمی یا غیررنگی'],
  ['WRONG_BACKGROUND', 'پس‌زمینه نامناسب'],
  ['HEAD_COVERING_VIOLATION', 'پوشش نامناسب سر'],
  ['LOW_QUALITY', 'کیفیت ناکافی'],
  ['OTHER', 'سایر'],
].map(([value, label]) => ({ value, label }));

export function AdminPhotoReviewQueue({ items }: { items: AdminPhoto[] }) {
  const router = useRouter();
  const [preview, setPreview] = useState<Record<string, string>>({});
  const [reason, setReason] = useState<Record<string, string>>({});
  const [detail, setDetail] = useState<Record<string, string>>({});
  const [pending, setPending] = useState<string>();
  const [message, setMessage] = useState<string>();
  const [visibleItems, setVisibleItems] = useState(items);

  async function act(item: AdminPhoto, action: 'preview' | 'approve' | 'reject') {
    if (pending) return;
    setPending(`${item.uploadId}:${action}`);
    setMessage(undefined);
    try {
      if (action === 'preview') {
        const result = await getAdminPhotoViewUrl(item.uploadId);
        setPreview((current) => ({ ...current, [item.uploadId]: result.viewUrl }));
      } else if (action === 'approve') {
        await approveAdminPhoto(item.uploadId, item.version);
        setVisibleItems((current) => current.filter(({ uploadId }) => uploadId !== item.uploadId));
        setMessage('عکس تأیید شد و از صف انتظار بررسی خارج شد.');
        router.refresh();
      } else {
        await rejectAdminPhoto(
          item.uploadId,
          item.version,
          reason[item.uploadId],
          detail[item.uploadId],
        );
        setVisibleItems((current) => current.filter(({ uploadId }) => uploadId !== item.uploadId));
        setMessage('عکس رد شد و نتیجه برای خانواده ثبت شد.');
        router.refresh();
      }
    } catch (error) {
      setMessage(getApiErrorFeedback(error).message);
      router.refresh();
    } finally {
      setPending(undefined);
    }
  }

  if (items.length === 0)
    return (
      <Card>
        <p className="text-sm text-muted">عکسی در این صف نیست.</p>
      </Card>
    );
  return (
    <div className="space-y-4">
      {message && (
        <p role="alert" className="text-sm text-danger">
          {message}
        </p>
      )}
      {visibleItems.map((item) => (
        <Card key={item.uploadId} variant="outlined">
          <div className="grid gap-5 lg:grid-cols-[minmax(220px,320px)_1fr]">
            <div className="aspect-[3/4] overflow-hidden rounded-xl border border-border bg-surface-muted">
              {preview[item.uploadId] ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={preview[item.uploadId]}
                  alt="پیش‌نمایش عکس کارت سرویس"
                  className="size-full object-cover"
                />
              ) : (
                <div className="flex size-full items-center justify-center p-5 text-center text-sm text-muted">
                  پیش‌نمایش فقط با پیوند کوتاه‌عمر و مجاز
                </div>
              )}
            </div>
            <div className="space-y-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h2 className="font-black">
                    {item.student
                      ? `${item.student.firstName} ${item.student.lastName}`
                      : 'فاقد اتصال به دانش‌آموز'}
                  </h2>
                  <p className="mt-1 text-xs text-muted">
                    {item.width}×{item.height} پیکسل ·{' '}
                    {Math.round((item.actualSize ?? item.declaredSize) / 1024)} کیلوبایت
                  </p>
                </div>
                <Badge
                  tone={
                    item.status === 'PENDING_REVIEW'
                      ? 'warning'
                      : item.status === 'APPROVED'
                        ? 'success'
                        : 'neutral'
                  }
                >
                  {item.status}
                </Badge>
              </div>
              <Button
                size="sm"
                variant="secondary"
                disabled={Boolean(pending)}
                onClick={() => act(item, 'preview')}
              >
                نمایش ایمن عکس
              </Button>
              {item.status === 'PENDING_REVIEW' && (
                <div className="space-y-3 border-t border-border pt-4">
                  <Button
                    size="sm"
                    disabled={Boolean(pending) || !item.studentId}
                    onClick={() => act(item, 'approve')}
                  >
                    تأیید عکس
                  </Button>
                  {!item.studentId && (
                    <p className="text-xs text-danger">
                      عکس بدون اتصال به دانش‌آموز قابل تأیید نیست.
                    </p>
                  )}
                  <Select
                    value={reason[item.uploadId]}
                    onValueChange={(value) =>
                      setReason((current) => ({ ...current, [item.uploadId]: value }))
                    }
                    options={rejectionOptions}
                    placeholder="دلیل رد"
                  />
                  <Textarea
                    value={detail[item.uploadId] ?? ''}
                    onChange={(event) =>
                      setDetail((current) => ({ ...current, [item.uploadId]: event.target.value }))
                    }
                    maxLength={500}
                    placeholder="توضیح ایمن اختیاری"
                  />
                  <Button
                    size="sm"
                    variant="danger"
                    disabled={Boolean(pending) || !reason[item.uploadId]}
                    onClick={() => act(item, 'reject')}
                  >
                    رد عکس
                  </Button>
                </div>
              )}
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
}
