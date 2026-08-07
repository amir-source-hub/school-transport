import { Breadcrumbs } from '@/components/navigation/breadcrumbs';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { ContractActions } from '@/features/finance/contract-actions';
import { getContract, getPaymentPlan } from '@/features/finance/contracts-api';
import { formatIrr } from '@/lib/formatters';
import { metadataFor } from '@/lib/route-metadata';

export const metadata = metadataFor('/student/contracts/[contractId]');
export const dynamic = 'force-dynamic';

const contractLabels: Record<string, string> = {
  academicYear: 'سال تحصیلی',
  serviceType: 'نوع سرویس',
  totalAmount: 'مبلغ کل',
  prepaymentAmount: 'پیش‌پرداخت',
  firstName: 'نام',
  lastName: 'نام خانوادگی',
  nationalId: 'کد ملی',
  phoneNumber: 'شماره همراه',
  birthDate: 'تاریخ تولد',
  gender: 'جنسیت',
  title: 'عنوان نشانی',
  province: 'استان',
  city: 'شهر',
  district: 'منطقه',
  streetAddress: 'نشانی',
  postalCode: 'کد پستی',
  latitude: 'عرض جغرافیایی',
  longitude: 'طول جغرافیایی',
  schoolId: 'شناسه مدرسه',
  educationLevel: 'مقطع',
  grade: 'پایه',
};

const groupLabels: Record<string, string> = {
  student: 'دانش‌آموز',
  father: 'پدر',
  mother: 'مادر',
  emergencyContact: 'تماس اضطراری',
  address: 'نشانی سوار شدن',
  school: 'مدرسه',
  service: 'سرویس',
  price: 'شرایط مالی',
};

function parseContractSnapshot(snapshot: string | null) {
  if (!snapshot) return [];
  try {
    const parsed = JSON.parse(snapshot) as Record<string, unknown>;
    return Object.entries(parsed)
      .filter(([group]) => group !== 'contractText')
      .map(([group, value]) => ({
        title: groupLabels[group] ?? contractLabels[group] ?? group,
        fields:
          value && typeof value === 'object' && !Array.isArray(value)
            ? Object.entries(value as Record<string, unknown>)
            : [[group, value] as [string, unknown]],
      }));
  } catch {
    return [{ title: 'متن قرارداد', fields: [['text', snapshot] as [string, unknown]] }];
  }
}

function getContractText(snapshot: string | null, studentName: string) {
  if (snapshot) {
    try {
      const parsed = JSON.parse(snapshot) as Record<string, unknown>;
      if (typeof parsed.contractText === 'string' && parsed.contractText.trim()) {
        return parsed.contractText;
      }
    } catch {
      if (snapshot.trim()) return snapshot;
    }
  }
  return `قرارداد ارائه خدمات حمل‌ونقل دانش‌آموزی

این قرارداد میان ثمین گشت مهر ایران و خانواده دانش‌آموز ${studentName} منعقد می‌شود. سامانه متعهد است با رعایت الزامات ایمنی، برنامه‌ریزی مسیر و هماهنگی با مدرسه، بیشترین تلاش خود را برای ارائه سرویس درخواستی انجام دهد.

نوع خودرو، ساعت حرکت و مسیر ممکن است بر اساس ظرفیت، شرایط ترافیکی، محدوده پوشش، تصمیم مدرسه و الزامات ایمنی تغییر کند. هر تغییر مؤثر پیش از شروع خدمت به خانواده اطلاع داده خواهد شد.

خانواده مسئول صحت اطلاعات دانش‌آموز، والدین، تماس اضطراری، نشانی و موقعیت ثبت‌شده است و متعهد می‌شود تغییرات را به‌موقع اعلام کند. آغاز نهایی سرویس منوط به تأیید ظرفیت و برنامه مسیر است.

با پذیرش این قرارداد، خانواده اعلام می‌کند تمام بندها را مطالعه کرده و با شرایط فوق موافق است.`;
}

function formatContractValue(key: string, value: unknown) {
  if (value === null || value === undefined || value === '') return '—';
  if (key.toLowerCase().includes('amount') && typeof value === 'number') return formatIrr(value);
  if (typeof value === 'boolean') return value ? 'بله' : 'خیر';
  return String(value);
}

