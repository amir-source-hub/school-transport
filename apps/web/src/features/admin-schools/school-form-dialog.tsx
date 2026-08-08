'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { createSchool, updateSchool } from '@/features/admin-schools/admin-schools-api';
import type { AdminSchool, CreateSchoolInput } from '@/features/admin-schools/admin-schools-api';

const schoolTypes = [
  { value: 'PUBLIC', label: 'دولتی' },
  { value: 'PRIVATE', label: 'خصوصی' },
  { value: 'SPECIAL', label: 'استثنائی' },
  { value: 'INTERNATIONAL', label: 'بین‌المللی' },
];

const genderTypes = [
  { value: 'MIXED', label: 'مختلط' },
  { value: 'FEMALE', label: 'دخترانه' },
  { value: 'MALE', label: 'پسرانه' },
];

const normalizeDigits = (value: string) =>
  value
    .replace(/[۰-۹]/g, (digit) => String('۰۱۲۳۴۵۶۷۸۹'.indexOf(digit)))
    .replace(/[٠-٩]/g, (digit) => String('٠١٢٣٤٥٦٧٨٩'.indexOf(digit)));

const educationLevels = [
  { level: 'ابتدایی', grades: ['اول', 'دوم', 'سوم', 'چهارم', 'پنجم', 'ششم'] },
  { level: 'متوسطه اول', grades: ['هفتم', 'هشتم', 'نهم'] },
  { level: 'متوسطه دوم', grades: ['دهم', 'یازدهم', 'دوازدهم'] },
];

type Props = {
  mode: 'create';
} | {
  mode: 'edit';
  school: AdminSchool;
};

export function SchoolFormDialog(props: Props) {
  const router = useRouter();
  const isEdit = props.mode === 'edit';
  const initial = isEdit ? props.school : null;
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<CreateSchoolInput>({
    name: initial?.name ?? '',
    schoolType: initial?.schoolType ?? '',
    genderType: initial?.genderType ?? '',
    province: initial?.province ?? '',
    city: initial?.city ?? '',
    district: initial?.district ?? '',
    address: initial?.address ?? '',
    phoneNumber: initial?.phoneNumber ?? '',
    managerName: initial?.managerName ?? '',
    managerPhone: initial?.managerPhone ?? '',
    educationOptions: initial?.educationOptions ?? [],
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const update = <K extends keyof CreateSchoolInput>(key: K, value: CreateSchoolInput[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const handle = async () => {
    if (!form.name || !form.schoolType || !form.genderType || !form.province || !form.city || !form.address) {
      setError('لطفاً همه فیلدهای ضروری را پر کنید');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const payload = {
        ...form,
        district: form.district || undefined,
        phoneNumber: form.phoneNumber ? normalizeDigits(form.phoneNumber) : undefined,
        managerPhone: form.managerPhone ? normalizeDigits(form.managerPhone) : undefined,
        managerName: form.managerName || undefined,
      };
      if (isEdit) {
        await updateSchool(props.school.id, payload);
      } else {
        await createSchool(payload);
      }
      setOpen(false);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'خطا در ذخیره مدرسه');
    } finally {
      setLoading(false);
    }
  };

  const toggleGrade = (level: string, grade: string) => {
    const current = form.educationOptions.find((option) => option.level === level);
    const grades = current?.grades.includes(grade)
      ? current.grades.filter((value) => value !== grade)
      : [...(current?.grades ?? []), grade];
    update('educationOptions', [
      ...form.educationOptions.filter((option) => option.level !== level),
      ...(grades.length ? [{ level, grades }] : []),
    ]);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {isEdit ? (
          <Button variant="ghost" size="sm">ویرایش</Button>
        ) : (
          <Button>افزودن مدرسه</Button>
        )}
      </DialogTrigger>
      <DialogContent title={isEdit ? 'ویرایش مدرسه' : 'افزودن مدرسه جدید'} description="اطلاعات مدرسه را وارد کنید.">
        <div className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="school-name" className="text-sm font-bold">نام مدرسه *</label>
              <Input id="school-name" value={form.name} onChange={(e) => update('name', e.target.value)} className="mt-1" />
            </div>
            <div>
              <label htmlFor="school-type" className="text-sm font-bold">نوع مدرسه *</label>
              <div className="mt-1"><Select options={schoolTypes} value={form.schoolType} onValueChange={(v) => update('schoolType', v)} placeholder="انتخاب کنید" /></div>
            </div>
            <div>
              <label htmlFor="gender-type" className="text-sm font-bold">نوع جنسیت *</label>
              <div className="mt-1"><Select options={genderTypes} value={form.genderType} onValueChange={(v) => update('genderType', v)} placeholder="انتخاب کنید" /></div>
            </div>
            <div>
              <label htmlFor="school-phone" className="text-sm font-bold">تلفن</label>
              <Input id="school-phone" dir="ltr" value={form.phoneNumber ?? ''} onChange={(e) => update('phoneNumber', e.target.value)} className="mt-1" />
            </div>
            <div>
              <label htmlFor="school-province" className="text-sm font-bold">استان *</label>
              <Input id="school-province" value={form.province} onChange={(e) => update('province', e.target.value)} className="mt-1" />
            </div>
            <div>
              <label htmlFor="school-city" className="text-sm font-bold">شهر *</label>
              <Input id="school-city" value={form.city} onChange={(e) => update('city', e.target.value)} className="mt-1" />
            </div>
            <div>
              <label htmlFor="school-district" className="text-sm font-bold">منطقه</label>
              <Input id="school-district" value={form.district ?? ''} onChange={(e) => update('district', e.target.value)} className="mt-1" />
            </div>
            <div>
              <label htmlFor="school-manager-name" className="text-sm font-bold">نام مدیر</label>
              <Input id="school-manager-name" value={form.managerName ?? ''} onChange={(e) => update('managerName', e.target.value)} className="mt-1" />
            </div>
            <div>
              <label htmlFor="school-manager-phone" className="text-sm font-bold">تلفن مدیر</label>
              <Input id="school-manager-phone" dir="ltr" value={form.managerPhone ?? ''} onChange={(e) => update('managerPhone', e.target.value)} className="mt-1" />
            </div>
          </div>
          <div>
            <label htmlFor="school-address" className="text-sm font-bold">نشانی *</label>
            <Textarea id="school-address" value={form.address} onChange={(e) => update('address', e.target.value)} className="mt-1" />
          </div>
          <div>
            <p className="text-sm font-bold">مقطع‌ها و پایه‌های قابل ثبت‌نام *</p>
            <div className="mt-2 space-y-3">
              {educationLevels.map(({ level, grades }) => (
                <div key={level} className="rounded-xl border border-border p-3">
                  <p className="mb-2 text-sm font-black">{level}</p>
                  <div className="flex flex-wrap gap-2">
                    {grades.map((grade) => {
                      const checked = form.educationOptions.some((option) => option.level === level && option.grades.includes(grade));
                      return (
                        <label key={grade} className={`cursor-pointer rounded-lg border px-3 py-2 text-xs font-bold transition ${checked ? 'border-primary bg-primary-soft text-primary' : 'border-border bg-white'}`}>
                          <input className="sr-only" type="checkbox" checked={checked} onChange={() => toggleGrade(level, grade)} />
                          {grade}
                        </label>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>
          {error && <p className="text-xs text-danger">{error}</p>}
          <div className="flex gap-3">
            <Button variant="ghost" onClick={() => setOpen(false)}>انصراف</Button>
            <Button loading={loading} onClick={handle}>{isEdit ? 'ذخیره تغییرات' : 'افزودن مدرسه'}</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
