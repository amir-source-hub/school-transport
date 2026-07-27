'use client';

import dynamic from 'next/dynamic';
import {
  BusFront,
  CarFront,
  Check,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  FileCheck2,
  LocateFixed,
  ShieldCheck,
  Truck,
  WalletCards,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useMemo, useState } from 'react';

const LocationPicker = dynamic(
  () => import('@/components/common/location-picker').then((m) => ({ default: m.LocationPicker })),
  { ssr: false },
);
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { JalaliDateInput } from '@/components/forms/jalali-date-input';
import { getApiErrorFeedback } from '@/lib/api-error-feedback';
import { isValidIranianNationalId, normalizeDigits } from './national-id';
import {
  acceptEnrollmentPrice,
  acceptGuidedContract,
  cancelEnrollment,
  createGuidedEnrollment,
  payGuidedPrepayment,
  type GuidedEnrollmentResult,
} from './enrollments-api';

type SchoolOption = {
  id: string;
  name: string;
  city: string;
  educationOptions: { level: string; grades: string[] }[];
};
type SavedParent = {
  firstName: string;
  lastName: string;
  nationalId: string;
  phoneNumber: string;
};
type SavedParents = {
  father: SavedParent | null;
  mother: SavedParent | null;
};
const stages = ['مشخصات', 'نشانی', 'مدرسه', 'سرویس و قرارداد'];

const initialForm = {
  studentFirst: '',
  studentLast: '',
  studentNationalId: '',
  birthDate: '',
  gender: '',
  fatherFirst: '',
  fatherLast: '',
  fatherNationalId: '',
  fatherPhone: '',
  motherFirst: '',
  motherLast: '',
  motherNationalId: '',
  motherPhone: '',
  emergencyFirst: '',
  emergencyLast: '',
  emergencyRelationship: '',
  emergencyPhone: '',
  addressTitle: 'منزل',
  province: 'تهران',
  city: 'تهران',
  district: '',
  streetAddress: '',
  postalCode: '',
  latitude: 35.7219,
  longitude: 51.3347,
  schoolId: '',
  educationLevel: '',
  grade: '',
  serviceType: 'BUS',
  paymentPlanType: 'INSTALLMENTS',
  parentNotes: '',
};

const vehicleOptions = [
  {
    value: 'BUS',
    label: 'اتوبوس',
    description: 'مناسب مسیرهای پرتراکم و گروه‌های بزرگ',
    icon: BusFront,
  },
  {
    value: 'MINIBUS',
    label: 'مینی‌بوس',
    description: 'مناسب مسیرهای محلی با ظرفیت متوسط',
    icon: Truck,
  },
  {
    value: 'CAR',
    label: 'خودرو سواری',
    description: 'ظرفیت کم و مسیرهای اختصاصی‌تر',
    icon: CarFront,
  },
  {
    value: 'VAN',
    label: 'ون',
    description: 'ظرفیت متوسط و دسترسی بهتر در محله‌ها',
    icon: BusFront,
  },
];

