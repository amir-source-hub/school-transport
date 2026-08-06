'use client';

import { ArrowLeft, Banknote, Calculator, Calendar, FileText, ShieldCheck } from 'lucide-react';
import Image from 'next/image';
import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { ButtonLink } from '@/components/ui/button';
import { Alert } from '@/components/feedback/alert';
import { PageContainer } from '@/components/common/page-container';
import { cn } from '@/lib/cn';

const factors = [
  { icon: Calculator, label: 'مسافت', description: 'فاصله بین خانه و مدرسه' },
  { icon: Banknote, label: 'نوع سرویس', description: 'سرویس معمولی یا ویژه' },
  { icon: Calendar, label: 'تعداد فرزند', description: 'خانواده‌های چند فرزندی' },
  { icon: ShieldCheck, label: 'دوره قرارداد', description: 'طول مدت قرارداد' },
];

const paymentMethods = [
  { id: 'full', label: 'پرداخت کامل', desc: 'تسویه یک‌باره با تخفیف ویژه' },
  { id: 'installment', label: 'پرداخت اقساطی', desc: 'پیش‌پرداخت یک‌سوم و ۴ قسط ماهانه' },
];

const pricingSteps = [
  { number: '۱', title: 'ثبت درخواست', desc: 'خانواده درخواست خدمت را ثبت می‌کند.' },
  { number: '۲', title: 'بررسی مدیریت', desc: 'مدیریت درخواست را بررسی و قیمت را تعیین می‌کند.' },
  { number: '۳', title: 'اعلام قیمت', desc: 'قیمت نهایی در سامانه نمایش داده می‌شود.' },
  { number: '۴', title: 'انتخاب روش', desc: 'خانواده روش پرداخت را انتخاب می‌کند.' },
];

