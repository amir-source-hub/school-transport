'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

import { Alert } from '@/components/feedback/alert';
import { Field } from '@/components/forms/field';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { getApiErrorFeedback } from '@/lib/api-error-feedback';
import { login, register, requestPasswordReset } from './auth-api';
import { setAuthSession } from './auth-session';

const credentialsSchema = z.object({
  username: z.string().trim().min(3, 'نام کاربری باید حداقل ۳ نویسه باشد.'),
  password: z
    .string()
    .min(8, 'رمز عبور باید حداقل ۸ نویسه باشد.')
    .regex(/[A-Za-z]/, 'رمز عبور باید حداقل یک حرف داشته باشد.')
    .regex(/\d/, 'رمز عبور باید حداقل یک عدد داشته باشد.'),
});

const registrationSchema = credentialsSchema
  .extend({ confirmPassword: z.string() })
  .refine(({ password, confirmPassword }) => password === confirmPassword, {
    path: ['confirmPassword'],
    message: 'تکرار رمز عبور یکسان نیست.',
  });

const phoneSchema = z.object({
  phoneNumber: z.string().regex(/^09\d{9}$/, 'شماره همراه را با قالب 09xxxxxxxxx وارد کنید.'),
});

type Credentials = z.infer<typeof credentialsSchema>;
type Registration = z.infer<typeof registrationSchema>;
type Phone = z.infer<typeof phoneSchema>;

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

export function LoginForm() {
  const router = useRouter();
  const [error, setError] = useState<unknown>();
  const [role, setRole] = useState<'PARENT' | 'ADMIN'>('PARENT');
  const {
    register: registerField,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<Credentials>({ resolver: zodResolver(credentialsSchema) });

  const submit = handleSubmit(async (values) => {
    setError(undefined);
    try {
      const response = await login(values.username, values.password, role);
      setAuthSession(response.data.accessToken, response.data.user.role);
      router.replace(role === 'ADMIN' ? '/admin/dashboard' : '/parent/dashboard');
    } catch (caught) {
      setError(caught);
    }
  });

  return (
    <form className="space-y-5" onSubmit={submit} noValidate>
      <FormError error={error} />
      <Field label="نوع حساب" htmlFor="login-role" required>
        <select
          id="login-role"
          className="min-h-12 rounded-[var(--radius-sm)] border border-border bg-surface px-3 text-sm"
          value={role}
          onChange={(event) => setRole(event.target.value as 'PARENT' | 'ADMIN')}
        >
          <option value="PARENT">خانواده</option>
          <option value="ADMIN">مدیر سامانه</option>
        </select>
      </Field>
      <Field label="نام کاربری" htmlFor="login-username" required error={errors.username?.message}>
        <Input id="login-username" autoComplete="username" {...registerField('username')} />
      </Field>
      <Field label="رمز عبور" htmlFor="login-password" required error={errors.password?.message}>
        <Input
          id="login-password"
          type="password"
          autoComplete="current-password"
          {...registerField('password')}
        />
      </Field>
      <div className="flex items-center justify-between gap-3 text-sm">
        <Link className="font-bold text-primary hover:underline" href="/forgot-password">
          رمز عبور را فراموش کرده‌ام
        </Link>
        <Link className="font-bold text-primary hover:underline" href="/register">
          ساخت حساب خانواده
        </Link>
      </div>
      <Button className="w-full" type="submit" disabled={isSubmitting}>
        {isSubmitting ? 'در حال ورود…' : 'ورود'}
      </Button>
    </form>
  );
}

export function RegisterForm() {
  const router = useRouter();
  const [error, setError] = useState<unknown>();
  const {
    register: registerField,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<Registration>({ resolver: zodResolver(registrationSchema) });

  const submit = handleSubmit(async ({ username, password }) => {
    setError(undefined);
    try {
      await register(username, password);
      router.replace('/login?registered=1');
    } catch (caught) {
      setError(caught);
    }
  });

  return (
    <form className="space-y-5" onSubmit={submit} noValidate>
      <FormError error={error} />
      <Field
        label="نام کاربری خانوادگی"
        htmlFor="register-username"
        required
        error={errors.username?.message}
      >
        <Input id="register-username" autoComplete="username" {...registerField('username')} />
      </Field>
      <Field
        label="رمز عبور"
        htmlFor="register-password"
        required
        hint="حداقل ۸ نویسه، شامل حرف و عدد"
        error={errors.password?.message}
      >
        <Input
          id="register-password"
          type="password"
          autoComplete="new-password"
          {...registerField('password')}
        />
      </Field>
      <Field
        label="تکرار رمز عبور"
        htmlFor="register-confirm"
        required
        error={errors.confirmPassword?.message}
      >
        <Input
          id="register-confirm"
          type="password"
          autoComplete="new-password"
          {...registerField('confirmPassword')}
        />
      </Field>
      <Button className="w-full" type="submit" disabled={isSubmitting}>
        {isSubmitting ? 'در حال ساخت حساب…' : 'ساخت حساب'}
      </Button>
      <p className="text-center text-sm text-muted">
        حساب دارید؟{' '}
        <Link className="font-bold text-primary hover:underline" href="/login">
          وارد شوید
        </Link>
      </p>
    </form>
  );
}

export function ForgotPasswordForm() {
  const [error, setError] = useState<unknown>();
  const [sent, setSent] = useState(false);
  const {
    register: registerField,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<Phone>({ resolver: zodResolver(phoneSchema) });

  const submit = handleSubmit(async ({ phoneNumber }) => {
    setError(undefined);
    try {
      await requestPasswordReset(phoneNumber);
      setSent(true);
    } catch (caught) {
      setError(caught);
    }
  });

  if (sent) {
    return (
      <Alert title="درخواست ثبت شد">
        اگر شماره همراه با حسابی مرتبط باشد، کد بازیابی ارسال می‌شود.
      </Alert>
    );
  }

  return (
    <form className="space-y-5" onSubmit={submit} noValidate>
      <FormError error={error} />
      <Field
        label="شماره همراه اصلی"
        htmlFor="recovery-phone"
        required
        error={errors.phoneNumber?.message}
      >
        <Input
          id="recovery-phone"
          dir="ltr"
          inputMode="tel"
          autoComplete="tel"
          placeholder="09123456789"
          {...registerField('phoneNumber')}
        />
      </Field>
      <Button className="w-full" type="submit" disabled={isSubmitting}>
        {isSubmitting ? 'در حال ارسال…' : 'ارسال کد بازیابی'}
      </Button>
      <p className="text-center text-sm">
        <Link className="font-bold text-primary hover:underline" href="/login">
          بازگشت به ورود
        </Link>
      </p>
    </form>
  );
}
