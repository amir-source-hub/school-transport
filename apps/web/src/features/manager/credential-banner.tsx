import { ShieldAlert } from 'lucide-react';
import { ButtonLink } from '@/components/ui/button';
export function CredentialBanner({ required }: { required: boolean }) {
  if (!required) return null;
  return (
    <aside
      role="alert"
      className="flex flex-col gap-3 rounded-2xl border border-warning/30 bg-warning-soft p-4 sm:flex-row sm:items-center"
    >
      <ShieldAlert className="size-6 shrink-0 text-warning" />
      <p className="flex-1 text-sm font-bold leading-7">
        برای بررسی یا تغییر اطلاعات ورود، با مدیر سامانه تماس بگیرید. این پنل فقط برای مشاهده است.
      </p>
      <ButtonLink href="/manager/info" size="sm">
        مشاهده اطلاعات حساب
      </ButtonLink>
    </aside>
  );
}
