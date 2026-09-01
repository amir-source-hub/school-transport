'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Select } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { getApiErrorFeedback } from '@/lib/api-error-feedback';
import { PhotoUploadCard } from './photo-upload-card';
import { rejectAdminPhoto } from './admin-student-photos-api';

const reasons = [
  { value: 'BLURRED', label: 'تار یا خارج از فوکوس' },
  { value: 'CROPPED_FACE', label: 'برش نامناسب چهره' },
  { value: 'FILTER_OR_EDITING', label: 'فیلتر یا ویرایش تصویر' },
  { value: 'NOT_A_RECENT_COLOR_PHOTO', label: 'عکس قدیمی یا غیررنگی' },
  { value: 'WRONG_BACKGROUND', label: 'پس‌زمینه نامناسب' },
  { value: 'LOW_QUALITY', label: 'کیفیت ناکافی' },
  { value: 'OTHER', label: 'سایر' },
];

export function AdminStudentPhotoActions({
  studentId,
  familyId,
  approvedPhoto,
}: {
  studentId: string;
  familyId: string;
  approvedPhoto: { uploadId: string; version: number } | null;
}) {
  const router = useRouter();
  const [reason, setReason] = useState('');
  const [detail, setDetail] = useState('');
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState<string>();

  async function rejectApproved() {
    if (!approvedPhoto || !reason || pending) return;
    setPending(true);
    setMessage(undefined);
    try {
      await rejectAdminPhoto(approvedPhoto.uploadId, approvedPhoto.version, reason, detail);
      setMessage('تأیید عکس لغو شد و درخواست بارگذاری مجدد برای خانواده ارسال شد.');
      router.refresh();
    } catch (error) {
      setMessage(getApiErrorFeedback(error).message);
    } finally {
      setPending(false);
    }
  }

  return (
    <Card className="lg:col-span-2">
      <h2 className="font-black">مدیریت عکس دانش‌آموز</h2>
      <p className="mt-2 text-sm leading-7 text-muted">
        مدیر می‌تواند عکس تأییدشده را رد کند تا خانواده اعلان دریافت کرده و عکس تازه بفرستد، یا
        مستقیماً عکس جایگزین بارگذاری کند. عکس جایگزین مدیر پس از پردازش، همان‌جا تأیید می‌شود.
      </p>
      {approvedPhoto && (
        <div className="mt-4 grid gap-3 rounded-xl border border-danger/25 bg-danger/5 p-4 md:grid-cols-2">
          <Select
            options={reasons}
            value={reason}
            onValueChange={setReason}
            placeholder="دلیل لغو تأیید"
          />
          <Textarea
            value={detail}
            onChange={(event) => setDetail(event.target.value)}
            maxLength={500}
            placeholder="توضیح اختیاری برای خانواده"
          />
          <Button variant="danger" disabled={!reason} loading={pending} onClick={rejectApproved}>
            رد عکس تأییدشده و درخواست بارگذاری مجدد
          </Button>
        </div>
      )}
      <div className="mt-5 border-t border-border pt-5">
        <PhotoUploadCard
          studentId={studentId}
          familyId={familyId}
          mode="admin"
          initialItems={[]}
          showHeading={false}
        />
      </div>
      {message && <p className="mt-3 text-sm font-bold text-primary">{message}</p>}
    </Card>
  );
}
