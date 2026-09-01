'use client';

import type { ReactNode } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { FileImage, GraduationCap, Home, LayoutDashboard, Menu, Route, UserRound } from 'lucide-react';

import { BrandMark } from '@/components/brand/brand-mark';
import { Button, ButtonLink } from '@/components/ui/button';
import { Drawer, DrawerClose, DrawerContent, DrawerTrigger } from '@/components/ui/drawer';
import { LogoutMenuItem } from '@/features/auth/logout-menu-item';
import { cn } from '@/lib/cn';

const navGroups = [
  {
    group: 'امروز',
    items: [
      { href: '/driver/dashboard', label: 'نمای کلی', icon: LayoutDashboard },
      { href: '/driver/service-runs', label: 'سرویس‌های من', icon: Route },
    ],
  },
  {
    group: 'مدیریت',
    items: [
      { href: '/driver/students', label: 'دانش‌آموزان', icon: GraduationCap },
      { href: '/driver/profile', label: 'اطلاعات من و خودرو', icon: UserRound },
      { href: '/driver/documents', label: 'تصاویر من', icon: FileImage },
    ],
  },
] as const;

const mobileDock = [
  { href: '/driver/dashboard', label: 'خانه', icon: Home },
  { href: '/driver/service-runs', label: 'سرویس‌ها', icon: Route },
  { href: '/driver/students', label: 'دانش‌آموزان', icon: GraduationCap },
  { href: '/driver/profile', label: 'اطلاعات من', icon: UserRound },
] as const;

export function isDriverRouteActive(pathname: string, href: string) {
  const normalizedPath = pathname.length > 1 ? pathname.replace(/\/+$/, '') : pathname;
  const normalizedHref = href.length > 1 ? href.replace(/\/+$/, '') : href;
  return normalizedPath === normalizedHref || normalizedPath.startsWith(`${normalizedHref}/`);
}

function DriverNavigation({ mobile = false }: { mobile?: boolean }) {
  const pathname = usePathname();
  return (
    <div className="flex min-h-full flex-col">
      <div className="space-y-6">
        {navGroups.map(({ group, items }) => (
          <div key={group} className="space-y-1">
            <p className="px-3 text-[10px] font-bold uppercase tracking-widest text-white/50">{group}</p>
            {items.map(({ href, label, icon: Icon }) => {
              const active = isDriverRouteActive(pathname, href);
              const link = (
                <Link
                  href={href}
                  aria-current={active ? 'page' : undefined}
                  className={cn(
                    'relative flex min-h-11 items-center gap-3 rounded-[var(--radius-control)] px-3 text-sm font-bold transition-all duration-[var(--duration-fast)]',
                    active ? 'bg-sun/15 text-sun' : 'text-white hover:bg-white/10',
                  )}
                >
                  <Icon aria-hidden="true" className="size-5" />
                  {label}
                  {active && <span aria-hidden="true" className="absolute right-0 top-1/2 h-5 w-0.5 -translate-y-1/2 rounded-full bg-sun" />}
                </Link>
              );
              return mobile ? <DrawerClose asChild key={href}>{link}</DrawerClose> : <div key={href}>{link}</div>;
            })}
          </div>
        ))}
      </div>
      <div className="mt-auto border-t border-white/10 pt-4"><LogoutMenuItem mobile={mobile} /></div>
    </div>
  );
}

export function DriverShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  return (
    <div className="min-h-screen overflow-x-clip bg-[var(--paper)] pb-16 lg:pb-0">
      <header className="sticky top-0 z-40 border-b border-border/60 bg-white/90 backdrop-blur-lg">
        <div className="mx-auto flex min-h-16 max-w-[var(--width-portal)] items-center gap-3 px-4 sm:px-6">
          <Drawer>
            <DrawerTrigger asChild>
              <Button variant="ghost" size="icon" className="lg:hidden" aria-label="باز کردن منوی پنل راننده"><Menu aria-hidden="true" className="size-5" /></Button>
            </DrawerTrigger>
            <DrawerContent title="پنل راننده" description="مدیریت سرویس‌ها و اطلاعات راننده" dark><DriverNavigation mobile /></DrawerContent>
          </Drawer>
          <Link href="/driver/dashboard" aria-label="پنل راننده" className="flex items-center gap-2.5 font-black text-foreground">
            <BrandMark size={24} /><span className="hidden sm:inline">پنل راننده</span>
          </Link>
          <ButtonLink href="/" variant="ghost" size="sm" className="ms-auto hidden sm:inline-flex"><Home aria-hidden="true" className="size-4" />صفحه اصلی</ButtonLink>
        </div>
      </header>

      <div className="mx-auto flex max-w-[var(--width-portal)]">
        <aside className="sticky top-16 hidden h-[calc(100vh-4rem)] w-64 shrink-0 self-start overflow-y-auto border-l border-white/10 bg-navy p-5 lg:block">
          <div className="mb-8 flex items-center gap-3 px-3">
            <BrandMark size={24} className="text-sun" />
            <div><p className="text-sm font-black text-white">سرویس مدرسه</p><p className="text-[10px] text-white/50">پنل راننده</p></div>
          </div>
          <div className="h-[calc(100%-4.5rem)]"><DriverNavigation /></div>
        </aside>
        <main className="portal-main min-w-0 flex-1 p-4 sm:p-6 lg:p-8 xl:p-10">{children}</main>
      </div>

      <nav aria-label="ناوبری سریع راننده" className="fixed inset-x-0 bottom-0 z-40 flex min-h-16 items-start justify-around border-t border-border/60 bg-white/95 px-1 shadow-[0_-8px_24px_-20px_rgba(15,23,42,.45)] backdrop-blur-lg lg:hidden">
        {mobileDock.map(({ href, label, icon: Icon }) => {
          const active = isDriverRouteActive(pathname, href);
          return (
            <Link key={href} href={href} aria-current={active ? 'page' : undefined} className={cn('flex min-h-14 min-w-0 flex-1 flex-col items-center justify-center gap-0.5 rounded-lg px-1 py-1.5 text-[10px] font-bold transition-colors min-[360px]:text-[11px]', active ? 'text-primary' : 'text-muted hover:text-primary')}>
              <Icon aria-hidden="true" className="size-5 shrink-0" /><span className="max-w-full truncate">{label}</span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
