'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

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
import { loginOrRegisterDriver, loginOrRegisterParent } from './auth-api';
import { setAuthSession } from './auth-session';
import { setOnboardingState } from './onboarding-session';
import { safePortalPath } from './safe-next';

const parentCredentialsSchema = z.object({
  phoneNumber: z.string().regex(/^09\d{9}$/, 'شماره همراه را با قالب 09xxxxxxxxx وارد کنید.'),
  nationalId: z.string().regex(/^\d{10}$/, 'کد ملی باید دقیقاً ۱۰ رقم باشد.'),
});

type ParentCredentials = z.infer<typeof parentCredentialsSchema>;

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

export function StudentPortalLoginForm({ nextPath, enrollmentPath = '/onboarding/enrollments', audience = 'family' }: { nextPath?: string; enrollmentPath?: string; audience?: 'family' | 'driver' }) {
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
      const response = await (audience === 'driver' ? loginOrRegisterDriver : loginOrRegisterParent)(phoneNumber, nationalId, rememberMe);
      if (response.data.user === null) {
        setOnboardingState({
          sessionId: response.data.onboarding.sessionId,
          phoneNumber,
          nationalId: response.data.onboarding.nationalId,
          expiresAt: response.data.onboarding.expiresAt,
          currentStep: response.data.onboarding.currentStep,
          portalRole: audience === 'driver' ? 'DRIVER' : 'PARENT',
        });
        router.replace(enrollmentPath);
        return;
      }
      setAuthSession(response.data.accessToken, response.data.user.role);
      router.replace(safePortalPath(nextPath, audience === 'driver' ? '/driver/dashboard' : '/student/dashboard'));
    } catch (caught) {
      setError(caught);
    }
  });

  return (
    <form className="space-y-5" onSubmit={submit} noValidate>
      <Alert tone="info" title={audience === 'driver' ? 'ورود و ثبت‌نام راننده' : 'ورود و ثبت‌نام خانواده'}>
        {audience === 'driver' ? 'شماره همراه و کد ملی راننده پس از احراز، در فرم ثبت‌نام ثابت و غیرقابل تغییر هستند.' : 'شماره همراه و کد ملی سرپرست، مشخصات ثابت ورود خانواده هستند و برای همه دانش‌آموزان این حساب استفاده می‌شوند.'}
      </Alert>
      <FormError error={error} />
      <Field
        label={audience === 'driver' ? 'شماره همراه راننده' : 'شماره همراه سرپرست'}
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
        label={audience === 'driver' ? 'کد ملی راننده' : 'کد ملی سرپرست'}
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
