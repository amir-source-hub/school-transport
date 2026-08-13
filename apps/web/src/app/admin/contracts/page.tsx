import { Breadcrumbs } from '@/components/navigation/breadcrumbs';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import {
  getAdminContracts,
  getContractTone,
  getContractActionLabel,
} from '@/features/admin-finance/admin-contracts-api';
import { GenerateContractDialog } from '@/features/admin-finance/generate-contract-dialog';
import { formatIrr } from '@/lib/formatters';
import { ButtonLink } from '@/components/ui/button';
import { formatJalaliDate, formatJalaliDateTime } from '@/lib/formatters';

const detailLabels: Record<string, string> = {
  bindings: 'اطلاعات ثبت‌شده قرارداد',
  price: 'اطلاعات مالی قرارداد',
  totalAmount: 'مبلغ کل',
  prepaymentAmount: 'مبلغ پیش‌پرداخت',
  installmentCount: 'تعداد اقساط',
  currency: 'واحد پول',
  priceStatus: 'وضعیت قیمت',
  fullPaymentAllowed: 'امکان پرداخت کامل',
  installmentPaymentAllowed: 'امکان پرداخت اقساطی',
  versionNumber: 'نسخه',
  registrationId: 'شناسه ثبت‌نام',
  setAt: 'زمان ثبت قیمت',
  parentConfirmedAt: 'زمان تأیید خانواده',
  studentFullName: 'نام و نام خانوادگی دانش‌آموز',
  guardianFullName: 'نام و نام خانوادگی سرپرست',
  guardianRole: 'نسبت سرپرست',
  studentNationalId: 'کد ملی دانش‌آموز',
  educationLevel: 'مقطع تحصیلی',
  grade: 'پایه تحصیلی',
  fieldOfStudy: 'رشته تحصیلی',
  academicYear: 'سال تحصیلی',
  serviceAmountRial: 'هزینه سرویس به ریال',
  serviceAmountToman: 'هزینه سرویس به تومان',
  serviceAmountTomanWords: 'هزینه سرویس به حروف',
  paymentState: 'وضعیت پرداخت',
  homePhone: 'تلفن منزل',
  postalCode: 'کد پستی',
  homeAddress: 'نشانی منزل',
  emergencyPhone: 'شماره تماس اضطراری',
  motherMobile: 'شماره همراه مادر',
  fatherMobile: 'شماره همراه پدر',
  contractStartDate: 'تاریخ شروع قرارداد',
  serviceType: 'نوع سرویس',
  schoolName: 'نام مدرسه',
  generatedDate: 'تاریخ صدور قرارداد',
  decisionDeadline: 'مهلت تصمیم‌گیری',
};

const hiddenSnapshotFields = new Set([
  'schemaVersion',
  'templateVersion',
  'generatedAt',
  'acceptance',
  'enrollment',
  'contractText',
  'pages',
  'templateHash',
]);

const statusLabels: Record<string, string> = {
  PENDING: 'پرداخت نشده',
  PAID: 'پرداخت شده',
  SUCCEEDED: 'موفق',
  FAILED: 'ناموفق',
  CREATED: 'ایجاد شده',
  ACTIVE: 'فعال',
  COMPLETED: 'تکمیل شده',
  ACCEPTED: 'پذیرفته شده',
  DRAFT: 'پیش‌نویس',
  GENERATED: 'صادر شده',
  REJECTED: 'رد شده',
  CANCELLED: 'لغو شده',
  AWAITING_PREPAYMENT: 'در انتظار پرداخت پیش‌پرداخت',
  BUS: 'اتوبوس',
  VAN: 'ون',
  SEDAN: 'سواری',
  FATHER: 'پدر',
  MOTHER: 'مادر',
  OTHER: 'سایر بستگان',
};

function formatDetailValue(key: string, value: unknown) {
  if (value === null || value === undefined || value === '') return '—';
  if (typeof value === 'boolean') return value ? 'بله' : 'خیر';
  if (typeof value === 'number' && key.toLowerCase().includes('amount')) return formatIrr(value);
  if (typeof value === 'string' && /^\d{4}\/\d{2}\/\d{2}/.test(value)) {
    return value.replace(/\d/g, (digit) => '۰۱۲۳۴۵۶۷۸۹'[Number(digit)]);
  }
  if (typeof value === 'string' && /(At|Date)$/i.test(key)) return formatJalaliDateTime(value);
  return statusLabels[String(value)] ?? String(value);
}

