'use client';
/* eslint-disable @next/next/no-img-element */
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { getApiErrorFeedback } from '@/lib/api-error-feedback';
import { rejectAdminDriverDocument, type DriverDetail } from './admin-drivers-api';

const labels: Record<string, string> = {
  DRIVER_PHOTO: 'عکس راننده',
  PROFILE_PHOTO: 'عکس پرسنلی',
  NATIONAL_CARD_FRONT: 'روی کارت ملی',
  NATIONAL_CARD_BACK: 'پشت کارت ملی',
  BIRTH_CERTIFICATE_PAGE_1: 'صفحه اول شناسنامه',
  BIRTH_CERTIFICATE_PAGE_2: 'صفحه دوم شناسنامه',
  DRIVER_LICENSE_FRONT: 'روی گواهینامه',
  DRIVER_LICENSE_BACK: 'پشت گواهینامه',
  CRIMINAL_RECORD_CERTIFICATE: 'گواهی سوءپیشینه',
  ADDICTION_TEST_CERTIFICATE: 'گواهی عدم اعتیاد',
  COMMITMENT_LETTER_RETURNED: 'تعهدنامه تکمیل‌شده',
  ADDICTION_LETTER_RETURNED: 'نامه عدم اعتیاد تکمیل‌شده',
  VEHICLE_PHOTO: 'عکس خودرو',
  VEHICLE_CARD_FRONT: 'روی کارت خودرو',
  VEHICLE_CARD_BACK: 'پشت کارت خودرو',
  VEHICLE_TITLE_DOCUMENT: 'سند خودرو',
  TECHNICAL_INSPECTION_DOCUMENT: 'معاینه فنی',
  INSURANCE_POLICY_DOCUMENT: 'بیمه‌نامه',
};
export function DriverDocumentCard({
  driverId,
  document,
}: {
  driverId: string;
  document: DriverDetail['documents'][number];
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  async function reject() {
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
  return (
    <article className="overflow-hidden rounded-2xl border border-border bg-white">
      <a href={document.viewUrl} target="_blank" rel="noreferrer">
        <img
          src={document.viewUrl}
          alt={labels[document.documentType] ?? 'تصویر مدرک راننده'}
          className="aspect-[4/3] w-full bg-surface-inset object-contain"
        />
      </a>
      <div className="p-4">
        <div className="flex items-center justify-between gap-2">
          <h3 className="font-black">{labels[document.documentType] ?? document.documentType}</h3>
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
            رد تصویر و درخواست بارگذاری مجدد
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
