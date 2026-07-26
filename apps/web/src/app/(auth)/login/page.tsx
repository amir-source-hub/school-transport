import type { Metadata } from 'next';
import { LoginForm } from '@/features/auth/auth-forms';

export const metadata: Metadata = { title: 'ورود یا ساخت حساب' };

export default function LoginPage() {
  return (
    <>
      <div className="flex items-center gap-2 mb-2">
        <span className="h-px flex-1 bg-border/50" aria-hidden="true" />
        <span className="flex size-8 items-center justify-center rounded-lg bg-primary-soft text-primary text-xs font-black">
          و
        </span>
        <span className="h-px flex-1 bg-border/50" aria-hidden="true" />
      </div>
      <h1 className="text-3xl font-black">ورود یا ساخت حساب</h1>
      <p className="mt-3 text-sm text-muted">
        خانواده‌ها با تأیید شماره همراه وارد می‌شوند یا حساب تازه می‌سازند. مدیران باید شماره
        ثبت‌شده خود را انتخاب کنند.
      </p>
      <div className="mt-8">
        <LoginForm />
      </div>
    </>
  );
}
