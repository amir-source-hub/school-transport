'use client';

import {
  Bell,
  ClipboardList,
  FileText,
  GraduationCap,
  Home,
  LayoutDashboard,
  Menu,
  Plus,
  UserRound,
  WalletCards,
} from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState, type ReactNode } from 'react';

import { Button, ButtonLink } from '@/components/ui/button';
import { Drawer, DrawerClose, DrawerContent, DrawerTrigger } from '@/components/ui/drawer';
import { BrandMark } from '@/components/brand/brand-mark';
import { LogoutMenuItem } from '@/features/auth/logout-menu-item';
import { cn } from '@/lib/cn';

const navGroups = [
  {
    group: 'امروز',
    items: [
      { href: '/student/dashboard', label: 'نمای کلی', icon: LayoutDashboard },
      { href: '/student/notifications', label: 'اعلان‌ها', icon: Bell },
    ],
  },
  {
    group: 'خدمات',
    items: [
      { href: '/student/students', label: 'دانش‌آموزان', icon: GraduationCap },
      { href: '/student/enrollments', label: 'ثبت‌نام', icon: ClipboardList },
    ],
  },
  {
    group: 'حساب',
    items: [
      { href: '/student/contracts', label: 'قراردادها', icon: FileText },
      { href: '/student/payments', label: 'پرداخت‌ها', icon: WalletCards },
      { href: '/student/profile', label: 'اطلاعات خانواده', icon: UserRound },
    ],
  },
] as const;

const mobileDock = [
  { href: '/student/dashboard', label: 'خانه', icon: Home },
  { href: '/student/students', label: 'دانش‌آموزان', icon: GraduationCap },
  { href: '/student/enrollments', label: 'ثبت‌نام', icon: ClipboardList },
  { href: '/student/payments', label: 'پرداخت‌ها', icon: WalletCards },
] as const;

export function isStudentRouteActive(pathname: string, href: string) {
  const normalizedPath = pathname.length > 1 ? pathname.replace(/\/+$/, '') : pathname;
  const normalizedHref = href.length > 1 ? href.replace(/\/+$/, '') : href;
  return normalizedPath === normalizedHref || normalizedPath.startsWith(`${normalizedHref}/`);
}

function useVirtualKeyboardOpen() {
  const [keyboardOpen, setKeyboardOpen] = useState(false);

  useEffect(() => {
    const viewport = window.visualViewport;
    if (!viewport) return;

    const update = () => {
      const focused = document.activeElement;
      const editing =
        focused instanceof HTMLInputElement ||
        focused instanceof HTMLTextAreaElement ||
        focused instanceof HTMLSelectElement ||
        (focused instanceof HTMLElement && focused.isContentEditable);
      setKeyboardOpen(editing && viewport.height < window.innerHeight * 0.75);
    };

    viewport.addEventListener('resize', update);
    document.addEventListener('focusin', update);
    document.addEventListener('focusout', update);
    update();
    return () => {
      viewport.removeEventListener('resize', update);
      document.removeEventListener('focusin', update);
      document.removeEventListener('focusout', update);
    };
  }, []);

  return keyboardOpen;
}

function StudentNavigation({ mobile = false }: { mobile?: boolean }) {
  const pathname = usePathname();

  const content = navGroups.map(({ group, items }) => (
    <div key={group} className="space-y-1">
      <p className="px-3 text-[10px] font-bold uppercase tracking-widest text-white/50">{group}</p>
      {items.map(({ href, label, icon: Icon }) => {
        const active = isStudentRouteActive(pathname, href);
        const link = (
          <Link
            href={href}
            aria-current={active ? 'page' : undefined}
            className={cn(
              'relative flex min-h-11 items-center gap-3 rounded-[var(--radius-control)] px-3 text-sm font-bold transition-all duration-[var(--duration-fast)]',
              active ? 'bg-sun/15 text-sun' : 'text-white/60 hover:bg-white/5 hover:text-white',
            )}
          >
            <Icon aria-hidden="true" className="size-5" />
            {label}
            {active && (
              <span
                className="absolute right-0 top-1/2 h-5 w-0.5 -translate-y-1/2 rounded-full bg-sun"
                aria-hidden="true"
              />
            )}
          </Link>
        );

        return mobile ? (
          <DrawerClose asChild key={href}>
            {link}
          </DrawerClose>
        ) : (
          <div key={href}>{link}</div>
        );
      })}
    </div>
  ));

  return (
    <div className="flex min-h-full flex-col">
      <div className="space-y-6">{content}</div>
      <div className="mt-6 space-y-2 border-t pt-4">
        <Link
          href="/"
          className="flex min-h-11 items-center gap-3 rounded-[var(--radius-control)] px-3 text-sm font-bold text-white/60 transition-colors hover:bg-white/5 hover:text-white"
        >
          <Home aria-hidden="true" className="size-5" />
          صفحه اصلی سایت
        </Link>
        <LogoutMenuItem mobile={mobile} />
      </div>
    </div>
  );
}

