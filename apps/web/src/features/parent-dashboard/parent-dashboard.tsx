'use client';

import { AlertCircle, ArrowLeft, Bell, CheckCircle2 } from 'lucide-react';
import { useState } from 'react';
import { motion, useReducedMotion } from 'motion/react';

import { Breadcrumbs } from '@/components/navigation/breadcrumbs';
import { Alert } from '@/components/feedback/alert';
import { Badge } from '@/components/ui/badge';
import { ButtonLink, Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { BrandMark } from '@/components/brand/brand-mark';
import { cn } from '@/lib/cn';

import type { DemoStudentDashboard } from './mock-parent-dashboard';

function StudentIdentitySwitcher({
  students,
  selectedId,
  onSelect,
}: {
  students: readonly DemoStudentDashboard[];
  selectedId: string;
  onSelect: (id: string) => void;
}) {
  const prefersReduced = useReducedMotion();

  return (
    <div
      className="flex gap-3 overflow-x-auto pb-1"
      role="group"
      aria-label="انتخاب دانش‌آموز"
      aria-live="polite"
    >
      {students.map((student) => {
        const selected = student.id === selectedId;
        return (
          <button
            key={student.id}
            type="button"
            aria-pressed={selected}
            onClick={() => onSelect(student.id)}
            className={cn(
              'relative flex shrink-0 items-center gap-2.5 rounded-[var(--radius-pill)] border px-4 py-2.5 text-sm font-bold transition-colors',
              selected
                ? 'border-primary bg-primary-soft text-primary-hover'
                : 'border-border bg-surface-paper text-muted hover:border-primary hover:text-foreground',
            )}
          >
            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-primary/10 text-xs font-black text-primary">
              {student.name.charAt(0)}
            </span>
            <span>{student.name}</span>
            {selected && !prefersReduced && (
              <motion.span
                layoutId="student-indicator"
                className="absolute -bottom-0.5 left-0 right-0 mx-auto h-0.5 w-8 rounded-full bg-primary"
                transition={{ type: 'spring', stiffness: 400, damping: 30 }}
              />
            )}
          </button>
        );
      })}
    </div>
  );
}

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

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-bold text-primary">خوش آمدید</p>
          <h1 className="mt-1 text-2xl font-black sm:text-3xl">
            وضعیت سرویس را دنبال کنید
          </h1>
        </div>
        <ButtonLink href="/parent/students/new" size="sm">
          افزودن دانش‌آموز
        </ButtonLink>
      </div>

      <StudentIdentitySwitcher
        students={students}
        selectedId={selectedStudent.id}
        onSelect={setSelectedId}
      />

      {selectedStudent.warning && (
        <Alert tone="danger" title="اقدام لازم">
          <div className="flex items-center gap-2">
            <AlertCircle aria-hidden="true" className="size-4 shrink-0" />
            {selectedStudent.warning}
          </div>
        </Alert>
      )}

      <section aria-label="وضعیت جاری و اقدام بعدی" className="space-y-4">
        <Card variant="raised" padding="lg" className="relative overflow-hidden">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-muted">
                وضعیت ثبت‌نام
              </p>
              <h2 className="mt-1 text-xl font-black">{selectedStudent.enrollmentStatus}</h2>
              <p className="mt-1 text-sm text-muted">{selectedStudent.nextAction}</p>
              <div className="mt-4 flex items-center gap-3">
                <Badge tone={selectedStudent.enrollmentTone}>
                  {selectedStudent.enrollmentStatus}
                </Badge>
                <span className="text-xs text-muted">اقدام بعدی</span>
                <ArrowLeft aria-hidden="true" className="size-3.5 text-muted" />
              </div>
            </div>
            <BrandMark size={40} className="shrink-0 opacity-20" />
          </div>
          <div className="mt-6 grid grid-cols-3 gap-2">
            {['ثبت اطلاعات', 'بررسی', 'قرارداد'].map((step, i) => (
              <div key={step} className="flex flex-col items-center gap-1.5">
                <span
                  className={cn(
                    'flex h-6 w-6 items-center justify-center rounded-full text-[10px] font-bold',
                    i <= 0 ? 'bg-primary text-white' : 'bg-surface-inset text-muted',
                  )}
                >
                  {i <= 0 ? <CheckCircle2 aria-hidden="true" className="size-3.5" /> : i + 1}
                </span>
                <span className="text-[10px] text-muted">{step}</span>
              </div>
            ))}
          </div>
        </Card>

        <div className="grid gap-4 sm:grid-cols-2">
          <Card variant="outlined" padding="md">
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted">وضعیت قرارداد</p>
              <Badge tone="neutral">{selectedStudent.contractStatus}</Badge>
            </div>
            <p className="mt-2 text-lg font-black">{selectedStudent.contractStatus}</p>
          </Card>
          <Card variant="outlined" padding="md">
            <p className="text-sm text-muted">خلاصه پرداخت</p>
            <p className="mt-2 text-lg font-black">{selectedStudent.paymentSummary}</p>
            <p className="mt-1 text-xs text-muted">
              پرداخت بعدی: {selectedStudent.nextPayment}
            </p>
          </Card>
        </div>
      </section>

      <section className="grid gap-5 lg:grid-cols-[1.1fr_.9fr]">
        <Card variant="outlined" padding="md">
          <dl className="divide-y divide-border text-sm">
            <div className="flex items-center justify-between py-3">
              <dt className="text-muted">نام</dt>
              <dd className="font-bold">{selectedStudent.name}</dd>
            </div>
            <div className="flex items-center justify-between py-3">
              <dt className="text-muted">مدرسه و پایه</dt>
              <dd className="font-bold">{selectedStudent.schoolAndGrade}</dd>
            </div>
            <div className="flex items-center justify-between py-3">
              <dt className="text-muted">سال تحصیلی</dt>
              <dd className="font-bold">{selectedStudent.academicYear}</dd>
            </div>
          </dl>
        </Card>
        <Card variant="outlined" padding="md">
          <div className="flex items-center gap-2">
            <Bell aria-hidden="true" className="size-5 text-primary" />
            <h2 className="font-black">اعلان‌های اخیر</h2>
          </div>
          <ul className="mt-4 space-y-2 text-sm">
            {selectedStudent.notifications.map((notification) => (
              <li key={notification} className="rounded-[var(--radius-control)] bg-surface-inset p-3 text-muted">
                {notification}
              </li>
            ))}
          </ul>
        </Card>
      </section>
    </div>
  );
}
