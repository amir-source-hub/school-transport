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
        برای امنیت اطلاعات دانش‌آموزان، نام کاربری و رمز عبور اولیه خود را همین حالا تغییر دهید.
      </p>
      <ButtonLink href="/manager/settings" size="sm">
        تغییر اطلاعات ورود
      </ButtonLink>
    </aside>
  );
}
