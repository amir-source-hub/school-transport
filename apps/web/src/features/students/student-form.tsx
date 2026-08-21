'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { JalaliDateInput } from '@/components/forms/jalali-date-input';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { getApiErrorFeedback } from '@/lib/api-error-feedback';
import { createStudent, updateStudent, type Student, type StudentInput } from './students-api';

type SchoolOption = { id: string; name: string; educationOptions?: { level: string; grades: string[] }[] };

export function StudentForm({ schools, student }: { schools: SchoolOption[]; student?: Student }) {
  const router = useRouter();
  const [form, setForm] = useState<StudentInput>({
    schoolId: student?.schoolId ?? schools[0]?.id ?? '',
    firstName: student?.firstName ?? '',
    lastName: student?.lastName ?? '',
    nationalId: student?.nationalId ?? '',
    birthDate: student?.birthDate ?? '',
    gender: student?.gender ?? '',
    grade: student?.grade ?? '',
    className: student?.className ?? '',
    fatherName: student?.fatherName ?? '',
    phoneNumber: student?.phoneNumber ?? '',
    fieldOfStudy: student?.fieldOfStudy ?? '',
  });
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string>();

  const set = (key: keyof StudentInput, value: string | undefined) =>
    setForm((current) => ({ ...current, [key]: value ?? '' }));

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setPending(true);
    setError(undefined);
    try {
      if (student) {
        await updateStudent(student.id, {
          firstName: form.firstName,
          lastName: form.lastName,
          schoolId: form.schoolId,
          className: form.className,
          grade: form.grade,
          fatherName: form.fatherName || undefined,
          birthDate: form.birthDate || undefined,
          gender: form.gender || undefined,
          phoneNumber: form.phoneNumber || undefined,
          fieldOfStudy: form.fieldOfStudy || undefined,
        });
        router.refresh();
      } else {
        const created = await createStudent(form);
        router.replace(`/student/students/${created.id}`);
      }
    } catch (caught) {
      setError(getApiErrorFeedback(caught).message);
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-5">
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="text-sm font-bold">
          نام
          <Input
            required
            value={form.firstName}
            onChange={(event) => set('firstName', event.target.value)}
          />
        </label>
        <label className="text-sm font-bold">
          نام خانوادگی
          <Input
            required
            value={form.lastName}
            onChange={(event) => set('lastName', event.target.value)}
          />
        </label>
        <label className="text-sm font-bold">
          کد ملی
          <Input
            required
            disabled={Boolean(student)}
            dir="ltr"
            inputMode="numeric"
            value={form.nationalId}
            onChange={(event) => set('nationalId', event.target.value)}
          />
        </label>
        <label className="text-sm font-bold">
          مدرسه
          <Select
            value={form.schoolId}
            onValueChange={(value) => {
              const school = schools.find((item) => item.id === value);
              setForm((current) => ({
                ...current,
                schoolId: value,
                className: school?.educationOptions?.[0]?.level ?? '',
                grade: school?.educationOptions?.[0]?.grades[0] ?? '',
              }));
            }}
            options={schools.map((school) => ({ value: school.id, label: school.name }))}
            placeholder="مدرسه را انتخاب کنید"
          />
        </label>
        <label className="text-sm font-bold">
          مقطع تحصیلی
          <Select
            value={form.className ?? ''}
            onValueChange={(value) => {
              const school = schools.find((item) => item.id === form.schoolId);
              const level = school?.educationOptions?.find((item) => item.level === value);
              setForm((current) => ({ ...current, className: value, grade: level?.grades[0] ?? '' }));
            }}
            options={(schools.find((item) => item.id === form.schoolId)?.educationOptions ?? []).map((item) => ({ value: item.level, label: item.level }))}
            placeholder="انتخاب کنید"
          />
        </label>
        <label className="text-sm font-bold">
          پایه
          <Select
            value={form.grade}
            onValueChange={(value) => set('grade', value)}
            options={(schools.find((item) => item.id === form.schoolId)?.educationOptions?.find((item) => item.level === form.className)?.grades ?? []).map((grade) => ({ value: grade, label: grade }))}
            placeholder="انتخاب کنید"
          />
        </label>
        <>
          <label className="text-sm font-bold">
            تاریخ تولد
            <JalaliDateInput
              value={form.birthDate ?? ''}
              onChange={(value) => set('birthDate', value)}
              required={!student}
            />
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
              placeholder="انتخاب کنید"
            />
          </label>
        </>
        <label className="text-sm font-bold">
          نام پدر (اختیاری)
          <Input
            value={form.fatherName ?? ''}
            onChange={(event) => set('fatherName', event.target.value)}
          />
        </label>
        <label className="text-sm font-bold">
          شماره همراه دانش‌آموز (اختیاری)
          <Input
            dir="ltr"
            inputMode="numeric"
            value={form.phoneNumber ?? ''}
            onChange={(event) =>
              set('phoneNumber', event.target.value.replace(/\D/g, '').slice(0, 11))
            }
          />
        </label>
        <label className="text-sm font-bold">
          رشته تحصیلی (اختیاری)
          <Input
            value={form.fieldOfStudy ?? ''}
            onChange={(event) => set('fieldOfStudy', event.target.value)}
          />
        </label>
      </div>
      {error && <p className="text-sm text-danger">{error}</p>}
      <Button type="submit" loading={pending}>
        {student ? 'ذخیره تغییرات' : 'افزودن دانش‌آموز'}
      </Button>
    </form>
  );
}
