'use client';

import { ArrowRight, ShieldCheck } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

import { BrandMark } from '@/components/brand/brand-mark';
import { RouteLoading } from '@/components/feedback/route-loading';
import { apiRequest } from '@/lib/api-client';
import { SITE_NAME } from '@/lib/route-metadata';
import { AdminLoginForm } from '@/features/auth/auth-forms';
import { featureFlags } from '@/lib/feature-flags';

export default function AdminLoginPage() {
  const router = useRouter();
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    let active = true;
    apiRequest<{ user: { role: 'PARENT' | 'ADMIN' } }>('/auth/me', {
      cache: 'no-store',
      redirectOnAuthFailure: false,
    })
      .then(({ data }) => {
        if (active) {
          router.replace(data.user.role === 'ADMIN' ? '/admin/dashboard' : '/student/dashboard');
        }
      })
      .catch(() => {
        if (active) setChecked(true);
      });
    return () => {
      active = false;
    };
  }, [router]);

  if (!checked) return <RouteLoading compact />;

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden px-4 py-10 sm:px-6">
      <Image
        src="/images/banner-school-campus-vehicle-fleet-wide.webp"
        alt=""
        fill
        className="object-cover object-center"
        priority
        fetchPriority="high"
        sizes="100vw"
      />
      <div className="absolute inset-0 bg-[linear-gradient(135deg,rgba(16,24,40,.86),rgba(16,24,40,.42)_48%,rgba(34,87,230,.28))]" />
      <Link
        href="/"
        className="absolute right-5 top-5 z-20 inline-flex items-center gap-2 rounded-full border border-white/20 bg-navy/35 px-4 py-2 text-sm font-bold text-white backdrop-blur-xl sm:right-8 sm:top-8"
      >
        <ArrowRight className="size-4" />
        صفحه اصلی
      </Link>
      <section className="relative z-10 w-full max-w-[28rem] rounded-[2rem] border border-white/60 bg-white/92 p-6 shadow-[0_30px_90px_-25px_rgba(15,23,42,.65)] backdrop-blur-2xl sm:p-9">
        <div className="flex items-center justify-between gap-4 border-b border-slate-200/70 pb-5">
          <Link href="/" className="inline-flex items-center gap-3 font-black text-foreground">
            <span className="grid size-11 place-items-center rounded-2xl bg-navy text-sun shadow-lg">
              <BrandMark size={24} />
            </span>
            <span>
              <span className="block">{SITE_NAME}</span>
              <span className="mt-0.5 block text-[11px] font-medium text-muted">ورود مدیریت</span>
            </span>
          </Link>
          <span className="grid size-10 place-items-center rounded-xl bg-success-soft text-success">
            <ShieldCheck className="size-5" />
          </span>
        </div>
        <div className="pt-6">
          <p className="text-xs font-black text-primary">ورود مدیریت</p>
          <h1 className="mt-2 text-2xl font-black tracking-tight">ورود مدیران سامانه</h1>
          <p className="mt-3 text-sm leading-7 text-muted">
            نام کاربری و رمز عبور را وارد کنید؛ سپس کد تأیید پیامک‌شده را برای ورود دو مرحله‌ای
            وارد کنید.
          </p>
          <div className="mt-7">
            {featureFlags.adminTwoFactor ? (
              <AdminLoginForm />
            ) : (
              <p role="status" className="rounded-2xl bg-warning/10 p-4 text-sm leading-7">
                ورود مدیریت در این انتشار موقتاً غیرفعال است.
              </p>
            )}
          </div>
        </div>
        <div className="mt-7 flex items-center justify-center gap-3 border-t border-slate-200/70 pt-5 text-xs text-muted">
          <span>ورود خانواده</span>
          <Link href="/login" className="font-bold text-primary hover:text-primary-hover">
            از صفحه ورود عمومی
          </Link>
        </div>
      </section>
    </main>
  );
}
