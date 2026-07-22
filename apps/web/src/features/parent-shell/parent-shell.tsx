'use client';

import {
  Bell,
  BusFront,
  ChevronDown,
  ClipboardList,
  FileText,
  GraduationCap,
  Home,
  LayoutDashboard,
  Menu,
  UserRound,
  WalletCards,
} from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { ReactNode } from 'react';

import { Button } from '@/components/ui/button';
import { Drawer, DrawerClose, DrawerContent, DrawerTrigger } from '@/components/ui/drawer';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { BrandMark } from '@/components/brand/brand-mark';
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
      { href: '/parent/service-requests', label: 'درخواست خدمت', icon: BusFront },
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
      <p className="px-3 text-xs font-bold uppercase tracking-wider text-muted">{group}</p>
      {items.map(({ href, label, icon: Icon }) => {
        const active = pathname === href || pathname.startsWith(`${href}/`);
        const link = (
          <Link
            href={href}
            aria-current={active ? 'page' : undefined}
            className={cn(
              'relative flex min-h-11 items-center gap-3 rounded-[var(--radius-control)] px-3 text-sm font-bold transition-colors',
              active
                ? 'bg-primary-soft text-primary-hover'
                : 'text-muted hover:bg-surface-inset hover:text-foreground',
            )}
          >
            <Icon aria-hidden="true" className="size-5" />
            {label}
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
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-40 border-b border-border bg-surface/95 backdrop-blur">
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

          <Link href="/parent/dashboard" className="flex items-center gap-2 font-black text-foreground">
            <BrandMark size={24} />
            <span className="hidden sm:inline">پنل خانواده</span>
          </Link>

          <div className="ms-auto flex items-center gap-1">
            <Link
              href="/parent/notifications"
              className="grid size-11 place-items-center rounded-[var(--radius-control)] text-muted hover:bg-surface-inset hover:text-foreground"
              aria-label="مشاهده اعلان‌ها"
            >
              <Bell aria-hidden="true" className="size-5" />
            </Link>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" aria-label="منوی حساب خانواده">
                  <UserRound aria-hidden="true" className="size-5" />
                  <span className="hidden sm:inline">حساب خانواده</span>
                  <ChevronDown aria-hidden="true" className="size-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuItem disabled>
                  خروج پس از اتصال احراز هویت فعال می‌شود
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </header>

      <div className="mx-auto grid max-w-[var(--width-portal)] lg:grid-cols-[16rem_1fr]">
        <aside className="hidden min-h-[calc(100vh-4rem)] border-l border-border bg-surface p-5 lg:block">
          <ParentNavigation />
        </aside>
        <main className="min-w-0 p-4 sm:p-6 lg:p-8">{children}</main>
      </div>

      <nav
        aria-label="ناوبری سریع موبایل"
        className="fixed bottom-0 left-0 right-0 z-40 flex items-center justify-around border-t border-border bg-surface-paper px-2 pb-safe lg:hidden"
      >
        {mobileDock.map(({ href, label, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            className="flex flex-col items-center gap-0.5 px-3 py-2 text-[10px] font-bold text-muted"
          >
            <Icon aria-hidden="true" className="size-5" />
            {label}
          </Link>
        ))}
      </nav>
    </div>
  );
}