export default async function ContractPage({
  params,
}: {
  params: Promise<{ contractId: string }>;
}) {
  const { contractId } = await params;
  const contract = await getContract(contractId);
  const payment = contract.paymentPlanId ? await getPaymentPlan(contract.paymentPlanId) : null;
  const snapshot = parseContractSnapshot(contract.contractDataSnapshot);
  const contractText = getContractText(
    contract.contractDataSnapshot,
    `${contract.studentName} ${contract.studentLastName}`,
  );
  return (
    <div className="space-y-6">
      <Breadcrumbs
        items={[
          { label: 'پنل دانش‌آموز', href: '/student/dashboard' },
          { label: 'قراردادها', href: '/student/contracts' },
          { label: contract.contractNumber },
        ]}
      />
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-sm font-bold text-primary">نسخه {contract.versionNumber}</p>
          <h1 className="mt-1 text-2xl font-black sm:text-3xl">{contract.contractNumber}</h1>
          <p className="text-sm text-muted">
            {contract.studentName} {contract.studentLastName}
          </p>
        </div>
        <Badge
          tone={
            contract.contractStatus === 'ACCEPTED'
              ? 'success'
              : contract.contractStatus === 'REJECTED'
                ? 'danger'
                : 'warning'
          }
        >
          {contract.contractStatus}
        </Badge>
      </div>
      <section className="grid gap-4 md:grid-cols-3">
        <Card>
          <p className="text-sm text-muted">سال تحصیلی</p>
          <p className="mt-2 font-black">{contract.academicYear}</p>
        </Card>
        <Card>
          <p className="text-sm text-muted">نوع سرویس</p>
          <p className="mt-2 font-black">{contract.serviceType}</p>
        </Card>
        <Card>
          <p className="text-sm text-muted">مبلغ</p>
          <p className="mt-2 font-black">{formatIrr(contract.totalAmount)}</p>
        </Card>
      </section>
      <Card>
        <h2 className="text-lg font-black">شرایط ثبت‌شده قرارداد</h2>
        <p className="mt-2 text-sm text-muted">
          این اطلاعات همان نسخه‌ای است که هنگام صدور قرارداد ثبت و قفل شده است.
        </p>
        {snapshot.length === 0 ? (
          <p className="mt-5 text-sm text-muted">جزئیات قرارداد ثبت نشده است.</p>
        ) : (
          <div className="mt-5 grid gap-4 md:grid-cols-2">
            {snapshot.map((group) => (
              <section
                key={group.title}
                className="rounded-xl border border-border bg-surface-muted/50 p-4"
              >
                <h3 className="font-black text-primary">{group.title}</h3>
                <dl className="mt-3 divide-y divide-border/60 text-sm">
                  {group.fields.map(([key, value]) => (
                    <div key={key} className="grid grid-cols-[8rem_1fr] gap-3 py-2">
                      <dt className="text-muted">
                        {contractLabels[key] ?? (key === 'text' ? 'متن' : key)}
                      </dt>
                      <dd
                        className="break-words font-bold"
                        dir={
                          ['nationalId', 'phoneNumber', 'latitude', 'longitude'].includes(key)
                            ? 'ltr'
                            : undefined
                        }
                      >
                        {formatContractValue(key, value)}
                      </dd>
                    </div>
                  ))}
                </dl>
              </section>
            ))}
          </div>
        )}
      </Card>
      <Card>
        <h2 className="text-lg font-black">متن قرارداد</h2>
        <div className="mt-4 whitespace-pre-line rounded-xl border border-border bg-surface-muted/40 p-5 text-sm leading-8">
          {contractText}
        </div>
      </Card>
      {payment && (
        <Card>
          <h2 className="text-lg font-black">برنامه پرداخت</h2>
          <div className="mt-4 space-y-2">
            {payment.items.map((item) => (
              <div
                key={item.id}
                className="flex flex-wrap justify-between gap-3 border-b border-border py-3"
              >
                <span>
                  {item.itemType === 'PREPAYMENT' ? 'پیش‌پرداخت' : `قسط ${item.sequenceNumber}`}
                </span>
                <strong>{formatIrr(item.amount)}</strong>
                <Badge tone={item.itemStatus === 'PAID' ? 'success' : 'warning'}>
                  {item.itemStatus}
                </Badge>
              </div>
            ))}
          </div>
        </Card>
      )}
      {contract.contractStatus === 'GENERATED' && <ContractActions id={contract.id} />}
    </div>
  );
}
