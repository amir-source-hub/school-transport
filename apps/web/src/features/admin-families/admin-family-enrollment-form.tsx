'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { JalaliDateInput } from '@/components/forms/jalali-date-input';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { getApiErrorFeedback } from '@/lib/api-error-feedback';
import { normalizeDigits } from '@/features/enrollment/national-id';
import {
  createAdminFamilyEnrollment,
  type FamilyDetail,
} from './admin-families-api';

type SchoolOption = { id: string; name: string; educationOptions: { level: string; grades: string[] }[] };

const fatherKeys = ['fatherFirst', 'fatherLast', 'fatherNationalId', 'fatherPhone'] as const;
const motherKeys = ['motherFirst', 'motherLast', 'motherNationalId', 'motherPhone'] as const;
const emergencyKeys = ['emergencyFirst', 'emergencyLast', 'emergencyRelationship', 'emergencyPhone'] as const;

export function AdminFamilyEnrollmentForm({ family, schools }: { family: FamilyDetail; schools: SchoolOption[] }) {
  const router = useRouter();
  const father = family.parents.find((parent) => parent.parentType === 'FATHER');
  const mother = family.parents.find((parent) => parent.parentType === 'MOTHER');
  const guardian =
    family.parents.find((parent) => parent.parentType === 'GUARDIAN') ??
    family.parents.find((parent) => parent.isPrimaryContact) ??
    father;
  const guardianPhone = family.primaryPhone ?? guardian?.phoneNumber ?? '';
  const address = family.addresses.find((item) => item.isActive) ?? family.addresses[0];
  const emergency = family.emergencyContacts.find((item) => item.isActive) ?? family.emergencyContacts[0];
  const initialSchool = schools[0];
  const initialLevel = initialSchool?.educationOptions[0];
  const [form, setForm] = useState({
    studentFirst: '', studentLast: '', studentNationalId: '', birthDate: '', gender: 'FEMALE', studentPhone: '',
    homePhone: '',
    guardianFirst: guardian?.firstName ?? '', guardianLast: guardian?.lastName ?? '', guardianNationalId: guardian?.nationalId ?? '', guardianRelationshipType: guardian?.parentType === 'MOTHER' ? 'MOTHER' : 'FATHER', guardianRelationshipDescription: '',
    fatherFirst: father?.firstName ?? '', fatherLast: father?.lastName ?? '', fatherNationalId: father?.nationalId ?? '', fatherPhone: father?.phoneNumber ?? '',
    motherFirst: mother?.firstName ?? '', motherLast: mother?.lastName ?? '', motherNationalId: mother?.nationalId ?? '', motherPhone: mother?.phoneNumber ?? '',
    emergencyFirst: emergency?.firstName ?? '', emergencyLast: emergency?.lastName ?? '', emergencyRelationship: emergency?.relationship ?? '', emergencyPhone: emergency?.phoneNumber ?? '',
    addressTitle: address?.title ?? 'منزل', province: address?.province ?? 'تهران', city: address?.city ?? 'تهران', district: address?.district ?? '', streetAddress: address?.streetAddress ?? '', postalCode: address?.postalCode ?? '',
    latitude: String(address?.latitude ?? 35.7219), longitude: String(address?.longitude ?? 51.3347),
    schoolId: initialSchool?.id ?? '', educationLevel: initialLevel?.level ?? '', grade: initialLevel?.grades[0] ?? '', serviceType: 'BUS', paymentPlanType: 'INSTALLMENTS', parentNotes: '',
  });
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string>();
  const [done, setDone] = useState(false);
  const school = useMemo(() => schools.find((item) => item.id === form.schoolId), [form.schoolId, schools]);
  const levels = school?.educationOptions ?? [];
  const grades = levels.find((item) => item.level === form.educationLevel)?.grades ?? [];
  const set = (key: keyof typeof form, value: string) => setForm((current) => ({ ...current, [key]: value }));
  const textField = (key: keyof typeof form, label: string, dir?: 'ltr', required = true) => (
    <label className="text-sm font-bold">{label}<Input required={required} className="mt-1" dir={dir} value={form[key]} onChange={(event) => set(key, event.target.value)} /></label>
  );
  const sectionStarted = (keys: readonly (keyof typeof form)[]) =>
    keys.some((key) => String(form[key]).trim() !== '');

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setPending(true); setError(undefined);
    try {
      await createAdminFamilyEnrollment(family.id, {
        student: { firstName: form.studentFirst, lastName: form.studentLast, nationalId: normalizeDigits(form.studentNationalId), birthDate: form.birthDate || undefined, gender: form.gender as 'MALE' | 'FEMALE' },
        homePhone: form.homePhone ? `021${normalizeDigits(form.homePhone)}` : '',
        guardian: { firstName: form.guardianFirst, lastName: form.guardianLast, nationalId: normalizeDigits(form.guardianNationalId), relationshipType: form.guardianRelationshipType as 'FATHER' | 'MOTHER' | 'OTHER', relationshipDescription: form.guardianRelationshipType === 'OTHER' ? form.guardianRelationshipDescription || undefined : undefined },
        father: sectionStarted(fatherKeys) ? { firstName: form.fatherFirst, lastName: form.fatherLast, nationalId: normalizeDigits(form.fatherNationalId), phoneNumber: normalizeDigits(form.fatherPhone) } : null,
        mother: sectionStarted(motherKeys) ? { firstName: form.motherFirst, lastName: form.motherLast, nationalId: normalizeDigits(form.motherNationalId), phoneNumber: normalizeDigits(form.motherPhone) } : null,
        emergencyContact: sectionStarted(emergencyKeys) ? { firstName: form.emergencyFirst, lastName: form.emergencyLast, relationship: form.emergencyRelationship, phoneNumber: normalizeDigits(form.emergencyPhone) } : null,
        address: { title: form.addressTitle, province: form.province, city: form.city, streetAddress: form.streetAddress, postalCode: normalizeDigits(form.postalCode), latitude: Number(form.latitude), longitude: Number(form.longitude) },
        school: { schoolId: form.schoolId, educationLevel: form.educationLevel, grade: form.grade },
        service: { serviceType: form.serviceType as 'BUS' | 'MINIBUS' | 'CAR' | 'VAN', paymentPlanType: form.paymentPlanType as 'FULL' | 'INSTALLMENTS', parentNotes: form.parentNotes || undefined },
      });
      setDone(true); router.refresh();
    } catch (caught) { setError(getApiErrorFeedback(caught).message); }
    finally { setPending(false); }
  }

  if (done) return <p role="status" className="rounded-xl bg-success/10 p-4 text-sm font-bold text-success">ثبت‌نام ایجاد شد. قرارداد و پیش‌پرداخت اکنون برای بررسی و اقدام والد در پنل خانواده نمایش داده می‌شود.</p>;

  return (
    <form onSubmit={submit} className="space-y-6">
      <fieldset><legend className="mb-3 font-black">مشخصات دانش‌آموز</legend><div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{textField('studentFirst', 'نام')}{textField('studentLast', 'نام خانوادگی')}{textField('studentNationalId', 'کد ملی', 'ltr')}{textField('homePhone', 'تلفن منزل (۰۲۱)', 'ltr')}<label className="text-sm font-bold">تاریخ تولد<JalaliDateInput value={form.birthDate} onChange={(value) => set('birthDate', value)} required /></label><label className="text-sm font-bold">جنسیت<Select value={form.gender} onValueChange={(value) => set('gender', value)} options={[{ value: 'FEMALE', label: 'دختر' }, { value: 'MALE', label: 'پسر' }]} /></label></div></fieldset>
      <fieldset><legend className="mb-3 font-black">سرپرست</legend><div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">{textField('guardianFirst', 'نام')}{textField('guardianLast', 'نام خانوادگی')}{textField('guardianNationalId', 'کد ملی', 'ltr')}<label className="text-sm font-bold">نسبت<Select value={form.guardianRelationshipType} onValueChange={(value) => set('guardianRelationshipType', value)} options={[{ value: 'FATHER', label: 'پدر' }, { value: 'MOTHER', label: 'مادر' }, { value: 'OTHER', label: 'سایر' }]} /></label>{form.guardianRelationshipType === 'OTHER' && <div className="lg:col-span-2">{textField('guardianRelationshipDescription', 'شرح نسبت')}</div>}<label className="text-sm font-bold">شماره همراه سرپرست<Input required className="mt-1" dir="ltr" value={guardianPhone} disabled /></label></div></fieldset>
      <fieldset><legend className="mb-3 font-black">اطلاعات پدر</legend><div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">{textField('fatherFirst', 'نام پدر')}{textField('fatherLast', 'نام خانوادگی پدر')}{textField('fatherNationalId', 'کد ملی پدر', 'ltr')}{textField('fatherPhone', 'همراه پدر', 'ltr')}</div></fieldset>
      <fieldset><legend className="mb-3 font-black">اطلاعات مادر</legend><div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">{textField('motherFirst', 'نام مادر')}{textField('motherLast', 'نام خانوادگی مادر')}{textField('motherNationalId', 'کد ملی مادر', 'ltr')}{textField('motherPhone', 'همراه مادر', 'ltr')}</div></fieldset>
      <fieldset><legend className="mb-3 font-black">تماس اضطراری و نشانی</legend><div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">{textField('emergencyFirst', 'نام تماس اضطراری')}{textField('emergencyLast', 'نام خانوادگی')}{textField('emergencyRelationship', 'نسبت')}{textField('emergencyPhone', 'شماره همراه', 'ltr')}{textField('addressTitle', 'عنوان نشانی')}{textField('province', 'استان')}{textField('city', 'شهر')}{textField('district', 'منطقه', undefined, false)}<div className="sm:col-span-2">{textField('streetAddress', 'نشانی کامل')}</div>{textField('postalCode', 'کد پستی', 'ltr')}{textField('latitude', 'عرض جغرافیایی', 'ltr')}{textField('longitude', 'طول جغرافیایی', 'ltr')}</div></fieldset>
      <fieldset><legend className="mb-3 font-black">مدرسه و سرویس</legend><div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3"><label className="text-sm font-bold">مدرسه<Select value={form.schoolId} onValueChange={(value) => { const next = schools.find((item) => item.id === value); setForm((current) => ({ ...current, schoolId: value, educationLevel: next?.educationOptions[0]?.level ?? '', grade: next?.educationOptions[0]?.grades[0] ?? '' })); }} options={schools.map(({ id, name }) => ({ value: id, label: name }))} /></label><label className="text-sm font-bold">مقطع<Select value={form.educationLevel} onValueChange={(value) => { const nextGrades = levels.find((item) => item.level === value)?.grades ?? []; setForm((current) => ({ ...current, educationLevel: value, grade: nextGrades[0] ?? '' })); }} options={levels.map(({ level }) => ({ value: level, label: level }))} /></label><label className="text-sm font-bold">پایه<Select value={form.grade} onValueChange={(value) => set('grade', value)} options={grades.map((value) => ({ value, label: value }))} /></label><label className="text-sm font-bold">نوع سرویس<Select value={form.serviceType} onValueChange={(value) => set('serviceType', value)} options={[{ value: 'BUS', label: 'اتوبوس' }, { value: 'MINIBUS', label: 'مینی‌بوس' }, { value: 'CAR', label: 'خودرو' }, { value: 'VAN', label: 'ون' }]} /></label><label className="text-sm font-bold">روش پرداخت باقی‌مانده<Select value={form.paymentPlanType} onValueChange={(value) => set('paymentPlanType', value)} options={[{ value: 'FULL', label: 'یکجا' }, { value: 'INSTALLMENTS', label: 'اقساط' }]} /></label></div><label className="mt-3 block text-sm font-bold">توضیحات<Textarea className="mt-1" value={form.parentNotes} onChange={(event) => set('parentNotes', event.target.value)} /></label></fieldset>
      <p className="rounded-xl bg-warning/10 p-3 text-sm">مدیریت فقط اطلاعات را ثبت می‌کند؛ پذیرش یا رد قرارداد و پرداخت پیش‌پرداخت فقط توسط والد در پنل خانواده انجام می‌شود.</p>
      {error && <p role="alert" className="text-sm text-danger">{error}</p>}
      <Button type="submit" loading={pending}>ایجاد ثبت‌نام و ارسال برای اقدام والد</Button>
    </form>
  );
}
