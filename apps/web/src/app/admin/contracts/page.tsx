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

export const metadata = { title: 'قراردادها' };
export const dynamic = 'force-dynamic';

export default async function ContractsPage() {
  const { contracts } = await getAdminContracts();

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
                <p className="mt-1 text-xs text-muted">صدور: {record.issuedAt}</p>
              )}
              {record.acceptedAt && (
                <p className="text-xs text-muted">پذیرش: {record.acceptedAt}</p>
              )}
              <div className="mt-4">
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
    </div>
  );
}
