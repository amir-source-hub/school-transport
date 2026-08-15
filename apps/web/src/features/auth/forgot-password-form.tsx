import { GraduationCap, PhoneCall, Route } from 'lucide-react';

import { ButtonLink } from '@/components/ui/button';

export function ForgotPasswordForm() {
  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-border/60 bg-surface p-4">
        <div className="flex items-start gap-3">
          <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-sky text-primary">
            <GraduationCap className="size-5" aria-hidden />
          </span>
          <div className="min-w-0">
            <p className="text-sm font-black">ورود خانواده با مشخصات ثابت</p>
            <p className="mt-1 text-xs leading-5 text-muted">
              برای ورود به پنل دانش‌آموز از شماره همراه و کد ملی سرپرست استفاده می‌کنید؛
              رمز عبور دیگر لازم نیست.
            </p>
          </div>
        </div>
      </div>
      <div className="rounded-2xl border border-border/60 bg-surface p-4">
        <div className="flex items-start gap-3">
          <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-sky text-primary">
            <PhoneCall className="size-5" aria-hidden />
          </span>
          <div className="min-w-0">
            <p className="text-sm font-black">دریافت کد یک‌بارمصرف بدون رمز عبور</p>
            <p className="mt-1 text-xs leading-5 text-muted">
              اگر مشخصات ورود دائم ندارید، می‌توانید با یک کد پیامکی یک‌بارمصرف وارد شوید.
            </p>
          </div>
        </div>
      </div>
      <div className="rounded-2xl border border-border/60 bg-surface p-4">
        <div className="flex items-start gap-3">
          <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-sky text-primary">
            <Route className="size-5" aria-hidden />
          </span>
          <div className="min-w-0">
            <p className="text-sm font-black">مدیران مدرسه</p>
            <p className="mt-1 text-xs leading-5 text-muted">
              نام کاربری و رمز عبور اولیه شما توسط سامانه ایجاد شده است؛ در صورت نیاز، مدیر ناحیه
              آن را بازنشانی می‌کند.
            </p>
          </div>
        </div>
      </div>
      <ButtonLink href="/login" variant="primary" size="lg" className="w-full rounded-xl">
        <PhoneCall className="size-4" aria-hidden />
        مراجعه به صفحه ورود
      </ButtonLink>
    </div>
  );
}
