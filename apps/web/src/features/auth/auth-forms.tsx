'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

import { Alert } from '@/components/feedback/alert';
import { Field } from '@/components/forms/field';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { getApiErrorFeedback } from '@/lib/api-error-feedback';
import { requestAuthOtp, verifyAuthOtp, type AuthRole } from './auth-api';
import { setAuthSession } from './auth-session';

const phoneSchema = z.object({
  phoneNumber: z.string().regex(/^09\d{9}$/, 'شماره همراه را با قالب 09xxxxxxxxx وارد کنید.'),
});
const codeSchema = z.object({
  code: z.string().regex(/^\d{6}$/, 'کد تأیید باید ۶ رقم باشد.'),
});

type Phone = z.infer<typeof phoneSchema>;
type Code = z.infer<typeof codeSchema>;

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

function OtpAuthForm() {
  const router = useRouter();
  const [error, setError] = useState<unknown>();
  const [role, setRole] = useState<AuthRole>('PARENT');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [developmentCode, setDevelopmentCode] = useState<string>();
  const [unregistered, setUnregistered] = useState(false);
  const [otpSent, setOtpSent] = useState(false);
  const phoneForm = useForm<Phone>({ resolver: zodResolver(phoneSchema) });
  const codeForm = useForm<Code>({ resolver: zodResolver(codeSchema) });

  const sendCode = phoneForm.handleSubmit(async ({ phoneNumber: value }) => {
    setError(undefined);
    setUnregistered(false);
    try {
      const response = await requestAuthOtp(value, role);
      if (response.data.accountExists === false) {
        setUnregistered(true);
        return;
      }
      setPhoneNumber(value);
      setDevelopmentCode(response.data.developmentCode);
      codeForm.reset({ code: '' });
      setOtpSent(true);
    } catch (caught) {
      setError(caught);
    }
  });

  const verifyCode = codeForm.handleSubmit(async ({ code }) => {
    setError(undefined);
    try {
      const response = await verifyAuthOtp(phoneNumber, code, role);
      setAuthSession(response.data.accessToken, response.data.user.role);
      router.replace(role === 'ADMIN' ? '/admin/dashboard' : '/parent/dashboard');
    } catch (caught) {
      setError(caught);
    }
  });

  if (otpSent) {
    return (
      <form className="space-y-5" onSubmit={verifyCode} noValidate>
        <FormError error={error} />
        <Alert title="کد تأیید ارسال شد">کد ۶ رقمی ارسال‌شده به {phoneNumber} را وارد کنید.</Alert>
        {developmentCode && (
          <Alert title="کد آزمایشی">
            تا پیش از اتصال سرویس پیامک، کد ورود شما:
            <strong className="mt-2 block text-center text-2xl tracking-[0.35em]" dir="ltr">
              {developmentCode}
            </strong>
          </Alert>
        )}
        <Field
          label="کد تأیید"
          htmlFor="auth-code"
          required
          error={codeForm.formState.errors.code?.message}
        >
          <Input
            key="otp-code"
            id="auth-code"
            dir="ltr"
            inputMode="numeric"
            autoComplete="one-time-code"
            maxLength={6}
            autoFocus
            {...codeForm.register('code')}
          />
        </Field>
        <Button className="w-full" type="submit" disabled={codeForm.formState.isSubmitting}>
          {codeForm.formState.isSubmitting ? 'در حال بررسی…' : 'تأیید و ادامه'}
        </Button>
        <Button
          type="button"
          variant="ghost"
          className="w-full"
          onClick={() => {
            setOtpSent(false);
            setDevelopmentCode(undefined);
            codeForm.reset();
            setError(undefined);
          }}
        >
          تغییر شماره همراه
        </Button>
      </form>
    );
  }

  return (
    <form className="space-y-5" onSubmit={sendCode} noValidate>
      <FormError error={error} />
      {unregistered && role === 'ADMIN' && (
        <Alert tone="danger" title="شماره همراه مدیر ثبت نشده است">
          این شماره برای حساب مدیر ثبت نشده است. از شماره همراهی استفاده کنید که قبلاً در رکورد مدیر
          سامانه ذخیره شده است.
        </Alert>
      )}
      <Field label="نوع حساب" htmlFor="login-role" required>
        <select
          id="login-role"
          className="min-h-12 rounded-[var(--radius-sm)] border border-border bg-surface px-3 text-sm"
          value={role}
          onChange={(event) => {
            setRole(event.target.value as AuthRole);
            setUnregistered(false);
          }}
        >
          <option value="PARENT">خانواده (ورود یا ساخت حساب)</option>
          <option value="ADMIN">مدیر سامانه</option>
        </select>
      </Field>
      <Field
        label="شماره همراه"
        htmlFor="auth-phone"
        required
        error={phoneForm.formState.errors.phoneNumber?.message}
      >
        <Input
          key="auth-phone"
          id="auth-phone"
          dir="ltr"
          inputMode="tel"
          autoComplete="tel"
          placeholder="09123456789"
          {...phoneForm.register('phoneNumber')}
        />
      </Field>
      <Button className="w-full" type="submit" disabled={phoneForm.formState.isSubmitting}>
        {phoneForm.formState.isSubmitting ? 'در حال ارسال…' : 'دریافت کد تأیید'}
      </Button>
    </form>
  );
}

export function LoginForm() {
  return <OtpAuthForm />;
}

export function RegisterForm() {
  return <OtpAuthForm />;
}

export function ForgotPasswordForm() {
  return (
    <Alert title="ورود بدون رمز عبور">
      برای ورود فقط شماره همراه و کد یک‌بارمصرف لازم است. از صفحه ورود ادامه دهید.
    </Alert>
  );
}
