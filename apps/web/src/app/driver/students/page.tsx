/* eslint-disable @next/next/no-img-element */
import { MapPin, Phone, UserRound } from 'lucide-react';
import { Breadcrumbs } from '@/components/navigation/breadcrumbs';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { getDriverStudents } from '@/features/driver/driver-api';

export const metadata = { title: 'دانش‌آموزان من' };
export default async function Page() {
  const students = await getDriverStudents();
  return <div className="space-y-6"><Breadcrumbs items={[{ label: 'پنل راننده', href: '/driver/dashboard' }, { label: 'دانش‌آموزان من' }]} /><header><p className="text-sm font-bold text-primary">فهرست اختصاص‌یافته</p><h1 className="text-2xl font-black">دانش‌آموزان من</h1><p className="mt-2 text-sm text-muted">مشخصات ضروری، خانواده، نشانی و مسیرهای فعال هر دانش‌آموز.</p></header>
    {students.length ? <div className="grid gap-4 xl:grid-cols-2">{students.map((student) => <Card key={student.id}>
      <div className="flex items-start gap-3">{student.imageUrl ? <img src={student.imageUrl} alt={`عکس ${student.firstName} ${student.lastName}`} className="size-16 rounded-xl object-cover" /> : <span className="grid size-16 place-items-center rounded-xl bg-primary-soft text-primary"><UserRound /></span>}<div><h2 className="font-black">{student.firstName} {student.lastName}</h2><p className="text-xs text-muted">نام پدر: {student.fatherName ?? '—'}</p><p className="text-xs text-muted">{student.schoolName} · {student.grade ?? student.className ?? 'پایه نامشخص'}</p></div></div>
      <div className="mt-4 rounded-xl bg-surface-inset p-3"><p className="text-xs font-bold text-muted">اطلاعات خانواده</p>{student.parents.length ? <ul className="mt-2 space-y-2">{student.parents.map((parent) => <li key={`${parent.type}-${parent.phoneNumber}`} className="flex flex-wrap justify-between gap-2 text-sm"><span className="font-bold">{parent.type === 'MOTHER' ? 'مادر' : parent.type === 'FATHER' ? 'پدر' : 'سرپرست'}: {parent.name}</span><a href={`tel:${parent.phoneNumber}`} dir="ltr" className="font-bold text-primary"><Phone className="me-1 inline size-4" />{parent.phoneNumber}</a></li>)}</ul> : <p className="mt-2 text-sm text-muted">اطلاعات والدین ثبت نشده است.</p>}</div>
      <div className="mt-4"><p className="text-xs text-muted">نشانی</p><p className="mt-1 flex gap-2 text-sm font-medium"><MapPin className="size-4 shrink-0 text-primary" />{student.address ?? 'نشانی فعالی ثبت نشده است.'}</p>{student.latitude != null && student.longitude != null && <a className="mt-2 inline-block text-xs font-bold text-primary" target="_blank" rel="noreferrer" href={`https://www.google.com/maps?q=${student.latitude},${student.longitude}`}>باز کردن روی نقشه</a>}</div>
      <div className="mt-4 flex flex-wrap gap-2">{student.assignments.map((assignment, index) => <Badge key={`${assignment.runTitle}-${index}`} tone={assignment.direction === 'TO_SCHOOL' ? 'info' : 'warning'}>{assignment.runTitle} · ترتیب {assignment.pickupOrder.toLocaleString('fa-IR')}</Badge>)}</div>
    </Card>)}</div> : <Card><p className="text-sm text-muted">هنوز دانش‌آموز فعالی به سرویس شما اختصاص داده نشده است.</p></Card>}
  </div>;
}
