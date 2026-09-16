'use client';

/* eslint-disable @next/next/no-img-element */
import { Camera, ExternalLink, FileText, RefreshCw } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Alert } from '@/components/feedback/alert';
import { getApiErrorFeedback } from '@/lib/api-error-feedback';
import { replaceDriverDocument, type DriverDocument } from './driver-api';

export type DriverDocumentDefinition = { type: string; label: string; hint: string };

export function DriverDocuments({
  documents,
  definitions,
}: {
  documents: DriverDocument[];
  definitions: readonly DriverDocumentDefinition[];
}) {
  const router = useRouter();
  const [pending, setPending] = useState<string>();
  const [progress, setProgress] = useState<number | null>(null);
  const [message, setMessage] = useState<string>();
  async function replace(type: string, file?: File) {
    if (!file) return;
    if (
      !['image/jpeg', 'image/png', 'application/pdf'].includes(file.type) ||
      file.size > 5 * 1024 * 1024
    ) {
      setMessage('فایل باید JPG، PNG یا PDF و حداکثر ۵ مگابایت باشد.');
      return;
    }
    try {
      setPending(type);
      setProgress(null);
      setMessage(undefined);
      await replaceDriverDocument(file, type, setProgress);
      setMessage('مدرک جدید با موفقیت ذخیره شد.');
      router.refresh();
    } catch (error) {
      setMessage(getApiErrorFeedback(error).message);
    } finally {
      setPending(undefined);
      setProgress(null);
    }
  }
  return (
    <div className="space-y-5">
      {message && (
        <Alert tone="info" title="وضعیت مدرک">
          {message}
        </Alert>
      )}
      <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
        {definitions.map(({ type, label, hint }) => {
          const document = documents.find((item) => item.documentType === type);
          const canUpload = !document || document.reviewStatus === 'REJECTED';
          return (
            <section key={type} className="rounded-2xl border border-border bg-surface-paper p-4">
              <div className="flex items-center justify-between gap-2">
                <h2 className="font-black">{label}</h2>
                <span
                  className={`rounded-full px-2 py-1 text-[10px] font-bold ${document?.reviewStatus === 'REJECTED' ? 'bg-danger/10 text-danger' : document ? 'bg-success-soft text-success' : 'bg-surface-inset text-muted'}`}
                >
                  {document?.reviewStatus === 'REJECTED'
                    ? 'رد شده'
                    : document
                      ? 'بارگذاری شده'
                      : 'بارگذاری نشده'}
                </span>
              </div>
              <div className="mt-4 overflow-hidden rounded-xl bg-surface-inset">
                {document?.mimeType === 'application/pdf' ? (
                  <a
                    href={document.viewUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="grid aspect-[4/3] place-items-center gap-2 text-primary"
                  >
                    <FileText className="size-12" />
                    <span className="inline-flex items-center gap-2 text-sm font-bold">
                      مشاهده PDF <ExternalLink className="size-4" />
                    </span>
                  </a>
                ) : document ? (
                  <img
                    src={document.viewUrl}
                    alt={label}
                    className="aspect-[4/3] w-full object-contain"
                  />
                ) : (
                  <div className="grid aspect-[4/3] place-items-center text-muted">
                    <Camera className="size-10" />
                  </div>
                )}
              </div>
              <p className="mt-3 min-h-12 text-xs leading-6 text-muted">
                {document?.reviewStatus === 'REJECTED'
                  ? `علت رد: ${document.rejectionReason || 'نیاز به بارگذاری تصویر جدید'}`
                  : `${hint}؛ JPG، PNG یا PDF، حداکثر ۵ مگابایت.`}
              </p>
              {pending === type && (
                <div
                  className="mt-3"
                  role="progressbar"
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-valuenow={progress ?? 0}
                >
                  <div className="h-2 overflow-hidden rounded-full bg-surface-muted">
                    <div
                      className={`h-full bg-primary transition-[width] ${progress == null ? 'w-1/3 animate-pulse' : ''}`}
                      style={progress == null ? undefined : { width: `${progress}%` }}
                    />
                  </div>
                  <p className="mt-1 text-xs font-bold text-primary">
                    {progress == null ? 'در حال اتصال…' : `${progress.toLocaleString('fa-IR')}٪`}
                  </p>
                </div>
              )}
              {canUpload ? (
                <label className="mt-4 inline-flex cursor-pointer">
                  <input
                    type="file"
                    className="sr-only"
                    accept="image/jpeg,image/png,application/pdf"
                    disabled={Boolean(pending)}
                    onChange={(event) => {
                      void replace(type, event.target.files?.[0]);
                      event.currentTarget.value = '';
                    }}
                  />
                  <span className="inline-flex min-h-11 items-center gap-2 rounded-lg bg-primary px-4 text-sm font-bold text-white">
                    <RefreshCw className="size-4" />
                    {pending === type
                      ? 'در حال بارگذاری…'
                      : document
                        ? 'بارگذاری مجدد'
                        : 'بارگذاری مدرک'}
                  </span>
                </label>
              ) : (
                <p className="mt-4 text-xs font-bold text-success">
                  تصویر ثبت شده و فقط پس از رد مدیریت قابل بارگذاری مجدد است.
                </p>
              )}
            </section>
          );
        })}
      </div>
    </div>
  );
}
