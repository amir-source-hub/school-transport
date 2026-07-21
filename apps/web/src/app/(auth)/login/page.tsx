import type { Metadata } from 'next';
import { LoginForm } from '@/features/auth/auth-forms';

export const metadata: Metadata = { title: 'ورود' };

export default function LoginPage() {
  return (
    <>
      <p className="text-sm font-bold text-primary">حساب کاربری</p>
      <h1 className="mt-2 text-3xl font-black">ورود به سامانه</h1>
      <p className="mt-3 text-sm text-muted">
        با نام کاربری و رمز عبور حساب خانواده یا مدیر وارد شوید.
      </p>
      <div className="mt-8">
        <LoginForm />
      </div>
    </>
  );
}
