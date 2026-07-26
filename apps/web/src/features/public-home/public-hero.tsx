'use client';

import { ArrowLeft, CheckCircle2, MapPinned, Route, ScrollText, ShieldCheck, WalletCards } from 'lucide-react';
import { motion, useReducedMotion } from 'motion/react';
import Image from 'next/image';
import { Badge } from '@/components/ui/badge';
import { ButtonLink } from '@/components/ui/button';
import { PageContainer } from '@/components/common/page-container';

function HeroRouteLine() {
  const prefersReduced = useReducedMotion();

  return (
    <svg
      className="absolute bottom-0 left-0 right-0 h-24 w-full md:h-32"
      viewBox="0 0 1440 128"
      fill="none"
      preserveAspectRatio="none"
      aria-hidden="true"
    >
      <motion.path
        d="M0 64 Q180 20 360 50 T720 40 T1080 55 T1440 45"
        stroke="url(#hero-route-gradient)"
        strokeWidth="2"
        fill="none"
        opacity="0.4"
        initial={prefersReduced ? { pathLength: 1 } : { pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={prefersReduced ? { duration: 0 } : { duration: 1.5, ease: [0.16, 1, 0.3, 1], delay: 0.5 }}
      />
      <motion.circle cx="0" cy="64" r="4" fill="var(--sun)" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.8 }} />
      <motion.circle cx="360" cy="50" r="3" fill="var(--transit-blue)" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 2 }} />
      <motion.circle cx="720" cy="40" r="4" fill="var(--sun)" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 2.2 }} />
      <motion.circle cx="1080" cy="55" r="3" fill="var(--transit-blue)" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 2.4 }} />
      <motion.circle cx="1440" cy="45" r="4" fill="var(--sun)" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 2.6 }} />
      <defs>
        <linearGradient id="hero-route-gradient" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="var(--sun)" />
          <stop offset="50%" stopColor="var(--transit-blue)" />
          <stop offset="100%" stopColor="var(--sun)" />
        </linearGradient>
      </defs>
    </svg>
  );
}

export function PublicHero() {
  const prefersReduced = useReducedMotion();

  return (
    <section className="relative min-h-[680px] overflow-hidden md:min-h-[760px] lg:min-h-[860px]">
      <Image
        src="/images/hero-main.png"
        alt=""
        fill
        className="object-cover object-[62%_30%]"
        priority
        sizes="100vw"
      />
      <div
        className="absolute inset-0 bg-[linear-gradient(90deg,rgba(16,24,40,.3)_0%,rgba(16,24,40,.18)_35%,rgba(16,24,40,.6)_65%,rgba(16,24,40,.92)_100%)]"
        aria-hidden="true"
      />
      <HeroRouteLine />
      <svg className="pointer-events-none absolute inset-0 h-full w-full opacity-[0.04]" aria-hidden="true">
        <defs>
          <pattern id="hero-dots" x="0" y="0" width="60" height="60" patternUnits="userSpaceOnUse">
            <circle cx="30" cy="30" r="1" fill="white" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#hero-dots)" />
      </svg>
      <PageContainer className="relative z-10 flex min-h-[680px] flex-col justify-center md:min-h-[760px] lg:min-h-[860px]">
        <motion.div
          initial={false}
          animate={{ opacity: 1, x: 0 }}
          transition={prefersReduced ? { duration: 0 } : { duration: 0.7, delay: 0.2 }}
          className="absolute bottom-32 left-5 hidden w-72 overflow-hidden rounded-[1.75rem] border border-white/20 bg-navy/55 p-5 text-white shadow-2xl shadow-navy/30 backdrop-blur-xl lg:block xl:left-8"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-bold text-sun">مسیر روشن ثبت‌نام</p>
              <p className="mt-1 font-black text-white">از درخواست تا شروع سرویس</p>
            </div>
            <span className="grid size-11 place-items-center rounded-2xl bg-sun text-navy">
              <MapPinned className="size-5" />
            </span>
          </div>
          <div className="mt-5 space-y-3">
            {['ثبت اطلاعات و نشانی', 'انتخاب مدرسه و خودرو', 'قرارداد و پیش‌پرداخت'].map((label, index) => (
              <div key={label} className="flex items-center gap-3 rounded-xl bg-white/8 px-3 py-2.5">
                <CheckCircle2 className="size-4 shrink-0 text-sun" />
                <span className="text-xs font-bold text-white/85">{label}</span>
                <span className="mr-auto text-[10px] text-white/40">۰{index + 1}</span>
              </div>
            ))}
          </div>
        </motion.div>
        <motion.div
          initial={false}
          animate={{ opacity: 1, y: 0 }}
          transition={prefersReduced ? { duration: 0 } : { duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          className="max-w-2xl lg:ml-auto lg:w-[48%]"
        >
          <Badge tone="info" className="mb-5 border-sun/30 bg-sun/15 text-sun backdrop-blur-sm">
            <Route aria-hidden="true" className="size-3.5" />
            ثبت‌نام سال تحصیلی جدید آغاز شد
          </Badge>
          <h1 className="text-balance text-4xl font-black leading-[1.25] tracking-tight text-white sm:text-5xl lg:text-6xl">
            <span className="text-sun">مسیر امن</span>{' '}
            <span className="text-white">فرزند شما،</span>
            <br />
            <span className="text-white">از خانه تا مدرسه</span>
          </h1>
          <p className="mt-5 max-w-xl text-lg leading-relaxed text-white/70">
            ثبت‌نام آنلاین، قرارداد شفاف، پرداخت امن و پیگیری وضعیت سرویس مدرسه در هر مرحله.
            همه چیز در یک سامانه یکپارچه و قابل اعتماد.
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <ButtonLink
              href="/login"
              size="lg"
              className="min-w-44 bg-sun text-navy hover:bg-sun/90 shadow-lg shadow-sun/20"
            >
              ثبت‌نام دانش‌آموز
              <ArrowLeft aria-hidden="true" className="size-4" />
            </ButtonLink>
            <ButtonLink
              href="/registration-guide"
              size="lg"
              variant="inverse"
              className="border-white/20 bg-white/10 backdrop-blur-md hover:bg-white/20"
            >
              <Route aria-hidden="true" className="size-4" />
              مراحل دریافت سرویس
            </ButtonLink>
          </div>
          <motion.div
            initial={false}
            animate={{ opacity: 1, y: 0 }}
            transition={prefersReduced ? { duration: 0 } : { duration: 0.5, delay: 0.4 }}
            className="mt-10 flex flex-wrap items-center gap-5 text-sm text-white/70"
          >
            <span className="flex items-center gap-1.5">
              <ShieldCheck aria-hidden="true" className="size-4 text-sun" />
              پرداخت امن
            </span>
            <span className="flex items-center gap-1.5">
              <ScrollText aria-hidden="true" className="size-4 text-sun" />
              قرارداد شفاف
            </span>
            <span className="flex items-center gap-1.5">
              <WalletCards aria-hidden="true" className="size-4 text-sun" />
              پشتیبانی پاسخگو
            </span>
          </motion.div>
        </motion.div>
      </PageContainer>
      {!prefersReduced && (
        <motion.div
          className="absolute bottom-6 left-1/2 -translate-x-1/2"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1, y: [0, 8, 0] }}
          transition={{ delay: 2.8, repeat: Infinity, duration: 2, ease: 'easeInOut' }}
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" className="text-white/40">
            <path d="M12 5v14M5 12l7 7 7-7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </motion.div>
      )}
    </section>
  );
}
