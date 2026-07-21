import type { Metadata } from 'next';
import { RegisterForm } from '@/features/auth/auth-forms';

export const metadata: Metadata = { title: 'ثبت‌نام' };

export default function RegisterPage() {
  return (
    <>
      <p className="text-sm font-bold text-primary">حساب خانواده</p>
      <h1 className="mt-2 text-3xl font-black">ساخت حساب کاربری</h1>
      <p className="mt-3 text-sm text-muted">
        این حساب مشترک خانواده است؛ اطلاعات تکمیلی پس از ورود ثبت می‌شود.
      </p>
      <div className="mt-8">
        <RegisterForm />
      </div>
    </>
  );
}
