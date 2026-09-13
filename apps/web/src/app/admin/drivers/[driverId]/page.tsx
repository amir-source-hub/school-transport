import { Breadcrumbs } from '@/components/navigation/breadcrumbs';
import { PrintPageButton } from '@/components/common/print-page-button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { DriverAdminActions } from '@/features/admin-drivers/driver-admin-actions';
import { getAdminDriver } from '@/features/admin-drivers/admin-drivers-api';
import { DriverDocumentCard } from '@/features/admin-drivers/driver-document-card';
import { formatJalaliDate, formatJalaliDateTime, formatPersianTime } from '@/lib/formatters';

export const metadata = { title: 'پرونده راننده' };
export const dynamic = 'force-dynamic';
const date = (value: unknown) => value ? formatJalaliDate(String(value)) : '—';

export default async function Page({ params }: { params: Promise<{ driverId: string }> }) {
  const { driverId } = await params;
  const data = await getAdminDriver(driverId);
  const d = data.driver;
  const v = data.vehicle;
  const personal: Array<[string, unknown]> = [['نام پدر',d.fatherName],['کد ملی',d.nationalId],['جنسیت',d.gender],['همراه',d.phoneNumber],['همراه دوم',d.secondaryPhoneNumber],['تلفن منزل',d.homePhoneNumber],['نام تماس اضطراری',d.emergencyFirstName],['نام خانوادگی تماس اضطراری',d.emergencyLastName],['نسبت تماس اضطراری',d.emergencyRelationship],['تماس اضطراری',d.emergencyPhoneNumber],['تحصیلات',d.education],['شماره شبا',d.iban],['شماره کارت',d.cardNumber],['بانک',d.bankName],['استان',d.province],['شهر',d.city],['منطقه شهرداری',d.municipalityDistrict],['نشانی',d.streetAddress],['کد پستی',d.postalCode],['معرف',d.referrerName],['تلفن معرف',d.referrerPhoneNumber]];
  const vehicle: Array<[string, unknown]> = [['نوع',v?.vehicleType],['سیستم',v?.system],['سال ساخت',v?.modelYear],['پلاک',v?.plateNumber],['ظرفیت',v?.capacity],['نوع استفاده',v?.usageType],['مالکیت',v?.ownershipType],['بیمه',date(v?.insuranceExpiresAt)],['معاینه فنی',date(v?.technicalInspectionExpiresAt)]];
  return <div className="space-y-6">
    <Breadcrumbs items={[{label:'پنل مدیریت',href:'/admin/dashboard'},{label:'رانندگان',href:'/admin/drivers'},{label:`${d.firstName} ${d.lastName}`}]}/>
    <header className="flex flex-wrap items-end justify-between gap-4"><div><h1 className="text-2xl font-black">{d.firstName} {d.lastName}</h1><p className="mt-2 text-sm text-muted">پرونده کامل راننده و ارتباط‌های واقعی سرویس</p></div><DriverAdminActions driver={d} vehicle={v}/></header>
    <div className="grid gap-5 lg:grid-cols-2">
      <InfoCard title="مشخصات فردی" rows={personal}/><InfoCard title="خودرو" rows={vehicle}/>
      <Card className="lg:col-span-2"><h2 className="font-black">مسیرها و دانش‌آموزان</h2><div className="mt-4 grid gap-4 md:grid-cols-2">{data.runs.map(run=><section key={run.id} className="rounded-xl bg-primary-soft p-4"><div className="flex justify-between"><h3 className="font-black">{run.title}</h3><Badge>{run.direction==='TO_SCHOOL'?'رفت':run.direction==='FROM_SCHOOL'?'برگشت':'رفت و برگشت'}</Badge></div><p className="mt-2 text-sm">{run.school.name} · {formatPersianTime(run.scheduledStartTime)} تا {formatPersianTime(run.scheduledArrivalTime)}</p><ul className="mt-3 space-y-1 text-sm">{run.students.map(student=><li key={student.id}>{student.pickupOrder}. {student.firstName} {student.lastName}{student.companion?` + همراه (${student.companion.firstName} ${student.companion.lastName})`:''}</li>)}</ul></section>)}</div></Card>
      <Card className="lg:col-span-2"><h2 className="text-lg font-black">تصاویر و مدارک راننده</h2><p className="mt-2 text-sm text-muted">هر تصویر را می‌توانید رد کنید؛ سپس فقط همان تصویر در پنل راننده امکان بارگذاری مجدد خواهد داشت.</p><div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">{data.documents.map(document=><DriverDocumentCard key={document.id} driverId={driverId} document={document}/>)}</div></Card>
      <Card className="lg:col-span-2 print:border-0"><div className="flex items-center justify-between gap-3"><div><h2 className="font-black">قرارداد راننده</h2><p className="mt-2 text-sm text-muted">نسخه {String(d.contractVersion??'driver-v1')} · پذیرفته‌شده در {d.contractAcceptedAt?formatJalaliDateTime(String(d.contractAcceptedAt)):'—'}</p></div><PrintPageButton/></div><div className="mt-4 rounded-xl bg-surface-inset p-5 text-sm leading-8">راننده با پذیرش قرارداد، صحت اطلاعات و مدارک، رعایت برنامه سرویس، ایمنی دانش‌آموزان و مقررات سامانه را تأیید کرده است.</div></Card>
    </div>
  </div>;
}
function InfoCard({title,rows}:{title:string;rows:Array<[string,unknown]>}){return <Card><h2 className="font-black">{title}</h2><dl className="mt-4 grid grid-cols-2 gap-4 text-sm">{rows.map(([label,value])=><div key={label}><dt className="text-muted">{label}</dt><dd className="font-bold">{String(value??'—')}</dd></div>)}</dl></Card>}
