'use client';
import { useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { changeManagerCredentials } from './manager-api';
import { getApiErrorFeedback } from '@/lib/api-error-feedback';
export function CredentialForm({ username }: { username: string }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [msg, setMsg] = useState<string>();
  const [failed, setFailed] = useState(false);
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setPending(true);
    setMsg(undefined);
    setFailed(false);
    const f = new FormData(e.currentTarget);
    try {
      await changeManagerCredentials({
        currentPassword: String(f.get('currentPassword')),
        newUsername: String(f.get('newUsername')),
        newPassword: String(f.get('newPassword')),
        confirmNewPassword: String(f.get('confirmNewPassword')),
      });
      setMsg('اطلاعات ورود با موفقیت تغییر کرد. نشست‌های دیگر بسته شدند.');
      e.currentTarget.reset();
      router.refresh();
    } catch (error) {
      setFailed(true);
      setMsg(getApiErrorFeedback(error).message);
    } finally {
      setPending(false);
    }
  }
  return (
    <form onSubmit={submit} className="space-y-4" aria-busy={pending}>
      <label className="block space-y-2">
        <span className="text-sm font-bold">رمز عبور فعلی</span>
        <Input name="currentPassword" type="password" required autoComplete="current-password" />
      </label>
      <label className="block space-y-2">
        <span className="text-sm font-bold">نام کاربری جدید</span>
        <Input
          name="newUsername"
          required
          minLength={3}
          maxLength={100}
          defaultValue={username}
          autoComplete="username"
        />
      </label>
      <label className="block space-y-2">
        <span className="text-sm font-bold">رمز عبور جدید</span>
        <Input
          name="newPassword"
          type="password"
          required
          minLength={8}
          maxLength={128}
          autoComplete="new-password"
        />
      </label>
      <label className="block space-y-2">
        <span className="text-sm font-bold">تکرار رمز عبور جدید</span>
        <Input
          name="confirmNewPassword"
          type="password"
          required
          minLength={8}
          maxLength={128}
          autoComplete="new-password"
        />
      </label>
      <p className="text-xs leading-6 text-muted">
        حداقل ۸ نویسه؛ نام کاربری و رمز جدید نباید با شماره همراه مدیر برابر باشد.
      </p>
      <Button loading={pending} disabled={pending}>
        ذخیره اطلاعات ورود
      </Button>
      {msg && (
        <p
          role={failed ? 'alert' : 'status'}
          className={failed ? 'text-sm text-danger' : 'text-sm text-success'}
        >
          {msg}
        </p>
      )}
    </form>
  );
}
