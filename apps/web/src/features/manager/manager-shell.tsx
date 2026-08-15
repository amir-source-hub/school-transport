'use client';
import type { ReactNode } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Building2,
  Bus,
  GraduationCap,
  LayoutDashboard,
  Menu,
  MessageSquareText,
  Monitor,
  Settings,
  Sparkles,
} from 'lucide-react';
import { BrandMark } from '@/components/brand/brand-mark';
import { Button } from '@/components/ui/button';
import { Drawer, DrawerClose, DrawerContent, DrawerTrigger } from '@/components/ui/drawer';
import { LogoutMenuItem } from '@/features/auth/logout-menu-item';
import { cn } from '@/lib/cn';

const links = [
  ['/manager/dashboard', 'داشبورد', LayoutDashboard],
  ['/manager/students', 'دانش‌آموزان', GraduationCap],
  ['/manager/drivers', 'رانندگان', Bus],
  ['/manager/online-control', 'کنترل آنلاین', Monitor],
  ['/manager/hyperschool', 'هایپرمدرسه', Sparkles],
  ['/manager/feedback', 'انتقادات و پیشنهادات', MessageSquareText],
  ['/manager/settings', 'تنظیمات', Settings],
] as const;
export function isManagerRouteActive(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
}
function Navigation({ mobile = false }: { mobile?: boolean }) {
  const pathname = usePathname();
  return (
    <div className="flex min-h-full flex-col">
      <nav aria-label="ناوبری پنل مدیر مدرسه" className="space-y-1">
        {links.map(([href, label, Icon]) => {
          const active = isManagerRouteActive(pathname, href);
          const link = (
            <Link
              href={href}
              aria-current={active ? 'page' : undefined}
              className={cn(
                'flex min-h-11 items-center gap-3 rounded-xl px-3 py-2 text-sm font-bold',
                active ? 'bg-sun text-navy' : 'text-white hover:bg-white/10',
              )}
            >
              <Icon className="size-4" aria-hidden="true" />
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
      <div className="mt-auto border-t border-white/10 pt-4">
        <LogoutMenuItem mobile={false} />
      </div>
    </div>
  );
}
export function ManagerShell({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-[var(--paper)]">
      <header className="sticky top-0 z-40 border-b border-border/60 bg-white/90 backdrop-blur-xl">
        <div className="mx-auto flex min-h-16 max-w-[96rem] items-center gap-3 px-4 sm:px-6">
          <Drawer>
            <DrawerTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="lg:hidden"
                aria-label="باز کردن منوی مدیر مدرسه"
              >
                <Menu className="size-5" />
              </Button>
            </DrawerTrigger>
            <DrawerContent title="پنل مدیر مدرسه" description="مدیریت خدمات مدرسه" dark>
              <Navigation mobile />
            </DrawerContent>
          </Drawer>
          <Link href="/manager/dashboard" className="flex items-center gap-2 font-black">
            <BrandMark size={24} />
            <span>پنل مدیر مدرسه</span>
          </Link>
          <span className="ms-auto hidden items-center gap-2 text-xs font-bold text-muted sm:flex">
            <Building2 className="size-4" />
            مرکز عملیات مدرسه
          </span>
        </div>
      </header>
      <div className="mx-auto flex max-w-[96rem]">
        <aside className="sticky top-16 hidden h-[calc(100vh-4rem)] w-64 shrink-0 bg-navy p-5 lg:block">
          <div className="mb-6 rounded-2xl border border-white/10 bg-white/5 p-4">
            <p className="text-xs font-bold text-sun">مدیریت مدرسه</p>
            <p className="mt-2 text-xs leading-6 text-white/55">
              دانش‌آموزان، سرویس‌ها و ارتباط با سامانه در یک نمای امن
            </p>
          </div>
          <div className="h-[calc(100%-7rem)]">
            <Navigation />
          </div>
        </aside>
        <main className="min-w-0 flex-1 p-4 sm:p-6 lg:p-8 xl:p-10">{children}</main>
      </div>
    </div>
  );
}
