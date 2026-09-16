'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import {
  Check,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  ImagePlus,
  LocateFixed,
  LogOut,
} from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import { Controller, useForm } from 'react-hook-form';
import { Alert } from '@/components/feedback/alert';
import { Field } from '@/components/forms/field';
import { JalaliDateInput } from '@/components/forms/jalali-date-input';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { getOnboardingState } from '@/features/auth/onboarding-session';
import { normalizeDigits } from '@/features/enrollment/national-id';
import {
  normalizeMobileInput,
  placeCaretAfterPrefix,
} from '@/features/enrollment/input-normalizers';
import { finalizeOnboarding } from '@/features/enrollment/enrollments-api';
import { getApiErrorFeedback } from '@/lib/api-error-feedback';
import { submitDriverEnrollment, uploadDriverDocument } from './driver-enrollment-api';
import {
  driverEnrollmentSchema,
  hasReachedContractEnd,
  plateLetters,
  removeLatinLetters,
  stepFields,
  type DriverEnrollmentForm,
} from './driver-enrollment-schema';
import {
  DRIVER_CONTRACT_CLAUSES,
  DRIVER_CONTRACT_NOTES,
  DRIVER_CONTRACT_TITLE,
} from './driver-contract';

const stages = ['مشخصات فردی', 'سکونت و معرف', 'اطلاعات خودرو', 'قرارداد'];
const LocationPicker = dynamic(
  () =>
    import('@/components/common/location-picker').then((module) => ({
      default: module.LocationPicker,
    })),
  { ssr: false },
);
const selectOptions = {
  gender: [
    { value: 'MALE', label: 'مرد' },
    { value: 'FEMALE', label: 'زن' },
  ],
  education: [
    { value: 'BELOW_DIPLOMA', label: 'زیر دیپلم' },
    { value: 'DIPLOMA', label: 'دیپلم' },
    { value: 'ASSOCIATE', label: 'کاردانی' },
    { value: 'BACHELOR', label: 'کارشناسی' },
    { value: 'MASTER', label: 'کارشناسی ارشد' },
    { value: 'DOCTORATE', label: 'دکتری' },
  ],
  vehicle: [
    { value: 'CAR', label: 'سواری' },
    { value: 'VAN', label: 'ون' },
    { value: 'MINIBUS', label: 'مینی‌بوس' },
    { value: 'BUS', label: 'اتوبوس' },
  ],
};

