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
import { formatJalaliDate } from '@/lib/formatters';

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
                <Badge tone={getContractTone(record.status)}>{record.status}</Badge>
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
                  href={`/admin/contracts?selected=${record.id}`}
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
        <Card>
          <h2 className="text-xl font-black">جزئیات قرارداد {selectedContract.contractNumber}</h2>
          <dl className="mt-5 grid gap-4 text-sm sm:grid-cols-2 lg:grid-cols-4">
            <div><dt className="text-muted">دانش‌آموز</dt><dd className="mt-1 font-bold">{selectedContract.studentName}</dd></div>
            <div><dt className="text-muted">سال تحصیلی</dt><dd className="mt-1 font-bold">{selectedContract.academicYear ?? '—'}</dd></div>
            <div><dt className="text-muted">مبلغ ثبت‌شده</dt><dd className="mt-1 font-bold">{selectedContract.price === null ? '—' : formatIrr(selectedContract.price)}</dd></div>
            <div><dt className="text-muted">وضعیت</dt><dd className="mt-1 font-bold">{selectedContract.status}</dd></div>
          </dl>
          {selectedSnapshot && (
            <div className="mt-6 grid gap-4 md:grid-cols-2">
              {Object.entries(selectedSnapshot)
                .filter(([key]) => key !== 'contractText')
                .map(([key, value]) => (
                  <section key={key} className="rounded-xl border border-border bg-surface-muted/40 p-4">
                    <h3 className="font-black">{key}</h3>
                    <pre className="mt-3 whitespace-pre-wrap break-words font-sans text-sm leading-7">
                      {typeof value === 'object' ? JSON.stringify(value, null, 2) : String(value)}
                    </pre>
                  </section>
                ))}
            </div>
          )}
          {typeof selectedSnapshot?.contractText === 'string' && (
            <div className="mt-6 whitespace-pre-line rounded-xl border border-border p-5 text-sm leading-8">
              {selectedSnapshot.contractText}
            </div>
          )}
        </Card>
      )}
    </div>
  );
}
