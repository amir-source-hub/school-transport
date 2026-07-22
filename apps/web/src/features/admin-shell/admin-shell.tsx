'use client';

import {
  Bell,
  Building2,
  BusFront,
  ChevronDown,
  ClipboardCheck,
  FileText,
  GraduationCap,
  LayoutDashboard,
  Menu,
  Search,
  Settings,
  Tags,
  UserRound,
  UsersRound,
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
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/cn';

const navigation = [
  { href: '/admin/dashboard', label: 'داشبورد', icon: LayoutDashboard },
  { href: '/admin/registrations', label: 'درخواست‌های ثبت‌نام', icon: ClipboardCheck },
  { href: '/admin/families', label: 'خانواده‌ها', icon: UsersRound },
  { href: '/admin/students', label: 'دانش‌آموزان', icon: GraduationCap },
  { href: '/admin/schools', label: 'مدارس', icon: Building2 },
  { href: '/admin/service-requests', label: 'درخواست‌های خدمت', icon: BusFront },
  { href: '/admin/contracts', label: 'قراردادها', icon: FileText },
  { href: '/admin/pricing', label: 'قیمت‌گذاری', icon: Tags },
  { href: '/admin/payments', label: 'پرداخت‌ها', icon: WalletCards },
  { href: '/admin/notifications', label: 'اعلان‌ها', icon: Bell },
  { href: '/admin/settings', label: 'تنظیمات', icon: Settings },
] as const;

function AdminNavigation({ mobile = false }: { mobile?: boolean }) {
  const pathname = usePathname();
  return (
    <nav aria-label="ناوبری پنل مدیریت" className="space-y-1">
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

export function AdminShell({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-40 border-b border-border bg-surface/95 backdrop-blur">
        <div className="mx-auto flex min-h-16 max-w-[96rem] items-center gap-3 px-4 sm:px-6">
          <Drawer>
            <DrawerTrigger asChild>
              <Button
                variant="ghost"
                className="size-11 px-0 lg:hidden"
                aria-label="باز کردن منوی مدیریت"
              >
                <Menu aria-hidden="true" className="size-5" />
              </Button>
            </DrawerTrigger>
            <DrawerContent title="پنل مدیریت" description="بخش‌های عملیاتی نسخه MVP">
              <AdminNavigation mobile />
            </DrawerContent>
          </Drawer>
          <Link href="/admin/dashboard" className="font-black text-foreground">
            پنل مدیریت
          </Link>
          <label className="ms-auto hidden w-full max-w-sm lg:block">
            <span className="sr-only">جست‌وجوی مدیریتی</span>
            <span className="relative block">
              <Search
                aria-hidden="true"
                className="absolute end-3 top-1/2 size-4 -translate-y-1/2 text-muted"
              />
              <Input placeholder="جست‌وجوی سریع..." className="pe-10" />
            </span>
          </label>
          <Link
            href="/admin/notifications"
            className="grid size-11 place-items-center rounded-[var(--radius-sm)] text-muted hover:bg-surface-muted hover:text-foreground"
            aria-label="اعلان‌های مدیریت"
          >
            <Bell aria-hidden="true" className="size-5" />
          </Link>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="px-3" aria-label="منوی حساب مدیر">
                <UserRound aria-hidden="true" className="size-5" />
                <span className="hidden sm:inline">مدیر نمونه</span>
                <ChevronDown aria-hidden="true" className="size-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuItem disabled>خروج پس از اتصال احراز هویت فعال می‌شود</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>
      <div className="mx-auto grid max-w-[96rem] lg:grid-cols-[18rem_1fr]">
        <aside className="hidden min-h-[calc(100vh-4rem)] border-l border-border bg-surface p-5 lg:block">
          <AdminNavigation />
        </aside>
        <main className="min-w-0 p-4 sm:p-6 lg:p-8">{children}</main>
      </div>
    </div>
  );
}
