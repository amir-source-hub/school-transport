'use client';

import {
  AlertCircle,
  ArrowLeft,
  Bell,
  CarFront,
  CheckCircle2,
  Clock,
  CreditCard,
  ExternalLink,
  FileText,
  GraduationCap,
  Home,
  Route,
  Phone,
  UserRound,
  UserRoundPlus,
} from 'lucide-react';
import { motion, useReducedMotion } from 'motion/react';
import { useState } from 'react';
import { Alert } from '@/components/feedback/alert';
import { Badge } from '@/components/ui/badge';
import { ButtonLink } from '@/components/ui/button';
import { cn } from '@/lib/cn';
import { formatPersianTime } from '@/lib/formatters';
import { IranianPlate, driverValueLabel } from '@/features/admin-drivers/driver-display';
import { driverDocumentLabels } from '@/features/admin-drivers/driver-document-definitions';
import type { StudentDriverAssignment } from '@/features/students/students-api';
export type StudentDashboard = {
  id: string;
  name: string;
  schoolAndGrade: string;
  academicYear: string;
  enrollmentCode: string;
  enrollmentStatus: string;
  enrollmentTone: string;
  nextAction: string;
  warning: string | null;
  contractStatus: string;
  paymentSummary: string;
  nextPayment: string;
  notifications: readonly string[];
  driverAssignments: StudentDriverAssignment[];
};

function AssignmentTimes({ assignment }: { assignment: StudentDriverAssignment }) {
  return (
    <dl className="grid gap-2 text-sm sm:grid-cols-2">
      {assignment.direction !== 'FROM_SCHOOL' && (
        <div className="flex items-center justify-between gap-3 rounded-xl bg-primary-soft px-3 py-2">
          <dt className="text-muted">ساعت رفت</dt>
          <dd className="font-black tabular-nums">
            {formatPersianTime(assignment.scheduledStartTime)}
          </dd>
        </div>
      )}
      {assignment.direction !== 'TO_SCHOOL' && (
        <div className="flex items-center justify-between gap-3 rounded-xl bg-primary-soft px-3 py-2">
          <dt className="text-muted">ساعت برگشت</dt>
          <dd className="font-black tabular-nums">
            {formatPersianTime(assignment.scheduledArrivalTime)}
          </dd>
        </div>
      )}
    </dl>
  );
}