export const metadata = { title: 'قراردادها' };
export const dynamic = 'force-dynamic';

export default async function ContractsPage({
  searchParams,
}: {
  searchParams: Promise<{ selected?: string }>;
}) {
  const { contracts } = await getAdminContracts();
  const { selected } = await searchParams;
  const selectedContract = contracts.find((item) => item.id === selected);
  const selectedSnapshot = (() => {
    if (!selectedContract?.contractDataSnapshot) return null;
    try {
      return JSON.parse(selectedContract.contractDataSnapshot) as Record<string, unknown>;
    } catch {
      return null;
    }
  })();

  return (
    <div className="space-y-6">
      <Breadcrumbs
        items={[{ label: 'پنل مدیریت', href: '/admin/dashboard' }, { label: 'قراردادها' }]}
      />
      <div>
        <p className="text-sm font-bold text-primary">نسخه‌ها و وضعیت قرارداد</p>
        <h1 className="mt-1 text-2xl font-black sm:text-3xl">قراردادها</h1>
      </div>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {contracts.map((record) => {
          const action = getContractActionLabel(record.status, record.price, record.priceStatus);
          const needsContract =
            record.priceStatus === 'ACCEPTED' && record.status === 'بدون قرارداد';
          return (
            <Card key={record.id}>
              <div className="flex items-start justify-between gap-3">
                <p className="font-black">{record.studentName}</p>
                <Badge tone={getContractTone(record.status)}>
                  {statusLabels[record.status] ?? record.status}
                </Badge>
              </div>
              {record.price !== null && (
                <p className="mt-3 text-sm text-muted">{formatIrr(record.price)}</p>
              )}
              <p className="mt-3 text-sm font-bold">{action.label}</p>
              {record.issuedAt && (
                <p className="mt-1 text-xs text-muted">صدور: {formatJalaliDate(record.issuedAt)}</p>
              )}
              {record.acceptedAt && (
                <p className="text-xs text-muted">پذیرش: {formatJalaliDate(record.acceptedAt)}</p>
              )}
              <div className="mt-4">
                <ButtonLink
                  href={`/admin/contracts?selected=${record.id}#contract-details`}
                  variant={selectedContract?.id === record.id ? 'primary' : 'secondary'}
                  size="sm"
                  className="mb-3 w-full"
                >
                  مشاهده جزئیات قرارداد و ثبت‌نام
                </ButtonLink>
                {needsContract ? (
                  <GenerateContractDialog enrollmentId={record.enrollmentId} label={action.label} />
                ) : record.status === 'ACCEPTED' ? (
                  <p className="text-sm text-muted">قرارداد توسط خانواده پذیرفته شده است.</p>
                ) : (
                  <p className="text-sm text-muted">{action.label}</p>
                )}
              </div>
            </Card>
          );
        })}
      </div>
      {selectedContract && (
        <Card id="contract-details" className="scroll-mt-24 ring-2 ring-primary/20">
          <h2 className="text-xl font-black">جزئیات قرارداد {selectedContract.contractNumber}</h2>
          <dl className="mt-5 grid gap-4 text-sm sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <dt className="text-muted">دانش‌آموز</dt>
              <dd className="mt-1 font-bold">{selectedContract.studentName}</dd>
            </div>
            <div>
              <dt className="text-muted">سال تحصیلی</dt>
              <dd className="mt-1 font-bold">{selectedContract.academicYear ?? '—'}</dd>
            </div>
            <div>
              <dt className="text-muted">مبلغ ثبت‌شده</dt>
              <dd className="mt-1 font-bold">
                {selectedContract.price === null ? '—' : formatIrr(selectedContract.price)}
              </dd>
            </div>
            <div>
              <dt className="text-muted">وضعیت</dt>
              <dd className="mt-1 font-bold">
                {statusLabels[selectedContract.status] ?? selectedContract.status}
              </dd>
            </div>
          </dl>
          {selectedSnapshot && (
            <div className="mt-6 space-y-4">
              {Object.entries(selectedSnapshot)
                .filter(([key]) => !hiddenSnapshotFields.has(key))
                .map(([key, value]) => (
                  <section
                    key={key}
                    className="rounded-xl border border-border bg-surface-muted/40 p-4"
                  >
                    <h3 className="font-black">{detailLabels[key] ?? key}</h3>
                    {value && typeof value === 'object' && !Array.isArray(value) ? (
                      <dl className="mt-4 grid gap-4 text-sm sm:grid-cols-2 lg:grid-cols-3">
                        {Object.entries(value).map(([field, fieldValue]) => (
                          <div key={field}>
                            <dt className="text-muted">{detailLabels[field] ?? field}</dt>
                            <dd className="mt-1 break-words font-bold">
                              {formatDetailValue(field, fieldValue)}
                            </dd>
                          </div>
                        ))}
                      </dl>
                    ) : (
                      <p className="mt-3 text-sm">{formatDetailValue(key, value)}</p>
                    )}
                  </section>
                ))}
            </div>
          )}
          {typeof selectedSnapshot?.contractText === 'string' && (
            <div className="mt-6 whitespace-pre-line rounded-xl border border-border p-5 text-sm leading-8">
              {selectedSnapshot.contractText}
            </div>
          )}
          <section className="mt-6 border-t border-border pt-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 className="text-lg font-black">برنامه و سوابق پرداخت</h3>
                <p className="mt-1 text-sm text-muted">پیش‌پرداخت و اقساط مرتبط با همین قرارداد</p>
              </div>
              {selectedContract.paymentPlan && (
                <Badge
                  tone={
                    selectedContract.paymentPlan.planStatus === 'COMPLETED' ? 'success' : 'warning'
                  }
                >
                  {statusLabels[selectedContract.paymentPlan.planStatus] ??
                    selectedContract.paymentPlan.planStatus}
                </Badge>
              )}
            </div>
            {!selectedContract.paymentPlan ? (
              <p className="mt-4 rounded-xl bg-surface-muted p-4 text-sm text-muted">
                هنوز برنامه پرداختی برای این قرارداد ایجاد نشده است.
              </p>
            ) : (
              <>
                <dl className="mt-5 grid gap-4 text-sm sm:grid-cols-2 lg:grid-cols-4">
                  <div>
                    <dt className="text-muted">مبلغ کل</dt>
                    <dd className="mt-1 font-bold">
                      {formatIrr(selectedContract.paymentPlan.totalAmount)}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-muted">پیش‌پرداخت</dt>
                    <dd className="mt-1 font-bold">
                      {formatIrr(selectedContract.paymentPlan.prepaymentAmount)}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-muted">مانده اقساط</dt>
                    <dd className="mt-1 font-bold">
                      {formatIrr(selectedContract.paymentPlan.remainingInstallmentAmount)}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-muted">تعداد اقساط</dt>
                    <dd className="mt-1 font-bold">
                      {selectedContract.paymentPlan.installmentCount}
                    </dd>
                  </div>
                </dl>
                <div className="mt-5 space-y-3">
                  {selectedContract.paymentPlan.items.map((item) => {
                    const paid = item.itemStatus === 'PAID';
                    const latestTransaction = item.transactions[0];
                    return (
                      <div key={item.id} className="rounded-xl border border-border p-4">
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <div>
                            <p className="font-black">
                              {item.itemType === 'PREPAYMENT'
                                ? 'پیش‌پرداخت'
                                : `قسط ${item.sequenceNumber}`}
                            </p>
                            <p className="mt-1 text-sm text-muted">
                              {formatIrr(item.amount)}
                              {item.dueDate ? ` — سررسید ${formatJalaliDate(item.dueDate)}` : ''}
                            </p>
                          </div>
                          <Badge tone={paid ? 'success' : 'neutral'}>
                            {paid ? 'پرداخت شده' : 'پرداخت نشده'}
                          </Badge>
                        </div>
                        {paid && item.paidAt && (
                          <p className="mt-3 text-sm">
                            پرداخت: {formatJalaliDateTime(item.paidAt)} —{' '}
                            {formatIrr(item.paidAmount)}
                          </p>
                        )}
                        {latestTransaction && (
                          <p className="mt-2 text-xs text-muted">
                            آخرین تراکنش:{' '}
                            {statusLabels[latestTransaction.transactionStatus] ??
                              latestTransaction.transactionStatus}
                            {' — '}
                            {formatJalaliDateTime(
                              latestTransaction.verifiedAt ?? latestTransaction.createdAt,
                            )}
                          </p>
                        )}
                      </div>
                    );
                  })}
                </div>
              </>
            )}
          </section>
        </Card>
      )}
    </div>
  );
}
