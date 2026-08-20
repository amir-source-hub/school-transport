import { FileSpreadsheet } from 'lucide-react';
import { Breadcrumbs } from '@/components/navigation/breadcrumbs';
import { Card } from '@/components/ui/card';
import { getManagerSettings } from '@/features/manager/manager-api';
import { ManagerReportButtons } from '@/features/manager/manager-report-buttons';
export const metadata = { title: 'گزارش جامع اکسل' };
export default async function Page() {
  const s = await getManagerSettings();
  const school = s.schools.find((x) => x.id === s.primarySchoolId) ?? s.schools[0];
  return (
    <div className="space-y-6">
      <Breadcrumbs
        items={[
          { label: 'پنل مدیر مدرسه', href: '/manager/dashboard' },
          { label: 'گزارش جامع اکسل' },
        ]}
      />
      <header>
        <h1 className="text-2xl font-black">گزارش جامع اکسل</h1>
        <p className="mt-2 text-sm text-muted">
          خروجی‌ها فقط شامل اطلاعات مدرسه تحت دسترسی این حساب هستند.
        </p>
      </header>
      <Card>
        <FileSpreadsheet className="size-8 text-success" />
        <h2 className="mt-4 font-black">{school?.name}</h2>
        <p className="mt-2 mb-5 text-sm text-muted">
          سه فایل جداگانه برای دانش‌آموزان، رانندگان و ارتباط مسیرها دریافت کنید.
        </p>
        {school && <ManagerReportButtons schoolName={school.name} username={s.manager.username} />}
      </Card>
    </div>
  );
}
