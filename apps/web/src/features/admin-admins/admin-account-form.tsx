'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { getApiErrorFeedback } from '@/lib/api-error-feedback';
import {
  createAdminAccount,
  updateAdminAccount,
  type AdminAccount,
  type AdminAccountInput,
} from './admin-admins-api';

const emptyForm: AdminAccountInput = {
  username: '',
  firstName: '',
  lastName: '',
  phoneNumber: '',
  email: '',
};

export function AdminAccountForm({
  admin,
  triggerLabel = admin ? 'ویرایش' : 'افزودن مدیر',
}: {
  admin?: AdminAccount;
  triggerLabel?: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string>();
  const [form, setForm] = useState<AdminAccountInput>(
    admin
      ? {
          username: admin.username,
          firstName: admin.firstName,
          lastName: admin.lastName,
          phoneNumber: admin.phoneNumber,
          email: admin.email ?? '',
        }
      : emptyForm,
  );
  const set = (key: keyof AdminAccountInput, value: string) =>
    setForm((current) => ({ ...current, [key]: value }));

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setError(undefined);
    if (!/^09\d{9}$/.test(form.phoneNumber)) {
      setError('شماره همراه باید ۱۱ رقم و با ۰۹ شروع شود.');
      return;
    }
    setPending(true);
    try {
      if (admin) await updateAdminAccount(admin.id, form);
      else await createAdminAccount(form);
      setOpen(false);
      router.refresh();
    } catch (caught) {
      setError(getApiErrorFeedback(caught).message);
    } finally {
      setPending(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant={admin ? 'ghost' : 'primary'}>
          {triggerLabel}
        </Button>
      </DialogTrigger>
      <DialogContent
        title={admin ? 'ویرایش مدیر' : 'افزودن مدیر'}
        description="اطلاعات حساب مدیریتی را وارد کنید. ورود مدیر با رمز یک‌بارمصرف شماره همراه انجام می‌شود."
      >
        <form className="grid gap-4 sm:grid-cols-2" onSubmit={submit}>
          <label className="text-sm font-bold">
            نام
            <Input
              required
              className="mt-2"
              value={form.firstName}
              onChange={(event) => set('firstName', event.target.value)}
            />
          </label>
          <label className="text-sm font-bold">
            نام خانوادگی
            <Input
              required
              className="mt-2"
              value={form.lastName}
              onChange={(event) => set('lastName', event.target.value)}
            />
          </label>
          <label className="text-sm font-bold">
            نام کاربری
            <Input
              required
              minLength={3}
              dir="ltr"
              className="mt-2"
              value={form.username}
              onChange={(event) => set('username', event.target.value)}
            />
          </label>
          <label className="text-sm font-bold">
            شماره همراه
            <Input
              required
              inputMode="numeric"
              dir="ltr"
              maxLength={11}
              className="mt-2"
              value={form.phoneNumber}
              onChange={(event) => set('phoneNumber', event.target.value.replace(/\D/g, ''))}
            />
          </label>
          <label className="text-sm font-bold sm:col-span-2">
            ایمیل
            <Input
              type="email"
              dir="ltr"
              className="mt-2"
              value={form.email ?? ''}
              onChange={(event) => set('email', event.target.value)}
            />
          </label>
          {error && <p className="text-sm text-danger sm:col-span-2">{error}</p>}
          <div className="flex gap-3 sm:col-span-2">
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
