import { notFound } from 'next/navigation';
import { Breadcrumbs } from '@/components/navigation/breadcrumbs';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { mockDrivers } from '@/features/manager-drivers/mock-drivers';
export const metadata = { title: 'جزئیات راننده آزمایشی' };
export default async function Page({ params }: { params: Promise<{ driverId: string }> }) {
  const { driverId } = await params;
  const d = mockDrivers.find((x) => x.id === driverId);
  if (!d) notFound();
  return (
    <div className="space-y-6">
      <Breadcrumbs
        items={[
          { label: 'پنل مدیر مدرسه', href: '/manager/dashboard' },
          { label: 'رانندگان', href: '/manager/drivers' },
          { label: d.name },
        ]}
      />
      <header className="flex justify-between gap-3">
        <div>
          <h1 className="text-2xl font-black">{d.name}</h1>
          <p className="mt-2 text-sm text-muted">پرونده نمایشی راننده و خودرو</p>
        </div>
        <Badge tone="warning">اطلاعات آزمایشی</Badge>
      </header>
      <div className="grid gap-5 lg:grid-cols-2">
        <Card>
          <h2 className="font-black">مشخصات راننده</h2>
          <div className="mt-4 flex gap-4">
            {d.profileObjectUrl ? (
              // S3-backed preview URL; no driver images are bundled with the application.
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={d.profileObjectUrl}
                alt={`عکس ${d.name}`}
                className="size-28 rounded-2xl object-cover"
              />
            ) : (
              <div className="grid size-28 shrink-0 place-items-center rounded-2xl border-2 border-dashed border-border bg-surface-muted text-center text-xs text-muted">
                محل عکس S3 راننده
              </div>
            )}
            <dl className="grid flex-1 grid-cols-2 gap-3 text-sm">
              <div>
                <dt className="text-muted">شماره همراه</dt>
                <dd className="font-mono font-bold">{d.phoneNumber}</dd>
              </div>
              <div>
                <dt className="text-muted">کد ملی</dt>
                <dd className="font-mono font-bold">{d.nationalId}</dd>
              </div>
              <div>
                <dt className="text-muted">گواهینامه</dt>
                <dd className="font-mono font-bold">{d.licenseNumber}</dd>
              </div>
              <div>
                <dt className="text-muted">سابقه</dt>
                <dd className="font-bold">{d.experienceYears.toLocaleString('fa-IR')} سال</dd>
              </div>
              <div>
                <dt className="text-muted">مسیر</dt>
                <dd className="font-bold">{d.route}</dd>
              </div>
              <div>
                <dt className="text-muted">دانش‌آموز تخصیص‌یافته</dt>
                <dd className="font-bold">{d.assigned.toLocaleString('fa-IR')} نفر</dd>
              </div>
            </dl>
          </div>
        </Card>
        <Card>
          <h2 className="font-black">خودروی نمونه</h2>
          <dl className="mt-4 grid grid-cols-2 gap-4 text-sm">
            <div>
              <dt className="text-muted">خودرو</dt>
              <dd className="font-bold">{d.vehicle}</dd>
            </div>
            <div>
              <dt className="text-muted">رنگ</dt>
              <dd className="font-bold">{d.color}</dd>
            </div>
            <div>
              <dt className="text-muted">پلاک</dt>
              <dd className="font-bold">{d.plate}</dd>
            </div>
            <div>
              <dt className="text-muted">ظرفیت</dt>
              <dd className="font-bold">{d.capacity.toLocaleString('fa-IR')} نفر</dd>
            </div>
            <div>
              <dt className="text-muted">سال ساخت</dt>
              <dd className="font-bold">{d.vehicleYear.toLocaleString('fa-IR')}</dd>
            </div>
            <div>
              <dt className="text-muted">شناسه خودرو</dt>
              <dd className="font-mono font-bold">{d.vin}</dd>
            </div>
            <div>
              <dt className="text-muted">اعتبار بیمه</dt>
              <dd className="font-bold">{d.insuranceExpiresAt}</dd>
            </div>
            <div>
              <dt className="text-muted">اعتبار معاینه فنی</dt>
              <dd className="font-bold">{d.technicalInspectionExpiresAt}</dd>
            </div>
          </dl>
        </Card>
        <Card>
          <h2 className="font-black">مدارک نمونه</h2>
          <div className="mt-4 space-y-3">
            {d.documents.map((x) => (
              <div
                key={x.title}
                className="flex justify-between gap-3 rounded-xl bg-surface-muted p-3 text-sm"
              >
                <div>
                  <span>{x.title}</span>
                  <p className="mt-1 text-xs text-muted">
                    {x.objectUrl
                      ? 'فایل از ذخیره‌گاه S3'
                      : 'محل فایل S3 آماده است؛ هنوز فایلی بارگذاری نشده'}
                  </p>
                </div>
                <Badge tone={x.status.startsWith('تأیید') ? 'success' : 'warning'}>
                  {x.status}
                </Badge>
              </div>
            ))}
          </div>
        </Card>
      </div>
      <Card className="border-warning/25 bg-warning-soft">
        <p className="text-sm font-bold leading-7">
          این پرونده آزمایشی است. تصاویر و مدارک واقعی فقط از نشانی‌های مجاز و کوتاه‌عمر S3 نمایش
          داده می‌شوند و داخل پروژه نگهداری نمی‌شوند.
        </p>
      </Card>
    </div>
  );
}
