'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { getApiErrorFeedback } from '@/lib/api-error-feedback';
import {
  createFamilyParent,
  deleteFamilyParent,
  updateFamilyParent,
  type AdminParent,
} from './admin-families-api';

export function ParentEditor({ familyId, parent }: { familyId: string; parent?: AdminParent }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string>();
  const [form, setForm] = useState({
    parentType: parent?.parentType ?? 'FATHER',
    firstName: parent?.firstName ?? '',
    lastName: parent?.lastName ?? '',
    nationalId: parent?.nationalId ?? '',
    phoneNumber: parent?.phoneNumber ?? '',
    isPrimaryContact: parent?.isPrimaryContact ?? false,
  });
  const set = (key: keyof typeof form, value: string | boolean) =>
    setForm((current) => ({ ...current, [key]: value }));
  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(undefined);
    if (!form.firstName.trim() || !form.lastName.trim() || !/^\d{1,20}$/.test(form.nationalId)) {
      setError('نام، نام خانوادگی و کد ملی عددی الزامی است.');
      return;
    }
    if (!/^09\d{9}$/.test(form.phoneNumber)) {
      setError('شماره همراه باید ۱۱ رقم و با ۰۹ شروع شود.');
      return;
    }
    setPending(true);
    try {
      if (parent) {
        await updateFamilyParent(familyId, parent.id, form);
      } else {
        await createFamilyParent(familyId, {
          ...form,
          parentType: form.parentType as 'FATHER' | 'MOTHER',
        });
      }
      setOpen(false);
      router.refresh();
    } catch (caught) {
      setError(getApiErrorFeedback(caught).message);
    } finally {
      setPending(false);
    }
  };
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant={parent ? 'secondary' : 'primary'}>
          {parent ? 'ویرایش والد' : 'افزودن والد'}
        </Button>
      </DialogTrigger>
      <DialogContent
        title={parent ? 'ویرایش اطلاعات والد' : 'افزودن والد'}
        description="اطلاعات پدر یا مادر را ثبت کنید."
      >
        <form onSubmit={submit} className="grid gap-4 sm:grid-cols-2">
          {!parent && (
            <label className="text-sm font-bold sm:col-span-2">
              نسبت
              <Select
                className="mt-2"
                value={form.parentType}
                onValueChange={(value) => set('parentType', value)}
                options={[
                  { value: 'FATHER', label: 'پدر' },
                  { value: 'MOTHER', label: 'مادر' },
                ]}
              />
            </label>
          )}
          {[
            ['firstName', 'نام'],
            ['lastName', 'نام خانوادگی'],
            ['nationalId', 'کد ملی'],
            ['phoneNumber', 'شماره همراه'],
          ].map(([key, label]) => (
            <label key={key} className="text-sm font-bold">
              {label}
              <Input
                required
                className="mt-2"
                dir={key === 'nationalId' || key === 'phoneNumber' ? 'ltr' : undefined}
                value={String(form[key as keyof typeof form])}
                onChange={(event) =>
                  set(
                    key as keyof typeof form,
                    key === 'nationalId' || key === 'phoneNumber'
                      ? event.target.value.replace(/\D/g, '')
                      : event.target.value,
                  )
                }
              />
            </label>
          ))}
          <label className="flex items-center gap-2 text-sm font-bold sm:col-span-2">
            <input
              type="checkbox"
              checked={form.isPrimaryContact}
              onChange={(event) => set('isPrimaryContact', event.target.checked)}
            />
            تماس اصلی خانواده
          </label>
          {error && <p className="text-sm text-danger sm:col-span-2">{error}</p>}
          <div className="flex gap-2 sm:col-span-2">
            <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
              انصراف
            </Button>
            <Button type="submit" loading={pending}>
              ذخیره
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function DeleteParentButton({ familyId, parentId }: { familyId: string; parentId: string }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string>();
  return (
    <div>
      <Button
        size="sm"
        variant="danger"
        loading={pending}
        onClick={async () => {
          if (!window.confirm('این والد از خانواده حذف شود؟')) return;
          setPending(true);
          try {
            await deleteFamilyParent(familyId, parentId);
            router.refresh();
          } catch (caught) {
            setError(getApiErrorFeedback(caught).message);
          } finally {
            setPending(false);
          }
        }}
      >
        حذف والد
      </Button>
      {error && <p className="mt-2 text-xs text-danger">{error}</p>}
    </div>
  );
}
