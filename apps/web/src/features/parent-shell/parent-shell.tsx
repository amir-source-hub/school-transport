'use client';

import {
  Bell,
  BusFront,
  ChevronDown,
  ClipboardList,
  FileText,
  GraduationCap,
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
import { cn } from '@/lib/cn';

const navigation = [
  { href: '/parent/dashboard', label: 'نمای کلی', icon: LayoutDashboard },
  { href: '/parent/students', label: 'دانش‌آموزان', icon: GraduationCap },
  { href: '/parent/enrollments', label: 'ثبت‌نام', icon: ClipboardList },
  { href: '/parent/service-requests', label: 'درخواست خدمت', icon: BusFront },
  { href: '/parent/contracts', label: 'قراردادها', icon: FileText },
  { href: '/parent/payments', label: 'پرداخت‌ها', icon: WalletCards },
  { href: '/parent/notifications', label: 'اعلان‌ها', icon: Bell },
  { href: '/parent/profile', label: 'اطلاعات خانواده', icon: UserRound },
] as const;

function ParentNavigation({ mobile = false }: { mobile?: boolean }) {
  const pathname = usePathname();

  return (
    <nav aria-label="ناوبری پنل خانواده" className="space-y-1">
      {navigation.map(({ href, label, icon: Icon }) => {
        const active = pathname === href || pathname.startsWith(`${href}/`);
        const link = (
          <Link
            href={href}
            aria-current={active ? 'page' : undefined}
            className={cn(
              'flex min-h-11 items-center gap-3 rounded-[var(--radius-sm)] px-3 text-sm font-bold transition-colors',
              active
                ? 'bg-primary-soft text-primary-hover'
                : 'text-muted hover:bg-surface-muted hover:text-foreground',
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
    </nav>
  );
}

export function ParentShell({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-40 border-b border-border bg-surface/95 backdrop-blur">
        <div className="mx-auto flex min-h-16 max-w-[90rem] items-center gap-3 px-4 sm:px-6">
          <Drawer>
            <DrawerTrigger asChild>
              <Button
                variant="ghost"
                className="size-11 px-0 lg:hidden"
                aria-label="باز کردن منوی پنل"
              >
                <Menu aria-hidden="true" className="size-5" />
              </Button>
            </DrawerTrigger>
            <DrawerContent title="پنل خانواده" description="دسترسی به بخش‌های حساب خانواده">
              <ParentNavigation mobile />
            </DrawerContent>
          </Drawer>

          <Link href="/parent/dashboard" className="font-black text-foreground">
            پنل خانواده
          </Link>
          <span className="rounded-full bg-warning-soft px-3 py-1 text-xs font-bold text-warning">
            داده نمایشی
          </span>

          <div className="ms-auto flex items-center gap-1">
            <Link
              href="/parent/notifications"
              className="grid size-11 place-items-center rounded-[var(--radius-sm)] text-muted hover:bg-surface-muted hover:text-foreground"
              aria-label="مشاهده اعلان‌ها"
            >
              <Bell aria-hidden="true" className="size-5" />
            </Link>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="px-3" aria-label="منوی حساب خانواده">
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

      <div className="mx-auto grid max-w-[90rem] lg:grid-cols-[17rem_1fr]">
        <aside className="hidden min-h-[calc(100vh-4rem)] border-l border-border bg-surface p-5 lg:block">
          <ParentNavigation />
        </aside>
        <main className="min-w-0 p-4 sm:p-6 lg:p-8">{children}</main>
      </div>
    </div>
  );
}
