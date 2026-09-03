import { Clock3, MapPin, Phone, School, Users } from 'lucide-react';
import { Breadcrumbs } from '@/components/navigation/breadcrumbs';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { getDriverRuns } from '@/features/driver/driver-api';

export const metadata = { title: 'سرویس من' };
export default async function Page() {
  const runs = await getDriverRuns();
  return <div className="space-y-6">
    <Breadcrumbs items={[{ label: 'پنل راننده', href: '/driver/dashboard' }, { label: 'سرویس من' }]} />
    <header><p className="text-sm font-bold text-primary">برنامه مسیرها</p><h1 className="text-2xl font-black">سرویس من</h1><p className="mt-2 text-sm text-muted">هر مسیر برنامه مستقل، مدرسه مقصد و ترتیب توقف دانش‌آموزان را نشان می‌دهد.</p></header>
    {runs.length ? <div className="space-y-5">{runs.map((run) => <Card key={run.id}>
      <div className="flex flex-wrap items-start justify-between gap-3"><div><h2 className="text-lg font-black">{run.title}</h2><p className="mt-1 flex items-center gap-1 text-xs text-muted"><School className="size-4" />{run.schoolName}</p></div><Badge tone={run.direction === 'TO_SCHOOL' ? 'info' : 'warning'}>{run.direction === 'TO_SCHOOL' ? 'حرکت به مدرسه' : 'بازگشت از مدرسه'}</Badge></div>
      <div className="mt-4 grid gap-3 rounded-xl bg-surface-inset p-4 text-sm sm:grid-cols-3"><span><Clock3 className="mb-1 size-4 text-primary" />{run.scheduledStartTime} تا {run.scheduledArrivalTime}</span><span><MapPin className="mb-1 size-4 text-primary" />{run.areaDescription ?? 'محدوده ثبت نشده'}</span><span><Users className="mb-1 size-4 text-primary" />{run.students.length.toLocaleString('fa-IR')} دانش‌آموز</span></div>
      <section className="mt-4 rounded-xl border border-border p-4"><h3 className="font-black">اطلاعات مدرسه</h3><p className="mt-2 text-sm">{run.schoolAddress}</p><div className="mt-2 flex flex-wrap gap-4 text-xs text-muted">{run.schoolPhoneNumber && <a href={`tel:${run.schoolPhoneNumber}`} dir="ltr"><Phone className="me-1 inline size-3" />{run.schoolPhoneNumber}</a>}{run.schoolLatitude != null && run.schoolLongitude != null && <a className="font-bold text-primary" href={`https://www.google.com/maps?q=${run.schoolLatitude},${run.schoolLongitude}`} target="_blank" rel="noreferrer">نقشه مدرسه</a>}</div></section>
      <ol className="mt-4 space-y-3">{run.students.map((student) => <li key={student.id} className="rounded-xl border border-border p-4"><div className="flex items-center gap-3"><span className="grid size-8 place-items-center rounded-full bg-primary-soft font-black text-primary">{student.pickupOrder.toLocaleString('fa-IR')}</span><div><p className="font-black">{student.firstName} {student.lastName}</p><p className="text-xs text-muted">زمان توقف: <b className="text-foreground">{student.scheduledStopTime ?? 'ثبت نشده'}</b></p></div><span className="ms-auto text-xs text-muted">{student.grade ?? 'پایه نامشخص'}</span></div><p className="mt-3 flex gap-2 text-sm"><MapPin className="size-4 shrink-0 text-primary" />{student.address ?? 'نشانی ثبت نشده'}</p><div className="mt-2 flex flex-wrap gap-4 text-xs">{student.guardianPhone && <a className="font-bold text-primary" href={`tel:${student.guardianPhone}`} dir="ltr">{student.guardianPhone}</a>}{student.latitude != null && student.longitude != null && <a className="font-bold text-primary" href={`https://www.google.com/maps?q=${student.latitude},${student.longitude}`} target="_blank" rel="noreferrer">موقعیت دانش‌آموز</a>}{student.notes && <span className="text-muted">یادداشت: {student.notes}</span>}</div></li>)}</ol>
    </Card>)}</div> : <Card><p className="text-sm text-muted">هنوز مسیری برای شما تعریف نشده است.</p></Card>}
  </div>;
}
