'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

import { Alert } from '@/components/feedback/alert';
import { Field } from '@/components/forms/field';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { getApiErrorFeedback } from '@/lib/api-error-feedback';
import {
  requestAdminPasswordChallenge,
  requestParentOtp,
  verifyAdminOtp,
  verifyParentOtp,
  type AdminChallengeResponse,
  type UiRoleIdentifier,
} from './auth-api';
import { setAuthSession } from './auth-session';
import { setOnboardingState } from './onboarding-session';

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

function useNow() {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);
  return now;
}

function remainingFrom(expiresAt: string, now: number) {
  if (!expiresAt) return 0;
  return Math.max(0, Math.ceil((new Date(expiresAt).getTime() - now) / 1000));
}

function ResendButton({
  onClick,
  disabled,
  resendIn,
}: {
  onClick: () => void;
  disabled: boolean;
  resendIn: number;
}) {
  const label = resendIn > 0 ? `ارسال مجدد کد تا ${resendIn} ثانیه دیگر` : 'دریافت کد جدید';
  return (
    <Button type="button" variant="ghost" className="w-full" disabled={disabled || resendIn > 0} onClick={onClick}>
      {label}
    </Button>
  );
}

function OtpAuthForm() {
  const router = useRouter();
  const [error, setError] = useState<unknown>();
  const [role, setRole] = useState<UiRoleIdentifier>('STUDENT_PORTAL');
  const [comingSoonRole, setComingSoonRole] = useState<UiRoleIdentifier | null>(null);
  const [phoneNumber, setPhoneNumber] = useState('');
  const [developmentCode, setDevelopmentCode] = useState<string>();
  const [otpSent, setOtpSent] = useState(false);
  const [expiresAt, setExpiresAt] = useState('');
  const [resendNonce, setResendNonce] = useState(0);
  const [resending, setResending] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const phoneForm = useForm<Phone>({ resolver: zodResolver(phoneSchema) });
  const codeForm = useForm<Code>({ resolver: zodResolver(codeSchema) });

  const now = useNow();
  const [resendReadyAt, setResendReadyAt] = useState(0);
  const remainingSeconds = remainingFrom(expiresAt, now);
  const resendIn = resendNonce === 0 ? 0 : Math.max(0, Math.ceil((resendReadyAt - now) / 1000));
  const expired = otpSent && remainingSeconds === 0;

  const sendCode = async (value: string) => {
    setError(undefined);
    try {
      const response = await requestParentOtp(value);
      setPhoneNumber(value);
      setDevelopmentCode(response.data.developmentCode);
      setExpiresAt(response.data.expiresAt);
      setResendReadyAt(now + response.data.cooldownSeconds * 1000);
      setResendNonce((nonce) => nonce + 1);
      codeForm.reset({ code: '' });
      setOtpSent(true);
    } catch (caught) {
      setError(caught);
    }
  };

  const resendCode = async () => {
    if (resending || resendIn > 0 || !phoneNumber) return;
    setResending(true);
    try {
      await sendCode(phoneNumber);
    } finally {
      setResending(false);
    }
  };

  const submitPhone = phoneForm.handleSubmit(async ({ phoneNumber: value }) => {
    if (role !== 'STUDENT_PORTAL') {
      setComingSoonRole(role);
      return;
    }
    await sendCode(value);
  });

  const verifyCode = codeForm.handleSubmit(async ({ code }) => {
    if (expired) return;
    setError(undefined);
    try {
      const response = await verifyParentOtp(phoneNumber, code, rememberMe);
      if (response.data.user === null) {
        setOnboardingState({
          sessionId: response.data.onboarding.sessionId,
          phoneNumber,
          expiresAt: response.data.onboarding.expiresAt,
          currentStep: response.data.onboarding.currentStep,
        });
        router.replace('/onboarding/enrollments');
        return;
      }
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
        <Alert title="کد تأیید ارسال شد">
          کد ۶ رقمی ارسال‌شده به {phoneNumber} را وارد کنید.
          {remainingSeconds > 0 && (
            <span className="mt-1 block text-xs text-muted">
              کد تا {remainingSeconds} ثانیه دیگر معتبر است.
            </span>
          )}
        </Alert>
        {developmentCode && (
          <Alert title="کد آزمایشی">
            تا پیش از اتصال سرویس پیامک، کد ورود شما:
            <strong className="mt-2 block text-center text-2xl tracking-[0.35em]" dir="ltr">
              {developmentCode}
            </strong>
          </Alert>
        )}
        {expired && (
          <Alert tone="danger" title="مهلت کد به پایان رسیده است">
            زمان اعتبار کد به پایان رسیده است. برای دریافت کد تازه، دکمه «دریافت کد جدید» را بزنید.
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
            disabled={expired}
            {...codeForm.register('code')}
          />
        </Field>
        <Checkbox
          checked={rememberMe}
          onChange={(event) => setRememberMe(event.target.checked)}
          label="در این دستگاه به خاطر بسپار (۷ روز)"
        />
        <Button
          className="w-full"
          type="submit"
          disabled={codeForm.formState.isSubmitting || expired}
        >
          {codeForm.formState.isSubmitting ? 'در حال بررسی…' : 'تأیید و ادامه'}
        </Button>
        <ResendButton onClick={resendCode} disabled={resending} resendIn={resendIn} />
        <Button
          type="button"
          variant="ghost"
          className="w-full"
          onClick={() => {
            setOtpSent(false);
            setDevelopmentCode(undefined);
            setExpiresAt('');
            setResendNonce(0);
            codeForm.reset();
            setError(undefined);
            setComingSoonRole(null);
          }}
        >
          تغییر شماره همراه
        </Button>
      </form>
    );
  }

  return (
    <form className="space-y-5" onSubmit={submitPhone} noValidate>
      <fieldset>
        <legend className="text-sm font-bold">نقش شما</legend>
        <div className="mt-3 grid grid-cols-3 gap-2.5" role="listbox" aria-label="نقش">
          {([
            {
              id: 'STUDENT_PORTAL',
              title: 'دانش‌آموز',
              description: 'ورود و ثبت‌نام سرویس مدرسه',
              active: true,
            },
            {
              id: 'SCHOOL_MANAGER_COMING_SOON',
              title: 'مدیر مدارس',
              description: 'پنل مدیریت مدرسه',
              active: false,
            },
            {
              id: 'DRIVER_COMING_SOON',
              title: 'راننده',
              description: 'پنل راننده سرویس',
              active: false,
            },
          ] as const satisfies ReadonlyArray<{
            id: UiRoleIdentifier;
            title: string;
            description: string;
            active: boolean;
          }>).map(({ id, title, description, active }) => (
            <button
              key={id}
              type="button"
              role="option"
              aria-selected={role === id}
              data-testid={`role-${id}`}
              onClick={() => {
                setRole(id);
                setComingSoonRole(active ? null : id);
                setError(undefined);
              }}
              className={`rounded-xl border-2 p-3 text-right transition ${
                role === id ? 'border-primary bg-primary-soft' : 'border-slate-200 bg-white'
              }`}
            >
              <span
                className={`mb-2 inline-flex rounded-lg px-2 py-0.5 text-[10px] font-black ${
                  active ? 'bg-primary text-white' : 'bg-slate-100 text-muted'
                }`}
              >
                {active ? 'فعال' : 'به‌زودی'}
              </span>
              <span className="block text-sm font-black">{title}</span>
              <span className="mt-1 block text-[10px] leading-4 text-muted">{description}</span>
            </button>
          ))}
        </div>
        {comingSoonRole && role !== 'STUDENT_PORTAL' && (
          <div className="mt-3" role="status">
            <Alert tone="info" title="این بخش به‌زودی فعال می‌شود">
              ورود دانش‌آموز برای همین حالا در دسترس است؛ مدیریت مدارس و رانندگی به‌زودی فعال
              می‌شود.
            </Alert>
          </div>
        )}
      </fieldset>
      <FormError error={error} />
      <Field
        label="شماره همراه سرپرست دانش‌آموز"
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
        disabled={phoneForm.formState.isSubmitting || role !== 'STUDENT_PORTAL'}
      >
        {phoneForm.formState.isSubmitting ? 'در حال ارسال…' : 'دریافت کد تأیید'}
      </Button>
    </form>
  );
}

function AdminLoginFormInner() {
  const router = useRouter();
  const [error, setError] = useState<unknown>();
  const [challenge, setChallenge] = useState<AdminChallengeResponse>();
  const [developmentCode, setDevelopmentCode] = useState<string>();
  const [resendNonce, setResendNonce] = useState(0);
  const [resending, setResending] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [credentials, setCredentials] = useState<AdminCredentials>();
  const credentialsForm = useForm<AdminCredentials>({
    resolver: zodResolver(adminCredentialsSchema),
  });
  const codeForm = useForm<Code>({ resolver: zodResolver(codeSchema) });
  const now = useNow();
  const [resendReadyAt, setResendReadyAt] = useState(0);
  const remainingSeconds = remainingFrom(challenge?.expiresAt ?? '', now);
  const resendIn = resendNonce === 0 ? 0 : Math.max(0, Math.ceil((resendReadyAt - now) / 1000));
  const expired = Boolean(challenge && remainingSeconds === 0);

  const startChallenge = credentialsForm.handleSubmit(async (values) => {
    setError(undefined);
    try {
      const response = await requestAdminPasswordChallenge(values.username, values.password);
      setCredentials(values);
      setChallenge(response.data);
      setDevelopmentCode(response.data.developmentCode);
      setResendReadyAt(now + response.data.cooldownSeconds * 1000);
      setResendNonce((nonce) => nonce + 1);
      codeForm.reset({ code: '' });
    } catch (caught) {
      setError(caught);
    }
  });

  const resendCode = async () => {
    if (resending || resendIn > 0 || !credentials) return;
    setResending(true);
    setError(undefined);
    try {
      const response = await requestAdminPasswordChallenge(
        credentials.username,
        credentials.password,
      );
      setChallenge(response.data);
      setDevelopmentCode(response.data.developmentCode);
      setResendReadyAt(now + response.data.cooldownSeconds * 1000);
      setResendNonce((nonce) => nonce + 1);
      codeForm.reset({ code: '' });
    } catch (caught) {
      setError(caught);
    } finally {
      setResending(false);
    }
  };

  const verifyCode = codeForm.handleSubmit(async ({ code }) => {
    if (!challenge || expired) return;
    setError(undefined);
    try {
      const response = await verifyAdminOtp(challenge.challengeId, code, rememberMe);
      setCredentials(undefined);
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
              کد تا {remainingSeconds} ثانیه دیگر معتبر است.
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
        {expired && (
          <Alert tone="danger" title="مهلت کد به پایان رسیده است">
            زمان اعتبار کد به پایان رسیده است. برای دریافت کد تازه، دکمه «دریافت کد جدید» را بزنید.
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
        <Checkbox
          checked={rememberMe}
          onChange={(event) => setRememberMe(event.target.checked)}
          label="در این دستگاه به خاطر بسپار (۷ روز)"
        />
        <Button
          className="w-full"
          type="submit"
          disabled={codeForm.formState.isSubmitting || expired}
        >
          {codeForm.formState.isSubmitting ? 'در حال بررسی…' : 'تأیید و ورود'}
        </Button>
        <ResendButton onClick={resendCode} disabled={resending} resendIn={resendIn} />
        <Button
          type="button"
          variant="ghost"
          className="w-full"
          onClick={() => {
            setChallenge(undefined);
            setDevelopmentCode(undefined);
            setResendNonce(0);
            setCredentials(undefined);
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