'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { Eye, EyeOff } from 'lucide-react';

import { Alert } from '@/components/feedback/alert';
import { Field } from '@/components/forms/field';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { getApiErrorFeedback } from '@/lib/api-error-feedback';
import { loginAdmin } from './auth-api';
import { setAuthSession } from './auth-session';
import { safePortalPath } from './safe-next';

const adminCredentialsSchema = z.object({
  username: z.string().min(3, 'نام کاربری باید حداقل ۳ نویسه باشد.'),
  password: z.string().min(1, 'رمز عبور را وارد کنید.'),
});

type AdminCredentials = z.infer<typeof adminCredentialsSchema>;

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

export function AdminLoginForm({ nextPath }: { nextPath?: string }) {
  const router = useRouter();
  const [error, setError] = useState<unknown>();
  const [rememberMe, setRememberMe] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const form = useForm<AdminCredentials>({ resolver: zodResolver(adminCredentialsSchema) });
  const submit = form.handleSubmit(async ({ username, password }) => {
    setError(undefined);
    try {
      const response = await loginAdmin(username, password, rememberMe);
      setAuthSession(response.data.accessToken, response.data.user.role);
      router.replace(safePortalPath(nextPath, '/admin/dashboard'));
    } catch (caught) {
      setError(caught);
    }
  });
  return (
    <form className="space-y-5" onSubmit={submit} noValidate>
      <FormError error={error} />
      <Field
        label="نام کاربری"
        htmlFor="admin-username"
        required
        error={form.formState.errors.username?.message}
      >
        <Input
          id="admin-username"
          dir="ltr"
          autoComplete="username"
          autoFocus
          {...form.register('username')}
        />
      </Field>
      <Field
        label="رمز عبور"
        htmlFor="admin-password"
        required
        error={form.formState.errors.password?.message}
      >
        <div className="relative">
          <Input
            id="admin-password"
            type={showPassword ? 'text' : 'password'}
            dir="ltr"
            className="pl-11"
            autoComplete="current-password"
            {...form.register('password')}
          />
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
        {form.formState.isSubmitting ? 'در حال بررسی…' : 'ورود به پنل مدیریت'}
      </Button>
    </form>
  );
}
