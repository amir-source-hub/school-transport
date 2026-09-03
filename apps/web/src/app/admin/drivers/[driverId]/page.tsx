/* eslint-disable @next/next/no-img-element */
import { Breadcrumbs } from '@/components/navigation/breadcrumbs';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { getAdminDriver } from '@/features/admin-drivers/admin-drivers-api';
export const metadata = { title: 'پرونده راننده' }; export const dynamic = 'force-dynamic';
export default async function Page({ params }: { params: Promise<{ driverId: string }> }) {
  const { driverId } = await params; const data = await getAdminDriver(driverId); const d = data.driver; const v = data.vehicle;
  return <div className="space-y-6"><Breadcrumbs items={[{ label: 'پنل مدیریت', href: '/admin/dashboard' }, { label: 'رانندگان', href: '/admin/drivers' }, { label: `${d.firstName} ${d.lastName}` }]} />
    <header><h1 className="text-2xl font-black">{d.firstName} {d.lastName}</h1><p className="mt-2 text-sm text-muted">پرونده کامل راننده و ارتباط‌های واقعی سرویس</p></header>
    <div className="grid gap-5 lg:grid-cols-2"><Card><h2 className="font-black">مشخصات فردی</h2><dl className="mt-4 grid grid-cols-2 gap-4 text-sm">{[['نام پدر',d.fatherName],['کد ملی',d.nationalId],['همراه',d.phoneNumber],['همراه دوم',d.secondaryPhoneNumber],['تلفن منزل',d.homePhoneNumber],['تماس اضطراری',d.emergencyPhoneNumber],['تحصیلات',d.education],['انقضای گواهینامه',d.licenseExpiresAt],['نشانی',d.streetAddress]].map(([k,val]) => <div key={String(k)}><dt className="text-muted">{String(k)}</dt><dd className="font-bold">{String(val ?? '—')}</dd></div>)}</dl></Card>
    <Card><h2 className="font-black">خودرو</h2><dl className="mt-4 grid grid-cols-2 gap-4 text-sm">{[['نوع',v?.vehicleType],['سیستم',v?.system],['سال ساخت',v?.modelYear],['پلاک',v?.plateNumber],['ظرفیت',v?.capacity],['بیمه',v?.insuranceExpiresAt],['معاینه فنی',v?.technicalInspectionExpiresAt]].map(([k,val]) => <div key={String(k)}><dt className="text-muted">{String(k)}</dt><dd className="font-bold">{String(val ?? '—')}</dd></div>)}</dl></Card>
    <Card className="lg:col-span-2"><h2 className="font-black">مسیرها و دانش‌آموزان</h2><div className="mt-4 grid gap-4 md:grid-cols-2">{data.runs.map((run) => <section key={run.id} className="rounded-xl bg-primary-soft p-4"><div className="flex justify-between"><h3 className="font-black">{run.title}</h3><Badge>{run.direction === 'TO_SCHOOL' ? 'رفت' : 'برگشت'}</Badge></div><p className="mt-2 text-sm">{run.school.name} · {run.scheduledStartTime} تا {run.scheduledArrivalTime}</p><ul className="mt-3 space-y-1 text-sm">{run.students.map((student) => <li key={student.id}>{student.pickupOrder}. {student.firstName} {student.lastName}</li>)}</ul></section>)}</div></Card>
    <Card className="lg:col-span-2"><h2 className="font-black">تصاویر ثبت‌شده</h2><div className="mt-4 grid gap-4 sm:grid-cols-2">{data.documents.map((document) => <a key={document.id} href={document.viewUrl} target="_blank" rel="noreferrer"><img src={document.viewUrl} alt="تصویر پرونده راننده" className="aspect-video w-full rounded-xl object-cover" /></a>)}</div></Card></div>
  </div>;
}
