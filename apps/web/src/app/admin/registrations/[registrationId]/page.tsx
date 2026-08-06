import { notFound } from 'next/navigation';

import { Breadcrumbs } from '@/components/navigation/breadcrumbs';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { ButtonLink } from '@/components/ui/button';
import {
  getAdminRegistration,
  getRegistrationTone,
} from '@/features/admin-registrations/admin-registrations-api';
import {
  ApproveButton,
  RejectButton,
  RequestCorrectionButton,
  StartReviewButton,
} from '@/features/admin-registrations/enrollment-actions';
import { metadataFor } from '@/lib/route-metadata';

export const metadata = metadataFor('/admin/registrations/[registrationId]');
export const dynamic = 'force-dynamic';

export default async function RegistrationPage({
  params,
}: {
  params: Promise<{ registrationId: string }>;
}) {
  const { registrationId } = await params;
  const { registration } = await getAdminRegistration(registrationId);
  if (!registration) notFound();

  const status = registration.status;
  const canStartReview = status === 'ارسال‌شده';
  const canDecide = status === 'در حال بررسی';
  const needsCorrection = status === 'نیازمند اصلاح';
  const isApproved = status === 'تأییدشده';
  const isRejected = status === 'ردشده';
  const awaitingPricing = status === 'در انتظار قیمت';
  const prepaid = status === 'پیش‌پرداخت انجام‌شده';
  const installmentsInProgress = status.startsWith('در حال پرداخت اقساط');
  const paymentCompleted = status === 'تسویه کامل';

  return (
    <div className="space-y-6">
      <Breadcrumbs
        items={[
          { label: 'پنل مدیریت', href: '/admin/dashboard' },
          { label: 'درخواست‌ها', href: '/admin/registrations' },
          { label: registration.trackingCode },
        ]}
      />
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-sm font-bold text-primary">{registration.trackingCode}</p>
          <h1 className="mt-1 text-2xl font-black sm:text-3xl">
            بررسی درخواست {registration.studentName}
          </h1>
        </div>
        <Badge tone={getRegistrationTone(status)}>{status}</Badge>
      </div>
      <Card>
        <h2 className="text-lg font-black">خلاصه درخواست</h2>
        <dl className="mt-4 divide-y divide-border text-sm">
          {[
            ['دانش‌آموز', registration.studentName],
            ['خانواده', registration.familyName],
            ['مدرسه', registration.schoolName],
            ['وضعیت', status],
            ['اقدام بعدی', registration.nextAction],
          ].map(([label, value]) => (
            <div key={label} className="grid gap-1 py-3 sm:grid-cols-[10rem_1fr]">
              <dt className="text-muted">{label}</dt>
              <dd className="font-bold">{value}</dd>
            </div>
          ))}
        </dl>
      </Card>
      <Card>
        <h2 className="text-lg font-black">تصمیم مدیریت</h2>
        <p className="mt-2 text-sm text-muted">
          {canStartReview && 'درخواست هنوز بررسی نشده است. برای شروع فرایند بررسی کلیک کنید.'}
          {canDecide && 'درخواست در حال بررسی است. می‌توانید تأیید، رد یا درخواست اصلاح کنید.'}
          {needsCorrection &&
            'از خانواده درخواست اصلاح اطلاعات شده است. پس از اعمال اصلاحات، درخواست دوباره بررسی می‌شود.'}
          {isApproved && 'این درخواست تأیید شده است. برای ثبت قیمت به بخش قیمت‌گذاری مراجعه کنید.'}
          {isRejected && 'این درخواست رد شده است.'}
          {awaitingPricing && 'درخواست تأیید شده و در انتظار ثبت قیمت است.'}
          {prepaid &&
            'قرارداد پذیرفته و پیش‌پرداخت انجام شده است. برنامه پرداخت باقی‌مانده را در بخش پرداخت‌ها ثبت کنید.'}
          {installmentsInProgress && 'پیش‌پرداخت انجام شده و بخشی از اقساط نیز پرداخت شده است.'}
          {paymentCompleted && 'پیش‌پرداخت و تمام اقساط این دانش‌آموز پرداخت شده‌اند.'}
        </p>
        <div className="mt-5 flex flex-col gap-3 sm:flex-row">
          {canStartReview && <StartReviewButton enrollmentId={registrationId} />}
          {canDecide && (
            <>
              <ApproveButton enrollmentId={registrationId} />
              <RequestCorrectionButton enrollmentId={registrationId} />
              <RejectButton enrollmentId={registrationId} />
            </>
          )}
          {(isApproved || awaitingPricing) && (
            <ButtonLink href="/admin/payments">مدیریت برنامه پرداخت</ButtonLink>
          )}
          {prepaid && (
            <ButtonLink href="/admin/payments">تنظیم مبلغ و سررسیدهای باقی‌مانده</ButtonLink>
          )}
          {installmentsInProgress && (
            <ButtonLink href="/admin/payments">مشاهده پرداخت‌ها و اقساط باقی‌مانده</ButtonLink>
          )}
          {paymentCompleted && <ButtonLink href="/admin/payments">مشاهده سوابق پرداخت</ButtonLink>}
        </div>
      </Card>
    </div>
  );
}
