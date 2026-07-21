'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

import { Alert } from '@/components/feedback/alert';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';

import { demoFamilyProfile } from './mock-family-profile';

const persianDigits = '۰۱۲۳۴۵۶۷۸۹';
const arabicDigits = '٠١٢٣٤٥٦٧٨٩';

const normalizeDigits = (value: string) =>
  value
    .replace(/[۰-۹]/g, (digit) => String(persianDigits.indexOf(digit)))
    .replace(/[٠-٩]/g, (digit) => String(arabicDigits.indexOf(digit)));

const mobileSchema = z
  .string()
  .transform(normalizeDigits)
  .refine((value) => /^09\d{9}$/.test(value), 'شماره همراه معتبر وارد کنید.');

const profileSchema = z.object({
  fatherFullName: z.string().trim().min(2, 'نام کامل پدر را وارد کنید.'),
  motherFullName: z.string().trim().min(2, 'نام کامل مادر را وارد کنید.'),
  email: z.union([z.literal(''), z.string().email('ایمیل معتبر وارد کنید.')]),
  homeAddress: z.string().trim().min(5, 'نشانی کامل خانه را وارد کنید.'),
  emergencyContactName: z.string().trim().min(2, 'نام تماس اضطراری را وارد کنید.'),
  emergencyContactRelationship: z.string().trim().min(2, 'نسبت با دانش‌آموز را وارد کنید.'),
  emergencyContactMobile: mobileSchema,
});

type ProfileFormValues = z.input<typeof profileSchema>;

function Field({
  label,
  error,
  children,
}: {
  label: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block text-sm font-bold">
      {label}
      <span className="mt-2 block">{children}</span>
      {error && <span className="mt-1 block text-xs text-danger">{error}</span>}
    </label>
  );
}

export function FamilyProfileForm() {
  const [saved, setSaved] = useState(false);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting, isDirty },
  } = useForm<ProfileFormValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: demoFamilyProfile,
  });

  const saveDemoProfile = handleSubmit(async () => {
    setSaved(false);
    await new Promise((resolve) => setTimeout(resolve, 250));
    setSaved(true);
  });

  return (
    <form className="space-y-6" onSubmit={saveDemoProfile} noValidate>
      <Alert tone="warning" title="ویرایش نمایشی">
        ذخیره این فرم فقط رفتار رابط کاربری را شبیه‌سازی می‌کند و اطلاعاتی به سرور فرستاده نمی‌شود.
      </Alert>

      <section className="rounded-[var(--radius-lg)] border border-border bg-surface p-5">
        <h2 className="text-lg font-black">اطلاعات والدین</h2>
        <div className="mt-5 grid gap-5 md:grid-cols-2">
          <Field label="نام کامل پدر" error={errors.fatherFullName?.message}>
            <Input {...register('fatherFullName')} aria-invalid={Boolean(errors.fatherFullName)} />
          </Field>
          <Field label="نام کامل مادر" error={errors.motherFullName?.message}>
            <Input {...register('motherFullName')} aria-invalid={Boolean(errors.motherFullName)} />
          </Field>
          <Field label="شماره همراه پدر">
            <Input
              value={demoFamilyProfile.fatherMobile}
              dir="ltr"
              disabled
              aria-describedby="phone-help"
            />
          </Field>
          <Field label="شماره همراه مادر">
            <Input
              value={demoFamilyProfile.motherMobile}
              dir="ltr"
              disabled
              aria-describedby="phone-help"
            />
          </Field>
          <div id="phone-help" className="md:col-span-2 text-sm text-muted">
            تغییر شماره اصلی نیازمند فرایند جداگانه تأیید با رمز یک‌بارمصرف است. شماره اصلی فعلی:{' '}
            <span dir="ltr" className="font-bold text-foreground">
              {demoFamilyProfile.primaryPhone}
            </span>
          </div>
          <Field label="ایمیل" error={errors.email?.message}>
            <Input
              {...register('email')}
              type="email"
              dir="ltr"
              aria-invalid={Boolean(errors.email)}
            />
          </Field>
        </div>
      </section>

      <section className="rounded-[var(--radius-lg)] border border-border bg-surface p-5">
        <h2 className="text-lg font-black">نشانی و تماس اضطراری</h2>
        <div className="mt-5 grid gap-5 md:grid-cols-2">
          <div className="md:col-span-2">
            <Field label="نشانی کامل خانه" error={errors.homeAddress?.message}>
              <Textarea {...register('homeAddress')} aria-invalid={Boolean(errors.homeAddress)} />
            </Field>
          </div>
          <Field label="نام کامل تماس اضطراری" error={errors.emergencyContactName?.message}>
            <Input
              {...register('emergencyContactName')}
              aria-invalid={Boolean(errors.emergencyContactName)}
            />
          </Field>
          <Field label="نسبت با دانش‌آموز" error={errors.emergencyContactRelationship?.message}>
            <Input
              {...register('emergencyContactRelationship')}
              aria-invalid={Boolean(errors.emergencyContactRelationship)}
            />
          </Field>
          <Field label="شماره همراه تماس اضطراری" error={errors.emergencyContactMobile?.message}>
            <Input
              {...register('emergencyContactMobile')}
              inputMode="numeric"
              dir="ltr"
              aria-invalid={Boolean(errors.emergencyContactMobile)}
            />
          </Field>
        </div>
      </section>

      {saved && (
        <Alert title="تغییرات نمایشی ذخیره شد">
          این پیام تأیید فقط از آداپتور نمایشی دریافت شده است.
        </Alert>
      )}

      <div className="sticky bottom-3 flex justify-end rounded-[var(--radius-lg)] border border-border bg-surface/95 p-3 shadow-[var(--shadow-md)] backdrop-blur">
        <Button type="submit" disabled={isSubmitting || !isDirty}>
          {isSubmitting ? 'در حال ذخیره نمایشی…' : 'ذخیره تغییرات نمایشی'}
        </Button>
      </div>
    </form>
  );
}
