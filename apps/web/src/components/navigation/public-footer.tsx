'use client';

import { ArrowLeft, Route } from 'lucide-react';
import Link from 'next/link';
import { useReducedMotion } from 'motion/react';
import { PageContainer } from '@/components/common/page-container';
import { BrandMark } from '@/components/brand/brand-mark';
import { SITE_NAME } from '@/lib/route-metadata';

const footerLinks = [
  {
    heading: 'خدمات',
    items: [
      ['خدمات سرویس مدرسه', '/services'],
      ['مراحل ثبت‌نام', '/registration-guide'],
      ['مدارس تحت پوشش', '/schools'],
    ],
  },
  {
    heading: 'راهنما',
    items: [
      ['نحوه قیمت‌گذاری', '/pricing'],
      ['ایمنی و استانداردها', '/safety'],
      ['سوالات متداول', '/faq'],
    ],
  },
  {
    heading: 'سامانه',
    items: [
      ['درباره ما', '/about'],
      ['تماس با ما', '/contact'],
      ['ورود / ثبت‌نام', '/login'],
    ],
  },
] as const;

export function PublicFooter() {
  const prefersReduced = useReducedMotion();

  return (
    <footer className="relative mt-auto overflow-hidden surface-dark">
      {!prefersReduced && (
        <div className="pointer-events-none absolute inset-0 opacity-[0.03]" aria-hidden="true">
          <svg width="100%" height="100%" className="h-full w-full">
            <defs>
              <pattern id="footer-grid" x="0" y="0" width="60" height="60" patternUnits="userSpaceOnUse">
                <circle cx="30" cy="30" r="1" fill="white" />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#footer-grid)" />
          </svg>
        </div>
      )}
      {!prefersReduced && (
        <div className="pointer-events-none absolute left-0 right-0 top-0 h-px bg-gradient-to-r from-transparent via-sun/30 to-transparent" aria-hidden="true" />
      )}
      <PageContainer className="relative z-10">
        <div className="grid gap-8 py-12 sm:grid-cols-2 lg:grid-cols-4">
          <div className="lg:col-span-1">
            <div className="flex items-center gap-3">
              <BrandMark size={32} className="text-sun" />
              <div>
                <p className="font-black text-white">{SITE_NAME}</p>
                <p className="text-xs text-white/40 mt-0.5">مسیر امن، تجربه روشن</p>
              </div>
            </div>
            <p className="mt-4 max-w-sm text-sm leading-relaxed text-white/50">
              سامانه یکپارچه ثبت‌نام، قرارداد و پرداخت خدمات سرویس مدرسه.
              از خانه تا مدرسه، همراه شما.
            </p>
            <Link
              href="/login"
              className="mt-5 inline-flex items-center gap-2 rounded-[var(--radius-pill)] bg-sun/15 px-5 py-2.5 text-sm font-bold text-sun transition-colors hover:bg-sun/25"
            >
              <Route aria-hidden="true" className="size-4" />
              ثبت‌نام آنلاین
              <ArrowLeft aria-hidden="true" className="size-3.5" />
            </Link>
          </div>

          {footerLinks.map((group) => (
            <nav key={group.heading} aria-label={group.heading}>
              <p className="text-sm font-bold text-white">{group.heading}</p>
              <ul className="mt-3 space-y-2.5">
                {group.items.map(([label, href]) => (
                  <li key={href}>
                    <Link
                      href={href}
                      className="text-sm text-white/50 transition-colors hover:text-white"
                    >
                      {label}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          ))}
        </div>

        {!prefersReduced && (
          <div className="relative h-px" aria-hidden="true">
            <svg
              viewBox="0 0 1200 1"
              className="w-full h-px"
              preserveAspectRatio="none"
            >
              <line x1="0" y1="0" x2="1200" y2="0" stroke="url(#footer-route-gradient)" strokeWidth="1" opacity="0.3" />
              <defs>
                <linearGradient id="footer-route-gradient" x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0%" stopColor="transparent" />
                  <stop offset="20%" stopColor="var(--sun)" />
                  <stop offset="50%" stopColor="var(--transit-blue)" />
                  <stop offset="80%" stopColor="var(--sun)" />
                  <stop offset="100%" stopColor="transparent" />
                </linearGradient>
              </defs>
            </svg>
          </div>
        )}

        <div className="flex flex-col items-center justify-between gap-2 py-4 text-xs text-white/30 sm:flex-row">
          <p>تمام حقوق این سامانه محفوظ است.</p>
          <p className="flex items-center gap-1">
            <Route aria-hidden="true" className="size-3" />
            مسیر امن فرزند شما، از خانه تا مدرسه
          </p>
        </div>
      </PageContainer>
    </footer>
  );
}
