'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import { motion, useReducedMotion } from 'motion/react';
import { ButtonLink } from '@/components/ui/button';
import { Drawer, DrawerContent, DrawerTrigger } from '@/components/ui/drawer';
import { PageContainer } from '@/components/common/page-container';
import { BrandMark } from '@/components/brand/brand-mark';
import { SITE_NAME } from '@/lib/route-metadata';
import { cn } from '@/lib/cn';
import { layoutSpring } from '@/components/motion/motion-config';

const links = [
  ['خدمات', '/services'],
  ['مراحل ثبت‌نام', '/registration-guide'],
  ['مدارس', '/schools'],
  ['قیمت‌گذاری', '/pricing'],
  ['ایمنی', '/safety'],
  ['درباره ما', '/about'],
  ['سوالات متداول', '/faq'],
  ['تماس', '/contact'],
] as const;

export function isPublicRouteActive(pathname: string, href: string) {
  const normalizedPath = pathname.length > 1 ? pathname.replace(/\/+$/, '') : pathname;
  const normalizedHref = href.length > 1 ? href.replace(/\/+$/, '') : href;
  return normalizedPath === normalizedHref || normalizedPath.startsWith(`${normalizedHref}/`);
}

function PublicNavLinks({
  onNavigate,
  mobile = false,
}: {
  onNavigate?: () => void;
  mobile?: boolean;
}) {
  const pathname = usePathname();
  const prefersReduced = useReducedMotion();

  return (
    <>
      {links.map(([label, href]) => {
        const isActive = isPublicRouteActive(pathname, href);
        return (
          <Link
            key={href}
            href={href}
            aria-current={isActive ? 'page' : undefined}
            onClick={onNavigate}
            style={!mobile ? { color: isActive ? '#ffffff' : 'rgba(255,255,255,.72)' } : undefined}
            className={cn(
              'relative flex min-h-11 items-center rounded-[var(--radius-pill)] px-3.5 py-2 text-sm font-medium leading-6 transition-colors',
              mobile ? 'whitespace-normal break-words' : 'whitespace-nowrap',
              mobile
                ? isActive
                  ? 'bg-primary-soft text-primary'
                  : 'text-foreground hover:bg-surface-muted'
                : isActive
                  ? 'text-white'
                  : 'text-white/70 hover:text-white',
            )}
          >
            {label}
            {isActive && !mobile && !prefersReduced && (
              <motion.span
                layoutId="public-nav-active"
                className="absolute inset-0 rounded-[var(--radius-pill)] bg-white/15"
                transition={layoutSpring}
                style={{ zIndex: -1 }}
              />
            )}
          </Link>
        );
      })}
    </>
  );
}

export function PublicHeader() {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <header className="fixed top-0 left-0 right-0 z-50 pt-3 transition-all duration-[var(--duration-ui)] sm:pt-4">
      <PageContainer className="relative">
        <div className="flex items-center justify-between rounded-[var(--radius-pill)] border border-white/15 bg-navy/90 px-4 py-2 shadow-[var(--shadow-overlay)] backdrop-blur-xl transition-all duration-[var(--duration-ui)]">
          <Link
            href="/"
            className="flex items-center gap-2.5 font-black text-white"
            style={{ color: '#ffffff' }}
            aria-label="صفحه اصلی ثمین گشت مهر ایران"
          >
            <BrandMark size={32} style={{ color: '#ffc857' }} />
            <span className="hidden text-sm text-white sm:inline">{SITE_NAME}</span>
            <span className="text-sm text-white sm:hidden">ثمین گشت مهر ایران</span>
          </Link>

          <nav aria-label="ناوبری اصلی" className="hidden items-center gap-1 lg:flex">
            <PublicNavLinks />
          </nav>

          <div className="hidden items-center gap-2 sm:flex">
            <ButtonLink
              href="/login"
              size="sm"
              className="min-w-32 bg-sun text-navy hover:bg-sun/90 shadow-lg shadow-sun/20"
            >
              ثبت‌نام و ورود
            </ButtonLink>
          </div>

          <Drawer open={mobileOpen} onOpenChange={setMobileOpen}>
            <DrawerTrigger asChild>
              <button
                type="button"
                className="flex min-h-11 min-w-11 items-center justify-center gap-2 rounded-[var(--radius-pill)] border border-white/20 px-3 text-sm font-bold text-white hover:bg-white/10 lg:hidden transition-colors"
                style={{ color: '#ffffff' }}
                aria-label="باز کردن منوی اصلی"
              >
                منو
              </button>
            </DrawerTrigger>
            <DrawerContent
              title="منوی اصلی"
              description="دسترسی به بخش‌های عمومی سامانه"
              className="lg:hidden"
            >
              <nav aria-label="ناوبری موبایل" className="flex flex-col gap-1">
                <PublicNavLinks mobile onNavigate={() => setMobileOpen(false)} />
              </nav>
              <div className="mt-3 border-t border-border/60 pt-3">
                <ButtonLink
                  href="/login"
                  size="sm"
                  className="w-full whitespace-normal bg-navy text-center leading-6 text-white hover:bg-navy/90"
                >
                  ثبت‌نام و ورود
                </ButtonLink>
              </div>
            </DrawerContent>
          </Drawer>
        </div>
      </PageContainer>
    </header>
  );
}
