'use client';

import { useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { JalaliDateInput } from '@/components/forms/jalali-date-input';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { getApiErrorFeedback } from '@/lib/api-error-feedback';
import { recordPaymentOnBehalf } from '@/features/admin-payments/admin-payments-api';
import { normalizeDigits } from '@/features/enrollment/national-id';
import {
  normalizeMobileInput,
  placeCaretAfterPrefix,
} from '@/features/enrollment/input-normalizers';
import {
  guidedEnrollmentSchema,
  type GuidedEnrollmentInput,
} from '@/features/enrollment/enrollment-schema';
import {
  createAdminFamilyEnrollment,
  type AdminEnrollmentActions,
  type FamilyDetail,
} from './admin-families-api';

type SchoolOption = {
  id: string;
  name: string;
  educationOptions: { level: string; grades: string[] }[];
};

const fatherKeys = ['fatherFirst', 'fatherLast', 'fatherNationalId', 'fatherPhone'] as const;
const motherKeys = ['motherFirst', 'motherLast', 'motherNationalId', 'motherPhone'] as const;
const emergencyKeys = [
  'emergencyFirst',
  'emergencyLast',
  'emergencyRelationship',
  'emergencyPhone',
] as const;

export function AdminFamilyEnrollmentForm({
  family,
  schools,
}: {
  family: FamilyDetail;
  schools: SchoolOption[];
}) {
  const router = useRouter();
  const father = family.parents.find((parent) => parent.parentType === 'FATHER');
  const mother = family.parents.find((parent) => parent.parentType === 'MOTHER');
  const guardian =
    family.parents.find((parent) => parent.parentType === 'GUARDIAN') ??
    family.parents.find((parent) => parent.isPrimaryContact) ??
    father;
  const guardianPhone = family.primaryPhone ?? guardian?.phoneNumber ?? '';
  const address = family.addresses.find((item) => item.isActive) ?? family.addresses[0];
  const emergency =
    family.emergencyContacts.find((item) => item.isActive) ?? family.emergencyContacts[0];
  const initialSchool = schools[0];
  const initialLevel = initialSchool?.educationOptions[0];
  const [form, setForm] = useState({
    studentFirst: '',
    studentLast: '',
    studentNationalId: '',
    birthDate: '',
    gender: 'FEMALE',
    studentPhone: '09',
    homePhone: '021',
    guardianFirst: guardian?.firstName ?? '',
    guardianLast: guardian?.lastName ?? '',
    guardianNationalId: guardian?.nationalId ?? '',
    guardianRelationshipType: guardian?.parentType === 'MOTHER' ? 'MOTHER' : 'FATHER',
    guardianRelationshipDescription: '',
    fatherFirst: father?.firstName ?? '',
    fatherLast: father?.lastName ?? '',
    fatherNationalId: father?.nationalId ?? '',
    fatherPhone: father?.phoneNumber ?? '09',
    motherFirst: mother?.firstName ?? '',
    motherLast: mother?.lastName ?? '',
    motherNationalId: mother?.nationalId ?? '',
    motherPhone: mother?.phoneNumber ?? '09',
    emergencyFirst: emergency?.firstName ?? '',
    emergencyLast: emergency?.lastName ?? '',
    emergencyRelationship: emergency?.relationship ?? '',
    emergencyPhone: emergency?.phoneNumber ?? '09',
    addressTitle: address?.title ?? 'منزل',
    province: address?.province ?? 'تهران',
    city: address?.city ?? 'تهران',
    district: address?.district ?? '',
    streetAddress: address?.streetAddress ?? '',
    postalCode: address?.postalCode ?? '',
    latitude: String(address?.latitude ?? 35.7219),
    longitude: String(address?.longitude ?? 51.3347),
    schoolId: initialSchool?.id ?? '',
    educationLevel: initialLevel?.level ?? '',
    grade: initialLevel?.grades[0] ?? '',
    serviceType: 'BUS',
    paymentPlanType: 'INSTALLMENTS',
    parentNotes: '',
  });
  const [signOnBehalf, setSignOnBehalf] = useState(false);
  const [signReason, setSignReason] = useState('');
  const [signSource, setSignSource] = useState('admin_console');
  const [recordCash, setRecordCash] = useState(false);
  const [cashReference, setCashReference] = useState('');
  const [cashPaidAt, setCashPaidAt] = useState('');
  const [cashDescription, setCashDescription] = useState('');
  const [cashReceipt, setCashReceipt] = useState<File>();
  const cashIdempotencyKey = useRef(crypto.randomUUID());
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string>();
  const [done, setDone] = useState<string | false>(false);
  const school = useMemo(
    () => schools.find((item) => item.id === form.schoolId),
    [form.schoolId, schools],
  );
  const levels = school?.educationOptions ?? [];
  const grades = levels.find((item) => item.level === form.educationLevel)?.grades ?? [];
  const set = (key: keyof typeof form, value: string) =>
    setForm((current) => ({ ...current, [key]: value }));
  const textField = (key: keyof typeof form, label: string, dir?: 'ltr', required = true) => (
    <label className="text-sm font-bold">
      {label}
      <Input
        required={required}
        className={`mt-1 ${dir ? 'text-left tabular-nums' : ''}`}
        dir={dir}
        inputMode={dir ? 'numeric' : undefined}
        value={form[key]}
        onFocus={(event) => {
          if (['fatherPhone', 'motherPhone', 'emergencyPhone', 'studentPhone'].includes(key)) {
            placeCaretAfterPrefix(event.currentTarget, 2);
          }
          if (key === 'homePhone') placeCaretAfterPrefix(event.currentTarget, 3);
        }}
        onChange={(event) => {
          if (['fatherPhone', 'motherPhone', 'emergencyPhone', 'studentPhone'].includes(key)) {
            set(key, normalizeMobileInput(event.target.value));
            return;
          }
          if (key === 'homePhone') {
            let digits = normalizeDigits(event.target.value).replace(/\D/g, '');
            while (digits.startsWith('021021')) digits = `021${digits.slice(6)}`;
            set(key, digits.startsWith('021') ? digits.slice(0, 11) : `021${digits}`.slice(0, 11));
            return;
          }
          if (key.toLowerCase().includes('nationalid') || key === 'postalCode') {
            set(key, normalizeDigits(event.target.value).replace(/\D/g, '').slice(0, 10));
            return;
          }
          set(key, event.target.value);
        }}
      />
    </label>
  );
  const sectionStarted = (keys: readonly (keyof typeof form)[]) =>
    keys.some((key) => {
      const value = String(form[key]).trim();
      return value !== '' && !(key.toLowerCase().includes('phone') && value === '09');
    });

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setPending(true);
    setError(undefined);
    const payload: GuidedEnrollmentInput = {
      student: {
        firstName: form.studentFirst,
        lastName: form.studentLast,
        nationalId: normalizeDigits(form.studentNationalId),
        birthDate: form.birthDate || undefined,
        gender: form.gender as 'MALE' | 'FEMALE',
      },
      homePhone: normalizeDigits(form.homePhone),
      guardian: {
        firstName:
          form.guardianRelationshipType === 'FATHER'
            ? form.fatherFirst
            : form.guardianRelationshipType === 'MOTHER'
              ? form.motherFirst
              : form.guardianFirst,
        lastName:
          form.guardianRelationshipType === 'FATHER'
            ? form.fatherLast
            : form.guardianRelationshipType === 'MOTHER'
              ? form.motherLast
              : form.guardianLast,
        nationalId: normalizeDigits(
          form.guardianRelationshipType === 'FATHER'
            ? form.fatherNationalId
            : form.guardianRelationshipType === 'MOTHER'
              ? form.motherNationalId
              : form.guardianNationalId,
        ),
        relationshipType: form.guardianRelationshipType as 'FATHER' | 'MOTHER' | 'OTHER',
        relationshipDescription:
          form.guardianRelationshipType === 'OTHER'
            ? form.guardianRelationshipDescription || undefined
            : undefined,
      },
      father: sectionStarted(fatherKeys)
        ? {
            firstName: form.fatherFirst,
            lastName: form.fatherLast,
            nationalId: normalizeDigits(form.fatherNationalId),
            phoneNumber: normalizeDigits(form.fatherPhone),
          }
        : null,
      mother: sectionStarted(motherKeys)
        ? {
            firstName: form.motherFirst,
            lastName: form.motherLast,
            nationalId: normalizeDigits(form.motherNationalId),
            phoneNumber: normalizeDigits(form.motherPhone),
          }
        : null,
      emergencyContact: sectionStarted(emergencyKeys)
        ? {
            firstName: form.emergencyFirst,
            lastName: form.emergencyLast,
            relationship: form.emergencyRelationship,
            phoneNumber: normalizeDigits(form.emergencyPhone),
          }
        : null,
      address: {
        title: form.addressTitle,
        province: form.province,
        city: form.city,
        streetAddress: form.streetAddress,
        postalCode: normalizeDigits(form.postalCode),
        latitude: Number(form.latitude),
        longitude: Number(form.longitude),
      },
      school: { schoolId: form.schoolId, educationLevel: form.educationLevel, grade: form.grade },
      service: {
        serviceType: form.serviceType as 'BUS' | 'MINIBUS' | 'CAR' | 'VAN',
        paymentPlanType: form.paymentPlanType as 'FULL' | 'INSTALLMENTS',
        parentNotes: form.parentNotes || undefined,
      },
    };
    const parsed = guidedEnrollmentSchema.safeParse(payload);
    if (!parsed.success) {
      setError(
        parsed.error.issues
          .map((issue) => issue.message)
          .slice(0, 3)
          .join(' — '),
      );
      setPending(false);
      return;
    }
    if (recordCash && (!cashReference.trim() || !cashPaidAt || !cashReceipt)) {
      setError('برای ثبت پیش‌پرداخت، تاریخ، شماره مرجع و تصویر رسید همگی الزامی هستند.');
      setPending(false);
      return;
    }
    if (recordCash && !signOnBehalf) {
      setError('برای ثبت پیش‌پرداخت نقدی، ابتدا پذیرش قرارداد به نمایندگی از والد را فعال کنید.');
      setPending(false);
      return;
    }
    const actions: AdminEnrollmentActions | undefined =
      signOnBehalf
        ? {
            signContractOnBehalf: signOnBehalf
              ? { reason: signReason.trim() || undefined, source: signSource }
              : undefined,
          }
        : undefined;
    try {
      const result = await createAdminFamilyEnrollment(family.id, parsed.data, actions);
      if (recordCash && cashReceipt) {
        await recordPaymentOnBehalf(
          result.data.scheduleItemId,
          {
            paidAt: cashPaidAt,
            referenceNumber: normalizeDigits(cashReference),
            description: cashDescription.trim() || undefined,
          },
          cashReceipt,
          cashIdempotencyKey.current,
        );
      }
      setDone(recordCash ? 'ENROLLED' : result.data.status);
      router.refresh();
    } catch (caught) {
      setError(getApiErrorFeedback(caught).message);
    } finally {
      setPending(false);
    }
  }

  if (done) {
    const message =
      done === 'ENROLLED'
        ? 'ثبت‌نام تکمیل شد؛ قرارداد به نمایندگی از والد پذیرفته شد و پیش‌پرداخت نقدی ثبت گردید. سرویس فعال است.'
        : done === 'CONTRACT_ACCEPTED'
          ? 'ثبت‌نام انجام شد و قرارداد به نمایندگی از والد پذیرفته شد؛ تعیین اقساط و شروع سرویس توسط مدیریت ادامه می‌یابد.'
          : 'ثبت‌نام ایجاد شد؛ قرارداد و پیش‌پرداخت اکنون برای بررسی و اقدام والد در پنل خانواده نمایش داده می‌شود.';
    return (
      <p role="status" className="rounded-xl bg-success/10 p-4 text-sm font-bold text-success">
        {message}
      </p>
    );
  }

  return (
    <form onSubmit={submit} noValidate className="space-y-6">
      <fieldset>
        <legend className="mb-3 font-black">مشخصات دانش‌آموز</legend>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {textField('studentFirst', 'نام')}
          {textField('studentLast', 'نام خانوادگی')}
          {textField('studentNationalId', 'کد ملی', 'ltr')}
          {textField('homePhone', 'تلفن منزل (۰۲۱)', 'ltr')}
          <div className="text-sm font-bold">
            <span>تاریخ تولد</span>
            <JalaliDateInput
              value={form.birthDate}
              onChange={(value) => set('birthDate', value)}
              required
              label="تاریخ تولد"
              minDate="1900-01-01"
              maxDate={new Date().toISOString().slice(0, 10)}
            />
          </div>
          <label className="text-sm font-bold">
            جنسیت
            <Select
              value={form.gender}
              onValueChange={(value) => set('gender', value)}
              options={[
                { value: 'FEMALE', label: 'دختر' },
                { value: 'MALE', label: 'پسر' },
              ]}
            />
          </label>
        </div>
      </fieldset>
      <fieldset>
        <legend className="mb-3 font-black">سرپرست</legend>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <label className="text-sm font-bold">
            نسبت
            <Select
              value={form.guardianRelationshipType}
              onValueChange={(value) => set('guardianRelationshipType', value)}
              options={[
                { value: 'FATHER', label: 'پدر' },
                { value: 'MOTHER', label: 'مادر' },
                { value: 'OTHER', label: 'سایر' },
              ]}
            />
          </label>
          {form.guardianRelationshipType === 'OTHER' && textField('guardianFirst', 'نام')}
          {form.guardianRelationshipType === 'OTHER' && textField('guardianLast', 'نام خانوادگی')}
          {form.guardianRelationshipType === 'OTHER' &&
            textField('guardianNationalId', 'کد ملی', 'ltr')}
          {form.guardianRelationshipType === 'OTHER' && (
            <div className="lg:col-span-2">
              {textField('guardianRelationshipDescription', 'شرح نسبت')}
            </div>
          )}
          <label className="text-sm font-bold">
            شماره همراه سرپرست
            <Input required className="mt-1" dir="ltr" value={guardianPhone} disabled />
          </label>
          <p className="text-xs leading-5 text-muted lg:col-span-4">
            شماره تأییدشده حساب خانواده؛ این شماره به‌عنوان شماره سرپرست ثبت می‌شود و حساب جدیدی
            برای آن ساخته نمی‌شود.
          </p>
        </div>
      </fieldset>
      <fieldset>
        <legend className="mb-3 font-black">اطلاعات پدر</legend>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {textField('fatherFirst', 'نام پدر')}
          {textField('fatherLast', 'نام خانوادگی پدر')}
          {textField('fatherNationalId', 'کد ملی پدر', 'ltr')}
          {textField('fatherPhone', 'همراه پدر', 'ltr')}
        </div>
      </fieldset>
      <fieldset>
        <legend className="mb-3 font-black">اطلاعات مادر</legend>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {textField('motherFirst', 'نام مادر')}
          {textField('motherLast', 'نام خانوادگی مادر')}
          {textField('motherNationalId', 'کد ملی مادر', 'ltr')}
          {textField('motherPhone', 'همراه مادر', 'ltr')}
        </div>
      </fieldset>
      <fieldset>
        <legend className="mb-3 font-black">تماس اضطراری و نشانی</legend>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {textField('emergencyFirst', 'نام تماس اضطراری')}
          {textField('emergencyLast', 'نام خانوادگی')}
          {textField('emergencyRelationship', 'نسبت')}
          {textField('emergencyPhone', 'شماره همراه', 'ltr')}
          {textField('addressTitle', 'عنوان نشانی')}
          {textField('province', 'استان')}
          {textField('city', 'شهر')}
          {textField('district', 'منطقه', undefined, false)}
          <div className="sm:col-span-2">{textField('streetAddress', 'نشانی کامل')}</div>
          {textField('postalCode', 'کد پستی', 'ltr')}
          {textField('latitude', 'عرض جغرافیایی', 'ltr')}
          {textField('longitude', 'طول جغرافیایی', 'ltr')}
        </div>
      </fieldset>
      <fieldset>
        <legend className="mb-3 font-black">مدرسه و سرویس</legend>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <label className="text-sm font-bold">
            مدرسه
            <Select
              value={form.schoolId}
              onValueChange={(value) => {
                const next = schools.find((item) => item.id === value);
                setForm((current) => ({
                  ...current,
                  schoolId: value,
                  educationLevel: next?.educationOptions[0]?.level ?? '',
                  grade: next?.educationOptions[0]?.grades[0] ?? '',
                }));
              }}
              options={schools.map(({ id, name }) => ({ value: id, label: name }))}
            />
          </label>
          <label className="text-sm font-bold">
            مقطع
            <Select
              value={form.educationLevel}
              onValueChange={(value) => {
                const nextGrades = levels.find((item) => item.level === value)?.grades ?? [];
                setForm((current) => ({
                  ...current,
                  educationLevel: value,
                  grade: nextGrades[0] ?? '',
                }));
              }}
              options={levels.map(({ level }) => ({ value: level, label: level }))}
            />
          </label>
          <label className="text-sm font-bold">
            پایه
            <Select
              value={form.grade}
              onValueChange={(value) => set('grade', value)}
              options={grades.map((value) => ({ value, label: value }))}
            />
          </label>
          <label className="text-sm font-bold">
            نوع سرویس
            <Select
              value={form.serviceType}
              onValueChange={(value) => set('serviceType', value)}
              options={[
                { value: 'BUS', label: 'اتوبوس' },
                { value: 'MINIBUS', label: 'مینی‌بوس' },
                { value: 'CAR', label: 'خودرو' },
                { value: 'VAN', label: 'ون' },
              ]}
            />
          </label>
          <label className="text-sm font-bold">
            روش پرداخت باقی‌مانده
            <Select
              value={form.paymentPlanType}
              onValueChange={(value) => set('paymentPlanType', value)}
              options={[
                { value: 'FULL', label: 'یکجا' },
                { value: 'INSTALLMENTS', label: 'اقساط' },
              ]}
            />
          </label>
        </div>
        <label className="mt-3 block text-sm font-bold">
          توضیحات
          <Textarea
            className="mt-1"
            value={form.parentNotes}
            onChange={(event) => set('parentNotes', event.target.value)}
          />
        </label>
      </fieldset>
      <fieldset>
        <legend className="mb-3 font-black">تکمیل به نمایندگی والد (اختیاری)</legend>
        <div className="space-y-3">
          <label className="flex items-start gap-3 rounded-xl border border-border p-4">
            <input
              type="checkbox"
              className="mt-1 size-4"
              checked={signOnBehalf}
              onChange={(event) => setSignOnBehalf(event.target.checked)}
            />
            <span>
              <span className="block text-sm font-bold">پذیرش قرارداد به نمایندگی از والد</span>
              <span className="block text-xs leading-5 text-muted">
                فقط زمانی فعال کنید که والد شخصاً (حضوری یا تلفنی) درخواست پذیرش داده باشد؛ نام شما
                در گزارش حسابرسی ثبت می‌شود.
              </span>
            </span>
          </label>
          {signOnBehalf && (
            <div className="grid gap-3 rounded-xl bg-surface-muted p-4 sm:grid-cols-2">
              <label className="text-sm font-bold">
                منبع پذیرش
                <Select
                  value={signSource}
                  onValueChange={setSignSource}
                  options={[
                    { value: 'admin_console', label: 'پنل مدیریت' },
                    { value: 'in_person', label: 'حضوری در دفتر' },
                    { value: 'phone', label: 'تلفنی' },
                  ]}
                />
              </label>
              <label className="text-sm font-bold">
                دلیل پذیرش
                <Input
                  className="mt-1"
                  value={signReason}
                  onChange={(event) => setSignReason(event.target.value)}
                />
              </label>
            </div>
          )}
          <label className="flex items-start gap-3 rounded-xl border border-border p-4">
            <input
              type="checkbox"
              className="mt-1 size-4"
              checked={recordCash}
              onChange={(event) => setRecordCash(event.target.checked)}
            />
            <span>
              <span className="block text-sm font-bold">ثبت پیش‌پرداخت نقدی (۴٬۹۹۷٬۸۰۰ تومان)</span>
              <span className="block text-xs leading-5 text-muted">
                هنگامی که مبلغ نقدی دریافت شده است؛ با ثبت آن سرویس بلافاصله فعال می‌شود.
              </span>
            </span>
          </label>
          {recordCash && (
            <div className="space-y-3 rounded-xl border border-warning/40 bg-warning/10 p-4">
              <p className="text-sm font-black text-foreground">هشدار پیش‌پرداخت نقدی</p>
              <p className="text-sm leading-6 text-muted">
                با ثبت پیش‌پرداخت نقدی به نمایندگی از والد، مبلغ ۴٬۹۹۷٬۸۰۰ تومان (معادل ۴۹٬۹۷۸٬۰۰۰
                ریال) به‌عنوان پرداخت قطعی ثبت می‌شود و سرویس بلافاصله فعال خواهد شد. حتماً شماره
                رسید دریافتی را درج کنید؛ این اقدام با نام شما در گزارش حسابرسی ثبت می‌شود و قابل
                بازگشت نیست.
              </p>
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="text-sm font-bold">
                  شماره رسید / مرجع پرداخت
                  <Input
                    required
                    className="mt-1"
                    dir="ltr"
                    value={cashReference}
                    onChange={(event) => setCashReference(event.target.value)}
                  />
                </label>
                <label className="text-sm font-bold">
                  تاریخ دریافت (شمسی)
                  <div className="mt-1">
                    <JalaliDateInput value={cashPaidAt} onChange={setCashPaidAt} />
                  </div>
                </label>
                <div className="sm:col-span-2">
                  <label className="text-sm font-bold">
                    توضیحات پرداخت
                    <Textarea
                      className="mt-1"
                      value={cashDescription}
                      onChange={(event) => setCashDescription(event.target.value)}
                    />
                  </label>
                </div>
                <label className="text-sm font-bold sm:col-span-2">
                  تصویر رسید پرداخت (JPEG یا PNG) *
                  <Input
                    required
                    className="mt-1"
                    type="file"
                    accept="image/jpeg,image/png"
                    onChange={(event) => setCashReceipt(event.target.files?.[0])}
                  />
                </label>
              </div>
            </div>
          )}
        </div>
      </fieldset>
      <p className="rounded-xl bg-warning/10 p-3 text-sm leading-6">
        بدون انتخاب گزینه‌های بالا، مدیریت فقط اطلاعات را ثبت می‌کند و پذیرش یا رد قرارداد و پرداخت
        پیش‌پرداخت فقط توسط والد در پنل خانواده انجام می‌شود.
      </p>
      {error && (
        <p role="alert" className="text-sm text-danger">
          {error}
        </p>
      )}
      <Button type="submit" loading={pending}>
        {signOnBehalf || recordCash
          ? 'ایجاد ثبت‌نام و تکمیل به نمایندگی والد'
          : 'ایجاد ثبت‌نام و ارسال برای اقدام والد'}
      </Button>
    </form>
  );
}
