import type { Metadata } from 'next';
import { LoginForm } from '@/features/auth/auth-forms';

export const metadata: Metadata = { title: 'ورود یا ساخت حساب' };

export default function LoginPage() {
  return (
    <>
      <p className="text-xs font-black text-primary">خوش آمدید</p>
      <h1 className="mt-2 text-3xl font-black tracking-tight">ورود یا ساخت حساب</h1>
      <p className="mt-3 text-sm leading-7 text-muted">
        خانواده‌ها با تأیید شماره همراه وارد می‌شوند یا حساب تازه می‌سازند. مدیران باید شماره
        ثبت‌شده خود را انتخاب کنند.
      </p>
      <div className="mt-7">
        <LoginForm />
      </div>
    </>
  );
}
