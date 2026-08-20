'use client';

import { useState } from 'react';
import { Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

type EducationOption = { level: string; grades: string[] };

export function ManagerStudentFilters({
  raw,
  educationOptions,
}: {
  raw: Record<string, string | string[] | undefined>;
  educationOptions: EducationOption[];
}) {
  const [level, setLevel] = useState(
    typeof raw.educationLevel === 'string' ? raw.educationLevel : '',
  );
  const allGrades = [...new Set(educationOptions.flatMap((x) => x.grades))];
  const grades = level
    ? (educationOptions.find((x) => x.level === level)?.grades ?? [])
    : allGrades;
  return (
    <form className="grid gap-3 md:grid-cols-2 xl:grid-cols-7">
      <label className="relative xl:col-span-2">
        <span className="sr-only">جست‌وجو</span>
        <Search className="absolute end-3 top-1/2 size-4 -translate-y-1/2 text-muted" />
        <Input
          name="query"
          defaultValue={typeof raw.query === 'string' ? raw.query : ''}
          placeholder="نام، کد دانش‌آموز یا کد ملی"
          className="pe-10"
        />
      </label>
      <select
        name="educationLevel"
        aria-label="مقطع تحصیلی"
        value={level}
        onChange={(e) => setLevel(e.target.value)}
        className="min-h-12 rounded-xl border border-border bg-white px-3"
      >
        <option value="">همه مقاطع</option>
        {educationOptions.map((x) => (
          <option key={x.level} value={x.level}>
            {x.level}
          </option>
        ))}
      </select>
      <select
        key={level}
        name="grade"
        aria-label="پایه تحصیلی"
        defaultValue={typeof raw.grade === 'string' && grades.includes(raw.grade) ? raw.grade : ''}
        className="min-h-12 rounded-xl border border-border bg-white px-3"
      >
        <option value="">همه پایه‌ها</option>
        {grades.map((x) => (
          <option key={x} value={x}>
            {x}
          </option>
        ))}
      </select>
      <select
        name="fieldOfStudy"
        aria-label="رشته تحصیلی"
        defaultValue={typeof raw.fieldOfStudy === 'string' ? raw.fieldOfStudy : ''}
        className="min-h-12 rounded-xl border border-border bg-white px-3"
      >
        <option value="">همه رشته‌ها</option>
        <option>ریاضی فیزیک</option>
        <option>علوم تجربی</option>
        <option>علوم انسانی</option>
        <option>سایر</option>
      </select>
      <select
        name="sortBy"
        aria-label="مرتب‌سازی دانش‌آموزان"
        defaultValue={typeof raw.sortBy === 'string' ? raw.sortBy : 'createdAt'}
        className="min-h-12 rounded-xl border border-border bg-white px-3"
      >
        <option value="createdAt">تاریخ ثبت</option>
        <option value="name">نام دانش‌آموز</option>
        <option value="nationalId">کد ملی</option>
        <option value="educationLevel">مقطع تحصیلی</option>
        <option value="grade">پایه تحصیلی</option>
      </select>
      <Button>اعمال فیلتر</Button>
    </form>
  );
}