export function CreateEnrollmentForm({
  schools,
  savedParents,
}: {
  schools: SchoolOption[];
  savedParents: SavedParents;
}) {
  const router = useRouter();
  const firstSchool = schools[0];
  const firstLevel = firstSchool?.educationOptions[0];
  const createInitialForm = () => ({
    ...initialForm,
    fatherFirst: savedParents.father?.firstName ?? '',
    fatherLast: savedParents.father?.lastName ?? '',
    fatherNationalId: savedParents.father?.nationalId ?? '',
    fatherPhone: savedParents.father?.phoneNumber ?? '',
    motherFirst: savedParents.mother?.firstName ?? '',
    motherLast: savedParents.mother?.lastName ?? '',
    motherNationalId: savedParents.mother?.nationalId ?? '',
    motherPhone: savedParents.mother?.phoneNumber ?? '',
    schoolId: firstSchool?.id ?? '',
    educationLevel: firstLevel?.level ?? '',
    grade: firstLevel?.grades[0] ?? '',
  });
  const [step, setStep] = useState(1);
  const [form, setForm] = useState(createInitialForm);
  const [result, setResult] = useState<GuidedEnrollmentResult>();
  const [contractRead, setContractRead] = useState(false);
  const [contractChecked, setContractChecked] = useState(false);
  const [accepted, setAccepted] = useState(false);
  const [paid, setPaid] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string>();
  const [locationError, setLocationError] = useState<string>();
  const set = (key: keyof typeof form, value: string | number) =>
    setForm((current) => ({ ...current, [key]: value }));
  const selectedSchool = useMemo(
    () => schools.find((school) => school.id === form.schoolId),
    [form.schoolId, schools],
  );
  const levelOptions = selectedSchool?.educationOptions ?? [];
  const gradeOptions =
    levelOptions.find(({ level }) => level === form.educationLevel)?.grades ?? [];
  const googleMapUrl = `https://www.google.com/maps?q=${form.latitude},${form.longitude}&z=16`;

  function selectSchool(schoolId: string) {
    const school = schools.find(({ id }) => id === schoolId);
    const firstLevel = school?.educationOptions[0];
    setForm((current) => ({
      ...current,
      schoolId,
      educationLevel: firstLevel?.level ?? '',
      grade: firstLevel?.grades[0] ?? '',
    }));
  }

  function selectLevel(educationLevel: string) {
    const grades =
      selectedSchool?.educationOptions.find(({ level }) => level === educationLevel)?.grades ?? [];
    setForm((current) => ({ ...current, educationLevel, grade: grades[0] ?? '' }));
  }

  function useCurrentLocation() {
    setLocationError(undefined);
    if (!navigator.geolocation) {
      setLocationError('مرورگر شما امکان دریافت موقعیت مکانی را ندارد.');
      return;
    }
    navigator.geolocation.getCurrentPosition(
      ({ coords }) =>
        setForm((current) => ({
          ...current,
          latitude: coords.latitude,
          longitude: coords.longitude,
        })),
      () =>
        setLocationError('اجازه دسترسی به موقعیت داده نشد. دسترسی Location مرورگر را فعال کنید.'),
      { enableHighAccuracy: true, timeout: 15_000, maximumAge: 30_000 },
    );
  }

  function next(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(undefined);
    const validationError = validateStep(step);
    if (validationError) {
      setError(validationError);
      return;
    }
    setStep((current) => Math.min(4, current + 1));
  }

  function validateStep(currentStep: number): string | null {
    if (currentStep === 1) {
      const requiredNames = [
        form.studentFirst,
        form.studentLast,
        form.fatherFirst,
        form.fatherLast,
        form.motherFirst,
        form.motherLast,
        form.emergencyFirst,
        form.emergencyLast,
        form.emergencyRelationship,
      ];
      if (requiredNames.some((value) => !value.trim()))
        return 'تمام مشخصات فردی ضروری را تکمیل کنید.';
    }
    const ids = [
      { key: 'کد ملی دانش‌آموز', value: form.studentNationalId },
      { key: 'کد ملی پدر', value: form.fatherNationalId },
      { key: 'کد ملی مادر', value: form.motherNationalId },
    ];
    if (currentStep === 1 || currentStep === 4) {
      for (const { key, value } of ids) {
        if (!isValidIranianNationalId(value)) {
          return `${key} نامعتبر است. فقط عدد و حداکثر ۲۰ رقم وارد کنید.`;
        }
      }
      if (!/^09\d{9}$/.test(normalizeDigits(form.fatherPhone)))
        return 'شماره همراه پدر نامعتبر است.';
      if (!/^09\d{9}$/.test(normalizeDigits(form.motherPhone)))
        return 'شماره همراه مادر نامعتبر است.';
      if (!/^09\d{9}$/.test(normalizeDigits(form.emergencyPhone)))
        return 'شماره همراه تماس اضطراری نامعتبر است.';
    }
    if (
      currentStep === 2 &&
      (!form.streetAddress.trim() || !/^\d{10}$/.test(normalizeDigits(form.postalCode)))
    ) {
      return 'نشانی کامل و کد پستی ۱۰ رقمی معتبر را وارد کنید.';
    }
    if (currentStep === 3 && (!form.schoolId || !form.educationLevel || !form.grade)) {
      return 'مدرسه، مقطع و پایه تحصیلی را انتخاب کنید.';
    }
    return null;
  }

  async function prepareContract(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const validationError = validateStep(4);
    if (validationError) {
      setError(validationError);
      return;
    }
    setPending(true);
    setError(undefined);
    try {
      setResult(
        await createGuidedEnrollment({
          student: {
            firstName: form.studentFirst,
            lastName: form.studentLast,
            nationalId: normalizeDigits(form.studentNationalId),
            birthDate: form.birthDate || undefined,
            gender: form.gender || undefined,
          },
          father: {
            firstName: form.fatherFirst,
            lastName: form.fatherLast,
            nationalId: normalizeDigits(form.fatherNationalId),
            phoneNumber: normalizeDigits(form.fatherPhone),
          },
          mother: {
            firstName: form.motherFirst,
            lastName: form.motherLast,
            nationalId: normalizeDigits(form.motherNationalId),
            phoneNumber: normalizeDigits(form.motherPhone),
          },
          emergencyContact: {
            firstName: form.emergencyFirst,
            lastName: form.emergencyLast,
            relationship: form.emergencyRelationship,
            phoneNumber: normalizeDigits(form.emergencyPhone),
          },
          address: {
            title: form.addressTitle,
            province: form.province,
            city: form.city,
            district: form.district || undefined,
            streetAddress: form.streetAddress,
            postalCode: normalizeDigits(form.postalCode),
            latitude: form.latitude,
            longitude: form.longitude,
          },
          school: {
            schoolId: form.schoolId,
            educationLevel: form.educationLevel,
            grade: form.grade,
          },
          service: {
            serviceType: form.serviceType,
            paymentPlanType: form.paymentPlanType as 'FULL' | 'INSTALLMENTS',
            parentNotes: form.parentNotes || undefined,
          },
        }),
      );
    } catch (caught) {
      setError(getApiErrorFeedback(caught).message);
    } finally {
      setPending(false);
    }
  }

  const lockedParentFields = new Set<keyof typeof form>([
    ...(savedParents.father
      ? (['fatherFirst', 'fatherLast', 'fatherNationalId', 'fatherPhone'] as const)
      : []),
    ...(savedParents.mother
      ? (['motherFirst', 'motherLast', 'motherNationalId', 'motherPhone'] as const)
      : []),
  ]);
  const field = (key: keyof typeof form, label: string, type = 'text') => (
    <label className="text-sm font-bold text-foreground">
      {label}
      <Input
        required={key !== 'birthDate'}
        type={type}
        value={String(form[key])}
        dir={['tel', 'number'].includes(type) ? 'ltr' : undefined}
        disabled={lockedParentFields.has(key)}
        onChange={(event) => set(key, event.target.value)}
        className="mt-2 disabled:cursor-not-allowed disabled:bg-surface-muted disabled:text-muted"
      />
    </label>
  );

  return (
    <div className="overflow-hidden rounded-[1.75rem] border border-slate-200 bg-white shadow-[0_25px_70px_-45px_rgba(15,23,42,.45)]">
      <div className="border-b border-slate-100 bg-slate-50/80 px-5 py-6 sm:px-8">
        <div className="grid grid-cols-4 gap-2">
          {stages.map((label, index) => {
            const number = index + 1;
            const done = number < step || Boolean(result);
            return (
              <div key={label} className="relative text-center">
                {index > 0 && (
                  <span
                    className={`absolute left-1/2 right-[-50%] top-5 h-px ${number <= step ? 'bg-primary' : 'bg-slate-200'}`}
                  />
                )}
                <span
                  className={`relative mx-auto flex size-10 items-center justify-center rounded-full border-2 text-sm font-black ${done ? 'border-primary bg-primary text-white' : number === step ? 'border-primary bg-white text-primary' : 'border-slate-200 bg-white text-muted'}`}
                >
                  {done ? <Check className="size-4" /> : number.toLocaleString('fa-IR')}
                </span>
                <span
                  className={`mt-2 block text-[11px] font-bold sm:text-sm ${number <= step ? 'text-foreground' : 'text-muted'}`}
                >
                  {label}
                </span>
              </div>
            );
          })}
        </div>
      </div>
      <div className="p-5 sm:p-8">
        {step === 1 && (
          <form onSubmit={next} className="space-y-7">
            <Section title="مشخصات دانش‌آموز">
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {field('studentFirst', 'نام دانش‌آموز')}
                {field('studentLast', 'نام خانوادگی')}
                {field('studentNationalId', 'کد ملی', 'tel')}
                <label className="text-sm font-bold">
                  تاریخ تولد (شمسی)
                  <div className="mt-2">
                    <JalaliDateInput
                      value={form.birthDate}
                      onChange={(value) => set('birthDate', value)}
                    />
                  </div>
                </label>
                <label className="text-sm font-bold">
                  جنسیت
                  <Select
                    value={form.gender}
                    onValueChange={(value) => set('gender', value)}
                    options={[
                      { value: 'FEMALE', label: 'دختر' },
                      { value: 'MALE', label: 'پسر' },
                    ]}
                    className="mt-2"
                  />
                </label>
              </div>
            </Section>
            <Section title="اطلاعات پدر">
              {savedParents.father && (
                <p className="mb-4 text-sm text-muted">
                  اطلاعات ذخیره‌شده پدر از پروفایل خانواده خوانده شده و در ثبت‌نام قابل تغییر نیست.
                </p>
              )}
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {field('fatherFirst', 'نام')}
                {field('fatherLast', 'نام خانوادگی')}
                {field('fatherNationalId', 'کد ملی', 'tel')}
                {field('fatherPhone', 'شماره همراه', 'tel')}
              </div>
            </Section>
            <Section title="اطلاعات مادر">
              {savedParents.mother && (
                <p className="mb-4 text-sm text-muted">
                  اطلاعات ذخیره‌شده مادر از پروفایل خانواده خوانده شده و در ثبت‌نام قابل تغییر نیست.
                </p>
              )}
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {field('motherFirst', 'نام')}
                {field('motherLast', 'نام خانوادگی')}
                {field('motherNationalId', 'کد ملی', 'tel')}
                {field('motherPhone', 'شماره همراه', 'tel')}
              </div>
            </Section>
            <Section title="تماس اضطراری">
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {field('emergencyFirst', 'نام')}
                {field('emergencyLast', 'نام خانوادگی')}
                {field('emergencyRelationship', 'نسبت')}
                {field('emergencyPhone', 'شماره همراه', 'tel')}
              </div>
            </Section>
            {error && <p className="text-sm text-danger">{error}</p>}
            <WizardFooter />
          </form>
        )}
        {step === 2 && (
          <form onSubmit={next} className="space-y-6">
            <Section title="نشانی محل سوار شدن">
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {field('addressTitle', 'عنوان نشانی')}
                {field('province', 'استان')}
                {field('city', 'شهر')}
                {field('district', 'منطقه')}
                <div className="sm:col-span-2">{field('streetAddress', 'نشانی کامل')}</div>
                {field('postalCode', 'کد پستی', 'tel')}
              </div>
            </Section>
            <div>
              <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h3 className="font-black">موقعیت روی نقشه</h3>
                  <p className="mt-1 text-xs text-muted">
                    روی نقشه کلیک کنید یا نشانگر را بکشید تا موقعیت دقیق را مشخص کنید.
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button type="button" size="sm" onClick={useCurrentLocation}>
                    <LocateFixed className="size-4" />
                    دریافت موقعیت من
                  </Button>
                  <a
                    href={googleMapUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-2 rounded-lg border border-border bg-white px-3 py-2 text-xs font-bold"
                  >
                    <ExternalLink className="size-4" />
                    باز کردن نقشه
                  </a>
                </div>
              </div>
              <LocationPicker
                latitude={form.latitude}
                longitude={form.longitude}
                onChange={(lat, lng) =>
                  setForm((prev) => ({ ...prev, latitude: lat, longitude: lng }))
                }
              />
              {locationError && <p className="mt-2 text-sm text-danger">{locationError}</p>}
            </div>
            {error && <p className="text-sm text-danger">{error}</p>}
            <WizardFooter onBack={() => setStep(1)} />
          </form>
        )}
        {step === 3 && (
          <form onSubmit={next} className="space-y-7">
            <Section title="انتخاب مدرسه">
              <div className="grid gap-5 sm:grid-cols-3">
                <label className="text-sm font-bold">
                  نام مدرسه
                  <Select
                    value={form.schoolId}
                    onValueChange={selectSchool}
                    options={schools.map((school) => ({
                      value: school.id,
                      label: `${school.name} — ${school.city}`,
                    }))}
                    className="mt-2"
                  />
                </label>
                <label className="text-sm font-bold">
                  مقطع تحصیلی
                  <Select
                    value={form.educationLevel}
                    onValueChange={selectLevel}
                    options={levelOptions.map(({ level }) => ({ value: level, label: level }))}
                    placeholder="ابتدا مدرسه را انتخاب کنید"
                    className="mt-2"
                  />
                </label>
                <label className="text-sm font-bold">
                  پایه تحصیلی
                  <Select
                    value={form.grade}
                    onValueChange={(value) => set('grade', value)}
                    options={gradeOptions.map((grade) => ({ value: grade, label: grade }))}
                    placeholder="ابتدا مقطع را انتخاب کنید"
                    className="mt-2"
                  />
                </label>
              </div>
            </Section>
            {selectedSchool && (
              <div className="flex items-center gap-4 rounded-2xl bg-primary-soft p-5">
                <span className="flex size-12 items-center justify-center rounded-2xl bg-white text-primary">
                  <ShieldCheck />
                </span>
                <div>
                  <p className="font-black">{selectedSchool.name}</p>
                  <p className="mt-1 text-sm text-muted">
                    {selectedSchool.city} · مدرسه فعال و تأییدشده
                  </p>
                </div>
              </div>
            )}
            {error && <p className="text-sm text-danger">{error}</p>}
            <WizardFooter onBack={() => setStep(2)} />
          </form>
        )}
        {step === 4 && !result && (
          <form onSubmit={prepareContract} className="space-y-7">
            <Section title="نوع وسیله نقلیه">
              <div className="grid gap-4 sm:grid-cols-2">
                {vehicleOptions.map(({ value, label, description, icon: Icon }) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => set('serviceType', value)}
                    className={`rounded-2xl border-2 p-5 text-right transition hover:-translate-y-0.5 hover:shadow-md ${form.serviceType === value ? 'border-primary bg-primary-soft' : 'border-slate-200 bg-white'}`}
                  >
                    <span
                      className={`mb-4 flex size-11 items-center justify-center rounded-xl ${form.serviceType === value ? 'bg-primary text-white' : 'bg-slate-100 text-slate-600'}`}
                    >
                      <Icon className="size-5" />
                    </span>
                    <p className="font-black">{label}</p>
                    <p className="mt-2 text-sm text-muted">{description}</p>
                  </button>
                ))}
              </div>
            </Section>
            <div className="rounded-2xl border border-sun/30 bg-sun/10 p-5">
              <p className="font-black text-foreground">نکته مهم درباره نوع سرویس</p>
              <p className="mt-2 text-sm leading-7 text-muted">
                تمام تلاش ما ارائه سرویس انتخابی شماست؛ با این حال نوع نهایی سرویس ممکن است به دلیل
                ظرفیت خودرو، محدوده مسیر، شرایط ترافیکی، تصمیم مدرسه یا الزامات ایمنی تغییر کند. هر
                تغییر پیش از شروع خدمت اطلاع‌رسانی می‌شود.
              </p>
            </div>
            <Section title="روش پرداخت مبلغ باقی‌مانده">
              <div className="grid gap-4 sm:grid-cols-2">
                {[
                  {
                    value: 'FULL',
                    title: 'پرداخت یکجا',
                    description:
                      'مدیریت مبلغ باقی‌مانده و یک سررسید را پس از بررسی مسیر تعیین می‌کند.',
                  },
                  {
                    value: 'INSTALLMENTS',
                    title: 'پرداخت اقساطی',
                    description:
                      'مدیریت تعداد اقساط، مبلغ هر قسط و تاریخ‌های شمسی را جداگانه تعیین می‌کند.',
                  },
                ].map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => set('paymentPlanType', option.value)}
                    className={`rounded-2xl border-2 p-5 text-right transition hover:-translate-y-0.5 hover:shadow-md ${
                      form.paymentPlanType === option.value
                        ? 'border-primary bg-primary-soft'
                        : 'border-border bg-white'
                    }`}
                  >
                    <p className="font-black">{option.title}</p>
                    <p className="mt-2 text-sm leading-7 text-muted">{option.description}</p>
                  </button>
                ))}
              </div>
              <p className="mt-3 text-sm text-muted">
                پیش‌پرداخت ثابت ۴٬۰۰۰٬۰۰۰ تومان در هر دو روش همین حالا پرداخت می‌شود.
              </p>
            </Section>
            <label className="text-sm font-bold">
              توضیحات برای واحد مسیر
              <Textarea
                className="mt-2"
                value={form.parentNotes}
                onChange={(event) => set('parentNotes', event.target.value)}
              />
            </label>
            {error && <p className="text-sm text-danger">{error}</p>}
            <WizardFooter
              onBack={() => setStep(3)}
              submitLabel="مشاهده قرارداد"
              pending={pending}
            />
          </form>
        )}
        {step === 4 && result && !accepted && (
          <div className="space-y-5">
            <div className="flex items-center gap-3">
              <span className="flex size-11 items-center justify-center rounded-2xl bg-primary-soft text-primary">
                <FileCheck2 />
              </span>
              <div>
                <h3 className="font-black">مطالعه و پذیرش قرارداد</h3>
                <p className="text-sm text-muted">
                  برای فعال شدن پذیرش، متن را تا انتها مرور کنید.
                </p>
              </div>
            </div>
            <div
              onScroll={(event) => {
                const el = event.currentTarget;
                if (el.scrollHeight - el.scrollTop - el.clientHeight < 24) setContractRead(true);
              }}
              className="h-72 overflow-y-auto whitespace-pre-line rounded-2xl border border-slate-200 bg-slate-50 p-6 text-sm leading-8"
            >
              {result.contractText}
              <div className="mt-8 border-t border-slate-200 pt-6 font-bold">پایان قرارداد</div>
            </div>
            <label
              className={`flex items-start gap-3 rounded-2xl border p-4 ${contractRead ? 'cursor-pointer border-primary/30' : 'cursor-not-allowed border-slate-200 opacity-55'}`}
            >
              <input
                type="checkbox"
                checked={contractChecked}
                onChange={(event) => setContractChecked(event.target.checked)}
                disabled={!contractRead}
                className="mt-1 size-4"
              />
              <span className="text-sm leading-6">
                تمام بندهای قرارداد را مطالعه کرده‌ام و آن را می‌پذیرم.
              </span>
            </label>
            <Button
              disabled={!contractRead || !contractChecked}
              loading={pending}
              onClick={async () => {
                setPending(true);
                setError(undefined);
                try {
                  await acceptGuidedContract(result.contractId);
                  setAccepted(true);
                } catch (caught) {
                  setError(getApiErrorFeedback(caught).message);
                } finally {
                  setPending(false);
                }
              }}
            >
              پذیرش قرارداد و ادامه
            </Button>
            {error && <p className="text-sm text-danger">{error}</p>}
          </div>
        )}
        {step === 4 && result && accepted && !paid && (
          <div className="mx-auto max-w-xl text-center">
            <span className="mx-auto flex size-16 items-center justify-center rounded-3xl bg-sun text-navy">
              <WalletCards className="size-7" />
            </span>
            <h3 className="mt-5 text-2xl font-black">پرداخت پیش‌پرداخت ثبت‌نام</h3>
            <p className="mt-3 text-muted">مبلغ ثابت برای تمام دانش‌آموزان</p>
            <p className="mt-4 text-4xl font-black text-primary">
              ۴٬۰۰۰٬۰۰۰ <span className="text-base">تومان</span>
            </p>
            <div className="mt-6 rounded-2xl bg-slate-50 p-4 text-right text-sm leading-7 text-muted">
              {form.paymentPlanType === 'FULL'
                ? 'مبلغ باقی‌مانده و تاریخ پرداخت یکجا پس از بررسی مسیر توسط مدیریت تعیین و اعلام می‌شود.'
                : 'تعداد، مبلغ و تاریخ اقساط پس از بررسی مسیر توسط مدیریت تعیین و اعلام می‌شود.'}
            </div>
            <Button
              className="mt-6 w-full"
              size="lg"
              loading={pending}
              onClick={async () => {
                setPending(true);
                setError(undefined);
                try {
                  await payGuidedPrepayment(result.scheduleItemId);
                  setPaid(true);
                  router.refresh();
                } catch (caught) {
                  setError(getApiErrorFeedback(caught).message);
                } finally {
                  setPending(false);
                }
              }}
            >
              پرداخت امن و تکمیل ثبت‌نام
            </Button>
            {error && <p className="mt-3 text-sm text-danger">{error}</p>}
          </div>
        )}
        {paid && (
          <div className="py-8 text-center">
            <span className="mx-auto flex size-16 items-center justify-center rounded-full bg-success/10 text-success">
              <Check className="size-8" />
            </span>
            <h3 className="mt-5 text-2xl font-black">ثبت‌نام دانش‌آموز تکمیل شد</h3>
            <p className="mt-3 text-muted">
              رسید پرداخت و وضعیت سرویس در همین حساب قابل پیگیری است.
            </p>
            <Button
              className="mt-6"
              onClick={() => {
                setStep(1);
                setResult(undefined);
                setAccepted(false);
                setPaid(false);
                setForm(createInitialForm());
              }}
            >
              ثبت دانش‌آموز دیگر
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h3 className="mb-4 text-lg font-black">{title}</h3>
      {children}
    </section>
  );
}

