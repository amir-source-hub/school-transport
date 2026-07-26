'use client';

import { ClipboardCheck, CreditCard, FileText, GraduationCap, Bell } from 'lucide-react';
import Image from 'next/image';
import { useState } from 'react';
import { motion, useReducedMotion } from 'motion/react';
import { Badge } from '@/components/ui/badge';
import { ButtonLink } from '@/components/ui/button';
import { PageContainer } from '@/components/common/page-container';
import { cn } from '@/lib/cn';

const serviceTabs = [
  { id: 'all', label: 'همه خدمات' },
  { id: 'registration', label: 'ثبت‌نام' },
  { id: 'financial', label: 'مالی' },
  { id: 'support', label: 'پشتیبانی' },
] as const;

const allServices = [
  { title: 'ثبت درخواست دانش‌آموز', description: 'برای هر دانش‌آموز پروفایل مستقل با درخواست ثبت‌نام و خدمت.', icon: GraduationCap, category: 'registration' },
  { title: 'بررسی و اعلام وضعیت', description: 'پس از ارسال، درخواست توسط مدیریت بررسی و نتیجه اعلام می‌شود.', icon: ClipboardCheck, category: 'registration' },
  { title: 'قیمت و قرارداد', description: 'قیمت پس از بررسی تعیین و قرارداد برای پذیرش در دسترس قرار می‌گیرد.', icon: FileText, category: 'financial' },
  { title: 'پرداخت و سوابق', description: 'پرداخت کامل یا اقساطی با سابقه و وضعیت شفاف در سامانه.', icon: CreditCard, category: 'financial' },
  { title: 'اعلان‌ها', description: 'رویدادهای مهم ثبت‌نام، قیمت، قرارداد و سررسیدها اطلاع‌رسانی می‌شوند.', icon: Bell, category: 'support' },
];

const processSteps = [
  { label: 'ثبت درخواست', description: 'اطلاعات دانش‌آموز را وارد کنید.', icon: GraduationCap },
  { label: 'بررسی مدیریت', description: 'درخواست شما بررسی می‌شود.', icon: ClipboardCheck },
  { label: 'قیمت‌گذاری', description: 'قیمت نهایی تعیین می‌گردد.', icon: FileText },
  { label: 'پذیرش و پرداخت', description: 'قرارداد را بپذیرید و پرداخت کنید.', icon: CreditCard },
];

