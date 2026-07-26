import type { Metadata } from 'next';
import { ForgotPasswordForm } from '@/features/auth/auth-forms';

export const metadata: Metadata = { title: 'ورود بدون رمز عبور' };

export default function ForgotPasswordPage() {
  return (
    <>
      <div className="flex items-center gap-2 mb-2">
        <span className="h-px flex-1 bg-border/50" aria-hidden="true" />
        <span className="flex size-8 items-center justify-center rounded-lg bg-primary-soft text-primary text-xs font-black">
          ب
        </span>
        <span className="h-px flex-1 bg-border/50" aria-hidden="true" />
      </div>
      <h1 className="text-3xl font-black">ورود بدون رمز عبور</h1>
      <p className="mt-3 text-sm text-muted">
        رمز عبور حذف شده است و ورود با کد یک‌بارمصرف انجام می‌شود.
      </p>
      <div className="mt-8">
        <ForgotPasswordForm />
      </div>
    </>
  );
}
