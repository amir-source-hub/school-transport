'use client';

import Link from 'next/link';
import { useReducedMotion } from 'motion/react';
import { PageContainer } from '@/components/common/page-container';
import { BrandMark } from '@/components/brand/brand-mark';
const footerLinks = [
  { heading: 'راهنما', items: [['مراحل ثبت‌نام', '/registration-guide'], ['نحوه قیمت‌گذاری', '/pricing'], ['پرسش‌های متداول', '/faq']] },
  { heading: 'سامانه', items: [['خدمات', '/services'], ['مدارس', '/schools'], ['درباره ما', '/about']] },
] as const;

export function PublicFooter() {
  const prefersReduced = useReducedMotion();

  return (
    <footer className="relative mt-auto overflow-hidden border-t border-border surface-dark">
      {!prefersReduced && (
        <div className="pointer-events-none absolute left-0 right-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/30 to-transparent" aria-hidden="true" />
      )}
      <PageContainer className="relative z-10">
        <div className="grid gap-8 py-12 sm:grid-cols-2 lg:grid-cols-4">
          <div className="lg:col-span-2">
            <div className="flex items-center gap-3">
              <BrandMark size={32} className="text-white" />
              <p className="font-black text-white">سامانه سرویس مدرسه</p>
            </div>
            <p className="mt-3 max-w-sm text-sm text-white/70">
              مسیر روشن و یکپارچه برای ثبت درخواست، قرارداد و پرداخت خدمات سرویس مدرسه.
            </p>
            <Link
              href="/contact"
              className="mt-4 inline-flex items-center gap-1.5 rounded-[var(--radius-pill)] bg-white/10 px-4 py-2 text-sm font-bold text-white transition-colors hover:bg-white/20"
            >
              تماس با پشتیبانی
            </Link>
          </div>
          {footerLinks.map((group) => (
            <nav key={group.heading} aria-label={group.heading} className="flex flex-col gap-2 text-sm">
              <p className="font-bold text-white">{group.heading}</p>
              {group.items.map(([label, href]) => (
                <Link key={href} href={href} className="text-white/60 transition-colors hover:text-white">
                  {label}
                </Link>
              ))}
            </nav>
          ))}
        </div>
      </PageContainer>
      <div className="border-t border-white/10">
        <PageContainer className="py-4 text-xs text-white/40">
          تمامی حقوق این سامانه محفوظ است.
        </PageContainer>
      </div>
    </footer>
  );
}
