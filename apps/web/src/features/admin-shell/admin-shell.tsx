'use client';

import {
  Bell,
  Building2,
  ChevronDown,
  ClipboardCheck,
  FileText,
  GraduationCap,
  LayoutDashboard,
  Menu,
  Search,
  Settings,
  Shield,
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
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { BrandMark } from '@/components/brand/brand-mark';
import { AutoSubmitForm } from '@/components/forms/auto-submit-form';
import { LogoutMenuItem } from '@/features/auth/logout-menu-item';
import { cn } from '@/lib/cn';

const navigation = [
  { href: '/admin/dashboard', label: 'داشبورد', icon: LayoutDashboard },
  { href: '/admin/registrations', label: 'ثبت‌نام‌ها', icon: ClipboardCheck },
  { href: '/admin/families', label: 'خانواده‌ها', icon: UsersRound },
  { href: '/admin/students', label: 'دانش‌آموزان', icon: GraduationCap },
  { href: '/admin/schools', label: 'مدارس', icon: Building2 },
  { href: '/admin/contracts', label: 'قراردادها', icon: FileText },
  { href: '/admin/payments', label: 'پرداخت‌ها', icon: WalletCards },
  { href: '/admin/notifications', label: 'اعلان‌ها', icon: Bell },
  { href: '/admin/admins', label: 'مدیران', icon: Shield },
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
              'flex min-h-10 items-center gap-3 rounded-[var(--radius-control)] px-3 text-sm font-bold transition-all duration-[var(--duration-fast)]',
              mobile
                ? active
                  ? 'bg-primary-soft text-primary'
                  : 'text-muted hover:bg-surface-muted hover:text-foreground'
                : active
                  ? 'bg-sun text-navy shadow-lg shadow-sun/10'
                  : 'text-white/60 hover:bg-white/8 hover:text-white',
            )}
          >
            <Icon aria-hidden="true" className={cn('size-4', active && (mobile ? 'text-primary' : 'text-navy'))} />
            {label}
            {active && (
              <span className={cn('mr-auto h-1.5 w-1.5 rounded-full', mobile ? 'bg-primary' : 'bg-navy')} aria-hidden="true" />
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
    </nav>
  );
}

export function AdminShell({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen overflow-x-clip bg-[radial-gradient(circle_at_15%_10%,rgba(34,87,230,.08),transparent_24%),var(--mist)]">
      <header className="sticky top-0 z-40 border-b border-white/70 bg-white/85 shadow-sm backdrop-blur-xl">
        <div className="mx-auto flex min-h-14 max-w-[96rem] items-center gap-3 px-4 sm:px-6">
          <Drawer>
            <DrawerTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="lg:hidden"
                aria-label="باز کردن منوی مدیریت"
              >
                <Menu aria-hidden="true" className="size-5" />
              </Button>
            </DrawerTrigger>
            <DrawerContent title="پنل مدیریت" description="بخش‌های عملیاتی">
              <AdminNavigation mobile />
            </DrawerContent>
          </Drawer>

          <Link href="/admin/dashboard" className="flex items-center gap-2 font-black text-foreground">
            <BrandMark size={24} />
            <span className="hidden sm:inline">پنل مدیریت</span>
          </Link>

          <AutoSubmitForm action="/admin/registrations" method="get" className="ms-auto hidden w-full max-w-xs lg:block">
            <label>
              <span className="sr-only">جست‌وجوی مدیریتی</span>
              <span className="relative block">
              <Search
                aria-hidden="true"
                className="absolute end-3 top-1/2 size-4 -translate-y-1/2 text-muted"
              />
                <Input type="search" name="q" placeholder="جست‌وجوی ثبت‌نام‌ها..." className="pe-10 h-9 text-sm rounded-[var(--radius-pill)] bg-surface-muted border-0" />
              </span>
            </label>
          </AutoSubmitForm>

          <Link
            href="/admin/notifications"
            className="relative grid size-9 place-items-center rounded-[var(--radius-control)] text-muted hover:bg-surface-muted hover:text-foreground transition-colors"
            aria-label="اعلان‌های مدیریت"
          >
            <Bell aria-hidden="true" className="size-4" />
            <span className="absolute -top-0.5 -right-0.5 flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-danger opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-danger" />
            </span>
          </Link>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="px-2 h-9 text-sm" aria-label="منوی حساب مدیر">
                <UserRound aria-hidden="true" className="size-4" />
                <span className="hidden sm:inline">مدیر نمونه</span>
                <ChevronDown aria-hidden="true" className="size-3.5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <LogoutMenuItem />
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>

      <div className="mx-auto flex max-w-[96rem]">
        <aside className="sticky top-14 hidden h-[calc(100vh-3.5rem)] w-[16rem] shrink-0 overflow-y-auto bg-navy p-4 lg:block">
          <div className="mb-6 rounded-2xl border border-white/10 bg-white/5 p-4">
            <p className="text-xs font-bold text-sun">مرکز عملیات</p>
            <p className="mt-1 text-sm font-black text-white">مدیریت سرویس مدارس</p>
            <p className="mt-2 text-[11px] leading-5 text-white/45">ثبت‌نام، قرارداد، مسیر و پرداخت در یک فضای یکپارچه</p>
          </div>
          <AdminNavigation />
        </aside>
        <main className="portal-main min-w-0 flex-1 p-4 sm:p-6 lg:p-8 xl:p-10">{children}</main>
      </div>
    </div>
  );
}
