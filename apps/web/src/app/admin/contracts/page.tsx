import { Alert } from '@/components/feedback/alert';
import { Breadcrumbs } from '@/components/navigation/breadcrumbs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { demoFinanceLifecycles, getContractAction } from '@/features/admin-finance/mock-lifecycle';

export const metadata = { title: 'قراردادها' };

export default function ContractsPage() {
  return (
    <div className="space-y-6">
      <Breadcrumbs
        items={[{ label: 'پنل مدیریت', href: '/admin/dashboard' }, { label: 'قراردادها' }]}
      />
      <div>
        <p className="text-sm font-bold text-primary">نسخه‌ها و وضعیت قرارداد</p>
        <h1 className="mt-1 text-2xl font-black sm:text-3xl">قراردادها</h1>
        <p className="mt-2 text-sm text-muted">
          این فهرست فقط چرخه مستند را با داده mock نمایش می‌دهد.
        </p>
      </div>
      <Alert tone="warning" title="نسخه پذیرفته‌شده تغییرناپذیر است">
        تغییر بعد از پذیرش باید با نسخه جایگزین، حفظ تاریخچه، کنترل وضعیت سرور و ثبت حسابرسی انجام
        شود.
      </Alert>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {demoFinanceLifecycles.map((record) => {
          const action = getContractAction(record);
          return (
            <Card key={record.id}>
              <div className="flex items-start justify-between gap-3">
                <p className="font-black">{record.student}</p>
                <Badge tone={record.contractStatus === 'پذیرفته‌شده' ? 'success' : 'warning'}>
                  {record.contractStatus}
                </Badge>
              </div>
              <p className="mt-4 text-sm font-bold">{action.label}</p>
              <p className="mt-2 min-h-12 text-sm text-muted">{action.reason}</p>
              <Button className="mt-4 w-full" variant="secondary" disabled>
                {action.label} پس از اتصال API
              </Button>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