function DriverAssignmentDetails({ assignments }: { assignments: StudentDriverAssignment[] }) {
  const first = assignments[0]!;
  const documents = [
    ...new Map(
      assignments.flatMap((assignment) => assignment.documents).map((document) => [
        document.documentType,
        document,
      ]),
    ).values(),
  ];
  return (
    <article className="overflow-hidden rounded-2xl border border-border bg-surface-paper">
      <div className="grid gap-4 p-4 sm:grid-cols-[1fr_auto] sm:items-start sm:p-5">
        <div>
          <p className="text-xs font-bold text-muted">راننده اختصاص‌یافته</p>
          <h3 className="mt-1 text-lg font-black">
            {first.driverFirstName} {first.driverLastName}
          </h3>
          <a
            href={`tel:${first.driverPhoneNumber}`}
            dir="ltr"
            className="mt-3 inline-flex min-h-11 items-center gap-2 rounded-xl bg-primary-soft px-3 text-sm font-bold text-primary"
          >
            <Phone className="size-4" aria-hidden="true" />
            {first.driverPhoneNumber}
          </a>
        </div>
        <div className="rounded-xl bg-surface-inset p-3">
          <div className="mb-2 flex items-center gap-2 text-xs font-bold text-muted">
            <CarFront className="size-4" aria-hidden="true" />
            {driverValueLabel(first.vehicleType)} · {first.vehicleSystem}
          </div>
          <IranianPlate value={first.plateNumber} />
        </div>
      </div>
      <div className="space-y-3 border-t border-border p-4 sm:p-5">
        {assignments.map((assignment) => (
          <section key={assignment.runId} aria-label={assignment.title}>
            <p className="mb-2 text-sm font-bold">{assignment.title}</p>
            <AssignmentTimes assignment={assignment} />
          </section>
        ))}
      </div>
      {documents.length > 0 && (
        <div className="border-t border-border p-4 sm:p-5">
          <h4 className="font-black">مدارک و تصاویر راننده</h4>
          <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-4">
            {documents.map((document) => {
              const label = driverDocumentLabels[document.documentType] ?? document.documentType;
              return (
                <a
                  key={document.documentType}
                  href={document.viewUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="overflow-hidden rounded-xl border border-border bg-surface-inset transition-colors hover:border-primary/40"
                >
                  {document.mimeType === 'application/pdf' ? (
                    <span className="grid aspect-[4/3] place-items-center gap-2 text-primary">
                      <FileText className="size-9" aria-hidden="true" />
                      <span className="inline-flex items-center gap-1 text-xs font-bold">
                        مشاهده PDF <ExternalLink className="size-3" aria-hidden="true" />
                      </span>
                    </span>
                  ) : (
                    // Signed object-storage URLs cannot be optimized reliably by Next Image.
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={document.viewUrl}
                      alt={label}
                      className="aspect-[4/3] w-full object-contain"
                    />
                  )}
                  <span className="block border-t border-border bg-white px-2 py-2 text-xs font-bold">
                    {label}
                  </span>
                </a>
              );
            })}
          </div>
        </div>
      )}
    </article>
  );
}

function groupDriverAssignments(assignments: StudentDriverAssignment[]) {
  const groups = new Map<string, StudentDriverAssignment[]>();
  for (const assignment of assignments) {
    const key = `${assignment.driverId}:${assignment.plateNumber}`;
    groups.set(key, [...(groups.get(key) ?? []), assignment]);
  }
  return [...groups.entries()];
}

const journeySteps = [
  { key: 'request', label: 'درخواست', icon: Route },
  { key: 'review', label: 'بررسی', icon: Clock },
  { key: 'price', label: 'قیمت', icon: CreditCard },
  { key: 'contract', label: 'قرارداد', icon: FileText },
  { key: 'payment', label: 'پرداخت', icon: CreditCard },
  { key: 'active', label: 'خدمت فعال', icon: CheckCircle2 },
] as const;

function getJourneyIndex(enrollmentCode: string): number {
  const indexes: Record<string, number> = {
    DRAFT: 0,
    SUBMITTED: 0,
    UNDER_REVIEW: 1,
    NEEDS_CORRECTION: 1,
    APPROVED: 2,
    CONTRACT_PENDING: 3,
    CONTRACT_READY: 3,
    CONTRACT_ACCEPTED: 4,
    ENROLLED: 5,
  };
  return indexes[enrollmentCode] ?? 0;
}

function StudentIdentitySwitcher({
  students,
  selectedId,
  onSelect,
}: {
  students: readonly StudentDashboard[];
  selectedId: string;
  onSelect: (id: string) => void;
}) {
  const prefersReduced = useReducedMotion();

  return (
    <div
      className="flex gap-3 overflow-x-auto pb-1 scrollbar-none"
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
              'relative flex shrink-0 items-center gap-3 rounded-[var(--radius-pill)] border px-4 py-3 text-sm font-bold transition-all duration-[var(--duration-fast)]',
              selected
                ? 'border-primary bg-primary text-white shadow-md shadow-primary/20'
                : 'border-border/60 bg-surface-paper text-muted hover:border-primary/50 hover:text-foreground shadow-[var(--shadow-raised)]',
            )}
          >
            <span
              className={cn(
                'flex h-8 w-8 items-center justify-center rounded-full text-xs font-black',
                selected ? 'bg-white/20 text-white' : 'bg-primary-soft text-primary',
              )}
            >
              {student.name.charAt(0)}
            </span>
            <div className="text-right">
              <p className={selected ? 'text-white' : 'text-foreground'}>{student.name}</p>
              <p className={cn('text-[10px]', selected ? 'text-white/70' : 'text-muted')}>
                {student.schoolAndGrade}
              </p>
            </div>
            {selected && !prefersReduced && (
              <motion.span
                layoutId="student-active-bg"
                className="absolute inset-0 rounded-[var(--radius-pill)] bg-primary"
                transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                style={{ zIndex: -1 }}
              />
            )}
          </button>
        );
      })}
    </div>
  );
}

