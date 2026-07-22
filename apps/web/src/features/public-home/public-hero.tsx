import { Badge } from '@/components/ui/badge';
import { ButtonLink } from '@/components/ui/button';
import { PageContainer } from '@/components/common/page-container';
import { BrandMark } from '@/components/brand/brand-mark';

export function PublicHero() {
  return (
    <section className="relative overflow-hidden surface-dark pb-16 pt-8 sm:pb-24 sm:pt-12">
      <div className="pointer-events-none absolute inset-0 opacity-[0.04]" aria-hidden="true">
        <svg width="100%" height="100%" className="h-full w-full">
          <defs>
            <pattern id="hero-grid" x="0" y="0" width="60" height="60" patternUnits="userSpaceOnUse">
              <circle cx="30" cy="30" r="1" fill="white" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#hero-grid)" />
        </svg>
      </div>
      <PageContainer className="relative z-10">
        <div className="mx-auto max-w-4xl text-center">
          <Badge tone="info" className="mb-5">
            ثبت‌نام و مدیریت آنلاین سرویس مدرسه
          </Badge>
          <h1 className="text-balance text-4xl font-black leading-[1.3] tracking-tight text-white sm:text-5xl lg:text-6xl">
            <span className="text-primary-soft">از خانه تا مدرسه،</span>{' '}
            <span className="text-white">روشن و قابل پیگیری</span>
          </h1>
          <p className="mx-auto mt-5 max-w-2xl text-lg text-white/70">
            از ثبت درخواست تا قرارداد و پرداخت، وضعیت سرویس مدرسه فرزندتان را در هر مرحله ببینید.
          </p>
          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <ButtonLink href="/register" size="lg" variant="primary" className="min-w-44 bg-white text-ink hover:bg-white/90">
              شروع ثبت‌نام
            </ButtonLink>
            <ButtonLink href="/registration-guide" size="lg" variant="inverse">
              دیدن مسیر کار
            </ButtonLink>
          </div>
          <div className="mt-10 flex flex-wrap items-center justify-center gap-6 text-sm text-white/50">
            <span className="flex items-center gap-1.5">
              <BrandMark size={24} className="text-white/30" />
              ثبت‌نام آنلاین
            </span>
            <span className="flex items-center gap-1.5">پرداخت امن</span>
            <span className="flex items-center gap-1.5">پشتیبانی پاسخگو</span>
          </div>
        </div>
      </PageContainer>
    </section>
  );
}
