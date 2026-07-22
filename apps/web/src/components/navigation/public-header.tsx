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
  ['FAQ', '/faq'],
  ['تماس', '/contact'],
] as const;

function PublicNavLinks({ onNavigate }: { onNavigate?: () => void }) {
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
            className={cn(
              'relative rounded-[var(--radius-pill)] px-3.5 py-1.5 text-sm font-medium transition-colors whitespace-nowrap',
              isActive ? 'text-primary' : 'text-muted hover:text-foreground',
            )}
          >
            {label}
            {isActive && !prefersReduced && (
              <motion.span
                layoutId="public-nav-active"
                className="absolute inset-0 rounded-[var(--radius-pill)] bg-primary-soft"
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
  const pathname = usePathname();
  const isHome = pathname === '/';

  return (
    <header className={cn(
      'fixed top-0 left-0 right-0 z-50 transition-all duration-[var(--duration-ui)]',
      isHome ? 'pt-4 sm:pt-5' : 'pt-2 sm:pt-3',
    )}>
      <PageContainer className="relative">
        <div className={cn(
          'flex items-center justify-between rounded-[var(--radius-pill)] border px-4 py-2 shadow-[var(--shadow-raised)] backdrop-blur-lg transition-all duration-[var(--duration-ui)]',
          isHome
            ? 'border-white/20 bg-white/10'
            : 'border-border/60 bg-white/95',
        )}>
          <Link
            href="/"
            className="flex items-center gap-2.5 font-black text-foreground"
            aria-label="صفحه اصلی سامانه سرویس مدرسه"
          >
            <BrandMark size={32} className={cn(isHome && 'text-white')} />
            <span className={cn('hidden text-sm sm:inline', isHome && 'text-white')}>
              سامانه سرویس مدرسه
            </span>
            <span className={cn('text-sm sm:hidden', isHome && 'text-white')}>
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
            <ButtonLink href="/login" variant="ghost" size="sm" className={cn(isHome && 'text-white hover:bg-white/10')}>
              ورود
            </ButtonLink>
            <ButtonLink
              href="/register"
              size="sm"
              className={cn(
                'min-w-28',
                isHome
                  ? 'bg-sun text-navy hover:bg-sun/90 shadow-lg shadow-sun/20'
                  : 'bg-navy text-white hover:bg-navy/90',
              )}
            >
              <Route aria-hidden="true" className="size-3.5" />
              ثبت‌نام
            </ButtonLink>
          </div>

          <button
            type="button"
            onClick={() => setMobileOpen(!mobileOpen)}
            className={cn(
              'flex min-h-10 items-center gap-2 rounded-[var(--radius-pill)] border px-3 text-sm font-bold lg:hidden transition-colors',
              isHome ? 'border-white/20 text-white hover:bg-white/10' : 'border-border text-foreground',
            )}
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
              <PublicNavLinks onNavigate={() => setMobileOpen(false)} />
            </nav>
            <div className="mt-3 grid grid-cols-2 gap-2 border-t border-border/60 pt-3">
              <ButtonLink href="/login" variant="secondary" size="sm">ورود</ButtonLink>
              <ButtonLink href="/register" size="sm" className="bg-navy text-white hover:bg-navy/90">ثبت‌نام</ButtonLink>
            </div>
          </div>
        )}
      </PageContainer>
    </header>
  );
}
