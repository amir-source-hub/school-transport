import type { Metadata } from 'next';
import { PortalLoginGateway } from '@/features/auth/portal-login-gateway';

export const metadata: Metadata = { title: 'ورود یا ساخت حساب' };

export default function LoginPage() {
  return (
    <>
      <p className="text-xs font-black text-primary">خوش آمدید</p>
      <h1 className="mt-1 text-3xl font-black tracking-tight">ورود یا ساخت حساب</h1>
      <p className="mt-2 text-sm leading-7 text-muted">
        یکی از پنل‌ها را انتخاب کنید و سپس مشخصات ورود خود را وارد کنید.
      </p>
      <div className="mt-6">
        <PortalLoginGateway />
      </div>
    </>
  );
}