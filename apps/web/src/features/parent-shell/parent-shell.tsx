'use client';

import {
  Bell,
  ChevronDown,
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
import type { ReactNode } from 'react';

import { Button, ButtonLink } from '@/components/ui/button';
import { Drawer, DrawerClose, DrawerContent, DrawerTrigger } from '@/components/ui/drawer';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { BrandMark } from '@/components/brand/brand-mark';
import { LogoutMenuItem } from '@/features/auth/logout-menu-item';
import { cn } from '@/lib/cn';

const navGroups = [
  {
    group: 'امروز',
    items: [
      { href: '/parent/dashboard', label: 'نمای کلی', icon: LayoutDashboard },
      { href: '/parent/notifications', label: 'اعلان‌ها', icon: Bell },
    ],
  },
  {
    group: 'خدمات',
    items: [
      { href: '/parent/students', label: 'دانش‌آموزان', icon: GraduationCap },
      { href: '/parent/enrollments', label: 'ثبت‌نام', icon: ClipboardList },
    ],
  },
  {
    group: 'حساب',
    items: [
      { href: '/parent/contracts', label: 'قراردادها', icon: FileText },
      { href: '/parent/payments', label: 'پرداخت‌ها', icon: WalletCards },
      { href: '/parent/profile', label: 'اطلاعات خانواده', icon: UserRound },
    ],
  },
] as const;

const mobileDock = [
  { href: '/parent/dashboard', label: 'خانه', icon: Home },
  { href: '/parent/students', label: 'دانش‌آموزان', icon: GraduationCap },
  { href: '/parent/enrollments', label: 'ثبت‌نام', icon: ClipboardList },
  { href: '/parent/payments', label: 'پرداخت‌ها', icon: WalletCards },
] as const;

function ParentNavigation({ mobile = false }: { mobile?: boolean }) {
  const pathname = usePathname();

  const content = navGroups.map(({ group, items }) => (
    <div key={group} className="space-y-1">
      <p className="px-3 text-[10px] font-bold uppercase tracking-widest text-white/40">{group}</p>
      {items.map(({ href, label, icon: Icon }) => {
        const active = pathname === href || pathname.startsWith(`${href}/`);
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

  return <div className="space-y-6">{content}</div>;
}

export function ParentShell({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen overflow-x-clip bg-[var(--paper)]">
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
            <DrawerContent title="پنل خانواده" description="دسترسی به بخش‌های حساب خانواده">
              <ParentNavigation mobile />
            </DrawerContent>
          </Drawer>

          <Link
            href="/parent/dashboard"
            className="flex items-center gap-2.5 font-black text-foreground"
          >
            <BrandMark size={24} />
            <span className="hidden sm:inline">پنل خانواده</span>
          </Link>

          <div className="ms-auto flex items-center gap-2">
            <ButtonLink
              href="/parent/enrollments"
              size="sm"
              className="bg-navy text-white hover:bg-navy/90 hidden sm:inline-flex"
            >
              <Plus aria-hidden="true" className="size-4" />
              ثبت‌نام دانش‌آموز
            </ButtonLink>
            <Link
              href="/parent/notifications"
              className="grid size-11 place-items-center rounded-[var(--radius-control)] text-muted hover:bg-surface-inset hover:text-foreground transition-colors"
              aria-label="مشاهده اعلان‌ها"
            >
              <Bell aria-hidden="true" className="size-5" />
            </Link>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label="منوی حساب خانواده"
                  className="sm:w-auto sm:px-4"
                >
                  <UserRound aria-hidden="true" className="size-5" />
                  <span className="hidden sm:inline">حساب خانواده</span>
                  <ChevronDown aria-hidden="true" className="hidden size-4 sm:block" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <LogoutMenuItem />
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </header>

      <div className="mx-auto flex max-w-[var(--width-portal)]">
        <aside className="hidden min-h-[calc(100vh-4rem)] w-[16rem] shrink-0 border-l border-white/10 bg-navy p-5 lg:block">
          <div className="mb-8 flex items-center gap-3 px-3">
            <BrandMark size={24} className="text-sun" />
            <div>
              <p className="text-sm font-black text-white">سرویس مدرسه</p>
              <p className="text-[10px] text-white/40">پنل خانواده</p>
            </div>
          </div>
          <ParentNavigation />
          <div className="mt-8 border-t border-white/10 pt-6">
            <ButtonLink
              href="/parent/enrollments"
              size="sm"
              className="w-full bg-sun text-navy hover:bg-sun/90"
            >
              <Plus aria-hidden="true" className="size-4" />
              ثبت‌نام دانش‌آموز
            </ButtonLink>
          </div>
        </aside>
        <main className="portal-main min-w-0 flex-1 p-4 sm:p-6 lg:p-8 xl:p-10">{children}</main>
      </div>

      <nav
        aria-label="ناوبری سریع موبایل"
        className="fixed bottom-0 left-0 right-0 z-40 flex items-center justify-around border-t border-border/60 bg-white px-2 pb-safe lg:hidden"
      >
        {mobileDock.map(({ href, label, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            className="flex flex-col items-center gap-0.5 px-3 py-2 text-[10px] font-bold text-muted transition-colors hover:text-primary"
          >
            <Icon aria-hidden="true" className="size-5" />
            {label}
          </Link>
        ))}
      </nav>
    </div>
  );
}
