import { Alert } from '@/components/feedback/alert';
import { Breadcrumbs } from '@/components/navigation/breadcrumbs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { getAdminContracts, getContractTone, getContractActionLabel } from '@/features/admin-finance/admin-contracts-api';
import { formatIrr } from '@/lib/formatters';

export const metadata = { title: 'قراردادها' };

export default async function ContractsPage() {
  const { contracts } = await getAdminContracts();

  return (
    <div className="space-y-6">
      <Breadcrumbs items={[{ label: 'پنل مدیریت', href: '/admin/dashboard' }, { label: 'قراردادها' }]} />
      <div>
        <p className="text-sm font-bold text-primary">نسخه‌ها و وضعیت قرارداد</p>
        <h1 className="mt-1 text-2xl font-black sm:text-3xl">قراردادها</h1>
      </div>
      <Alert tone="warning" title="نسخه پذیرفته‌شده تغییرناپذیر است">
        تغییر بعد از پذیرش باید با نسخه جایگزین، حفظ تاریخچه، کنترل وضعیت سرور و ثبت حسابرسی انجام شود.
      </Alert>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {contracts.map((record) => {
          const action = getContractActionLabel(record.status, record.price);
          return (
            <Card key={record.id}>
              <div className="flex items-start justify-between gap-3">
                <p className="font-black">{record.studentName}</p>
                <Badge tone={getContractTone(record.status)}>{record.status}</Badge>
              </div>
              {record.price !== null && <p className="mt-3 text-sm text-muted">{formatIrr(record.price)}</p>}
              <p className="mt-3 text-sm font-bold">{action.label}</p>
              <p className="mt-2 min-h-12 text-sm text-muted">{action.reason}</p>
              <Button className="mt-4 w-full" variant="secondary" disabled>فعال پس از اتصال مجوز</Button>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
