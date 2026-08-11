'use client';

import { Camera, ExternalLink, ImageIcon, RefreshCw, Trash2, X } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useRef, useState, type ChangeEvent } from 'react';
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
  type PhotoUploadMode,
} from './student-photos-api';

export const MAX_PHOTO_BYTES = 5 * 1024 * 1024;

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
  mode = 'panel',
  onUploadCompleted,
}: {
  studentId?: string;
  initialItems: PhotoUploadView[];
  mode?: PhotoUploadMode;
  onUploadCompleted?: (uploadId: string) => void;
}) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [items, setItems] = useState(initialItems);
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState<string>();
  const [selected, setSelected] = useState<{
    file: File;
    previewUrl: string;
    mime: (typeof ACCEPTED_PHOTO_MIMES)[number];
  }>();
  const [progress, setProgress] = useState(0);
  const abortRef = useRef<AbortController | undefined>(undefined);

  useEffect(
    () => () => {
      if (selected) URL.revokeObjectURL(selected.previewUrl);
    },
    [selected],
  );

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
      setMessage('حجم فایل از ۵ مگابایت بیشتر است. تصویر کوچک‌تری انتخاب کنید.');
      return;
    }

    if (selected) URL.revokeObjectURL(selected.previewUrl);
    setSelected({ file, previewUrl: URL.createObjectURL(file), mime: file.type });
    setProgress(0);
  }

  function removeSelection() {
    if (selected) URL.revokeObjectURL(selected.previewUrl);
    setSelected(undefined);
    setProgress(0);
    setMessage(undefined);
  }

  async function uploadSelected() {
    if (!selected || pending) return;
    const { file } = selected;
    const controller = new AbortController();
    abortRef.current = controller;
    setPending(true);
    setProgress(0);
    setMessage(undefined);
    try {
      const authorization = await authorizePhotoUpload(
        { studentId, declaredMime: selected.mime, declaredSize: file.size },
        mode,
      );
      try {
        await putPhotoObject(authorization.uploadUrl, file, {
          signal: controller.signal,
          onProgress: setProgress,
        });
      } catch (error) {
        if (error instanceof DOMException && error.name === 'AbortError') {
          setMessage('بارگذاری لغو شد. می‌توانید همین عکس یا عکس دیگری را انتخاب کنید.');
          return;
        }
        setMessage('ارسال فایل به ذخیره‌گاه ناموفق بود. اتصال را بررسی و دوباره تلاش کنید.');
        return;
      }
      const completed = await completePhotoUpload(authorization.uploadId, mode);
      onUploadCompleted?.(completed.uploadId);
      if (mode === 'panel') setItems(await getMyPhotoUploads(studentId));
      else setItems([completed]);
      removeSelection();
      setMessage('عکس کارت سرویس بارگذاری شد و در صف بررسی قرار گرفت.');
      router.refresh();
    } catch (error) {
      setMessage(getApiErrorFeedback(error).message);
    } finally {
      setPending(false);
      abortRef.current = undefined;
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
          عکس رنگی جدید، تک‌نفره، روبه‌رو، واضح، با نور یکنواخت و پس‌زمینه ساده باشد. چهره کامل،
          بدون فیلتر، عینک آفتابی، بازتاب عینک یا پوشش نامناسب دیده شود.
        </p>
        <Link
          href="/about#privacy"
          className="mt-2 inline-block text-xs font-bold text-primary hover:underline"
        >
          حریم خصوصی و نحوه نگهداری عکس
        </Link>
      </div>

      <label className="flex cursor-pointer flex-col items-center gap-2 rounded-[var(--radius-card)] border-2 border-dashed border-border/80 bg-surface-inset px-4 py-8 text-center transition-colors hover:border-primary/60">
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
        <span className="text-xs text-muted">فرمت JPG یا PNG، حداکثر ۵ مگابایت</span>
      </label>

      {selected && (
        <div className="grid gap-4 rounded-[var(--radius-card)] border border-border p-4 sm:grid-cols-[120px_1fr]">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={selected.previewUrl}
            alt="پیش‌نمایش عکس انتخابی"
            className="aspect-[3/4] w-full rounded-lg object-cover"
          />
          <div className="space-y-3">
            <p className="break-all text-sm font-bold">{selected.file.name}</p>
            {pending && (
              <div>
                <div
                  className="h-2 overflow-hidden rounded-full bg-surface-muted"
                  role="progressbar"
                  aria-label="پیشرفت بارگذاری"
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-valuenow={progress}
                >
                  <div
                    className="h-full bg-primary transition-[width]"
                    style={{ width: `${progress}%` }}
                  />
                </div>
                <p className="mt-1 text-xs text-muted">{progress}٪</p>
              </div>
            )}
            <div className="flex flex-wrap gap-2">
              <Button size="sm" onClick={uploadSelected} disabled={pending}>
                بارگذاری و ارسال برای بررسی
              </Button>
              {pending ? (
                <Button size="sm" variant="danger" onClick={() => abortRef.current?.abort()}>
                  <X aria-hidden="true" className="size-4" />
                  لغو
                </Button>
              ) : (
                <Button size="sm" variant="secondary" onClick={removeSelection}>
                  <Trash2 aria-hidden="true" className="size-4" />
                  حذف انتخاب
                </Button>
              )}
            </div>
          </div>
        </div>
      )}

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
                  {(item.status === 'REJECTED' ||
                    item.status === 'FAILED' ||
                    item.status === 'EXPIRED') && (
                    <Button size="sm" variant="secondary" onClick={() => inputRef.current?.click()}>
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
