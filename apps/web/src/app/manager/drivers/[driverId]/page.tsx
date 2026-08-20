/* eslint-disable @next/next/no-img-element */
import { Download } from 'lucide-react';
import { notFound } from 'next/navigation';
import { Breadcrumbs } from '@/components/navigation/breadcrumbs';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { mockDrivers, type MockDocument } from '@/features/manager-drivers/mock-drivers';
import { PrintButton } from '@/features/manager/print-button';
export const metadata = { title: 'جزئیات راننده' };
function Documents({ title, documents }: { title: string; documents: MockDocument[] }) {
  return (
    <Card className="lg:col-span-2">
      <h2 className="font-black">{title}</h2>
      <div className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {documents.map((doc) => (
          <section key={doc.title} className="rounded-xl border border-border p-3">
            <h3 className="font-bold">{doc.title}</h3>
            <div className="mt-3 grid grid-cols-2 gap-2">
              {doc.pages.map((src, index) => (
                <div key={index}>
                  {/* Test document asset; production files use private download URLs. */}
                  <img
                    src={src}
                    alt={`${doc.title}، صفحه ${index + 1}`}
                    className="aspect-[4/3] w-full rounded-lg bg-surface-muted object-contain"
                  />
                  <a
                    href={src}
                    download={`${doc.title}-${index + 1}.png`}
                    className="mt-2 flex items-center justify-center gap-1 text-xs font-bold text-primary print:hidden"
                  >
                    <Download className="size-3" />
                    دانلود صفحه {index + 1}
                  </a>
                </div>
              ))}
            </div>
          </section>
        ))}
      </div>
    </Card>
  );
}
export default async function Page({ params }: { params: Promise<{ driverId: string }> }) {
  const { driverId } = await params;
  const d = mockDrivers.find((x) => x.id === driverId);
  if (!d) notFound();
  const info = [
    ['نام', d.firstName],
    ['نام خانوادگی', d.lastName],
    ['نام پدر', d.fatherName],
    ['کد ملی', d.nationalId],
    ['تحصیلات', d.education],
    ['جنسیت', d.gender],
    ['تلفن همراه', d.phoneNumber],
    ['انقضای گواهینامه', d.licenseExpiresAt],
  ];
  const car = [
    ['نوع خودرو', d.vehicleType],
    ['سیستم', d.system],
    ['مدل (سال ساخت)', String(d.vehicleYear)],
    ['شماره پلاک', d.plate],
    ['وضعیت خودرو', d.vehicleStatus],
    ['انقضای معاینه فنی', d.technicalInspectionExpiresAt],
    ['انقضای بیمه‌نامه', d.insuranceExpiresAt],
  ];
  return (
    <div className="space-y-6">
      <Breadcrumbs
        items={[
          { label: 'پنل مدیر مدرسه', href: '/manager/dashboard' },
          { label: 'رانندگان', href: '/manager/drivers' },
          { label: `${d.firstName} ${d.lastName}` },
        ]}
      />
      <header className="flex justify-between">
        <div>
          <h1 className="text-2xl font-black">
            {d.firstName} {d.lastName}
          </h1>
          <p className="mt-2 text-sm text-muted">پرونده فقط‌خواندنی راننده، خودرو و مسیرها</p>
        </div>
        <div className="flex items-center gap-2"><PrintButton /><Badge tone="warning">اطلاعات آزمایشی</Badge></div>
      </header>
      <div className="grid gap-5 lg:grid-cols-2">
        <Card>
          <h2 className="font-black">مشخصات راننده</h2>
          <dl className="mt-4 grid grid-cols-2 gap-4 text-sm">
            {info.map(([k, v]) => (
              <div key={k}>
                <dt className="text-muted">{k}</dt>
                <dd className="font-bold">{v}</dd>
              </div>
            ))}
          </dl>
        </Card>
        <Card>
          <h2 className="font-black">مشخصات خودرو</h2>
          <dl className="mt-4 grid grid-cols-2 gap-4 text-sm">
            {car.map(([k, v]) => (
              <div key={k}>
                <dt className="text-muted">{k}</dt>
                <dd className="font-bold">{v}</dd>
              </div>
            ))}
          </dl>
        </Card>
        <Card className="lg:col-span-2">
          <h2 className="font-black">مسیرهای این راننده در مدرسه</h2>
          <p className="mt-2 text-sm leading-7 text-muted">هر کارت زیر یک نوبت سرویس مستقل است. ظرفیت خودرو در هر نوبت دوباره محاسبه می‌شود؛ بنابراین خودرو می‌تواند چند گروه متفاوت را پشت‌سرهم جابه‌جا کند.</p>
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            {d.routes.map((route) => (
              <section key={route.title} className="rounded-xl bg-primary-soft p-4">
                <div className="flex flex-wrap items-start justify-between gap-2"><div><h3 className="font-black">{route.title}</h3><p className="mt-1 text-xs text-muted">{route.schoolName} · {route.area}</p></div><Badge tone={route.direction === 'TO_SCHOOL' ? 'info' : 'warning'}>{route.direction === 'TO_SCHOOL' ? 'رفتن به مدرسه' : 'برگشت از مدرسه'}</Badge></div>
                <dl className="mt-3 grid grid-cols-3 gap-2 rounded-lg bg-white/70 p-3 text-xs"><div><dt className="text-muted">شروع</dt><dd className="font-black">{route.scheduledStartTime}</dd></div><div><dt className="text-muted">رسیدن</dt><dd className="font-black">{route.scheduledArrivalTime}</dd></div><div><dt className="text-muted">ظرفیت</dt><dd className="font-black">{route.students.length.toLocaleString('fa-IR')} از {d.capacity.toLocaleString('fa-IR')}</dd></div></dl>
                <p className="mt-3 text-xs font-bold">دانش‌آموزان این نوبت، به ترتیب سوار/پیاده شدن:</p>
                <ul className="mt-3 space-y-2 text-sm">
                  {route.students.map((x, i) => (
                    <li key={x}>
                      {i + 1}. {x}
                    </li>
                  ))}
                </ul>
              </section>
            ))}
          </div>
        </Card>
        <Documents title="مدارک راننده" documents={d.driverDocuments} />
        <Documents title="تصاویر و مدارک خودرو" documents={d.vehicleDocuments} />
      </div>
    </div>
  );
}
