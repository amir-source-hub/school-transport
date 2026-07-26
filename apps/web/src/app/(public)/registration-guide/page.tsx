'use client';

import { ArrowLeft, CheckCircle2, ClipboardCheck, FileText, GraduationCap, UserRound } from 'lucide-react';
import Image from 'next/image';
import { useState } from 'react';
import { motion } from 'motion/react';
import { Alert } from '@/components/feedback/alert';
import { Badge } from '@/components/ui/badge';
import { ButtonLink } from '@/components/ui/button';
import { PageContainer } from '@/components/common/page-container';
import { cn } from '@/lib/cn';

const steps = [
  {
    icon: UserRound,
    title: 'ایجاد حساب خانواده',
    description: 'یک حساب خانوادگی ایجاد کنید. این حساب می‌تواند چند دانش‌آموز را مدیریت کند.',
    details: ['ثبت نام و شماره تماس', 'تأیید با رمز یکبارمصرف', 'تنظیم حساب خانواده'],
    image: '/images/animation-picture-family.png',
  },
  {
    icon: GraduationCap,
    title: 'ثبت اطلاعات دانش‌آموز',
    description: 'اطلاعات لازم هر دانش‌آموز و درخواست خدمت مرتبط با او را وارد کنید.',
    details: ['مشخصات دانش‌آموز', 'انتخاب مدرسه و پایه', 'اطلاعات تماس اضطراری'],
    image: '/images/getting in bus.png',
  },
  {
    icon: ClipboardCheck,
    title: 'ارسال برای بررسی',
    description: 'پس از مرور اطلاعات، درخواست را ارسال کنید تا مدیریت آن را بررسی کند.',
    details: ['مرور اطلاعات ثبت‌شده', 'تأیید نهایی اطلاعات', 'دریافت کد پیگیری'],
    image: '/images/school-transport-animated4.png',
  },
  {
    icon: FileText,
    title: 'مشاهده قیمت و قرارداد',
    description: 'پس از تأیید و تعیین قیمت، جزئیات قرارداد و گزینه‌های پرداخت نمایش داده می‌شوند.',
    details: ['مشاهده قیمت نهایی', 'بررسی شرایط قرارداد', 'پذیرش یا درخواست تغییر'],
    image: '/images/school-transport-animated6-with white space on the left.png',
  },
  {
    icon: CheckCircle2,
    title: 'پرداخت و شروع خدمت',
    description: 'با انتخاب روش پرداخت، خدمت سرویس مدرسه برای فرزندتان فعال می‌شود.',
    details: ['انتخاب روش پرداخت', 'پرداخت آنلاین یا آفلاین', 'شروع خدمت سرویس مدرسه'],
    image: '/images/getting in bus 2.png',
  },
];

