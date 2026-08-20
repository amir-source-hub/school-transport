'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { AlertCircle, Eye, EyeOff } from 'lucide-react';

import { Alert } from '@/components/feedback/alert';
import { Field } from '@/components/forms/field';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { getApiErrorFeedback } from '@/lib/api-error-feedback';
import { loginManager } from './auth-api';
import { setAuthSession } from './auth-session';
import { safePortalPath } from './safe-next';

const managerCredentialsSchema = z.object({
  username: z.string().min(3, 'نام کاربری باید حداقل ۳ نویسه باشد.'),
  password: z.string().min(1, 'رمز عبور را وارد کنید.'),
});

type ManagerCredentials = z.infer<typeof managerCredentialsSchema>;

function FormError({ error }: { error: unknown }) {
  if (!error) return null;
  const feedback = getApiErrorFeedback(error);
  return (
    <Alert tone="danger" title={feedback.title}>
      {feedback.message}
      {feedback.requestId && (
        <span className="mt-1 block text-xs">شناسه پیگیری: {feedback.requestId}</span>
      )}
    </Alert>
  );
}

export function ManagerPortalLoginForm({ nextPath }: { nextPath?: string }) {
  const router = useRouter();
  const [error, setError] = useState<unknown>();
  const [rememberMe, setRememberMe] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [capsLockOn, setCapsLockOn] = useState(false);
  const form = useForm<ManagerCredentials>({ resolver: zodResolver(managerCredentialsSchema) });
  const submit = form.handleSubmit(async ({ username, password }) => {
    setError(undefined);
    try {
      const response = await loginManager(username, password, rememberMe);
      setAuthSession(response.data.accessToken, response.data.user.role);
      router.replace(safePortalPath(nextPath, '/manager/dashboard'));
    } catch (caught) {
      setError(caught);
    }
  });
  return (
    <form className="space-y-5" onSubmit={submit} noValidate>
      <Alert tone="info" title="دسترسی مدیران مدرسه">
        نام کاربری اولیه و رمز عبور اولیه توسط سامانه ایجاد می‌شود.
      </Alert>
      <FormError error={error} />
      <Field
        label="نام کاربری"
        htmlFor="manager-username"
        required
        error={form.formState.errors.username?.message}
      >
        <Input
          id="manager-username"
          dir="ltr"
          autoComplete="username"
          autoFocus
          {...form.register('username')}
        />
      </Field>
      <Field
        label="رمز عبور"
        htmlFor="manager-password"
        required
        error={form.formState.errors.password?.message}
      >
        <div className="relative">
          <Input
            id="manager-password"
            type={showPassword ? 'text' : 'password'}
            dir="ltr"
            className="pl-11"
            autoComplete="current-password"
            aria-describedby="manager-capslock-hint"
            {...form.register('password')}
            onKeyDown={(event) => setCapsLockOn(event.getModifierState?.('CapsLock') ?? false)}
            onKeyUp={(event) => setCapsLockOn(event.getModifierState?.('CapsLock') ?? false)}
          />
          {capsLockOn && (
            <span
              id="manager-capslock-hint"
              className="mt-1.5 flex items-center gap-1 text-xs font-medium text-warning"
            >
              <AlertCircle className="size-3.5" />
              کلید Caps Lock روشن است.
            </span>
          )}
          <button
            type="button"
            className="absolute left-1 top-1/2 grid size-9 -translate-y-1/2 place-items-center rounded-lg text-muted hover:bg-surface-muted hover:text-foreground"
            aria-label={showPassword ? 'پنهان‌کردن رمز عبور' : 'نمایش رمز عبور'}
            aria-pressed={showPassword}
            onClick={() => setShowPassword((current) => !current)}
          >
            {showPassword ? <EyeOff className="size-5" /> : <Eye className="size-5" />}
          </button>
        </div>
      </Field>
      <Checkbox
        checked={rememberMe}
        onChange={(event) => setRememberMe(event.target.checked)}
        label="در این دستگاه به خاطر بسپار (۷ روز)"
      />
      <Button
        className="w-full rounded-xl"
        size="lg"
        type="submit"
        disabled={form.formState.isSubmitting}
      >
        {form.formState.isSubmitting ? 'در حال بررسی…' : 'ورود به پنل مدرسه'}
      </Button>
    </form>
  );
}
