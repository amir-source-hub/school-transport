'use client';

import { Bell, FileText, GraduationCap, Route, UserRound, WalletCards, type LucideIcon } from 'lucide-react';
import { ButtonLink } from '@/components/ui/button';
import { cn } from '@/lib/cn';

type TileVariant = 'primary' | 'light' | 'dark' | 'outlined' | 'premium' | 'glass';

const tiles: {
  title: string;
  description: string;
  icon: LucideIcon;
  span: string;
  variant: TileVariant;
  action: { label: string; href: string } | null;
}[] = [
  {
    title: 'ثبت‌نام آنلاین',
    description: 'فرایند ثبت‌نام سرویس را در چند مرحله ساده و کاملاً آنلاین انجام دهید.',
    icon: GraduationCap,
    span: 'lg:col-span-2 lg:row-span-2',
    variant: 'primary',
    action: { label: 'شروع ثبت‌نام', href: '/register' },
  },
  {
    title: 'مدیریت قراردادها',
    description: 'قراردادها را مرور کنید و وضعیت پذیرش را ببینید.',
    icon: FileText,
    span: '',
    variant: 'light',
    action: null,
  },
  {
    title: 'پرداخت امن',
    description: 'پرداخت‌ها را پیگیری کنید و از وضعیت تأیید مطلع شوید.',
    icon: WalletCards,
    span: 'lg:col-span-1 lg:row-span-1',
    variant: 'dark',
    action: { label: 'مشاهده روش‌ها', href: '/pricing' },
  },
  {
    title: 'اعلان‌های هوشمند',
    description: 'از تغییر وضعیت درخواست و موارد نیازمند اقدام آگاه شوید.',
    icon: Bell,
    span: '',
    variant: 'outlined',
    action: null,
  },
  {
    title: 'خانواده چند فرزندی',
    description: 'تمام دانش‌آموزان خانواده را در یک حساب مدیریت کنید.',
    icon: UserRound,
    span: 'lg:col-span-1 lg:row-span-1',
    variant: 'premium',
    action: { label: 'بیشتر بدانید', href: '/services' },
  },
  {
    title: 'مسیر روشن',
    description: 'وضعیت درخواست، قرارداد و پرداخت را در هر لحظه ببینید.',
    icon: Route,
    span: '',
    variant: 'glass',
    action: null,
  },
];

const variantStyles: Record<TileVariant, string> = {
  primary: 'bg-navy text-white shadow-lg shadow-navy/20',
  light: 'bg-surface-paper text-foreground border border-border shadow-[var(--shadow-raised)]',
  dark: 'bg-ink text-white border border-white/10',
  outlined: 'bg-transparent text-foreground border-2 border-dashed border-border/60',
  premium: 'bg-gradient-to-br from-sun to-sun/80 text-navy shadow-lg shadow-sun/20',
  glass: 'bg-white/60 backdrop-blur-lg text-foreground border border-white/80',
};

export function EcosystemBento() {
  return (
    <section className="surface-paper py-16 sm:py-20 lg:py-24">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <p className="font-bold text-primary">همه چیز در یک سامانه</p>
          <h2 className="mt-2 text-3xl font-black">خدمات یکپارچه برای خانواده‌ها</h2>
          <p className="mt-3 text-muted">
            از ثبت‌نام تا پیگیری روزانه، همه ابزارها در دسترس شماست.
          </p>
        </div>
        <div className="mt-10 grid gap-4 lg:grid-cols-4 lg:grid-rows-3">
          {tiles.map((tile) => (
            <div
              key={tile.title}
              className={cn(
                'group relative flex flex-col rounded-[var(--radius-canvas)] p-6 transition-all duration-[var(--duration-ui)]',
                tile.span,
                variantStyles[tile.variant],
                tile.action && 'cursor-pointer hover:scale-[1.02]',
              )}
            >
              <div className="flex items-center gap-3">
                <span className={cn(
                  'flex size-10 items-center justify-center rounded-xl',
                  tile.variant === 'primary' && 'bg-white/10 text-sun',
                  tile.variant === 'light' && 'bg-primary-soft text-primary',
                  tile.variant === 'dark' && 'bg-white/10 text-sun',
                  tile.variant === 'outlined' && 'bg-surface-inset text-primary',
                  tile.variant === 'premium' && 'bg-navy/10 text-navy',
                  tile.variant === 'glass' && 'bg-primary-soft text-primary',
                )}>
                  <tile.icon aria-hidden="true" className="size-5" />
                </span>
                <h3 className={cn(
                  'font-black',
                  tile.variant === 'premium' && 'text-navy',
                  (tile.variant === 'primary' || tile.variant === 'dark') && 'text-white',
                )}>
                  {tile.title}
                </h3>
              </div>
              <p className={cn(
                'mt-3 text-sm leading-relaxed flex-1',
                tile.variant === 'primary' && 'text-white/70',
                tile.variant === 'light' && 'text-muted',
                tile.variant === 'dark' && 'text-white/60',
                tile.variant === 'outlined' && 'text-muted',
                tile.variant === 'premium' && 'text-navy/70',
                tile.variant === 'glass' && 'text-muted',
              )}>
                {tile.description}
              </p>
              {tile.action && (
                <div className="mt-4">
                  <ButtonLink
                    href={tile.action.href}
                    size="sm"
                    variant={
                      tile.variant === 'primary' ? 'inverse' :
                      tile.variant === 'premium' ? 'primary' :
                      tile.variant === 'dark' ? 'inverse' : 'ghost'
                    }
                    className={cn(
                      'w-fit',
                      tile.variant === 'primary' && 'bg-white/15 text-white hover:bg-white/25',
                      tile.variant === 'premium' && 'bg-navy text-white hover:bg-navy/90',
                    )}
                  >
                    {tile.action.label}
                  </ButtonLink>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
