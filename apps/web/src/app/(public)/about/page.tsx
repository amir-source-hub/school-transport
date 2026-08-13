'use client';

import {
  BadgeCheck,
  HeartHandshake,
  Lock,
  MonitorSmartphone,
  Route,
  Headphones,
} from 'lucide-react';
import Image from 'next/image';
import { motion } from 'motion/react';
import { Badge } from '@/components/ui/badge';
import { ButtonLink } from '@/components/ui/button';
import { PageContainer } from '@/components/common/page-container';

const values = [
  {
    icon: BadgeCheck,
    title: 'شفاف برای خانواده',
    description:
      'هر خانواده می‌تواند دانش‌آموزان خود را مدیریت کند و وضعیت هر کدام را جداگانه ببیند.',
  },
  {
    icon: Route,
    title: 'ساختارمند برای مدیریت',
    description: 'بررسی درخواست، تعیین قیمت و پرداخت در فرایندی مشخص و قابل پیگیری.',
  },
  {
    icon: HeartHandshake,
    title: 'متمرکز بر اعتماد',
    description: 'وضعیت‌ها و اقدام بعدی با زبان روشن و بدون پیچیدگی نمایش داده می‌شود.',
  },
  {
    icon: MonitorSmartphone,
    title: 'طراحی برای خانواده ایرانی',
    description: 'تجربه کاملاً فارسی، راست‌به‌چپ و واکنش‌گرا برای تلفن همراه.',
  },
  {
    icon: Lock,
    title: 'امنیت و حریم خصوصی',
    description: 'اطلاعات شخصی و مالی با پروتکل‌های امنیتی رمزنگاری می‌شود.',
  },
  {
    icon: Headphones,
    title: 'پشتیبانی پاسخگو',
    description: 'تیم پشتیبانی در ساعات اداری آماده پاسخگویی است.',
  },
];

const principles = [
  { year: '۱۴۰۰', title: 'طراحی اولیه', desc: 'مفهوم‌پردازی و طراحی معماری سامانه' },
  { year: '۱۴۰۱', title: 'توسعه نسخه اول', desc: 'پیاده‌سازی هسته اصلی خدمات' },
  { year: '۱۴۰۲', title: 'راه‌اندازی آزمایشی', desc: 'آزمون با گروه محدود خانواده‌ها' },
  { year: '۱۴۰۳', title: 'نسخه پایدار', desc: 'عرضه عمومی با پوشش کامل خدمات' },
];

