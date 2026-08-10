import { ArrowLeft, CheckCircle2 } from 'lucide-react';
import Image from 'next/image';
import { ButtonLink } from '@/components/ui/button';
import { PageContainer } from '@/components/common/page-container';

const checklist = [
  'ثبت نام آنلاین بدون نیاز به مراجعه حضوری',
  'مشاهده و پذیرش قرارداد به صورت دیجیتال',
  'پرداخت امن و پیگیری وضعیت',
  'پشتیبانی در تمام مراحل',
];

export function FinalRegistrationCta() {
  return (
    <section className="relative overflow-hidden surface-paper py-16 sm:py-20 lg:py-24">
      <div className="absolute inset-0" aria-hidden="true">
        <Image
          src="/images/photo-school-bus-city-mountain-road-background.webp"
          alt=""
          fill
          className="object-cover object-[center_60%]"
          sizes="100vw"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-navy/85 via-navy/75 to-navy/85" />
      </div>
      <PageContainer className="relative z-10">
        <div className="mx-auto max-w-3xl text-center">
          <h2 className="text-balance text-3xl font-black leading-tight text-white sm:text-4xl">
            برای ثبت‌نام آماده‌اید؟
          </h2>
          <p className="mt-4 text-lg text-white/60">مسیر امن فرزند شما از اینجا شروع می‌شود</p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-6">
            {checklist.map((item) => (
              <span key={item} className="flex items-center gap-2 text-sm text-white/70">
                <CheckCircle2 aria-hidden="true" className="size-4 text-sun" />
                {item}
              </span>
            ))}
          </div>
          <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <ButtonLink
              href="/login"
              size="lg"
              className="min-w-48 bg-sun text-navy hover:bg-sun/90 shadow-lg shadow-sun/25"
            >
              ثبت‌نام و ورود
              <ArrowLeft aria-hidden="true" className="size-4" />
            </ButtonLink>
            <ButtonLink
              href="/registration-guide"
              size="lg"
              variant="inverse"
              className="border-white/20 bg-white/10 backdrop-blur-md hover:bg-white/20"
            >
              راهنمای ثبت‌نام
            </ButtonLink>
          </div>
        </div>
      </PageContainer>
    </section>
  );
}