export default function RegistrationGuidePage() {
  const [activeStep, setActiveStep] = useState(0);
  const totalSteps = steps.length;

  return (
    <>
      <section className="relative overflow-hidden surface-dark pb-20 pt-32 sm:pt-36">
        <div className="absolute inset-0" aria-hidden="true">
          <Image src="/images/school-transport-animated9-with white space on the left.png" alt="" fill className="object-cover object-center" sizes="100vw" />
          <div className="absolute inset-0 bg-gradient-to-l from-navy/60 via-navy/50 to-navy/80" />
        </div>
        <PageContainer className="relative z-10">
          <div className="mx-auto max-w-3xl text-center">
            <Badge tone="info" className="mb-4 border-sun/30 bg-sun/15 text-sun backdrop-blur-sm">راهنمای ثبت‌نام</Badge>
            <h1 className="text-balance text-3xl font-black text-white sm:text-4xl">مراحل ثبت‌نام را قدم به قدم بشناسید</h1>
            <p className="mt-4 text-lg text-white/60">از ایجاد حساب تا شروع خدمت، همه مراحل را با راهنمایی دقیق دنبال کنید.</p>
          </div>
        </PageContainer>
      </section>

      <section className="surface-paper py-14">
        <PageContainer>
          <div className="mx-auto max-w-3xl">
            <Alert title="توجه درباره اطلاعات موردنیاز">
              جزئیات نهایی فیلدها و ترتیب فرم ثبت‌نام هنوز در سند اختصاصی فرم تأیید نشده است.
            </Alert>
          </div>
        </PageContainer>
      </section>

      <section className="surface-inset border-y border-border/60 py-14">
        <PageContainer>
          <div className="mx-auto max-w-5xl">
            <div className="flex flex-wrap justify-center gap-2 mb-10" role="tablist">
              {steps.map((step, i) => (
                <button
                  key={step.title}
                  role="tab"
                  aria-selected={activeStep === i}
                  onClick={() => setActiveStep(i)}
                  className={cn(
                    'flex items-center gap-2 rounded-[var(--radius-pill)] px-4 py-2 text-sm font-bold transition-all',
                    activeStep === i ? 'bg-navy text-white shadow-md' : 'bg-surface-paper text-muted hover:text-foreground border border-border/60',
                  )}
                >
                  <span className={cn(
                    'flex size-6 items-center justify-center rounded-full text-[10px]',
                    activeStep === i ? 'bg-white/20' : 'bg-primary-soft text-primary',
                  )}>
                    {i + 1}
                  </span>
                  {step.title}
                </button>
              ))}
            </div>

            <motion.div
              key={activeStep}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
              className="lg:grid lg:grid-cols-2 lg:gap-10 lg:items-center"
            >
              <div className={`order-2 ${activeStep % 2 === 0 ? 'lg:order-1' : 'lg:order-2'}`}>
                <div className="flex items-center gap-3 mb-4">
                  <span className="flex size-12 items-center justify-center rounded-2xl bg-primary text-white shadow-md shadow-primary/20">
                    {(() => { const StepIcon = steps[activeStep].icon; return <StepIcon aria-hidden="true" className="size-5" />; })()}
                  </span>
                  <div>
                    <p className="text-xs text-muted">مرحله {activeStep + 1} از {totalSteps}</p>
                    <h2 className="text-xl font-black">{steps[activeStep].title}</h2>
                  </div>
                </div>
                <p className="text-muted leading-relaxed">{steps[activeStep].description}</p>
                <ul className="mt-5 space-y-2">
                  {steps[activeStep].details.map(d => (
                    <li key={d} className="flex items-center gap-2 text-sm">
                      <CheckCircle2 aria-hidden="true" className="size-4 text-primary shrink-0" />
                      {d}
                    </li>
                  ))}
                </ul>
                <div className="mt-6 flex gap-3">
                  {activeStep > 0 && (
                    <button
                      onClick={() => setActiveStep(activeStep - 1)}
                      className="rounded-[var(--radius-control)] border border-border px-4 py-2 text-sm font-bold text-muted hover:text-foreground transition-colors"
                    >
                      مرحله قبل
                    </button>
                  )}
                  {activeStep < totalSteps - 1 ? (
                    <button
                      onClick={() => setActiveStep(activeStep + 1)}
                      className="rounded-[var(--radius-control)] bg-navy px-6 py-2 text-sm font-bold text-white hover:bg-navy/90 transition-colors"
                    >
                      مرحله بعد
                    </button>
                  ) : (
                    <ButtonLink href="/login" className="bg-sun text-navy hover:bg-sun/90">
                      شروع ثبت‌نام
                      <ArrowLeft aria-hidden="true" className="size-4" />
                    </ButtonLink>
                  )}
                </div>
              </div>
              <div className={`order-1 mb-6 lg:mb-0 ${activeStep % 2 === 0 ? 'lg:order-2' : 'lg:order-1'}`}>
                <div className="relative overflow-hidden rounded-[var(--radius-canvas)] aspect-[4/3]">
                  <Image src={steps[activeStep].image} alt="" fill className="object-cover" sizes="(max-width: 1024px) 100vw, 50vw" />
                  <div className="absolute inset-0 bg-gradient-to-t from-navy/20 to-transparent" />
                  <div className="absolute bottom-4 right-4">
                    <Badge tone="info" className="bg-white/90 text-navy backdrop-blur-sm border-0">مرحله {activeStep + 1}</Badge>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        </PageContainer>
      </section>

      <section className="surface-paper py-14">
        <PageContainer>
          <div className="mx-auto max-w-3xl text-center">
            <h2 className="text-2xl font-black">آماده شروع هستید؟</h2>
            <p className="mt-2 text-muted">فرایند ثبت‌نام را آغاز کنید.</p>
            <div className="mt-6 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <ButtonLink href="/login" size="lg" className="bg-navy text-white hover:bg-navy/90 shadow-md">
                شروع ثبت‌نام
                <ArrowLeft aria-hidden="true" className="size-4" />
              </ButtonLink>
              <ButtonLink href="/faq" variant="secondary" size="lg">سوالات متداول</ButtonLink>
            </div>
          </div>
        </PageContainer>
      </section>
    </>
  );
}
