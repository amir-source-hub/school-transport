'use client';

import { Camera, ExternalLink, ImageIcon, RefreshCw } from 'lucide-react';
import { useRef, useState, type ChangeEvent } from 'react';
import { useRouter } from 'next/navigation';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { getApiErrorFeedback } from '@/lib/api-error-feedback';
import {
  ACCEPTED_PHOTO_MIMES,
  authorizePhotoUpload,
  completePhotoUpload,
  getMyPhotoUploads,
  getPhotoViewUrl,
  putPhotoObject,
  type PhotoUploadView,
} from './student-photos-api';

const MAX_PHOTO_BYTES = 25 * 1024 * 1024;

const STATUS_META: Record<
  PhotoUploadView['status'],
  { label: string; tone: 'neutral' | 'info' | 'success' | 'warning' | 'danger' }
> = {
  AUTHORIZED: { label: 'آماده بارگذاری', tone: 'info' },
  UPLOADED: { label: 'در حال پردازش', tone: 'info' },
  VALIDATING: { label: 'در حال بررسی فنی', tone: 'info' },
  PENDING_REVIEW: { label: 'در انتظار تایید', tone: 'warning' },
  APPROVED: { label: 'تایید شده', tone: 'success' },
  REJECTED: { label: 'رد شده', tone: 'danger' },
  FAILED: { label: 'ناموفق', tone: 'danger' },
  EXPIRED: { label: 'منقضی شده', tone: 'neutral' },
  SUPERSEDED: { label: 'جایگزین شد', tone: 'neutral' },
};

function isAcceptedMime(type: string): type is (typeof ACCEPTED_PHOTO_MIMES)[number] {
  return (ACCEPTED_PHOTO_MIMES as readonly string[]).includes(type);
}

export function PhotoUploadCard({
  studentId,
  initialItems,
}: {
  studentId: string;
  initialItems: PhotoUploadView[];
}) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [items, setItems] = useState(initialItems);
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState<string>();

  async function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (event.target) event.target.value = '';
    if (!file) return;
    setMessage(undefined);

    if (!isAcceptedMime(file.type)) {
      setMessage('فرمت فایل پشتیبانی نمی‌شود. فقط تصویر JPG یا PNG بارگذاری کنید.');
      return;
    }
    if (file.size > MAX_PHOTO_BYTES) {
      setMessage('حجم فایل از ۲۵ مگابایت بیشتر است. تصویر کوچک‌تری انتخاب کنید.');
      return;
    }

    setPending(true);
    try {
      const authorization = await authorizePhotoUpload({
        studentId,
        declaredMime: file.type,
        declaredSize: file.size,
      });
      try {
        await putPhotoObject(authorization.uploadUrl, file);
      } catch {
        setMessage(
          'ارسال فایل به ذخیره‌گاه ناموفق بود. اتصال را بررسی و دوباره تلاش کنید.',
        );
        return;
      }
      await completePhotoUpload(authorization.uploadId);
      setItems(await getMyPhotoUploads(studentId));
      setMessage('عکس کارت سرویس بارگذاری شد و در صف بررسی قرار گرفت.');
      router.refresh();
    } catch (error) {
      setMessage(getApiErrorFeedback(error).message);
    } finally {
      setPending(false);
    }
  }

  async function openPhoto(uploadId: string) {
    setMessage(undefined);
    try {
      const { viewUrl } = await getPhotoViewUrl(uploadId);
      window.open(viewUrl, '_blank', 'noopener,noreferrer');
    } catch (error) {
      setMessage(getApiErrorFeedback(error).message);
    }
  }

  return (
    <div className="space-y-5">
      <div>
        <h2 className="flex items-center gap-2 text-lg font-black">
          <ImageIcon aria-hidden="true" className="size-5 text-primary" />
          عکس کارت سرویس
        </h2>
        <p className="mt-1 text-sm text-muted">
          برای کارت سرویس دانش‌آموز، یک عکس رنگی واضح و بدون کلاه یا عینک آفتابی بارگذاری کنید.
        </p>
      </div>

      <label
        className="flex cursor-pointer flex-col items-center gap-2 rounded-[var(--radius-card)] border-2 border-dashed border-border/80 bg-surface-inset px-4 py-8 text-center transition-colors hover:border-primary/60"
      >
        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png"
          className="sr-only"
          disabled={pending}
          onChange={handleFileChange}
        />
        <Camera aria-hidden="true" className="size-8 text-primary" />
        <span className="text-sm font-black">
          {pending ? 'در حال بارگذاری و بررسی…' : 'انتخاب عکس'}
        </span>
        <span className="text-xs text-muted">فرمت JPG یا PNG، حداکثر ۲۵ مگابایت</span>
      </label>

      {message && (
        <p role="status" className="text-sm text-muted">
          {message}
        </p>
      )}

      {items.length > 0 && (
        <ul className="space-y-3">
          {items.map((item) => {
            const meta = STATUS_META[item.status];
            return (
              <li
                key={item.uploadId}
                className="flex flex-col gap-3 rounded-[var(--radius-card)] border border-border/60 bg-surface-paper p-4 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="flex items-center gap-3">
                  <Badge tone={meta.tone}>{meta.label}</Badge>
                  <span className="text-xs text-muted">
                    {item.createdAt.toLocaleDateString('fa-IR')}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  {item.status === 'APPROVED' && (
                    <Button size="sm" variant="secondary" onClick={() => openPhoto(item.uploadId)}>
                      <ExternalLink aria-hidden="true" className="size-3.5" />
                      مشاهده عکس
                    </Button>
                  )}
                  {(item.status === 'REJECTED' || item.status === 'FAILED' || item.status === 'EXPIRED') && (
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => inputRef.current?.click()}
                    >
                      <RefreshCw aria-hidden="true" className="size-3.5" />
                      بارگذاری دوباره
                    </Button>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