export default function ServicesPage() {
  const [activeTab, setActiveTab] = useState('all');
  const prefersReduced = useReducedMotion();

  const filtered = activeTab === 'all' ? allServices : allServices.filter(s => s.category === activeTab);

  return (
    <>
      <section className="relative overflow-hidden surface-dark pb-20 pt-32 sm:pt-36">
        <div className="absolute inset-0" aria-hidden="true">
          <Image src="/images/school-transport-animated3.png" alt="" fill className="object-cover object-center" sizes="100vw" />
          <div className="absolute inset-0 bg-gradient-to-l from-navy/60 via-navy/50 to-navy/80" />
        </div>
        <PageContainer className="relative z-10">
          <div className="mx-auto max-w-3xl text-center">
            <Badge tone="info" className="mb-4 border-sun/30 bg-sun/15 text-sun backdrop-blur-sm">خدمات سامانه</Badge>
            <h1 className="text-balance text-3xl font-black text-white sm:text-4xl">همه مراحل سرویس مدرسه در یک مسیر مشخص</h1>
            <p className="mt-4 text-lg text-white/60">خدمات سامانه بر ثبت‌نام، بررسی، قیمت‌گذاری، قرارداد، پرداخت و اطلاع‌رسانی متمرکز است.</p>
          </div>
        </PageContainer>
      </section>

      <section className="surface-paper border-b border-border/60 py-12">
        <PageContainer>
          <div className="flex flex-wrap justify-center gap-2" role="tablist">
            {serviceTabs.map(tab => (
              <button
                key={tab.id}
                role="tab"
                aria-selected={activeTab === tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  'rounded-[var(--radius-pill)] px-5 py-2 text-sm font-bold transition-all duration-[var(--duration-fast)]',
                  activeTab === tab.id ? 'bg-navy text-white shadow-md' : 'bg-surface-inset text-muted hover:text-foreground',
                )}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </PageContainer>
      </section>

      <section className="surface-paper py-14">
        <PageContainer>
          <div className="mx-auto max-w-4xl">
            <motion.div layout className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3" role="tabpanel">
              {filtered.map((service, i) => (
                <motion.div
                  key={service.title}
                  initial={prefersReduced ? { opacity: 1 } : { opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: i * 0.05 }}
                  className="rounded-[var(--radius-card)] border border-border/60 bg-surface-paper p-6 shadow-[var(--shadow-raised)] transition-all duration-[var(--duration-ui)] hover:shadow-[var(--shadow-floating)] hover:-translate-y-0.5"
                >
                  <span className="flex size-11 items-center justify-center rounded-2xl bg-primary-soft text-primary">
                    <service.icon aria-hidden="true" className="size-5" />
                  </span>
                  <h2 className="mt-4 font-black">{service.title}</h2>
                  <p className="mt-2 text-sm leading-relaxed text-muted">{service.description}</p>
                </motion.div>
              ))}
            </motion.div>
          </div>
        </PageContainer>
      </section>

      <section className="surface-inset border-y border-border/60 py-16">
        <PageContainer>
          <div className="lg:grid lg:grid-cols-2 lg:items-center lg:gap-12">
            <div>
              <p className="font-bold text-primary">مسیر دریافت خدمت</p>
              <h2 className="mt-2 text-2xl font-black">از درخواست تا شروع خدمت</h2>
              <div className="mt-10 grid gap-6 md:grid-cols-2">
            {processSteps.map((step, i) => (
              <div key={step.label} className="relative text-center">
                {i < processSteps.length - 1 && (
                  <div className="absolute left-[60%] top-6 hidden h-0.5 w-[80%] bg-gradient-to-l from-primary-soft to-transparent md:block" aria-hidden="true" />
                )}
                <span className="mx-auto flex size-12 items-center justify-center rounded-2xl bg-primary text-white shadow-md shadow-primary/20">
                  <step.icon aria-hidden="true" className="size-5" />
                </span>
                <h3 className="mt-4 font-bold">{step.label}</h3>
                <p className="mt-1 text-xs text-muted">{step.description}</p>
            </div>
          ))}
            </div>
            </div>
            <div className="relative mt-10 lg:mt-0">
              <div className="relative aspect-[4/3] overflow-hidden rounded-[var(--radius-canvas)]">
                <Image src="/images/school-transport-animated5- with white space on the left.png" alt="" fill className="object-cover" sizes="(max-width: 1024px) 100vw, 50vw" />
              </div>
            </div>
          </div>
        </PageContainer>
      </section>

      <section className="surface-paper py-14">
        <PageContainer>
          <div className="rounded-[var(--radius-canvas)] surface-dark p-8 text-center sm:p-12">
            <h2 className="text-2xl font-black text-white">آماده شروع هستید؟</h2>
            <p className="mt-2 text-white/60">همین حالا ثبت‌نام کنید و مسیر امن فرزندتان را آغاز نمایید.</p>
            <div className="mt-6 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <ButtonLink href="/login" size="lg" className="bg-sun text-navy hover:bg-sun/90 shadow-lg shadow-sun/20">شروع ثبت‌نام</ButtonLink>
              <ButtonLink href="/registration-guide" size="lg" variant="inverse" className="border-white/20 bg-white/10 backdrop-blur-sm">راهنما</ButtonLink>
            </div>
          </div>
        </PageContainer>
      </section>
    </>
  );
}
