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

type FormState = AdminAccountInput & { passwordConfirmation: string };

function emptyForm(admin?: AdminAccount): FormState {
  return admin
    ? {
        username: admin.username,
        firstName: admin.firstName,
        lastName: admin.lastName,
        phoneNumber: admin.phoneNumber,
        email: admin.email ?? '',
        password: '',
        passwordConfirmation: '',
      }
    : {
        username: '',
        firstName: '',
        lastName: '',
        phoneNumber: '',
        email: '',
        password: '',
        passwordConfirmation: '',
      };
}

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
  const [form, setForm] = useState<FormState>(emptyForm(admin));
  const set = (key: keyof FormState, value: string) =>
    setForm((current) => ({ ...current, [key]: value }));

  function validate(): string | undefined {
    if (!form.firstName.trim() || !form.lastName.trim()) {
      return 'نام و نام خانوادگی مدیر الزامی است.';
    }
    if (form.username.trim().length < 3) {
      return 'نام کاربری باید حداقل ۳ نویسه باشد.';
    }
    if (!/^09\d{9}$/.test(form.phoneNumber)) {
      return 'شماره همراه باید ۱۱ رقم و با ۰۹ شروع شود.';
    }
    if (form.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
      return 'نشانی ایمیل معتبر نیست.';
    }
    const password = form.password ?? '';
    if (!admin && password.length < 8) {
      return 'رمز عبور مدیر باید حداقل ۸ نویسه باشد.';
    }
    if (admin && password && password.length < 8) {
      return 'رمز عبور جدید باید حداقل ۸ نویسه باشد.';
    }
    if (password !== (form.passwordConfirmation ?? '')) {
      return 'رمز عبور و تکرار آن یکسان نیستند.';
    }
    return undefined;
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setError(undefined);
    const message = validate();
    if (message) {
      setError(message);
      return;
    }
    setPending(true);
    try {
      const payload: AdminAccountInput = {
        username: form.username,
        firstName: form.firstName,
        lastName: form.lastName,
        phoneNumber: form.phoneNumber,
        email: form.email,
      };
      if (form.password && form.password.trim()) payload.password = form.password;
      if (admin) await updateAdminAccount(admin.id, payload);
      else await createAdminAccount(payload);
      setOpen(false);
      setForm(emptyForm(admin));
      router.refresh();
    } catch (caught) {
      setError(getApiErrorFeedback(caught).message);
    } finally {
      setPending(false);
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (next) {
          setForm(emptyForm(admin));
          setError(undefined);
        }
      }}
    >
      <DialogTrigger asChild>
        <Button size="sm" variant={admin ? 'ghost' : 'primary'}>
          {triggerLabel}
        </Button>
      </DialogTrigger>
      <DialogContent
        title={admin ? 'ویرایش مدیر' : 'افزودن مدیر'}
        description={
          admin
            ? 'برای رمز عبور فعلی هیچ تغییری نیاز نیست؛ در صورت تمایل رمز تازه وارد کنید.'
            : 'ورود مدیر با نام کاربری، رمز عبور و کد تأیید پیامکی انجام می‌شود.'
        }
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
          <label className="text-sm font-bold">
            رمز عبور
            <Input
              type="password"
              dir="ltr"
              autoComplete="new-password"
              className="mt-2"
              value={form.password ?? ''}
              onChange={(event) => set('password', event.target.value)}
              placeholder={admin ? 'برای تغییر ندادن خالی بگذارید' : 'حداقل ۸ نویسه'}
            />
          </label>
          <label className="text-sm font-bold">
            تکرار رمز عبور
            <Input
              type="password"
              dir="ltr"
              autoComplete="new-password"
              className="mt-2"
              value={form.passwordConfirmation ?? ''}
              onChange={(event) => set('passwordConfirmation', event.target.value)}
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