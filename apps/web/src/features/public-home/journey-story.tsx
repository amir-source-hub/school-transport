'use client';

import { ClipboardCheck, FileText, GraduationCap, WalletCards } from 'lucide-react';
import { motion, useReducedMotion } from 'motion/react';
import Image from 'next/image';
import { PageContainer } from '@/components/common/page-container';
import { cn } from '@/lib/cn';

const steps = [
  {
    number: 1,
    title: 'ایجاد حساب خانواده',
    description: 'اطلاعات خود را ثبت کنید و حساب خانواده را برای مدیریت سرویس مدرسه فرزندان ایجاد نمایید.',
    icon: GraduationCap,
    color: 'from-sun/20 to-transparent',
    image: '/images/hero-family.png',
  },
  {
    number: 2,
    title: 'ثبت دانش‌آموز و مدرسه',
    description: 'دانش‌آموز خود را اضافه کنید، مدرسه و پایه تحصیلی را انتخاب نمایید.',
    icon: ClipboardCheck,
    color: 'from-transit-blue/20 to-transparent',
    image: '/images/hero-arrival.png',
  },
  {
    number: 3,
    title: 'مشاهده قیمت و قرارداد',
    description: 'پس از بررسی، قیمت نهایی و شرایط قرارداد را مشاهده و پذیرش کنید.',
    icon: FileText,
    color: 'from-sun/20 to-transparent',
    image: '/images/hero-trust.png',
  },
  {
    number: 4,
    title: 'پرداخت و پیگیری وضعیت',
    description: 'پرداخت را انجام دهید و از وضعیت سرویس در هر مرحله مطلع شوید.',
    icon: WalletCards,
    color: 'from-transit-blue/20 to-transparent',
    image: '/images/hero-route.png',
  },
];

function JourneyDesktopView() {
  const prefersReduced = useReducedMotion();

  return (
    <div className="hidden lg:grid lg:grid-cols-2 lg:gap-12 lg:items-start">
      <div className="sticky top-32 overflow-hidden rounded-[var(--radius-canvas)]">
        <div className="relative aspect-[4/3]">
          <Image
            src={steps[0].image}
            alt=""
            fill
            className="object-cover"
            sizes="(max-width: 1024px) 100vw, 50vw"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-navy/40 to-transparent" />
        </div>
        <div className="absolute bottom-0 left-0 right-0 p-8">
          <p className="font-bold text-sun">مسیر دریافت سرویس</p>
          <p className="mt-1 text-2xl font-black text-white">از ثبت‌نام تا شروع خدمت در ۴ مرحله</p>
        </div>
      </div>
      <div className="relative space-y-0">
        <div className="absolute right-8 top-0 h-full w-0.5 bg-border/50" aria-hidden="true">
          <motion.div
            className="h-0 w-full bg-gradient-to-b from-sun via-transit-blue to-sun"
            initial={prefersReduced ? { height: '100%' } : { height: '0%' }}
            whileInView={{ height: '100%' }}
            viewport={{ once: true, margin: '-100px' }}
            transition={prefersReduced ? { duration: 0 } : { duration: 1.5, ease: [0.16, 1, 0.3, 1] }}
          />
        </div>
        {steps.map((step, index) => (
          <motion.div
            key={step.number}
            initial={prefersReduced ? { opacity: 1 } : { opacity: 0, x: -20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, margin: '-80px' }}
            transition={{ duration: 0.5, delay: index * 0.15, ease: [0.16, 1, 0.3, 1] }}
            className="relative mr-16 pb-16 last:pb-0"
          >
            <div className="absolute -right-[2.15rem] top-1 z-10 flex h-7 w-7 items-center justify-center rounded-full border-2 border-sun bg-navy text-xs font-bold text-sun">
              {step.number}
            </div>
            <div className={cn('rounded-[var(--radius-card)] border border-border/60 bg-surface-paper p-6 shadow-[var(--shadow-raised)] transition-shadow hover:shadow-[var(--shadow-floating)]')}>
              <div className="flex items-center gap-3">
                <span className="flex size-10 items-center justify-center rounded-xl bg-primary-soft text-primary">
                  <step.icon aria-hidden="true" className="size-5" />
                </span>
                <h3 className="text-lg font-black">{step.title}</h3>
              </div>
              <p className="mt-3 text-sm leading-relaxed text-muted">{step.description}</p>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

function JourneyMobileView() {
  return (
    <div className="lg:hidden">
      <div className="relative mr-6">
        <div className="absolute right-[0.65rem] top-0 h-full w-0.5 bg-border/50" aria-hidden="true" />
        {steps.map((step, index) => (
          <motion.div
            key={step.number}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-40px' }}
            transition={{ duration: 0.4, delay: index * 0.1 }}
            className="relative pb-10 last:pb-0"
          >
            <div className="absolute -right-[1.15rem] top-1 z-10 flex h-6 w-6 items-center justify-center rounded-full border-2 border-sun bg-navy text-[10px] font-bold text-sun">
              {step.number}
            </div>
            <div className="rounded-[var(--radius-card)] border border-border/60 bg-surface-paper p-5 shadow-[var(--shadow-raised)]">
              <div className="flex items-center gap-2.5">
                <span className="flex size-9 items-center justify-center rounded-xl bg-primary-soft text-primary">
                  <step.icon aria-hidden="true" className="size-4" />
                </span>
                <h3 className="font-black">{step.title}</h3>
              </div>
              <p className="mt-2 text-sm text-muted">{step.description}</p>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

export function JourneyStory() {
  return (
    <section className="overflow-hidden surface-inset border-y border-border py-16 sm:py-20 lg:py-24">
      <PageContainer>
        <div className="mx-auto max-w-2xl text-center">
          <p className="font-bold text-primary">مسیر دریافت سرویس</p>
          <h2 className="mt-2 text-3xl font-black">از خانه تا مدرسه، قدم به قدم</h2>
          <p className="mt-3 text-muted">
            هر مرحله از مسیر را با راهنمایی دقیق و شفاف دنبال کنید.
          </p>
        </div>
        <div className="mt-14">
          <JourneyDesktopView />
          <JourneyMobileView />
        </div>
      </PageContainer>
    </section>
  );
}
