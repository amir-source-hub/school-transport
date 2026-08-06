import { FileSpreadsheet } from 'lucide-react';
import { Breadcrumbs } from '@/components/navigation/breadcrumbs';
import { Card } from '@/components/ui/card';
import { ExportReportButton } from '@/features/admin-reports/export-report-button';
import { ReportPreviewPanel } from '@/features/admin-reports/report-preview';

export const metadata = { title: 'گزارش‌ها' };

const sheets = [
  'دانش‌آموزان با مدرسه، خانواده، تماس و نشانی',
  'خانواده‌ها، والدین و نشانی‌های ثبت‌شده',
  'ثبت‌نام‌ها، تاریخ‌ها، سرویس و وضعیت بررسی',
  'پیش‌پرداخت‌ها، اقساط، تراکنش‌ها و سررسیدها',
  'قراردادها، مبلغ، نسخه و تاریخ پذیرش',
];

export default function AdminReportsPage() {
  return (
    <div className="space-y-6">
      <Breadcrumbs
        items={[{ label: 'پنل مدیریت', href: '/admin/dashboard' }, { label: 'گزارش‌ها' }]}
      />
      <div>
        <p className="text-sm font-bold text-primary">خروجی مدیریتی</p>
        <h1 className="mt-1 text-2xl font-black sm:text-3xl">گزارش جامع Excel</h1>
        <p className="mt-2 max-w-2xl text-sm leading-7 text-muted">
          یک فایل چندبرگی و قابل فیلتر از اطلاعات عملیاتی سامانه دریافت کنید.
        </p>
      </div>
      <Card className="max-w-3xl">
        <div className="flex items-start gap-3">
          <div className="grid size-11 shrink-0 place-items-center rounded-xl bg-success/10 text-success">
            <FileSpreadsheet aria-hidden="true" className="size-5" />
          </div>
          <div>
            <h2 className="font-black">محتوای گزارش</h2>
            <ul className="mt-3 space-y-2 text-sm text-muted">
              {sheets.map((sheet) => (
                <li key={sheet}>• {sheet}</li>
              ))}
            </ul>
          </div>
        </div>
        <div className="mt-6 border-t border-border pt-5">
          <ExportReportButton />
        </div>
      </Card>
      <div>
        <h2 className="mb-3 text-xl font-black">پیش‌نمایش داده‌های گزارش</h2>
        <ReportPreviewPanel />
      </div>
    </div>
  );
}
