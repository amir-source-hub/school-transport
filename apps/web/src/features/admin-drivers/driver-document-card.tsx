'use client';
/* eslint-disable @next/next/no-img-element */
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Camera, ExternalLink, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { getApiErrorFeedback } from '@/lib/api-error-feedback';
import { rejectAdminDriverDocument, type DriverDetail } from './admin-drivers-api';
import { driverDocumentLabels } from './driver-document-definitions';
export function DriverDocumentCard({
  driverId,
  documentType,
  document,
}: {
  driverId: string;
  documentType: string;
  document?: DriverDetail['documents'][number];
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  async function reject() {
    if (!document) return;
    setBusy(true);
    setError('');
    try {
      await rejectAdminDriverDocument(driverId, document.id);
      router.refresh();
    } catch (e) {
      setError(getApiErrorFeedback(e).message);
    } finally {
      setBusy(false);
    }
  }
  const label = driverDocumentLabels[documentType] ?? documentType;
  if (!document) {
    return (
      <article className="overflow-hidden rounded-2xl border border-dashed border-border bg-surface-paper">
        <div
          className="grid aspect-[4/3] place-items-center gap-3 bg-surface-inset px-4 text-center text-muted"
          role="img"
          aria-label={`${label}: بارگذاری نشده`}
        >
          <span className="grid size-14 place-items-center rounded-2xl border border-border bg-white">
            <Camera className="size-7" aria-hidden="true" />
          </span>
          <span className="text-sm font-bold">تصویری بارگذاری نشده است</span>
        </div>
        <div className="p-4">
          <div className="flex items-center justify-between gap-2">
            <h3 className="font-black">{label}</h3>
            <span className="shrink-0 rounded-full bg-surface-inset px-2 py-1 text-xs font-bold text-muted">
              بارگذاری نشده
            </span>
          </div>
        </div>
      </article>
    );
  }
  return (
    <article className="overflow-hidden rounded-2xl border border-border bg-white">
      <a href={document.viewUrl} target="_blank" rel="noreferrer">
        {document.mimeType === 'application/pdf' ? (
          <span className="grid aspect-[4/3] place-items-center gap-2 bg-surface-inset text-primary">
            <FileText className="size-12" />
            <span className="inline-flex items-center gap-2 text-sm font-bold">
              مشاهده PDF <ExternalLink className="size-4" />
            </span>
          </span>
        ) : (
          <img
            src={document.viewUrl}
            alt={label}
            className="aspect-[4/3] w-full bg-surface-inset object-contain"
          />
        )}
      </a>
      <div className="p-4">
        <div className="flex items-center justify-between gap-2">
          <h3 className="font-black">{label}</h3>
          <span
            className={`rounded-full px-2 py-1 text-xs font-bold ${document.reviewStatus === 'REJECTED' ? 'bg-danger/10 text-danger' : 'bg-success-soft text-success'}`}
          >
            {document.reviewStatus === 'REJECTED' ? 'رد شده' : 'ثبت شده'}
          </span>
        </div>
        {document.rejectionReason && (
          <p className="mt-2 text-xs text-danger">{document.rejectionReason}</p>
        )}
        {document.reviewStatus !== 'REJECTED' && (
          <Button
            type="button"
            variant="ghost"
            className="mt-3 min-h-11 text-danger"
            loading={busy}
            onClick={() => void reject()}
          >
            رد مدرک و درخواست بارگذاری مجدد
          </Button>
        )}
        {error && (
          <p role="alert" className="mt-2 text-xs text-danger">
            {error}
          </p>
        )}
      </div>
    </article>
  );
}
