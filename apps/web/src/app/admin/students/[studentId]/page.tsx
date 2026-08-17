import { Breadcrumbs } from '@/components/navigation/breadcrumbs';
import { LocationDisplay } from '@/components/common/location-display';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import {
  getAdminStudentDetail,
  getAdminStudentPhoto,
} from '@/features/admin-students/admin-students-api';

export const metadata = { title: 'جزئیات دانش‌آموز' };
export const dynamic = 'force-dynamic';

export default async function AdminStudentPage({
  params,
}: {
  params: Promise<{ studentId: string }>;
}) {
  const { studentId } = await params;
  const student = await getAdminStudentDetail(studentId);
  const photo = await getAdminStudentPhoto(studentId).catch(() => null);

  return (
    <div className="space-y-6">
      <Breadcrumbs
        items={[
          { label: 'پنل مدیریت', href: '/admin/dashboard' },
          { label: 'دانش‌آموزان', href: '/admin/students' },
          { label: `${student.firstName} ${student.lastName}` },
        ]}
      />
      <header className="flex flex-wrap items-center gap-4">
        {photo ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={photo.viewUrl} alt={`عکس ${student.firstName} ${student.lastName}`} className="size-28 rounded-2xl object-cover" />
        ) : (
          <div className="grid size-28 place-items-center rounded-2xl bg-surface-muted text-sm font-bold text-muted">بدون عکس تأییدشده</div>
        )}
        <div>
          <h1 className="text-2xl font-black sm:text-3xl">{student.firstName} {student.lastName}</h1>
          <p className="mt-2 text-sm text-muted">{student.schoolName ?? 'مدرسه ثبت نشده'} · {student.grade ?? 'پایه ثبت نشده'}</p>
        </div>
      </header>
      <div className="grid gap-5 lg:grid-cols-2">
        <Card>
          <h2 className="font-black">مشخصات کامل دانش‌آموز</h2>
          <dl className="mt-4 grid grid-cols-2 gap-4 text-sm">
            <Info label="کد ملی" value={student.nationalId} mono />
            <Info label="کد دانش‌آموزی" value={student.studentCode} />
            <Info label="نام پدر" value={student.fatherName} />
            <Info label="شماره همراه دانش‌آموز" value={student.phoneNumber} mono />
            <Info label="تاریخ تولد" value={student.birthDate} />
            <Info label="جنسیت" value={student.gender === 'FEMALE' ? 'دختر' : student.gender === 'MALE' ? 'پسر' : null} />
            <Info label="مقطع" value={student.className} />
            <Info label="پایه" value={student.grade} />
            <Info label="رشته تحصیلی" value={student.fieldOfStudy} />
            <Info label="نوع مدرسه" value={student.schoolType} />
            <Info label="حساب خانواده" value={student.familyName} />
            <Info label="وضعیت" value={student.isActive ? 'فعال' : 'بایگانی‌شده'} />
          </dl>
        </Card>
        <Card>
          <h2 className="font-black">سرپرستان و تماس اضطراری</h2>
          <div className="mt-4 space-y-3 text-sm">
            {student.parents.map((parent) => (
              <div key={parent.id} className="rounded-xl bg-surface-muted p-3">
                <div className="flex justify-between gap-2"><p className="font-black">{parent.firstName} {parent.lastName}</p>{parent.isPrimaryContact && <Badge tone="info">سرپرست اصلی</Badge>}</div>
                <p className="mt-1 font-mono">{parent.nationalId} · {parent.phoneNumber}</p>
              </div>
            ))}
            {student.emergencyContacts.map((contact) => (
              <div key={contact.id} className="rounded-xl border border-border p-3">
                <p className="font-black">تماس اضطراری: {contact.firstName} {contact.lastName}</p>
                <p className="mt-1">{contact.relationship} · <span className="font-mono">{contact.phoneNumber}</span></p>
              </div>
            ))}
          </div>
        </Card>
        {student.addresses.map((address) => (
          <Card key={address.id} className="lg:col-span-2">
            <h2 className="font-black">موقعیت {address.title}</h2>
            <p className="my-3 text-sm leading-7">{address.province}، {address.city}{address.district ? `، ${address.district}` : ''}، {address.streetAddress}</p>
            {address.latitude != null && address.longitude != null ? (
              <LocationDisplay latitude={address.latitude} longitude={address.longitude} />
            ) : <p className="text-sm text-muted">مختصات این نشانی ثبت نشده است.</p>}
          </Card>
        ))}
        {student.enrollmentSummary && (
          <Card className="lg:col-span-2">
            <h2 className="font-black">ثبت‌نام، قرارداد و پرداخت</h2>
            <dl className="mt-4 grid gap-4 sm:grid-cols-3 text-sm">
              <Info label="وضعیت ثبت‌نام" value={student.enrollmentSummary.registrationStatus} />
              <Info label="نوع سرویس" value={student.enrollmentSummary.serviceType} />
              <Info label="سال تحصیلی" value={student.enrollmentSummary.academicYear} />
              <Info label="شماره قرارداد" value={student.enrollmentSummary.contract?.contractNumber} />
              <Info label="مبلغ کل" value={student.enrollmentSummary.price?.totalAmount?.toLocaleString('fa-IR')} />
              <Info label="تعداد اقساط پرداخت‌شده" value={student.enrollmentSummary.plan?.paidInstallmentCount?.toString()} />
            </dl>
          </Card>
        )}
      </div>
    </div>
  );
}

function Info({ label, value, mono = false }: { label: string; value?: string | null; mono?: boolean }) {
  return <div><dt className="text-muted">{label}</dt><dd className={`mt-1 font-bold ${mono ? 'font-mono' : ''}`}>{value || '—'}</dd></div>;
}