export default function PricingPage() {
  const [activeMethod, setActiveMethod] = useState('full');

  return (
    <>
      <section className="relative overflow-hidden surface-dark pb-20 pt-32 sm:pt-36">
        <div className="absolute inset-0" aria-hidden="true">
          <Image
            src="/images/pricing-hero-school-van-modern-campus.webp"
            alt=""
            fill
            className="object-cover object-center"
            priority
            fetchPriority="high"
            sizes="100vw"
          />
          <div className="absolute inset-0 bg-gradient-to-l from-navy/60 via-navy/50 to-navy/80" />
        </div>
        <PageContainer className="relative z-10">
          <div className="mx-auto max-w-3xl text-center">
            <Badge tone="info" className="mb-4 border-sun/30 bg-sun/15 text-sun backdrop-blur-sm">
              قیمت‌گذاری
            </Badge>
            <h1 className="text-balance text-3xl font-black text-white sm:text-4xl">
              شفافیت در هزینه‌ها، آرامش برای شما
            </h1>
            <p className="mt-4 text-lg text-white/60">
              قیمت نهایی پس از بررسی درخواست و با توجه به عوامل مؤثر تعیین می‌شود.
            </p>
          </div>
        </PageContainer>
      </section>

      <section className="surface-paper py-14">
        <PageContainer>
          <div className="mx-auto max-w-3xl">
            <Alert title="قیمت در فرم ثبت‌نام محاسبه نمی‌شود">
              هر مبلغ نهایی فقط پس از بررسی و از طرف سامانه اعلام می‌شود. رابط کاربری قیمت یا شرایط
              نهایی را به‌صورت مستقل محاسبه نمی‌کند.
            </Alert>
          </div>
        </PageContainer>
      </section>

      <section className="surface-inset border-y border-border/60 py-14">
        <PageContainer>
          <div className="mx-auto max-w-3xl text-center">
            <p className="font-bold text-primary">عوامل مؤثر بر قیمت</p>
            <h2 className="mt-2 text-2xl font-black">قیمت بر اساس چه عواملی تعیین می‌شود؟</h2>
          </div>
          <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {factors.map((f) => (
              <div
                key={f.label}
                className="rounded-[var(--radius-card)] border border-border/60 bg-surface-paper p-6 shadow-[var(--shadow-raised)] text-center transition-all hover:shadow-[var(--shadow-floating)] hover:-translate-y-0.5"
              >
                <span className="mx-auto flex size-12 items-center justify-center rounded-2xl bg-primary-soft text-primary">
                  <f.icon aria-hidden="true" className="size-5" />
                </span>
                <h3 className="mt-4 font-black">{f.label}</h3>
                <p className="mt-1 text-xs text-muted">{f.description}</p>
              </div>
            ))}
          </div>
        </PageContainer>
      </section>

      <section className="surface-paper py-14">
        <PageContainer>
          <div className="mx-auto max-w-3xl">
            <div className="text-center">
              <p className="font-bold text-primary">روش‌های پرداخت</p>
              <h2 className="mt-2 text-2xl font-black">انتخاب روش پرداخت</h2>
            </div>
            <div className="mt-8 flex justify-center gap-2" role="tablist">
              {paymentMethods.map((m) => (
                <button
                  key={m.id}
                  role="tab"
                  aria-selected={activeMethod === m.id}
                  onClick={() => setActiveMethod(m.id)}
                  className={cn(
                    'rounded-[var(--radius-pill)] px-6 py-2.5 text-sm font-bold transition-all',
                    activeMethod === m.id
                      ? 'bg-navy text-white shadow-md'
                      : 'bg-surface-inset text-muted hover:text-foreground',
                  )}
                >
                  {m.label}
                </button>
              ))}
            </div>
            <div className="mt-6 rounded-[var(--radius-canvas)] border border-border/60 bg-gradient-to-br from-surface-paper to-surface-inset p-8 text-center">
              {activeMethod === 'full' ? (
                <div>
                  <FileText aria-hidden="true" className="mx-auto size-10 text-primary" />
                  <p className="mt-4 text-lg font-black">تسویه یک‌باره</p>
                  <p className="mt-2 text-sm text-muted">
                    مبلغ کامل قرارداد به صورت نقدی پرداخت می‌شود. این روش معمولاً با تخفیف همراه
                    است.
                  </p>
                </div>
              ) : (
                <div>
                  <Calendar aria-hidden="true" className="mx-auto size-10 text-primary" />
                  <p className="mt-4 text-lg font-black">پرداخت اقساطی</p>
                  <p className="mt-2 text-sm text-muted">
                    یک‌سوم مبلغ به عنوان پیش‌پرداخت و مابقی در ۴ قسط ماهانه پرداخت می‌شود.
                  </p>
                </div>
              )}
            </div>
          </div>
        </PageContainer>
      </section>

      <section className="surface-inset border-y border-border/60 py-14">
        <PageContainer>
          <div className="lg:grid lg:grid-cols-2 lg:items-center lg:gap-12">
            <div>
              <p className="font-bold text-primary">مراحل قیمت‌گذاری</p>
              <h2 className="mt-2 text-2xl font-black">از درخواست تا اعلام قیمت</h2>
              <div className="mt-10 grid gap-5 sm:grid-cols-2">
                {pricingSteps.map((step, i) => (
                  <div key={step.number} className="relative text-center">
                    {i < pricingSteps.length - 1 && (
                      <div
                        className="absolute left-[60%] top-5 hidden h-0.5 w-[80%] bg-primary-soft md:block"
                        aria-hidden="true"
                      />
                    )}
                    <span className="mx-auto flex size-10 items-center justify-center rounded-full bg-primary text-sm font-black text-white">
                      {step.number}
                    </span>
                    <h3 className="mt-3 text-sm font-bold">{step.title}</h3>
                    <p className="mt-1 text-xs text-muted">{step.desc}</p>
                  </div>
                ))}
              </div>
            </div>
            <div className="relative mt-10 lg:mt-0">
              <div className="relative aspect-[4/3] overflow-hidden rounded-[var(--radius-canvas)]">
                <Image
                  src="/images/illustration-route-guide-school-bus-wide-left-space.webp"
                  alt=""
                  fill
                  className="object-cover"
                  sizes="(max-width: 1024px) 100vw, 50vw"
                />
              </div>
            </div>
          </div>
        </PageContainer>
      </section>

      <section className="surface-paper py-14">
        <PageContainer>
          <div className="rounded-[var(--radius-canvas)] bg-gradient-to-br from-navy to-ink p-8 text-center sm:p-12">
            <h2 className="text-2xl font-black text-white">برای شروع آماده‌اید؟</h2>
            <p className="mt-2 text-white/60">
              ثبت‌نام را آغاز کنید و از مسیر شفاف دریافت خدمت لذت ببرید.
            </p>
            <div className="mt-6 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <ButtonLink
                href="/login"
                size="lg"
                className="bg-sun text-navy hover:bg-sun/90 shadow-lg shadow-sun/20"
              >
                ثبت‌نام آنلاین
                <ArrowLeft aria-hidden="true" className="size-4" />
              </ButtonLink>
              <ButtonLink
                href="/registration-guide"
                size="lg"
                variant="inverse"
                className="border-white/20 bg-white/10 backdrop-blur-sm"
              >
                راهنمای ثبت‌نام
              </ButtonLink>
            </div>
          </div>
        </PageContainer>
      </section>
    </>
  );
}