function WizardFooter({
  onBack,
  submitLabel = 'مرحله بعد',
  pending,
}: {
  onBack?: () => void;
  submitLabel?: string;
  pending?: boolean;
}) {
  return (
    <div className="flex items-center justify-between border-t border-slate-100 pt-6">
      {onBack ? (
        <Button type="button" variant="ghost" onClick={onBack}>
          <ChevronRight className="size-4" />
          مرحله قبل
        </Button>
      ) : (
        <span />
      )}
      <Button type="submit" loading={pending}>
        {submitLabel}
        <ChevronLeft className="size-4" />
      </Button>
    </div>
  );
}

export function CancelEnrollmentButton({ id }: { id: string }) {
  const router = useRouter();
  return (
    <Button
      variant="danger"
      size="sm"
      onClick={async () => {
        await cancelEnrollment(id);
        router.refresh();
      }}
    >
      لغو درخواست
    </Button>
  );
}

export function AcceptPriceButton({
  enrollmentId,
  priceId,
  installmentAllowed,
}: {
  enrollmentId: string;
  priceId: string;
  installmentAllowed: boolean;
}) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  return (
    <Button
      size="sm"
      loading={pending}
      onClick={async () => {
        setPending(true);
        try {
          await acceptEnrollmentPrice(
            enrollmentId,
            priceId,
            installmentAllowed ? 'PREPAYMENT_PLUS_FOUR_INSTALLMENTS' : 'FULL',
          );
          router.refresh();
        } finally {
          setPending(false);
        }
      }}
    >
      پذیرش قیمت
    </Button>
  );
}