export function DriverEnrollmentForm() {
  const router = useRouter();
  const identity = getOnboardingState();
  const [step, setStep] = useState(0);
  const [serverError, setServerError] = useState<string>();
  const [complete, setComplete] = useState(false);
  const [locationError, setLocationError] = useState<string>();
  const [uploading, setUploading] = useState<'driverPhotoUploadId' | 'vehiclePhotoUploadId'>();
  const [uploadProgress, setUploadProgress] = useState<
    Partial<Record<'driverPhotoUploadId' | 'vehiclePhotoUploadId', number | null>>
  >({});
  const [previews, setPreviews] = useState<
    Partial<
      Record<'driverPhotoUploadId' | 'vehiclePhotoUploadId', { url: string; fileName: string }>
    >
  >({});
  const previewUrls = useRef<string[]>([]);
  const contractBoxRef = useRef<HTMLDivElement>(null);
  const form = useForm<DriverEnrollmentForm>({
    resolver: zodResolver(driverEnrollmentSchema),
    mode: 'onSubmit',
    defaultValues: {
      firstName: '',
      lastName: '',
      fatherName: '',
      gender: undefined,
      nationalId: identity.nationalId ?? '',
      phoneNumber: identity.phoneNumber ?? '09',
      secondaryPhoneNumber: '09',
      education: undefined,
      homePhoneNumber: '',
      emergencyFirstName: '',
      emergencyLastName: '',
      emergencyRelationship: '',
      emergencyPhoneNumber: '09',
      driverPhotoUploadId: '',
      iban: 'IR',
      cardNumber: '',
      bankName: '',
      streetAddress: '',
      postalCode: '',
      province: 'تهران',
      city: 'تهران',
      municipalityDistrict: '',
      latitude: 35.7219,
      longitude: 51.3347,
      locationSelected: false,
      referrerName: '',
      referrerPhoneNumber: '',
      vehiclePhotoUploadId: '',
      insuranceExpiresAt: '',
      vehicleType: undefined,
      system: '',
      modelYear: 1400,
      technicalInspectionExpiresAt: '',
      plateLeft: '',
      plateLetter: undefined,
      plateMiddle: '',
      plateIran: '',
      usageType: 'PERSONAL',
      ownershipType: 'SELF',
      contractFullyRead: false,
      contractAccepted: false,
    },
  });
  const errors = form.formState.errors;
  useEffect(() => () => previewUrls.current.forEach((url) => URL.revokeObjectURL(url)), []);
  useEffect(() => {
    if (step !== 3) return;
    const frame = window.requestAnimationFrame(() => {
      const box = contractBoxRef.current;
      if (box && hasReachedContractEnd(box.scrollHeight, box.clientHeight, box.scrollTop)) {
        form.setValue('contractFullyRead', true, { shouldValidate: true });
      }
    });
    return () => window.cancelAnimationFrame(frame);
  }, [step, form]);
  const e = (name: keyof DriverEnrollmentForm) => errors[name]?.message as string | undefined;
  const persianOnlyFields = new Set<keyof DriverEnrollmentForm>([
    'firstName',
    'lastName',
    'fatherName',
    'streetAddress',
    'referrerName',
    'system',
    'province',
    'city',
    'emergencyFirstName',
    'emergencyLastName',
    'emergencyRelationship',
  ]);
  const reg = (name: keyof DriverEnrollmentForm, max?: number) =>
    form.register(name, {
      onChange: (event) => {
        if (max) {
          form.setValue(
            name,
            normalizeDigits(event.target.value).replace(/\D/g, '').slice(0, max) as never,
          );
        } else if (persianOnlyFields.has(name)) {
          form.setValue(
            name,
            event.target.value.replace(/[^\u0600-\u06FF\u200c\s-]/g, '') as never,
            { shouldDirty: true },
          );
        }
      },
    });
  const persianReg = (name: keyof DriverEnrollmentForm) => {
    const registered = form.register(name);
    return {
      ...registered,
      onChange: (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        form.setValue(name, removeLatinLetters(event.target.value) as never, { shouldDirty: true });
      },
    };
  };
  const mobileReg = (name: 'secondaryPhoneNumber' | 'emergencyPhoneNumber') => {
    const registered = form.register(name);
    return {
      ...registered,
      onFocus: (event: React.FocusEvent<HTMLInputElement>) =>
        placeCaretAfterPrefix(event.currentTarget, 2),
      onChange: (event: React.ChangeEvent<HTMLInputElement>) => {
        const value = normalizeMobileInput(event.target.value);
        form.setValue(name, value, { shouldDirty: true });
        if (value.length === 11 && value === form.getValues('phoneNumber')) {
          form.setError(name, {
            type: 'duplicate',
            message:
              name === 'secondaryPhoneNumber'
                ? 'شماره همراه دوم نباید با شماره همراه اول یکسان باشد.'
                : 'شماره تماس اضطراری نباید با شماره همراه اول یکسان باشد.',
          });
        } else if (form.getFieldState(name).error?.type === 'duplicate') {
          form.clearErrors(name);
        }
      },
    };
  };
  async function next() {
    setServerError(undefined);
    if (await form.trigger(stepFields[step], { shouldFocus: true }))
      setStep((value) => Math.min(3, value + 1));
  }
  function useCurrentLocation() {
    setLocationError(undefined);
    if (!navigator.geolocation) {
      setLocationError('مرورگر امکان دریافت موقعیت مکانی را ندارد.');
      return;
    }
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        form.setValue('latitude', coords.latitude, { shouldValidate: true });
        form.setValue('longitude', coords.longitude, { shouldValidate: true });
        form.setValue('locationSelected', true, { shouldValidate: true });
      },
      () => setLocationError('موقعیت دریافت نشد. مکان‌یاب دستگاه و دسترسی مرورگر را بررسی کنید.'),
    );
  }
  async function upload(
    name: 'driverPhotoUploadId' | 'vehiclePhotoUploadId',
    type: 'DRIVER_PHOTO' | 'VEHICLE_PHOTO',
    file?: File,
  ) {
    if (!file) return;
    if (!['image/jpeg', 'image/png'].includes(file.type) || file.size > 5 * 1024 * 1024) {
      form.setError(name, { message: 'عکس باید JPG یا PNG و حداکثر ۵ مگابایت باشد.' });
      return;
    }
    try {
      setUploading(name);
      setUploadProgress((current) => ({ ...current, [name]: 0 }));
      const uploadId = await uploadDriverDocument(file, type, (percent) => {
        setUploadProgress((current) => ({ ...current, [name]: percent }));
      });
      const url = URL.createObjectURL(file);
      previewUrls.current.push(url);
      setPreviews((current) => {
        const previous = current[name];
        if (previous) URL.revokeObjectURL(previous.url);
        return { ...current, [name]: { url, fileName: file.name } };
      });
      form.clearErrors(name);
      form.setValue(name, uploadId, { shouldValidate: true });
    } catch (error) {
      form.setError(name, {
        message:
          error instanceof TypeError
            ? 'اتصال به فضای ذخیره‌سازی برقرار نشد. صفحه را تازه‌سازی و دوباره تلاش کنید.'
            : error instanceof Error
              ? error.message
              : 'بارگذاری عکس ناموفق بود.',
      });
    } finally {
      setUploading(undefined);
    }
  }
  const submit = form.handleSubmit(
    async (values) => {
      try {
        setServerError(undefined);
        await submitDriverEnrollment(values as DriverEnrollmentForm);
        await finalizeOnboarding('DRIVER');
        setComplete(true);
        router.replace('/driver/dashboard');
      } catch (error) {
        const feedback = getApiErrorFeedback(error);
        if (feedback.fieldErrors) {
          for (const [field, messages] of Object.entries(feedback.fieldErrors)) {
            if (field in form.getValues()) {
              form.setError(field as keyof DriverEnrollmentForm, {
                type: 'server',
                message: messages[0],
              });
            }
          }
          const invalidStep = stepFields.findIndex((fields) =>
            fields.some((field) => Boolean(feedback.fieldErrors?.[field])),
          );
          if (invalidStep >= 0) setStep(invalidStep);
        }
        setServerError(feedback.message);
      }
    },
    (invalidFields) => {
      const invalidStep = stepFields.findIndex((fields) =>
        fields.some((field) => Boolean(invalidFields[field])),
      );
      if (invalidStep >= 0) setStep(invalidStep);
      setServerError('ثبت نهایی انجام نشد. فیلدهای مشخص‌شده را بررسی و تکمیل کنید.');
    },
  );
  if (complete)
    return (
      <Alert tone="info" title="ثبت‌نام راننده تکمیل شد">
        اطلاعات، تصاویر و پذیرش قرارداد با موفقیت ثبت شدند.
      </Alert>
    );
  const date = (name: 'insuranceExpiresAt' | 'technicalInspectionExpiresAt', label: string) => (
    <Field label={label} htmlFor={name} error={e(name)}>
      <Controller
        control={form.control}
        name={name}
        render={({ field }) => (
          <JalaliDateInput
            id={name}
            value={field.value}
            onChange={field.onChange}
            minDate={new Date().toISOString().slice(0, 10)}
            label={label}
          />
        )}
      />
    </Field>
  );
  const uploadField = (
    name: 'driverPhotoUploadId' | 'vehiclePhotoUploadId',
    type: 'DRIVER_PHOTO' | 'VEHICLE_PHOTO',
    label: string,
    hint: string,
  ) => {
    const preview = previews[name];
    const progress = uploadProgress[name];
    return (
      <Field label={label} htmlFor={name} hint={hint} error={e(name)}>
        <label className="group flex min-h-36 cursor-pointer flex-col items-center justify-center overflow-hidden rounded-2xl border-2 border-dashed border-border bg-surface-inset p-3 text-sm font-bold text-primary transition hover:border-primary/60">
          <input
            id={name}
            className="sr-only"
            type="file"
            accept="image/jpeg,image/png"
            disabled={Boolean(uploading)}
            onChange={(event) => {
              void upload(name, type, event.target.files?.[0]);
              event.currentTarget.value = '';
            }}
          />
          {preview ? (
            <>
              <img
                src={preview.url}
                alt={`پیش‌نمایش ${label}`}
                className="max-h-56 w-full rounded-xl bg-white object-contain"
              />
              <span className="mt-3 inline-flex items-center gap-2">
                <ImagePlus className="size-5" />
                {uploading === name ? 'در حال بارگذاری…' : 'تعویض عکس'}
              </span>
              <span className="mt-1 max-w-full truncate text-xs font-normal text-muted" dir="ltr">
                {preview.fileName}
              </span>
            </>
          ) : (
            <>
              <ImagePlus className="mb-2 size-7" />
              <span>{uploading === name ? 'در حال بارگذاری…' : 'انتخاب و بارگذاری عکس'}</span>
            </>
          )}
        </label>
        {uploading === name && (
          <div
            className="mt-3"
            role="progressbar"
            aria-label={`پیشرفت بارگذاری ${label}`}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={progress ?? 0}
          >
            <div className="h-2 overflow-hidden rounded-full bg-surface-muted">
              <div
                className={`h-full bg-primary transition-[width] ${progress == null ? 'w-1/3 animate-pulse' : ''}`}
                style={progress == null ? undefined : { width: `${progress}%` }}
              />
            </div>
            <p className="mt-1 text-xs font-bold text-primary">
              {progress == null
                ? 'در حال برقراری ارتباط با ذخیره‌گاه…'
                : `بارگذاری: ${progress.toLocaleString('fa-IR')}٪`}
            </p>
          </div>
        )}
        {preview && uploading !== name && (
          <p className="mt-2 text-xs font-bold text-success">
            عکس با موفقیت بارگذاری شد و آماده ثبت نهایی است.
          </p>
        )}
      </Field>
    );
  };
  return (
    <form onSubmit={submit} noValidate className="space-y-6">
      <ol className="grid grid-cols-4 gap-2" aria-label="مراحل ثبت‌نام">
        {stages.map((label, index) => (
          <li
            key={label}
            className={`rounded-xl px-2 py-3 text-center text-xs font-bold ${index === step ? 'bg-primary text-white' : index < step ? 'bg-success-soft text-success' : 'bg-surface-muted text-muted'}`}
          >
            {index < step && <Check className="mx-auto mb-1 size-4" />}
            {label}
          </li>
        ))}
      </ol>
      {serverError && (
        <Alert tone="danger" title="ثبت اطلاعات انجام نشد">
          {serverError}
        </Alert>
      )}
      <section className="rounded-[var(--radius-card)] border border-border bg-surface-paper p-4 sm:p-6">
        <h2 className="mb-5 text-lg font-black">{stages[step]}</h2>
        {step === 0 && (
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="نام" htmlFor="firstName" error={e('firstName')}>
              <Input id="firstName" {...persianReg('firstName')} />
            </Field>
            <Field label="نام خانوادگی" htmlFor="lastName" error={e('lastName')}>
              <Input id="lastName" {...persianReg('lastName')} />
            </Field>
            <Field label="نام پدر" htmlFor="fatherName" error={e('fatherName')}>
              <Input id="fatherName" {...persianReg('fatherName')} />
            </Field>
            <Field label="جنسیت" htmlFor="gender" error={e('gender')}>
              <Controller
                control={form.control}
                name="gender"
                render={({ field }) => (
                  <Select
                    value={field.value}
                    onValueChange={field.onChange}
                    options={selectOptions.gender}
                  />
                )}
              />
            </Field>
            <Field
              label="کد ملی"
              htmlFor="nationalId"
              hint="این مقدار هنگام ورود احراز شده و قابل تغییر نیست."
              error={e('nationalId')}
            >
              <Input id="nationalId" dir="ltr" disabled value={form.watch('nationalId')} />
            </Field>
            <Field
              label="شماره همراه اول"
              htmlFor="phoneNumber"
              hint="این مقدار هنگام ورود احراز شده و قابل تغییر نیست."
              error={e('phoneNumber')}
            >
              <Input id="phoneNumber" dir="ltr" disabled value={form.watch('phoneNumber')} />
            </Field>
            <Field
              label="شماره همراه دوم"
              htmlFor="secondaryPhoneNumber"
              error={e('secondaryPhoneNumber')}
            >
              <Input
                id="secondaryPhoneNumber"
                dir="ltr"
                inputMode="numeric"
                maxLength={11}
                {...mobileReg('secondaryPhoneNumber')}
              />
            </Field>
            <Field label="تحصیلات" htmlFor="education" error={e('education')}>
              <Controller
                control={form.control}
                name="education"
                render={({ field }) => (
                  <Select
                    value={field.value}
                    onValueChange={field.onChange}
                    options={selectOptions.education}
                  />
                )}
              />
            </Field>
            <Field
              label="تلفن ثابت (بهمراه پیش شماره)"
              htmlFor="homePhoneNumber"
              hint="شماره را همراه پیش‌شماره و در ۱۱ رقم وارد کنید."
              error={e('homePhoneNumber')}
            >
              <Input
                id="homePhoneNumber"
                dir="ltr"
                inputMode="numeric"
                maxLength={11}
                {...reg('homePhoneNumber', 11)}
              />
            </Field>
            <Field
              label="شماره تماس اضطراری"
              htmlFor="emergencyPhoneNumber"
              error={e('emergencyPhoneNumber')}
            >
              <Input
                id="emergencyPhoneNumber"
                dir="ltr"
                inputMode="numeric"
                maxLength={11}
                {...mobileReg('emergencyPhoneNumber')}
              />
            </Field>
            <Field
              label="نام تماس اضطراری"
              htmlFor="emergencyFirstName"
              error={e('emergencyFirstName')}
            >
              <Input id="emergencyFirstName" {...persianReg('emergencyFirstName')} />
            </Field>
            <Field
              label="نام خانوادگی تماس اضطراری"
              htmlFor="emergencyLastName"
              error={e('emergencyLastName')}
            >
              <Input id="emergencyLastName" {...persianReg('emergencyLastName')} />
            </Field>
            <Field
              label="نسبت تماس اضطراری"
              htmlFor="emergencyRelationship"
              error={e('emergencyRelationship')}
            >
              <Input id="emergencyRelationship" {...persianReg('emergencyRelationship')} />
            </Field>
            {uploadField(
              'driverPhotoUploadId',
              'DRIVER_PHOTO',
              'عکس راننده',
              'عکس واضح، رنگی و روبه‌رو؛ جی‌پی‌جی یا پی‌ان‌جی، حداکثر ۵ مگابایت',
            )}
            <Field label="شماره شبا" htmlFor="iban" error={e('iban')}>
              <div
                dir="ltr"
                className="flex min-h-12 items-center overflow-hidden rounded-xl border border-border bg-white"
              >
                <span className="px-3 font-bold">IR</span>
                <Input
                  id="iban"
                  inputMode="numeric"
                  aria-label="۲۴ رقم شماره شبا"
                  className="border-0"
                  value={form.watch('iban').slice(2)}
                  onChange={(event) =>
                    form.setValue(
                      'iban',
                      `IR${normalizeDigits(event.target.value).replace(/\D/g, '').slice(0, 24)}`,
                      { shouldDirty: true, shouldValidate: true },
                    )
                  }
                  maxLength={24}
                />
              </div>
            </Field>
            <Field label="شماره کارت" htmlFor="cardNumber" error={e('cardNumber')}>
              <Input
                id="cardNumber"
                dir="ltr"
                inputMode="numeric"
                maxLength={16}
                {...reg('cardNumber', 16)}
              />
            </Field>
            <Field
              label="بانک"
              htmlFor="bankName"
              hint="شماره کارت و شبا باید به اسم خود راننده باشد. ترجیحاً بانک شهر."
              error={e('bankName')}
            >
              <Input id="bankName" {...persianReg('bankName')} />
            </Field>
          </div>
        )}
        {step === 1 && (
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <Field label="آدرس محل سکونت" htmlFor="streetAddress" error={e('streetAddress')}>
                <Textarea id="streetAddress" {...reg('streetAddress')} />
              </Field>
            </div>
            <Field label="کد پستی" htmlFor="postalCode" error={e('postalCode')}>
              <Input id="postalCode" dir="ltr" {...reg('postalCode', 10)} />
            </Field>
            <Field label="استان" htmlFor="province" error={e('province')}>
              <Input id="province" {...persianReg('province')} />
            </Field>
            <Field label="شهر" htmlFor="city" error={e('city')}>
              <Input id="city" {...persianReg('city')} />
            </Field>
            <Field
              label="منطقه شهرداری"
              htmlFor="municipalityDistrict"
              error={e('municipalityDistrict')}
            >
              <Controller
                control={form.control}
                name="municipalityDistrict"
                render={({ field }) => (
                  <Select
                    value={field.value}
                    onValueChange={field.onChange}
                    options={[
                      { value: 'سایر', label: 'سایر' },
                      ...Array.from({ length: 22 }, (_, i) => ({
                        value: String(i + 1),
                        label: `منطقه ${i + 1}`,
                      })),
                    ]}
                  />
                )}
              />
            </Field>
            <Field label="معرف" htmlFor="referrerName" error={e('referrerName')}>
              <Input id="referrerName" {...reg('referrerName')} />
            </Field>
            <Field label="تلفن معرف" htmlFor="referrerPhoneNumber" error={e('referrerPhoneNumber')}>
              <Input id="referrerPhoneNumber" dir="ltr" {...reg('referrerPhoneNumber', 11)} />
            </Field>
            <div className="space-y-3 sm:col-span-2">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h3 className="font-black">موقعیت روی نقشه</h3>
                  <p className="mt-1 text-xs text-muted">
                    روی نقشه کلیک کنید یا نشانگر را جابه‌جا کنید.
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button type="button" size="sm" onClick={useCurrentLocation}>
                    <LocateFixed className="size-4" />
                    دریافت موقعیت من
                  </Button>
                  <a
                    href={`https://www.google.com/maps?q=${form.watch('latitude')},${form.watch('longitude')}&z=16`}
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
                showCoordinates={false}
                latitude={form.watch('latitude')}
                longitude={form.watch('longitude')}
                onChange={(latitude, longitude) => {
                  form.setValue('latitude', latitude, { shouldValidate: true });
                  form.setValue('longitude', longitude, { shouldValidate: true });
                  form.setValue('locationSelected', true, { shouldValidate: true });
                }}
              />
              {e('locationSelected') && (
                <p className="text-xs text-danger">{e('locationSelected')}</p>
              )}
              {locationError && <p className="text-sm text-danger">{locationError}</p>}
            </div>
          </div>
        )}
        {step === 2 && (
          <div className="grid gap-4 sm:grid-cols-2">
            {uploadField(
              'vehiclePhotoUploadId',
              'VEHICLE_PHOTO',
              'عکس خودرو',
              'از روبه‌رو، کاملاً واضح و با پلاک خوانا',
            )}
            {date('insuranceExpiresAt', 'تاریخ انقضای بیمه‌نامه')}
            <Field label="نوع خودرو" htmlFor="vehicleType" error={e('vehicleType')}>
              <Controller
                control={form.control}
                name="vehicleType"
                render={({ field }) => (
                  <Select
                    value={field.value}
                    onValueChange={field.onChange}
                    options={selectOptions.vehicle}
                  />
                )}
              />
            </Field>
            <Field label="سیستم" htmlFor="system" error={e('system')}>
              <Input id="system" {...reg('system')} />
            </Field>
            <Field label="سال ساخت (مدل)" htmlFor="modelYear" error={e('modelYear')}>
              <Input id="modelYear" inputMode="numeric" maxLength={4} {...reg('modelYear', 4)} />
            </Field>
            {date('technicalInspectionExpiresAt', 'تاریخ انقضای معاینه فنی')}
            <div className="sm:col-span-2">
              <Field
                label="شماره انتظامی (پلاک)"
                htmlFor="plateLeft"
                error={e('plateLeft') || e('plateLetter') || e('plateMiddle') || e('plateIran')}
              >
                <div className="grid grid-cols-[1fr_1fr_1.5fr_1fr] gap-2" dir="ltr">
                  <Input id="plateLeft" placeholder="12" {...reg('plateLeft', 2)} />
                  <Controller
                    control={form.control}
                    name="plateLetter"
                    render={({ field }) => (
                      <Select
                        value={field.value}
                        onValueChange={field.onChange}
                        options={plateLetters.map((value) => ({ value, label: value }))}
                      />
                    )}
                  />
                  <Input placeholder="345" {...reg('plateMiddle', 3)} />
                  <Input placeholder="67" {...reg('plateIran', 2)} />
                </div>
              </Field>
            </div>
            <fieldset>
              <legend className="mb-2 text-sm font-bold">وضعیت خودرو</legend>
              <label className="ml-5">
                <input type="radio" value="PERSONAL" {...form.register('usageType')} /> شخصی
              </label>
              <label>
                <input type="radio" value="TAXI" {...form.register('usageType')} /> تاکسی
              </label>
            </fieldset>
            <fieldset>
              <legend className="mb-2 text-sm font-bold">مالکیت خودرو</legend>
              <label className="ml-5">
                <input type="radio" value="SELF" {...form.register('ownershipType')} /> خودم
              </label>
              <label>
                <input type="radio" value="OTHER" {...form.register('ownershipType')} /> دیگری
              </label>
            </fieldset>
          </div>
        )}
        {step === 3 && (
          <div className="space-y-4">
            <div
              ref={contractBoxRef}
              tabIndex={0}
              aria-label="متن قرارداد راننده"
              className="h-72 overflow-y-auto rounded-xl border border-border bg-surface-inset p-5 text-sm leading-8"
              onScroll={(event) => {
                const el = event.currentTarget;
                if (el.scrollTop + el.clientHeight >= el.scrollHeight - 8)
                  form.setValue('contractFullyRead', true, { shouldValidate: true });
              }}
            >
              <h3 className="mb-4 font-black">{DRIVER_CONTRACT_TITLE}</h3>
              <ol className="list-decimal space-y-3 pr-5">
                {DRIVER_CONTRACT_CLAUSES.map((clause, index) => (
                  <li key={clause}>
                    {clause}
                    {index === 21 && <p className="mt-2">{DRIVER_CONTRACT_NOTES[0]}</p>}
                    {index === 22 && <p className="mt-2">{DRIVER_CONTRACT_NOTES[1]}</p>}
                    {index === 24 && <p className="mt-2">{DRIVER_CONTRACT_NOTES[2]}</p>}
                  </li>
                ))}
              </ol>
            </div>
            <p
              className={`text-xs font-bold ${form.watch('contractFullyRead') ? 'text-success' : 'text-muted'}`}
            >
              {form.watch('contractFullyRead')
                ? 'متن قرارداد به‌طور کامل نمایش داده و مطالعه شد.'
                : 'برای فعال شدن پذیرش، متن قرارداد را تا انتها پیمایش کنید.'}
            </p>
            {e('contractFullyRead') && (
              <p className="text-xs text-danger">{e('contractFullyRead')}</p>
            )}
            <Checkbox
              label="قرارداد را به‌طور کامل مطالعه کردم و می‌پذیرم."
              disabled={!form.watch('contractFullyRead')}
              checked={form.watch('contractAccepted')}
              onChange={(event) =>
                form.setValue('contractAccepted', event.target.checked, {
                  shouldValidate: true,
                  shouldDirty: true,
                })
              }
            />
            {e('contractAccepted') && (
              <p className="text-xs text-danger">{e('contractAccepted')}</p>
            )}
          </div>
        )}
      </section>
      <div className="flex flex-wrap justify-between gap-3">
        <div className="flex gap-2">
          <Button type="button" variant="danger" onClick={() => router.push('/')}>
            <LogOut className="size-4" />
            خروج از فرم
          </Button>
          <Button
            type="button"
            variant="secondary"
            disabled={step === 0}
            onClick={() => setStep((value) => Math.max(0, value - 1))}
          >
            <ChevronRight className="size-4" />
            مرحله قبل
          </Button>
        </div>
        {step < 3 ? (
          <Button type="button" onClick={next}>
            مرحله بعد
            <ChevronLeft className="size-4" />
          </Button>
        ) : (
          <Button type="submit" disabled={form.formState.isSubmitting}>
            {form.formState.isSubmitting ? 'در حال ثبت…' : 'ایجاد حساب و ورود به پنل راننده'}
          </Button>
        )}
      </div>
    </form>
  );
}
