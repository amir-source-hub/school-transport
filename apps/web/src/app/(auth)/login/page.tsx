import type { Metadata } from 'next';
import Link from 'next/link';
import { ShieldCheck } from 'lucide-react';
import { LoginForm } from '@/features/auth/auth-forms';

export const metadata: Metadata = { title: 'ورود یا ساخت حساب' };

export default function LoginPage() {
  return (
    <>
      <p className="text-xs font-black text-primary">خوش آمدید</p>
      <h1 className="mt-2 text-3xl font-black tracking-tight">ورود یا ساخت حساب</h1>
      <p className="mt-3 text-sm leading-7 text-muted">
        خانواده‌ها با تأیید شماره همراه وارد می‌شوند یا حساب تازه می‌سازند.
      </p>
      <div className="mt-7">
        <LoginForm />
      </div>
      <div className="mt-5 flex items-center justify-center gap-2 border-t border-slate-200/70 pt-5 text-xs text-muted">
        <ShieldCheck className="size-4 text-primary" />
        <span>ورود مدیران سامانه از</span>
        <Link href="/admin/login" className="font-bold text-primary hover:text-primary-hover">
          صفحه ورود مدیریت
        </Link>
      </div>
    </>
  );
}