export function StudentShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const keyboardOpen = useVirtualKeyboardOpen();

  return (
    <div className="min-h-screen overflow-x-clip bg-[var(--paper)] [--parent-mobile-dock-height:4rem]">
      <header className="sticky top-0 z-40 border-b border-border/60 bg-white/90 backdrop-blur-lg">
        <div className="mx-auto flex min-h-16 max-w-[var(--width-portal)] items-center gap-3 px-4 sm:px-6">
          <Drawer>
            <DrawerTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="lg:hidden"
                aria-label="باز کردن منوی پنل"
              >
                <Menu aria-hidden="true" className="size-5" />
              </Button>
            </DrawerTrigger>
            <DrawerContent title="پنل دانش‌آموز" description="دسترسی به بخش‌های سرویس دانش‌آموزان">
              <StudentNavigation mobile />
            </DrawerContent>
          </Drawer>

          <Link
            href="/student/dashboard"
            aria-label="پنل دانش‌آموز"
            className="flex items-center gap-2.5 font-black text-foreground"
          >
            <BrandMark size={24} />
            <span className="hidden sm:inline">پنل دانش‌آموز</span>
          </Link>

          <div className="ms-auto flex items-center gap-2">
            <ButtonLink
              href="/student/enrollments"
              size="sm"
              className="bg-navy text-white hover:bg-navy/90 hidden sm:inline-flex"
            >
              <Plus aria-hidden="true" className="size-4" />
              ثبت‌نام دانش‌آموز
            </ButtonLink>
            <Link
              href="/student/notifications"
              className="grid size-11 place-items-center rounded-[var(--radius-control)] text-muted hover:bg-surface-inset hover:text-foreground transition-colors"
              aria-label="مشاهده اعلان‌ها"
            >
              <Bell aria-hidden="true" className="size-5" />
            </Link>
          </div>
        </div>
      </header>

      <div className="mx-auto flex max-w-[var(--width-portal)]">
        <aside className="hidden min-h-[calc(100vh-4rem)] w-[16rem] shrink-0 border-l border-white/10 bg-navy p-5 lg:block">
          <div className="mb-8 flex items-center gap-3 px-3">
            <BrandMark size={24} className="text-sun" />
            <div>
              <p className="text-sm font-black text-white">سرویس مدرسه</p>
              <p className="text-[10px] text-white/50">پنل دانش‌آموز</p>
            </div>
          </div>
          <StudentNavigation />
          <div className="mt-8 border-t border-white/10 pt-6">
            <ButtonLink
              href="/student/enrollments"
              size="sm"
              className="w-full bg-sun text-navy hover:bg-sun/90"
            >
              <Plus aria-hidden="true" className="size-4" />
              ثبت‌نام دانش‌آموز
            </ButtonLink>
          </div>
        </aside>
        <main className="portal-main min-w-0 flex-1 scroll-pb-[calc(var(--parent-mobile-dock-height)+env(safe-area-inset-bottom)+1rem)] p-4 pb-[calc(var(--parent-mobile-dock-height)+env(safe-area-inset-bottom)+1rem)] sm:p-6 sm:pb-[calc(var(--parent-mobile-dock-height)+env(safe-area-inset-bottom)+1.5rem)] lg:p-8 lg:pb-8 xl:p-10 xl:pb-10 [&_:focus]:scroll-mb-[calc(var(--parent-mobile-dock-height)+env(safe-area-inset-bottom)+1rem)]">
          {children}
        </main>
      </div>

      <nav
        aria-label="ناوبری سریع موبایل"
        data-keyboard-open={keyboardOpen || undefined}
        className={cn(
          'fixed inset-x-0 bottom-0 z-40 flex min-h-[calc(var(--parent-mobile-dock-height)+env(safe-area-inset-bottom))] items-start justify-around border-t border-border/60 bg-white/95 px-1 pb-[env(safe-area-inset-bottom)] shadow-[0_-8px_24px_-20px_rgba(15,23,42,.45)] backdrop-blur-lg lg:hidden',
          keyboardOpen && 'hidden',
        )}
      >
        {mobileDock.map(({ href, label, icon: Icon }) => {
          const active = isStudentRouteActive(pathname, href);
          return (
            <Link
              key={href}
              href={href}
              aria-current={active ? 'page' : undefined}
              className={cn(
                'flex min-h-14 min-w-0 flex-1 flex-col items-center justify-center gap-0.5 rounded-lg px-1 py-1.5 text-[10px] font-bold transition-colors focus-visible:outline-offset-[-3px] min-[360px]:text-[11px]',
                active ? 'text-primary' : 'text-muted hover:text-primary',
              )}
            >
              <Icon aria-hidden="true" className="size-5 shrink-0" />
              <span className="max-w-full truncate">{label}</span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
