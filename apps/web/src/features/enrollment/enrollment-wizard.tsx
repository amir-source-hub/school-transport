'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { z } from 'zod';

import { Alert } from '@/components/feedback/alert';
import { Field } from '@/components/forms/field';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { demoAcademicYear, demoEnrollmentSchools } from './mock-schools';
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
  notes: z.string().trim().max(500, 'یادداشت باید حداکثر ۵۰۰ نویسه باشد.'),
});

const schoolSchema = z.object({
  schoolId: z.string().min(1, 'مدرسه را انتخاب کنید.'),
  educationalLevel: z.string().min(1, 'مقطع تحصیلی را انتخاب کنید.'),
  grade: z.string().min(1, 'پایه تحصیلی را انتخاب کنید.'),
  className: z.string().trim().max(50, 'نام یا شماره کلاس باید حداکثر ۵۰ نویسه باشد.'),
});

type StudentValues = z.input<typeof studentSchema>;
type SchoolValues = z.input<typeof schoolSchema>;

export function EnrollmentWizard() {
  const [currentStep, setCurrentStep] = useState(0);
  const [studentComplete, setStudentComplete] = useState(false);
  const [schoolComplete, setSchoolComplete] = useState(false);
  const {
    register: registerStudent,
    handleSubmit: handleStudentSubmit,
    formState: { errors: studentErrors, isSubmitting: isStudentSubmitting },
  } = useForm<StudentValues>({
    resolver: zodResolver(studentSchema),
    defaultValues: {
      firstName: '',
      lastName: '',
      nationalId: '',
      birthDate: '',
      gender: undefined,
      notes: '',
    },
  });
  const {
    register: registerSchool,
    handleSubmit: handleSchoolSubmit,
    control: schoolControl,
    setValue: setSchoolValue,
    formState: { errors: schoolErrors, isSubmitting: isSchoolSubmitting },
  } = useForm<SchoolValues>({
    resolver: zodResolver(schoolSchema),
    defaultValues: { schoolId: '', educationalLevel: '', grade: '', className: '' },
  });

  const schoolId = useWatch({ control: schoolControl, name: 'schoolId' });
  const educationalLevel = useWatch({ control: schoolControl, name: 'educationalLevel' });
  const selectedSchool = demoEnrollmentSchools.find(({ id }) => id === schoolId);
  const selectedLevel = selectedSchool?.levels.find(({ name }) => name === educationalLevel);

  const continueFromStudent = handleStudentSubmit(async () => {
    setStudentComplete(true);
    setCurrentStep(1);
  });
  const continueFromSchool = handleSchoolSubmit(async () => {
    setSchoolComplete(true);
    setCurrentStep(2);
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
                error={studentErrors.firstName?.message}
              >
                <Input
                  id="student-first-name"
                  {...registerStudent('firstName')}
                  aria-invalid={Boolean(studentErrors.firstName)}
                />
              </Field>
              <Field
                label="نام خانوادگی"
                htmlFor="student-last-name"
                required
                error={studentErrors.lastName?.message}
              >
                <Input
                  id="student-last-name"
                  {...registerStudent('lastName')}
                  aria-invalid={Boolean(studentErrors.lastName)}
                />
              </Field>
              <Field
                label="کد ملی"
                htmlFor="student-national-id"
                required
                error={studentErrors.nationalId?.message}
                hint="ارقام فارسی و انگلیسی پذیرفته می‌شوند."
              >
                <Input
                  id="student-national-id"
                  inputMode="numeric"
                  dir="ltr"
                  {...registerStudent('nationalId')}
                  aria-invalid={Boolean(studentErrors.nationalId)}
                />
              </Field>
              <Field
                label="تاریخ تولد"
                htmlFor="student-birth-date"
                required
                error={studentErrors.birthDate?.message}
              >
                <Input
                  id="student-birth-date"
                  type="date"
                  dir="ltr"
                  {...registerStudent('birthDate')}
                  aria-invalid={Boolean(studentErrors.birthDate)}
                />
              </Field>
              <Field
                label="جنسیت"
                htmlFor="student-gender"
                required
                error={studentErrors.gender?.message}
              >
                <select
                  id="student-gender"
                  className="min-h-12 rounded-[var(--radius-sm)] border border-border bg-surface px-3 text-sm"
                  {...registerStudent('gender')}
                  aria-invalid={Boolean(studentErrors.gender)}
                >
                  <option value="">انتخاب کنید</option>
                  <option value="دختر">دختر</option>
                  <option value="پسر">پسر</option>
                </select>
              </Field>
              <div className="md:col-span-2">
                <Field
                  label="یادداشت تکمیلی (اختیاری)"
                  htmlFor="student-notes"
                  error={studentErrors.notes?.message}
                >
                  <Textarea
                    id="student-notes"
                    {...registerStudent('notes')}
                    aria-invalid={Boolean(studentErrors.notes)}
                  />
                </Field>
              </div>
            </div>
          </Card>
          <div className="flex justify-end">
            <Button type="submit" disabled={isStudentSubmitting}>
              ادامه به اطلاعات مدرسه
            </Button>
          </div>
        </form>
      ) : currentStep === 1 ? (
        <form className="space-y-5" onSubmit={continueFromSchool} noValidate>
          <Card>
            <h2 className="text-lg font-black">اطلاعات مدرسه</h2>
            <p className="mt-1 text-sm text-muted">
              مدرسه‌ها و ارتباط مقطع و پایه از آداپتور mock دریافت می‌شوند.
            </p>
            {studentComplete && (
              <p className="mt-3 text-sm font-bold text-success">اطلاعات مرحله اول حفظ شده است.</p>
            )}
            <div className="mt-5 grid gap-5 md:grid-cols-2">
              <Field
                label="مدرسه"
                htmlFor="school-id"
                required
                error={schoolErrors.schoolId?.message}
              >
                <select
                  id="school-id"
                  className="min-h-12 rounded-[var(--radius-sm)] border border-border bg-surface px-3 text-sm"
                  {...registerSchool('schoolId', {
                    onChange: () => {
                      setSchoolValue('educationalLevel', '');
                      setSchoolValue('grade', '');
                    },
                  })}
                  aria-invalid={Boolean(schoolErrors.schoolId)}
                >
                  <option value="">انتخاب کنید</option>
                  {demoEnrollmentSchools.map((school) => (
                    <option key={school.id} value={school.id}>
                      {school.name}
                    </option>
                  ))}
                </select>
              </Field>
              <Field
                label="شعبه"
                htmlFor="school-branch"
                hint="شعبه از مدرسه انتخاب‌شده دریافت می‌شود."
              >
                <Input id="school-branch" value={selectedSchool?.branch ?? ''} disabled />
              </Field>
              <Field
                label="مقطع تحصیلی"
                htmlFor="school-level"
                required
                error={schoolErrors.educationalLevel?.message}
              >
                <select
                  id="school-level"
                  className="min-h-12 rounded-[var(--radius-sm)] border border-border bg-surface px-3 text-sm disabled:bg-surface-muted"
                  disabled={!selectedSchool}
                  {...registerSchool('educationalLevel', {
                    onChange: () => setSchoolValue('grade', ''),
                  })}
                  aria-invalid={Boolean(schoolErrors.educationalLevel)}
                >
                  <option value="">انتخاب کنید</option>
                  {selectedSchool?.levels.map((level) => (
                    <option key={level.name}>{level.name}</option>
                  ))}
                </select>
              </Field>
              <Field
                label="پایه تحصیلی"
                htmlFor="school-grade"
                required
                error={schoolErrors.grade?.message}
              >
                <select
                  id="school-grade"
                  className="min-h-12 rounded-[var(--radius-sm)] border border-border bg-surface px-3 text-sm disabled:bg-surface-muted"
                  disabled={!selectedLevel}
                  {...registerSchool('grade')}
                  aria-invalid={Boolean(schoolErrors.grade)}
                >
                  <option value="">انتخاب کنید</option>
                  {selectedLevel?.grades.map((grade) => (
                    <option key={grade}>{grade}</option>
                  ))}
                </select>
              </Field>
              <Field
                label="سال تحصیلی"
                htmlFor="academic-year"
                hint="سال فعال از تنظیمات سرور خواهد آمد."
              >
                <Input id="academic-year" value={demoAcademicYear} disabled />
              </Field>
              <Field
                label="نام یا شماره کلاس (اختیاری)"
                htmlFor="class-name"
                error={schoolErrors.className?.message}
              >
                <Input
                  id="class-name"
                  {...registerSchool('className')}
                  aria-invalid={Boolean(schoolErrors.className)}
                />
              </Field>
            </div>
          </Card>
          <div className="flex flex-wrap justify-between gap-2">
            <Button variant="secondary" type="button" onClick={() => setCurrentStep(0)}>
              بازگشت و ویرایش دانش‌آموز
            </Button>
            <Button type="submit" disabled={isSchoolSubmitting}>
              ادامه به اطلاعات سرویس
            </Button>
          </div>
        </form>
      ) : (
        <Card>
          <h2 className="text-lg font-black">اطلاعات سرویس</h2>
          <p className="mt-2 text-sm text-muted">
            مراحل دانش‌آموز و مدرسه در پیش‌نویس حافظه‌ای تکمیل شدند. مرحله سرویس در برش بعدی افزوده
            می‌شود.
          </p>
          {schoolComplete && (
            <p className="mt-3 text-sm font-bold text-success">
              اطلاعات دو مرحله نخست حفظ شده است.
            </p>
          )}
          <Button
            className="mt-5"
            variant="secondary"
            type="button"
            onClick={() => setCurrentStep(1)}
          >
            بازگشت و ویرایش مدرسه
          </Button>
        </Card>
      )}
    </div>
  );
}
