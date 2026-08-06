'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

import { Alert } from '@/components/feedback/alert';
import { Field } from '@/components/forms/field';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { getApiErrorFeedback } from '@/lib/api-error-feedback';
import {
  requestAdminPasswordChallenge,
  requestParentOtp,
  verifyAdminOtp,
  verifyParentOtp,
  type AdminChallengeResponse,
} from './auth-api';
import { setAuthSession } from './auth-session';

const phoneSchema = z.object({
  phoneNumber: z.string().regex(/^09\d{9}$/, 'شماره همراه را با قالب 09xxxxxxxxx وارد کنید.'),
});
const codeSchema = z.object({
  code: z.string().regex(/^\d{6}$/, 'کد تأیید باید ۶ رقم باشد.'),
});
const adminCredentialsSchema = z.object({
  username: z.string().min(3, 'نام کاربری باید حداقل ۳ نویسه باشد.'),
  password: z.string().min(1, 'رمز عبور را وارد کنید.'),
});

type Phone = z.infer<typeof phoneSchema>;
type Code = z.infer<typeof codeSchema>;
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

function OtpAuthForm() {
  const router = useRouter();
  const [error, setError] = useState<unknown>();
  const [phoneNumber, setPhoneNumber] = useState('');
  const [developmentCode, setDevelopmentCode] = useState<string>();
  const [otpSent, setOtpSent] = useState(false);
  const phoneForm = useForm<Phone>({ resolver: zodResolver(phoneSchema) });
  const codeForm = useForm<Code>({ resolver: zodResolver(codeSchema) });

  const sendCode = phoneForm.handleSubmit(async ({ phoneNumber: value }) => {
    setError(undefined);
    try {
      const response = await requestParentOtp(value);
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
      const response = await verifyParentOtp(phoneNumber, code);
      setAuthSession(response.data.accessToken, response.data.user.role);
      router.replace('/parent/dashboard');
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
      <Button
        className="w-full rounded-xl"
        size="lg"
        type="submit"
        disabled={phoneForm.formState.isSubmitting}
      >
        {phoneForm.formState.isSubmitting ? 'در حال ارسال…' : 'دریافت کد تأیید'}
      </Button>
    </form>
  );
}

function countdownSeconds(expiresAt: string) {
  return Math.max(0, Math.floor((new Date(expiresAt).getTime() - Date.now()) / 1000));
}

function useOtpCountdown(expiresAt: string) {
  const [remainingSeconds, setRemainingSeconds] = useState(() => countdownSeconds(expiresAt));
  useEffect(() => {
    const timer = setInterval(() => {
      setRemainingSeconds(countdownSeconds(expiresAt));
    }, 1000);
    return () => clearInterval(timer);
  }, [expiresAt]);
  return remainingSeconds;
}

function AdminLoginFormInner() {
  const router = useRouter();
  const [error, setError] = useState<unknown>();
  const [challenge, setChallenge] = useState<AdminChallengeResponse>();
  const [developmentCode, setDevelopmentCode] = useState<string>();
  const credentialsForm = useForm<AdminCredentials>({
    resolver: zodResolver(adminCredentialsSchema),
  });
  const codeForm = useForm<Code>({ resolver: zodResolver(codeSchema) });
  const remainingSeconds = useOtpCountdown(challenge?.expiresAt ?? '');
  const expired = Boolean(challenge && remainingSeconds === 0);

  const startChallenge = credentialsForm.handleSubmit(async (values) => {
    setError(undefined);
    try {
      const response = await requestAdminPasswordChallenge(values.username, values.password);
      setChallenge(response.data);
      setDevelopmentCode(response.data.developmentCode);
      codeForm.reset({ code: '' });
    } catch (caught) {
      setError(caught);
    }
  });

  const verifyCode = codeForm.handleSubmit(async ({ code }) => {
    if (!challenge || expired) return;
    setError(undefined);
    try {
      const response = await verifyAdminOtp(challenge.challengeId, code);
      setAuthSession(response.data.accessToken, response.data.user.role);
      router.replace('/admin/dashboard');
    } catch (caught) {
      setError(caught);
    }
  });

  if (challenge) {
    return (
      <form className="space-y-5" onSubmit={verifyCode} noValidate>
        <FormError error={error} />
        <Alert title="کد تأیید ارسال شد">
          نخستین مرحله بررسی انجام شد. کد ۶ رقمی ارسال‌شده به شماره همراه شما را وارد کنید.
          {remainingSeconds > 0 && (
            <span className="mt-1 block text-xs text-muted">
              {expired ? '' : `کد تا ${remainingSeconds} ثانیه دیگر معتبر است.`}
            </span>
          )}
        </Alert>
        {developmentCode && (
          <Alert title="کد آزمایشی">
            کد ورود شما:
            <strong className="mt-2 block text-center text-2xl tracking-[0.35em]" dir="ltr">
              {developmentCode}
            </strong>
          </Alert>
        )}
        <Field
          label="کد تأیید"
          htmlFor="admin-otp-code"
          required
          error={codeForm.formState.errors.code?.message}
        >
          <Input
            key="admin-otp-code"
            id="admin-otp-code"
            dir="ltr"
            inputMode="numeric"
            autoComplete="one-time-code"
            maxLength={6}
            autoFocus
            disabled={expired}
            {...codeForm.register('code')}
          />
        </Field>
        {expired && (
          <Alert tone="danger" title="مهلت کد به پایان رسیده است">
            زمان اعتبار کد به پایان رسیده است. برای دریافت کد تازه، مراحل ورود را دوباره آغاز کنید.
          </Alert>
        )}
        <Button
          className="w-full"
          type="submit"
          disabled={codeForm.formState.isSubmitting || expired}
        >
          {codeForm.formState.isSubmitting ? 'در حال بررسی…' : 'تأیید و ورود'}
        </Button>
        <Button
          type="button"
          variant="ghost"
          className="w-full"
          onClick={() => {
            setChallenge(undefined);
            setDevelopmentCode(undefined);
            codeForm.reset();
            setError(undefined);
          }}
        >
          تغییر نام کاربری و رمز عبور
        </Button>
      </form>
    );
  }

  return (
    <form className="space-y-5" onSubmit={startChallenge} noValidate>
      <FormError error={error} />
      <Field
        label="نام کاربری"
        htmlFor="admin-username"
        required
        error={credentialsForm.formState.errors.username?.message}
      >
        <Input
          id="admin-username"
          dir="ltr"
          autoComplete="username"
          autoFocus
          {...credentialsForm.register('username')}
        />
      </Field>
      <Field
        label="رمز عبور"
        htmlFor="admin-password"
        required
        error={credentialsForm.formState.errors.password?.message}
      >
        <Input
          id="admin-password"
          type="password"
          dir="ltr"
          autoComplete="current-password"
          {...credentialsForm.register('password')}
        />
      </Field>
      <Button
        className="w-full rounded-xl"
        size="lg"
        type="submit"
        disabled={credentialsForm.formState.isSubmitting}
      >
        {credentialsForm.formState.isSubmitting ? 'در حال بررسی…' : 'مرحله بعد'}
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

export function AdminLoginForm() {
  return <AdminLoginFormInner />;
}

export function ForgotPasswordForm() {
  return (
    <Alert title="ورود بدون رمز عبور">
      برای ورود فقط شماره همراه و کد یک‌بارمصرف لازم است. از صفحه ورود ادامه دهید.
    </Alert>
  );
}