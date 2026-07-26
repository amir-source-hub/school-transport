'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { getApiErrorFeedback } from '@/lib/api-error-feedback';
import {
  acceptEnrollmentPrice,
  cancelEnrollment,
  createEnrollment,
  submitEnrollment,
} from './enrollments-api';

export function CreateEnrollmentForm({ students }: { students: { id: string; name: string }[] }) {
  const router = useRouter();
  const [studentId, setStudentId] = useState(students[0]?.id ?? '');
  const [academicYear, setAcademicYear] = useState('1405-1406');
  const [serviceType, setServiceType] = useState('ROUND_TRIP');
  const [requestedStartDate, setRequestedStartDate] = useState('');
  const [parentNotes, setParentNotes] = useState('');
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string>();

  return (
    <form
      className="grid gap-4 sm:grid-cols-2"
      onSubmit={async (event) => {
        event.preventDefault();
        setPending(true);
        setError(undefined);
        try {
          const enrollment = await createEnrollment({
            studentId,
            academicYear,
            serviceType,
            requestedStartDate: requestedStartDate || undefined,
            parentNotes: parentNotes || undefined,
          });
          await submitEnrollment(enrollment.id);
          router.refresh();
        } catch (caught) {
          setError(getApiErrorFeedback(caught).message);
        } finally {
          setPending(false);
        }
      }}
    >
      <label className="text-sm font-bold">دانش‌آموز
        <Select value={studentId} onValueChange={setStudentId} options={students.map((student) => ({ value: student.id, label: student.name }))} placeholder="انتخاب دانش‌آموز" />
      </label>
      <label className="text-sm font-bold">سال تحصیلی<Input required value={academicYear} onChange={(event) => setAcademicYear(event.target.value)} /></label>
      <label className="text-sm font-bold">نوع سرویس
        <Select value={serviceType} onValueChange={setServiceType} options={[{ value: 'ROUND_TRIP', label: 'رفت و برگشت' }, { value: 'ONE_WAY', label: 'یک‌طرفه' }]} />
      </label>
      <label className="text-sm font-bold">تاریخ شروع<Input type="date" value={requestedStartDate} onChange={(event) => setRequestedStartDate(event.target.value)} /></label>
      <label className="text-sm font-bold sm:col-span-2">توضیحات<Textarea value={parentNotes} onChange={(event) => setParentNotes(event.target.value)} /></label>
      {error && <p className="text-sm text-danger sm:col-span-2">{error}</p>}
      <Button type="submit" loading={pending} disabled={!studentId}>ثبت و ارسال درخواست</Button>
    </form>
  );
}

export function CancelEnrollmentButton({ id }: { id: string }) {
  const router = useRouter();
  return <Button variant="danger" size="sm" onClick={async () => { await cancelEnrollment(id); router.refresh(); }}>لغو درخواست</Button>;
}

export function AcceptPriceButton({ enrollmentId, priceId, installmentAllowed }: { enrollmentId: string; priceId: string; installmentAllowed: boolean }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  return (
    <Button
      size="sm"
      loading={pending}
      onClick={async () => {
        setPending(true);
        try {
          await acceptEnrollmentPrice(enrollmentId, priceId, installmentAllowed ? 'PREPAYMENT_PLUS_FOUR_INSTALLMENTS' : 'FULL');
          router.refresh();
        } finally {
          setPending(false);
        }
      }}
    >
      پذیرش قیمت
    </Button>
  );
}
