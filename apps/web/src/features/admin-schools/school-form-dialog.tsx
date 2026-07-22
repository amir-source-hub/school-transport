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
  { value: 'دولتی', label: 'دولتی' },
  { value: 'غیردولتی', label: 'غیردولتی' },
  { value: 'هیئت امنایی', label: 'هیئت امنایی' },
];

const genderTypes = [
  { value: 'مختلط', label: 'مختلط' },
  { value: 'دخترانه', label: 'دخترانه' },
  { value: 'پسرانه', label: 'پسرانه' },
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
      const payload = { ...form, district: form.district || undefined, phoneNumber: form.phoneNumber || undefined };
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
          </div>
          <div>
            <label htmlFor="school-address" className="text-sm font-bold">نشانی *</label>
            <Textarea id="school-address" value={form.address} onChange={(e) => update('address', e.target.value)} className="mt-1" />
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