export default function AboutPage() {
  return (
    <>
      <section className="relative overflow-hidden surface-dark pb-20 pt-32 sm:pt-36">
        <div className="absolute inset-0" aria-hidden="true">
          <Image
            src="/images/about-hero-transport-team-school-bus.webp"
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
              درباره ما
            </Badge>
            <h1 className="text-balance text-3xl font-black text-white sm:text-4xl">
              یک مسیر یکپارچه برای خانواده و مدیریت
            </h1>
            <p className="mt-4 text-lg text-white/60">
              سامانه‌ای برای ثبت و پیگیری خدمات سرویس مدرسه، از درخواست تا قرارداد و پرداخت.
            </p>
          </div>
        </PageContainer>
      </section>

      <section className="surface-paper py-16">
        <PageContainer>
          <div className="lg:grid lg:grid-cols-2 lg:items-center lg:gap-12">
            <div className="relative overflow-hidden rounded-[var(--radius-canvas)] mb-8 lg:mb-0">
              <div className="relative aspect-[4/3]">
                <Image
                  src="/images/about-family-mother-student-driver-morning.webp"
                  alt="خانواده و راننده سرویس مدرسه"
                  fill
                  className="object-cover object-center"
                  sizes="(max-width: 1024px) 100vw, 50vw"
                />
              </div>
              <div className="absolute inset-0 bg-gradient-to-t from-navy/30 to-transparent" />
            </div>
            <div>
              <p className="font-bold text-primary">داستان ما</p>
              <h2 className="mt-2 text-2xl font-black">
                ایجاد شفافیت و سادگی در خدمات سرویس مدرسه
              </h2>
              <p className="mt-4 leading-relaxed text-muted">
                ثمین گشت مهر ایران با هدف ایجاد شفافیت و سادگی در فرایند ثبت‌نام، قرارداد و پرداخت
                خدمات سرویس مدرسه طراحی شده است. خانواده‌ها می‌توانند تمام مراحل را در یک سامانه
                دنبال کنند و مدیریت نیز ابزارهای لازم برای بررسی، قیمت‌گذاری و پیگیری را در اختیار
                دارد.
              </p>
              <a
                href="https://maps.app.goo.gl/rGetdanWqsAq6SAcA"
                target="_blank"
                rel="noopener noreferrer"
                className="mt-4 block text-sm font-bold leading-7 text-primary hover:underline"
              >
                تهران، بزرگراه شهید بابایی، شهرک شهید بهشتی، خیابان سروستان دوم، کوچه نسترن ۲۷ و ۲۸،
                مجتمع تجاری گلستان، پلاک ۲۲
              </a>
              <p className="mt-2 text-sm text-muted" dir="ltr">
                09123859883 · 09126839458 · 021-77116782 · 021-77115832 · 021-77119045
              </p>
              <div className="mt-6">
                <ButtonLink href="/contact" variant="secondary">
                  ارتباط با ما
                </ButtonLink>
              </div>
            </div>
          </div>
        </PageContainer>
      </section>

      <section id="privacy" className="surface-dark scroll-mt-24 border-y border-white/10 py-16">
        <PageContainer>
          <div className="mx-auto max-w-3xl text-center">
            <Badge tone="info" className="bg-white/10 text-sun border-sun/20">
              اصول و ارزش‌ها
            </Badge>
            <h2 className="mt-3 text-2xl font-black text-white">چیزهایی که به آن اعتقاد داریم</h2>
          </div>
          <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {values.map((v, i) => (
              <motion.div
                key={v.title}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.3, delay: i * 0.05 }}
                className="rounded-[var(--radius-card)] border border-white/10 bg-white/5 p-6 backdrop-blur-sm"
              >
                <span className="flex size-10 items-center justify-center rounded-xl bg-sun/15 text-sun">
                  <v.icon aria-hidden="true" className="size-5" />
                </span>
                <h3 className="mt-4 font-bold text-white">{v.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-white/50">{v.description}</p>
              </motion.div>
            ))}
          </div>
        </PageContainer>
      </section>

      <section className="surface-inset border-y border-border/60 py-16">
        <PageContainer>
          <div className="lg:grid lg:grid-cols-2 lg:items-center lg:gap-12">
            <div>
              <div className="text-center lg:text-right">
                <p className="font-bold text-primary">مسیر توسعه</p>
                <h2 className="mt-2 text-2xl font-black">از ایده تا اجرا</h2>
              </div>
              <div className="mt-10 relative mr-4">
                <div
                  className="absolute right-1 top-0 h-full w-0.5 bg-primary-soft/50"
                  aria-hidden="true"
                />
                {principles.map((p, i) => (
                  <motion.div
                    key={p.year}
                    initial={{ opacity: 0, x: -20 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.4, delay: i * 0.1 }}
                    className="relative mr-6 pb-8 last:pb-0 sm:mr-8"
                  >
                    <span className="absolute -right-[2.15rem] top-0 flex size-4 items-center justify-center rounded-full border-2 border-primary bg-surface-inset">
                      <span className="size-1.5 rounded-full bg-primary" />
                    </span>
                    <p className="text-xs font-bold text-primary">{p.year}</p>
                    <h3 className="mt-1 font-black">{p.title}</h3>
                    <p className="mt-1 text-sm text-muted">{p.desc}</p>
                  </motion.div>
                ))}
              </div>
            </div>
            <div className="relative mt-10 lg:mt-0">
              <div className="relative aspect-[4/3] overflow-hidden rounded-[var(--radius-canvas)]">
                <Image
                  src="/images/about-illustration-school-transport-ecosystem.webp"
                  alt=""
                  fill
                  className="object-cover object-center"
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
            <h2 className="text-2xl font-black text-white">سؤالی دارید؟</h2>
            <p className="mt-2 text-white/60">تیم پشتیبانی آماده پاسخگویی به شماست.</p>
            <div className="mt-6 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <ButtonLink
                href="/contact"
                size="lg"
                className="bg-sun text-navy hover:bg-sun/90 shadow-lg shadow-sun/20"
              >
                تماس با پشتیبانی
              </ButtonLink>
              <ButtonLink
                href="/faq"
                size="lg"
                variant="inverse"
                className="border-white/20 bg-white/10 backdrop-blur-sm"
              >
                سوالات متداول
              </ButtonLink>
            </div>
          </div>
        </PageContainer>
      </section>
    </>
  );
}
