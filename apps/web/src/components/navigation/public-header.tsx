'use client';

import { Route } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import { motion, useReducedMotion } from 'motion/react';
import { ButtonLink } from '@/components/ui/button';
import { PageContainer } from '@/components/common/page-container';
import { BrandMark } from '@/components/brand/brand-mark';
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
        const isActive = pathname.startsWith(href);
        return (
          <Link
            key={href}
            href={href}
            onClick={onNavigate}
            style={!mobile ? { color: isActive ? '#ffffff' : 'rgba(255,255,255,.72)' } : undefined}
            className={cn(
              'relative rounded-[var(--radius-pill)] px-3.5 py-1.5 text-sm font-medium transition-colors whitespace-nowrap',
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
            aria-label="صفحه اصلی سامانه سرویس مدرسه"
          >
            <BrandMark size={32} className="text-white" />
            <span className="hidden text-sm text-white sm:inline">
              سامانه سرویس مدرسه
            </span>
            <span className="text-sm text-white sm:hidden">
              سرویس مدرسه
            </span>
          </Link>

          <nav
            aria-label="ناوبری اصلی"
            className="hidden items-center gap-1 lg:flex"
          >
            <PublicNavLinks />
          </nav>

          <div className="hidden items-center gap-2 sm:flex">
            <ButtonLink
              href="/login"
              variant="ghost"
              size="sm"
              className="!text-[#fff] hover:bg-white/10"
            >
              ورود
            </ButtonLink>
            <ButtonLink
              href="/login"
              size="sm"
              className="min-w-28 bg-sun text-navy hover:bg-sun/90 shadow-lg shadow-sun/20"
            >
              <Route aria-hidden="true" className="size-3.5" />
              ثبت‌نام
            </ButtonLink>
          </div>

          <button
            type="button"
            onClick={() => setMobileOpen(!mobileOpen)}
            className="flex min-h-10 items-center gap-2 rounded-[var(--radius-pill)] border border-white/20 px-3 text-sm font-bold text-white hover:bg-white/10 lg:hidden transition-colors"
            style={{ color: '#ffffff' }}
            aria-expanded={mobileOpen}
            aria-controls="mobile-menu"
          >
            {mobileOpen ? 'بستن' : 'منو'}
          </button>
        </div>

        {mobileOpen && (
          <div
            id="mobile-menu"
            className="absolute left-4 right-4 top-full z-50 mt-2 rounded-xl border border-border/60 bg-white p-3 shadow-[var(--shadow-floating)] lg:hidden"
          >
            <nav aria-label="ناوبری موبایل" className="flex flex-col gap-1">
              <PublicNavLinks mobile onNavigate={() => setMobileOpen(false)} />
            </nav>
            <div className="mt-3 grid grid-cols-2 gap-2 border-t border-border/60 pt-3">
              <ButtonLink href="/login" variant="secondary" size="sm">ورود</ButtonLink>
              <ButtonLink href="/login" size="sm" className="bg-navy text-white hover:bg-navy/90">ورود / ثبت‌نام</ButtonLink>
            </div>
          </div>
        )}
      </PageContainer>
    </header>
  );
}
