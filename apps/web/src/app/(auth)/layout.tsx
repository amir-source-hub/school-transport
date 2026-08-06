import { ArrowRight, Route, ShieldCheck } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { BrandMark } from '@/components/brand/brand-mark';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: { default: 'ورود امن', template: '%s | ورود امن' },
  description: 'ورود امن خانواده و مدیریت به سامانه سرویس مدرسه.',
  robots: { index: false, follow: false, noarchive: true, nosnippet: true },
};

export default function AuthLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden px-4 py-10 sm:px-6">
      <Image
        src="/images/banner-school-campus-vehicle-fleet-wide.png"
        alt=""
        fill
        className="object-cover object-center"
        priority
        fetchPriority="high"
        sizes="100vw"
      />
      <div className="absolute inset-0 bg-[linear-gradient(135deg,rgba(16,24,40,.82),rgba(16,24,40,.38)_48%,rgba(34,87,230,.25))]" />
      <div className="absolute inset-0 opacity-20 [background-image:radial-gradient(circle_at_20%_20%,rgba(255,200,87,.65),transparent_26%),radial-gradient(circle_at_80%_75%,rgba(34,87,230,.7),transparent_28%)]" />
      <Link
        href="/"
        className="absolute right-5 top-5 z-20 inline-flex items-center gap-2 rounded-full border border-white/20 bg-navy/35 px-4 py-2 text-sm font-bold text-white backdrop-blur-xl sm:right-8 sm:top-8"
      >
        <ArrowRight className="size-4" />
        صفحه اصلی
      </Link>
      <section className="relative z-10 w-full max-w-[31rem] rounded-[2rem] border border-white/60 bg-white/92 p-6 shadow-[0_30px_90px_-25px_rgba(15,23,42,.65)] backdrop-blur-2xl sm:p-9">
        <div className="flex items-center justify-between gap-4 border-b border-slate-200/70 pb-5">
          <Link href="/" className="inline-flex items-center gap-3 font-black text-foreground">
            <span className="grid size-11 place-items-center rounded-2xl bg-navy text-sun shadow-lg">
              <BrandMark size={24} />
            </span>
            <span>
              <span className="block">سامانه سرویس مدرسه</span>
              <span className="mt-0.5 block text-[11px] font-medium text-muted">
                ورود امن خانواده و مدیریت
              </span>
            </span>
          </Link>
          <span className="grid size-10 place-items-center rounded-xl bg-success-soft text-success">
            <ShieldCheck className="size-5" />
          </span>
        </div>
        <div className="pt-6">{children}</div>
        <div className="mt-7 flex items-center justify-center gap-3 border-t border-slate-200/70 pt-5 text-xs text-muted">
          <Route className="size-4 text-primary" />
          <span>ورود با کد یک‌بارمصرف</span>
          <span className="size-1 rounded-full bg-slate-300" />
          <Link href="/contact" className="font-bold hover:text-primary">
            پشتیبانی
          </Link>
        </div>
      </section>
    </main>
  );
}
