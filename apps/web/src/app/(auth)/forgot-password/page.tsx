import type { Metadata } from 'next';
import { ForgotPasswordForm } from '@/features/auth/auth-forms';

export const metadata: Metadata = { title: 'بازیابی رمز عبور' };

export default function ForgotPasswordPage() {
  return (
    <>
      <p className="text-sm font-bold text-primary">بازیابی امن</p>
      <h1 className="mt-2 text-3xl font-black">فراموشی رمز عبور</h1>
      <p className="mt-3 text-sm text-muted">
        برای حفظ حریم خصوصی، نتیجه وجود یا نبود حساب برای این شماره نمایش داده نمی‌شود.
      </p>
      <div className="mt-8">
        <ForgotPasswordForm />
      </div>
    </>
  );
}
