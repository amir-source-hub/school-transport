'use client';

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
  ['نحوه قیمت‌گذاری', '/pricing'],
  ['پرسش‌های متداول', '/faq'],
  ['تماس با ما', '/contact'],
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
              'relative rounded-[var(--radius-pill)] px-3.5 py-1.5 text-sm font-medium transition-colors',
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

  return (
    <header className="relative z-40 pt-3 sm:pt-4">
      <PageContainer className="relative">
        <div className="flex items-center justify-between rounded-[var(--radius-pill)] border border-border/60 bg-surface-paper/80 px-4 py-2 shadow-[var(--shadow-raised)] backdrop-blur-lg sm:px-5">
          <Link
            href="/"
            className="flex items-center gap-2.5 font-black text-foreground"
            aria-label="صفحه اصلی سامانه سرویس مدرسه"
          >
            <BrandMark size={32} />
            <span className="hidden text-sm sm:inline">سامانه سرویس مدرسه</span>
            <span className="text-sm sm:hidden">سرویس مدرسه</span>
          </Link>
          <nav
            aria-label="ناوبری اصلی"
            className="hidden items-center gap-1 lg:flex"
          >
            <PublicNavLinks />
          </nav>
          <div className="hidden items-center gap-2 sm:flex">
            <ButtonLink href="/login" variant="ghost" size="sm">
              ورود
            </ButtonLink>
            <ButtonLink href="/register" size="sm">
              شروع ثبت‌نام
            </ButtonLink>
          </div>
          <button
            type="button"
            onClick={() => setMobileOpen(!mobileOpen)}
            className="flex min-h-10 items-center gap-2 rounded-[var(--radius-pill)] border border-border px-3 text-sm font-bold lg:hidden"
            aria-expanded={mobileOpen}
            aria-controls="mobile-menu"
          >
            {mobileOpen ? 'بستن' : 'منو'}
          </button>
        </div>
        {mobileOpen && (
          <div
            id="mobile-menu"
            className="absolute left-4 right-4 top-full z-50 mt-2 rounded-xl border border-border bg-surface-paper p-3 shadow-[var(--shadow-floating)] lg:hidden"
          >
            <nav aria-label="ناوبری موبایل" className="flex flex-col gap-1">
              <PublicNavLinks onNavigate={() => setMobileOpen(false)} />
            </nav>
            <div className="mt-3 grid grid-cols-2 gap-2 border-t border-border pt-3">
              <ButtonLink href="/login" variant="secondary" size="sm">
                ورود
              </ButtonLink>
              <ButtonLink href="/register" size="sm">
                ثبت‌نام
              </ButtonLink>
            </div>
          </div>
        )}
      </PageContainer>
    </header>
  );
}
