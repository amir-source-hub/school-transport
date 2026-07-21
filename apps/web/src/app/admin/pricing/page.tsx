import { Alert } from '@/components/feedback/alert';
import { Breadcrumbs } from '@/components/navigation/breadcrumbs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { demoFinanceLifecycles, getPriceAction } from '@/features/admin-finance/mock-lifecycle';
import { formatIrr } from '@/lib/formatters';

export const metadata = { title: 'قیمت‌گذاری' };

export default function PricingPage() {
  return (
    <div className="space-y-6">
      <Breadcrumbs
        items={[{ label: 'پنل مدیریت', href: '/admin/dashboard' }, { label: 'قیمت‌گذاری' }]}
      />
      <div>
        <p className="text-sm font-bold text-primary">کنترل چرخه مالی</p>
        <h1 className="mt-1 text-2xl font-black sm:text-3xl">قیمت‌گذاری</h1>
        <p className="mt-2 text-sm text-muted">همه رکوردها و مجوزهای این صفحه نمایشی‌اند.</p>
      </div>
      <Alert tone="warning" title="قیمت نهایی فقط در سرور تعیین می‌شود">
        رابط کاربری هیچ مبلغ نهایی یا برنامه اقساطی را محاسبه نمی‌کند. قیمت قرارداد پذیرفته‌شده و
        سابقه مالی بازنویسی نمی‌شوند.
      </Alert>
      <div className="grid gap-4">
        {demoFinanceLifecycles.map((record) => {
          const action = getPriceAction(record);
          return (
            <Card key={record.id}>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <p className="font-black">{record.student}</p>
                  <p className="mt-1 text-sm text-muted">ثبت‌نام {record.registrationStatus}</p>
                </div>
                <Badge tone={action.allowed ? 'warning' : 'neutral'}>{action.label}</Badge>
              </div>
              <dl className="mt-5 grid gap-4 text-sm sm:grid-cols-3">
                <div>
                  <dt className="text-muted">قیمت فعلی</dt>
                  <dd className="mt-1 font-bold">
                    {record.price === null ? 'ثبت نشده' : formatIrr(record.price)}
                  </dd>
                </div>
                <div>
                  <dt className="text-muted">وضعیت قرارداد</dt>
                  <dd className="mt-1 font-bold">{record.contractStatus}</dd>
                </div>
                <div>
                  <dt className="text-muted">فعالیت پرداخت</dt>
                  <dd className="mt-1 font-bold">
                    {record.paymentStarted ? 'آغاز شده' : 'آغاز نشده'}
                  </dd>
                </div>
              </dl>
              <div className="mt-5 border-t border-border pt-4">
                <Button disabled>{action.label} پس از اتصال API</Button>
                <p className="mt-2 text-xs text-muted">{action.reason}</p>
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