function JourneyStatusCanvas({
  enrollmentCode,
  enrollmentStatus,
}: {
  enrollmentCode: string;
  enrollmentStatus: string;
  enrollmentTone: string;
}) {
  const current = getJourneyIndex(enrollmentCode);
  const prefersReduced = useReducedMotion();

  return (
    <div className="rounded-[var(--radius-card)] border border-border/60 bg-surface-paper p-5 shadow-[var(--shadow-raised)]">
      <div className="flex items-center gap-2 mb-4">
        <Route aria-hidden="true" className="size-4 text-primary" />
        <p className="text-xs font-bold text-muted uppercase tracking-wider">مسیر خدمت</p>
      </div>
      <p className="mb-5 text-sm text-muted">
        مرحله فعلی: <strong className="text-foreground">{enrollmentStatus}</strong>. مراحل آبی تکمیل
        شده‌اند و مرحله زرد در حال انجام است.
      </p>
      <div
        className="relative flex items-center justify-between"
        role="progressbar"
        aria-valuenow={current}
        aria-valuemin={0}
        aria-valuemax={journeySteps.length - 1}
      >
        <div
          className="absolute left-4 right-4 top-4 h-0.5 -translate-y-1/2 bg-border/70"
          aria-hidden="true"
        >
          <motion.div
            className="absolute right-0 h-full bg-primary"
            initial={prefersReduced ? false : { width: '0%' }}
            animate={{ width: `${(current / (journeySteps.length - 1)) * 100}%` }}
            transition={
              prefersReduced ? { duration: 0 } : { duration: 0.6, ease: [0.16, 1, 0.3, 1] }
            }
          />
        </div>
        {journeySteps.map((step, index) => {
          const isCompleted = index < current;
          const isCurrent = index === current;
          return (
            <div key={step.key} className="relative z-10 flex flex-col items-center gap-1.5">
              <span
                className={cn(
                  'flex size-8 items-center justify-center rounded-full text-xs font-bold transition-all duration-[var(--duration-ui)]',
                  isCompleted && 'bg-primary text-white shadow-sm shadow-primary/30',
                  isCurrent && 'border-2 border-sun bg-sun/10 text-sun shadow-sm shadow-sun/20',
                  !isCompleted &&
                    !isCurrent &&
                    'border border-border/60 bg-surface-inset text-muted',
                )}
              >
                {isCompleted ? (
                  <CheckCircle2 aria-hidden="true" className="size-4" />
                ) : (
                  <step.icon aria-hidden="true" className="size-3.5" />
                )}
              </span>
              <span
                className={cn(
                  'text-[10px] font-medium whitespace-nowrap',
                  isCurrent && 'text-sun font-bold',
                  isCompleted && 'text-primary',
                  !isCompleted && !isCurrent && 'text-muted',
                )}
              >
                {step.label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function NextBestAction({ nextAction, warning }: { nextAction: string; warning: string | null }) {
  return (
    <div
      className={cn(
        'rounded-[var(--radius-canvas)] p-6',
        warning
          ? 'bg-gradient-to-br from-danger/10 to-danger/5 border border-danger/20'
          : 'bg-gradient-to-br from-sun/15 to-sun/5 border border-sun/20',
      )}
    >
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-wider text-muted">اقدام بعدی</p>
          <h3 className="mt-1 text-lg font-black">{warning || 'در انتظار بررسی درخواست'}</h3>
          <p className="mt-1 text-sm text-muted">{nextAction}</p>
        </div>
        <span
          className={cn(
            'flex size-12 shrink-0 items-center justify-center rounded-2xl',
            warning ? 'bg-danger/10 text-danger' : 'bg-sun/20 text-navy',
          )}
        >
          {warning ? (
            <AlertCircle aria-hidden="true" className="size-6" />
          ) : (
            <Clock aria-hidden="true" className="size-6" />
          )}
        </span>
      </div>
      {!warning && (
        <div className="mt-4">
          <ButtonLink
            href="/student/enrollments"
            size="sm"
            variant="primary"
            className="bg-navy text-white hover:bg-navy/90"
          >
            مشاهده وضعیت ثبت‌نام
            <ArrowLeft aria-hidden="true" className="size-3.5" />
          </ButtonLink>
        </div>
      )}
    </div>
  );
}

function MoneyStrip({
  paymentSummary,
  nextPayment,
}: {
  paymentSummary: string;
  nextPayment: string;
}) {
  return (
    <div className="rounded-[var(--radius-card)] border border-border/60 bg-surface-paper p-5 shadow-[var(--shadow-raised)]">
      <div className="flex items-center gap-2 mb-3">
        <CreditCard aria-hidden="true" className="size-4 text-sun" />
        <p className="text-xs font-bold text-muted uppercase tracking-wider">خلاصه مالی</p>
      </div>
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted">وضعیت</span>
          <span className="text-sm font-bold">{paymentSummary}</span>
        </div>
        <div className="h-px bg-border/50" />
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted">پرداخت بعدی</span>
          <span className="text-sm font-bold text-sun">{nextPayment}</span>
        </div>
      </div>
    </div>
  );
}

function EventTimeline({ notifications }: { notifications: readonly string[] }) {
  return (
    <div className="rounded-[var(--radius-card)] border border-border/60 bg-surface-paper p-5 shadow-[var(--shadow-raised)]">
      <div className="flex items-center gap-2 mb-4">
        <Bell aria-hidden="true" className="size-4 text-primary" />
        <p className="text-xs font-bold text-muted uppercase tracking-wider">رویدادهای اخیر</p>
      </div>
      <div className="space-y-3">
        {notifications.length === 0 && (
          <p className="text-sm text-muted py-4 text-center">رویدادی ثبت نشده است.</p>
        )}
        {notifications.map((notification, i) => (
          <div key={i} className="relative mr-4 pr-4 last:pb-0">
            <div
              className="absolute right-0 top-1.5 h-2 w-2 rounded-full bg-primary/40"
              aria-hidden="true"
            />
            {i < notifications.length - 1 && (
              <div
                className="absolute right-[3px] top-4 h-full w-px bg-border/50"
                aria-hidden="true"
              />
            )}
            <p className="text-sm text-muted">{notification}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

export function StudentDashboard({ students }: { students: readonly StudentDashboard[] }) {
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
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <Home aria-hidden="true" className="size-4 text-primary" />
            <p className="text-sm font-bold text-primary">خوش آمدید</p>
          </div>
          <h1 className="mt-1 text-2xl font-black sm:text-3xl">وضعیت سرویس را دنبال کنید</h1>
        </div>
        <div className="flex flex-wrap gap-2">
        <ButtonLink
          href="/student/enrollments"
          size="sm"
          className="bg-navy text-white hover:bg-navy/90"
        >
          <GraduationCap aria-hidden="true" className="size-4" />
          ثبت‌نام دانش‌آموز
        </ButtonLink>
        <ButtonLink href={`/student/students/${selectedStudent.id}#student-companion`} size="sm" variant="secondary">
          <UserRoundPlus aria-hidden="true" className="size-4" />
          {selectedStudent.name} · مراقب همراه
        </ButtonLink>
        </div>
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

      <div className="grid gap-5 lg:grid-cols-[1fr_320px]">
        <div className="space-y-5">
          <NextBestAction
            nextAction={selectedStudent.nextAction}
            warning={selectedStudent.warning}
          />
          <JourneyStatusCanvas
            enrollmentCode={selectedStudent.enrollmentCode}
            enrollmentStatus={selectedStudent.enrollmentStatus}
            enrollmentTone={selectedStudent.enrollmentTone}
          />
        </div>
        <div className="space-y-4">
          <MoneyStrip
            paymentSummary={selectedStudent.paymentSummary}
            nextPayment={selectedStudent.nextPayment}
          />
          <div className="rounded-[var(--radius-card)] border border-border/60 bg-surface-paper p-5 shadow-[var(--shadow-raised)]">
            <div className="flex items-center gap-2 mb-3">
              <FileText aria-hidden="true" className="size-4 text-muted" />
              <p className="text-xs font-bold text-muted uppercase tracking-wider">قرارداد</p>
            </div>
            <Badge tone="neutral" className="text-xs">
              {selectedStudent.contractStatus}
            </Badge>
            <div className="mt-4">
              <ButtonLink href="/student/contracts" variant="ghost" size="sm" className="px-0">
                مشاهده قراردادها
                <ArrowLeft aria-hidden="true" className="size-3.5" />
              </ButtonLink>
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-[1fr_1fr]">
        <div className="rounded-[var(--radius-card)] border border-border/60 bg-surface-paper p-5 shadow-[var(--shadow-raised)]">
          <div className="flex items-center gap-2 mb-3">
            <UserRound aria-hidden="true" className="size-4 text-muted" />
            <p className="text-xs font-bold text-muted uppercase tracking-wider">
              اطلاعات دانش‌آموز
            </p>
          </div>
          <dl className="divide-y divide-border/50 text-sm">
            <div className="flex items-center justify-between py-2.5">
              <dt className="text-muted">نام</dt>
              <dd className="font-bold">{selectedStudent.name}</dd>
            </div>
            <div className="flex items-center justify-between py-2.5">
              <dt className="text-muted">مدرسه و پایه</dt>
              <dd className="font-bold">{selectedStudent.schoolAndGrade}</dd>
            </div>
            <div className="flex items-center justify-between py-2.5">
              <dt className="text-muted">سال تحصیلی</dt>
              <dd className="font-bold">{selectedStudent.academicYear}</dd>
            </div>
          </dl>
        </div>
        <EventTimeline notifications={selectedStudent.notifications} />
      </div>
      <div className="rounded-[var(--radius-card)] border border-border/60 bg-surface-paper p-5 shadow-[var(--shadow-raised)]">
        <div className="flex items-center gap-2"><Route aria-hidden="true" className="size-4 text-primary" /><h2 className="font-black">راننده و سرویس‌های فعال {selectedStudent.name}</h2></div>
        {!selectedStudent.driverAssignments.length && <p className="mt-3 text-sm text-muted">هنوز راننده‌ای برای این دانش‌آموز تعیین نشده است.</p>}
        <div className="mt-4 grid gap-4">
          {groupDriverAssignments(selectedStudent.driverAssignments).map(([key, assignments]) => (
            <DriverAssignmentDetails key={key} assignments={assignments} />
          ))}
        </div>
      </div>
    </div>
  );
}
