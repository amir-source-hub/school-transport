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
import {
  normalizeMobileInput,
  placeCaretAfterPrefix,
} from '@/features/enrollment/input-normalizers';
import { normalizeDigits } from '@/features/enrollment/national-id';
import { getApiErrorFeedback } from '@/lib/api-error-feedback';
import { loginAdmin, loginOrRegisterParent } from './auth-api';
import { setAuthSession } from './auth-session';
import { setOnboardingState } from './onboarding-session';

const parentCredentialsSchema = z.object({
  phoneNumber: z.string().regex(/^09\d{9}$/, 'شماره همراه را با قالب 09xxxxxxxxx وارد کنید.'),
  nationalId: z.string().regex(/^\d{1,10}$/, 'کد ملی باید فقط عدد و حداکثر ۱۰ رقم باشد.'),
});
const adminCredentialsSchema = z.object({
  username: z.string().min(3, 'نام کاربری باید حداقل ۳ نویسه باشد.'),
  password: z.string().min(1, 'رمز عبور را وارد کنید.'),
});

type ParentCredentials = z.infer<typeof parentCredentialsSchema>;
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

function ParentCredentialsForm() {
  const router = useRouter();
  const [error, setError] = useState<unknown>();
  const [rememberMe, setRememberMe] = useState(false);
  const form = useForm<ParentCredentials>({
    resolver: zodResolver(parentCredentialsSchema),
    defaultValues: { phoneNumber: '09', nationalId: '' },
  });
  const submit = form.handleSubmit(async ({ phoneNumber, nationalId }) => {
    setError(undefined);
    try {
      const response = await loginOrRegisterParent(phoneNumber, nationalId, rememberMe);
      if (response.data.user === null) {
        setOnboardingState({
          sessionId: response.data.onboarding.sessionId,
          phoneNumber,
          nationalId: response.data.onboarding.nationalId,
          expiresAt: response.data.onboarding.expiresAt,
          currentStep: response.data.onboarding.currentStep,
        });
        router.replace('/onboarding/enrollments');
        return;
      }
      setAuthSession(response.data.accessToken, response.data.user.role);
      router.replace('/student/dashboard');
    } catch (caught) {
      setError(caught);
    }
  });

  return (
    <form className="space-y-5" onSubmit={submit} noValidate>
      <Alert tone="info" title="ورود و ثبت‌نام خانواده">
        شماره همراه و کد ملی سرپرست، مشخصات ثابت ورود خانواده هستند و برای همه دانش‌آموزان این حساب
        استفاده می‌شوند.
      </Alert>
      <FormError error={error} />
      <Field
        label="شماره همراه سرپرست دانش‌آموز"
        htmlFor="auth-phone"
        required
        error={form.formState.errors.phoneNumber?.message}
      >
        <Input
          id="auth-phone"
          dir="ltr"
          inputMode="tel"
          className="text-left tabular-nums"
          autoComplete="username"
          placeholder="09123456789"
          {...form.register('phoneNumber', {
            onChange: (event) =>
              form.setValue('phoneNumber', normalizeMobileInput(event.target.value), {
                shouldValidate: form.formState.isSubmitted,
              }),
          })}
          onFocus={(event) => placeCaretAfterPrefix(event.currentTarget, 2)}
        />
      </Field>
      <Field
        label="کد ملی سرپرست"
        htmlFor="auth-national-id"
        required
        error={form.formState.errors.nationalId?.message}
      >
        <Input
          id="auth-national-id"
          dir="ltr"
          inputMode="numeric"
          className="text-left tabular-nums"
          autoComplete="current-password"
          maxLength={10}
          {...form.register('nationalId', {
            onChange: (event) =>
              form.setValue(
                'nationalId',
                normalizeDigits(event.target.value).replace(/\D/g, '').slice(0, 10),
                { shouldValidate: form.formState.isSubmitted },
              ),
          })}
        />
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
        {form.formState.isSubmitting ? 'در حال بررسی…' : 'ورود یا ثبت‌نام و ادامه'}
      </Button>
    </form>
  );
}

function AdminLoginFormInner() {
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
      router.replace('/admin/dashboard');
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

export function LoginForm() {
  return <ParentCredentialsForm />;
}
export function RegisterForm() {
  return <ParentCredentialsForm />;
}
export function AdminLoginForm() {
  return <AdminLoginFormInner />;
}
export function ForgotPasswordForm() {
  return (
    <Alert title="مشخصات ورود ثابت">
      برای ورود خانواده از شماره همراه سرپرست و کد ملی دانش‌آموز استفاده کنید.
    </Alert>
  );
}
