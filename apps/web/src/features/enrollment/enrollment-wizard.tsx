'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

import { Alert } from '@/components/feedback/alert';
import { Field } from '@/components/forms/field';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { isValidIranianNationalId, normalizeDigits } from './national-id';

const steps = [
  'اطلاعات دانش‌آموز',
  'اطلاعات مدرسه',
  'اطلاعات سرویس',
  'اضطراری و ایمنی',
  'ترجیح پرداخت',
  'بازبینی و تأیید',
] as const;

const studentSchema = z.object({
  firstName: z.string().trim().min(2, 'نام دانش‌آموز را وارد کنید.'),
  lastName: z.string().trim().min(2, 'نام خانوادگی دانش‌آموز را وارد کنید.'),
  nationalId: z
    .string()
    .transform(normalizeDigits)
    .refine(isValidIranianNationalId, 'کد ملی معتبر وارد کنید.'),
  birthDate: z.string().min(1, 'تاریخ تولد را وارد کنید.'),
  gender: z.enum(['دختر', 'پسر'], { message: 'جنسیت را انتخاب کنید.' }),
  grade: z.string().min(1, 'پایه تحصیلی را انتخاب کنید.'),
  notes: z.string().trim().max(500, 'یادداشت باید حداکثر ۵۰۰ نویسه باشد.'),
});

type StudentValues = z.input<typeof studentSchema>;

export function EnrollmentWizard() {
  const [currentStep, setCurrentStep] = useState(0);
  const [studentComplete, setStudentComplete] = useState(false);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<StudentValues>({
    resolver: zodResolver(studentSchema),
    defaultValues: {
      firstName: '',
      lastName: '',
      nationalId: '',
      birthDate: '',
      gender: undefined,
      grade: '',
      notes: '',
    },
  });

  const continueFromStudent = handleSubmit(async () => {
    setStudentComplete(true);
    setCurrentStep(1);
  });

  return (
    <div className="space-y-5">
      <Alert tone="warning" title="پیش‌نویس نمایشی">
        مقادیر فقط در حافظه همین صفحه نگه داشته می‌شوند. هیچ اطلاعاتی به سرور یا فضای ذخیره‌سازی
        مرورگر ارسال نمی‌شود.
      </Alert>

      <Card>
        <div className="flex items-center justify-between gap-3 text-sm">
          <p className="font-bold">مرحله {currentStep + 1} از ۶</p>
          <p className="text-muted">{steps[currentStep]}</p>
        </div>
        <div className="mt-3 h-2 overflow-hidden rounded-full bg-surface-muted" aria-hidden="true">
          <div
            className="h-full rounded-full bg-primary transition-[width]"
            style={{ width: `${((currentStep + 1) / steps.length) * 100}%` }}
          />
        </div>
        <ol
          className="mt-5 grid gap-2 text-xs sm:grid-cols-3 lg:grid-cols-6"
          aria-label="مراحل ثبت‌نام"
        >
          {steps.map((step, index) => (
            <li
              key={step}
              aria-current={index === currentStep ? 'step' : undefined}
              className={`rounded-lg border p-2 ${index === currentStep ? 'border-primary bg-primary-soft font-bold text-primary' : 'border-border text-muted'}`}
            >
              {index + 1}. {step}
            </li>
          ))}
        </ol>
      </Card>

      {currentStep === 0 ? (
        <form className="space-y-5" onSubmit={continueFromStudent} noValidate>
          <Card>
            <h2 className="text-lg font-black">اطلاعات دانش‌آموز</h2>
            <p className="mt-1 text-sm text-muted">
              همه فیلدهای ستاره‌دار طبق سند ثبت‌نام الزامی‌اند.
            </p>
            <div className="mt-5 grid gap-5 md:grid-cols-2">
              <Field
                label="نام"
                htmlFor="student-first-name"
                required
                error={errors.firstName?.message}
              >
                <Input
                  id="student-first-name"
                  {...register('firstName')}
                  aria-invalid={Boolean(errors.firstName)}
                />
              </Field>
              <Field
                label="نام خانوادگی"
                htmlFor="student-last-name"
                required
                error={errors.lastName?.message}
              >
                <Input
                  id="student-last-name"
                  {...register('lastName')}
                  aria-invalid={Boolean(errors.lastName)}
                />
              </Field>
              <Field
                label="کد ملی"
                htmlFor="student-national-id"
                required
                error={errors.nationalId?.message}
                hint="ارقام فارسی و انگلیسی پذیرفته می‌شوند."
              >
                <Input
                  id="student-national-id"
                  inputMode="numeric"
                  dir="ltr"
                  {...register('nationalId')}
                  aria-invalid={Boolean(errors.nationalId)}
                />
              </Field>
              <Field
                label="تاریخ تولد"
                htmlFor="student-birth-date"
                required
                error={errors.birthDate?.message}
              >
                <Input
                  id="student-birth-date"
                  type="date"
                  dir="ltr"
                  {...register('birthDate')}
                  aria-invalid={Boolean(errors.birthDate)}
                />
              </Field>
              <Field label="جنسیت" htmlFor="student-gender" required error={errors.gender?.message}>
                <select
                  id="student-gender"
                  className="min-h-12 rounded-[var(--radius-sm)] border border-border bg-surface px-3 text-sm"
                  {...register('gender')}
                  aria-invalid={Boolean(errors.gender)}
                >
                  <option value="">انتخاب کنید</option>
                  <option value="دختر">دختر</option>
                  <option value="پسر">پسر</option>
                </select>
              </Field>
              <Field
                label="پایه تحصیلی"
                htmlFor="student-grade"
                required
                error={errors.grade?.message}
                hint="گزینه‌ها تا اتصال مدرسه نمایشی‌اند."
              >
                <select
                  id="student-grade"
                  className="min-h-12 rounded-[var(--radius-sm)] border border-border bg-surface px-3 text-sm"
                  {...register('grade')}
                  aria-invalid={Boolean(errors.grade)}
                >
                  <option value="">انتخاب کنید</option>
                  {['هفتم', 'هشتم', 'نهم', 'دهم', 'یازدهم', 'دوازدهم'].map((grade) => (
                    <option key={grade}>{grade}</option>
                  ))}
                </select>
              </Field>
              <div className="md:col-span-2">
                <Field
                  label="یادداشت تکمیلی (اختیاری)"
                  htmlFor="student-notes"
                  error={errors.notes?.message}
                >
                  <Textarea
                    id="student-notes"
                    {...register('notes')}
                    aria-invalid={Boolean(errors.notes)}
                  />
                </Field>
              </div>
            </div>
          </Card>
          <div className="flex justify-end">
            <Button type="submit" disabled={isSubmitting}>
              ادامه به اطلاعات مدرسه
            </Button>
          </div>
        </form>
      ) : (
        <Card>
          <h2 className="text-lg font-black">اطلاعات مدرسه</h2>
          <p className="mt-2 text-sm text-muted">
            مرحله دانش‌آموز در پیش‌نویس حافظه‌ای تکمیل شد. فهرست وابسته مدرسه، مقطع و پایه در برش
            بعدی افزوده می‌شود.
          </p>
          {studentComplete && (
            <p className="mt-3 text-sm font-bold text-success">اطلاعات مرحله اول حفظ شده است.</p>
          )}
          <Button
            className="mt-5"
            variant="secondary"
            type="button"
            onClick={() => setCurrentStep(0)}
          >
            بازگشت و ویرایش
          </Button>
        </Card>
      )}
    </div>
  );
}
