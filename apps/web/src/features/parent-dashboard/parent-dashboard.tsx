'use client';

import { Bell, CalendarClock, FileText, GraduationCap, WalletCards } from 'lucide-react';
import { useState } from 'react';

import { Breadcrumbs } from '@/components/navigation/breadcrumbs';
import { Alert } from '@/components/feedback/alert';
import { Badge } from '@/components/ui/badge';
import { ButtonLink } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

import type { DemoStudentDashboard } from './mock-parent-dashboard';

export function ParentDashboard({ students }: { students: readonly DemoStudentDashboard[] }) {
  const [selectedId, setSelectedId] = useState(students[0]?.id);
  const selectedStudent = students.find(({ id }) => id === selectedId) ?? students[0];

  if (!selectedStudent) {
    return (
      <Alert title="هنوز دانش‌آموزی ثبت نشده است">
        برای شروع فرایند، نخست یک دانش‌آموز به حساب خانواده اضافه کنید.
      </Alert>
    );
  }

  return (
    <div className="space-y-6">
      <Breadcrumbs
        items={[{ label: 'پنل خانواده', href: '/parent/dashboard' }, { label: 'نمای کلی' }]}
      />

      <section className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-sm font-bold text-primary">نمای کلی خانواده</p>
          <h1 className="mt-1 text-2xl font-black sm:text-3xl">
            وضعیت هر دانش‌آموز را جداگانه پیگیری کنید
          </h1>
          <p className="mt-2 text-sm text-muted">
            تمام اطلاعات این صفحه نمایشی است و از سرور دریافت نشده است.
          </p>
        </div>
        <ButtonLink href="/parent/students/new">افزودن دانش‌آموز</ButtonLink>
      </section>

      <section aria-labelledby="student-selector-title">
        <h2 id="student-selector-title" className="text-sm font-black">
          دانش‌آموز فعلی
        </h2>
        <div
          className="mt-3 flex gap-3 overflow-x-auto pb-2"
          role="group"
          aria-label="انتخاب دانش‌آموز"
        >
          {students.map((student) => {
            const selected = student.id === selectedStudent.id;
            return (
              <button
                key={student.id}
                type="button"
                aria-pressed={selected}
                onClick={() => setSelectedId(student.id)}
                className={`min-h-12 shrink-0 rounded-[var(--radius-sm)] border px-4 text-sm font-bold transition-colors ${
                  selected
                    ? 'border-primary bg-primary-soft text-primary-hover'
                    : 'border-border bg-surface text-muted hover:border-primary hover:text-foreground'
                }`}
              >
                {student.name}
              </button>
            );
          })}
        </div>
      </section>

      <Alert title={`در حال مشاهده: ${selectedStudent.name}`}>
        هر اقدام و خلاصه وضعیت در این صفحه فقط به همین دانش‌آموز مربوط است.
      </Alert>

      {selectedStudent.warning && (
        <Alert tone="danger" title="اقدام لازم">
          {selectedStudent.warning}
        </Alert>
      )}

      <section
        className="grid gap-4 md:grid-cols-2 xl:grid-cols-4"
        aria-label="خلاصه وضعیت دانش‌آموز"
      >
        <Card>
          <GraduationCap aria-hidden="true" className="size-6 text-primary" />
          <p className="mt-4 text-sm text-muted">ثبت‌نام</p>
          <div className="mt-2">
            <Badge tone={selectedStudent.enrollmentTone}>{selectedStudent.enrollmentStatus}</Badge>
          </div>
          <p className="mt-3 text-sm">{selectedStudent.nextAction}</p>
        </Card>
        <Card>
          <FileText aria-hidden="true" className="size-6 text-primary" />
          <p className="mt-4 text-sm text-muted">وضعیت قرارداد</p>
          <p className="mt-2 font-black">{selectedStudent.contractStatus}</p>
        </Card>
        <Card>
          <WalletCards aria-hidden="true" className="size-6 text-primary" />
          <p className="mt-4 text-sm text-muted">خلاصه پرداخت</p>
          <p className="mt-2 font-black">{selectedStudent.paymentSummary}</p>
        </Card>
        <Card>
          <CalendarClock aria-hidden="true" className="size-6 text-primary" />
          <p className="mt-4 text-sm text-muted">پرداخت بعدی</p>
          <p className="mt-2 font-black">{selectedStudent.nextPayment}</p>
        </Card>
      </section>

      <section className="grid gap-5 lg:grid-cols-[1.1fr_.9fr]">
        <Card>
          <h2 className="text-lg font-black">خلاصه دانش‌آموز</h2>
          <dl className="mt-4 divide-y divide-border text-sm">
            <div className="flex flex-col gap-1 py-3 sm:flex-row sm:justify-between">
              <dt className="text-muted">نام</dt>
              <dd className="font-bold">{selectedStudent.name}</dd>
            </div>
            <div className="flex flex-col gap-1 py-3 sm:flex-row sm:justify-between">
              <dt className="text-muted">مدرسه و پایه</dt>
              <dd className="font-bold">{selectedStudent.schoolAndGrade}</dd>
            </div>
            <div className="flex flex-col gap-1 py-3 sm:flex-row sm:justify-between">
              <dt className="text-muted">سال تحصیلی</dt>
              <dd className="font-bold">{selectedStudent.academicYear}</dd>
            </div>
          </dl>
        </Card>
        <Card>
          <div className="flex items-center gap-2">
            <Bell aria-hidden="true" className="size-5 text-primary" />
            <h2 className="text-lg font-black">اعلان‌های اخیر</h2>
          </div>
          <ul className="mt-4 space-y-3 text-sm">
            {selectedStudent.notifications.map((notification) => (
              <li key={notification} className="rounded-[var(--radius-sm)] bg-surface-muted p-3">
                {notification}
              </li>
            ))}
          </ul>
        </Card>
      </section>
    </div>
  );
}
