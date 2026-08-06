import { BadgeCheck, FileSearch, LifeBuoy, ShieldCheck } from 'lucide-react';
import Image from 'next/image';
import { ButtonLink } from '@/components/ui/button';
import { PageContainer } from '@/components/common/page-container';
import { metadataFor } from '@/lib/route-metadata';

export const metadata = metadataFor('/safety');

export default function SafetyPage() {
  return (
    <>
      <section className="relative overflow-hidden surface-dark pb-20 pt-32 sm:pt-36">
        <div className="absolute inset-0" aria-hidden="true">
          <Image
            src="/images/safety-driver-inspecting-school-van.png"
            alt=""
            fill
            className="object-cover object-center"
            priority
            fetchPriority="high"
            sizes="100vw"
          />
          <div className="absolute inset-0 bg-navy/75" />
        </div>
        <PageContainer className="relative z-10">
          <div className="mx-auto max-w-3xl text-center">
            <p className="font-bold text-sun flex items-center justify-center gap-2">
              <ShieldCheck aria-hidden="true" className="size-4" />
              ایمنی و اطمینان
            </p>
            <h1 className="mt-3 text-3xl font-black text-white sm:text-4xl">
              استانداردهای ایمنی سرویس مدرسه
            </h1>
            <p className="mt-4 text-lg text-white/60">
              همه مراحل تأیید و نظارت بر رانندگان، خودروها و فرایندها.
            </p>
          </div>
        </PageContainer>
      </section>
      <section className="surface-paper py-16">
        <PageContainer>
          <div className="grid gap-8 md:grid-cols-3">
            <div className="rounded-[var(--radius-card)] border border-border/60 bg-surface-paper p-6 shadow-[var(--shadow-raised)]">
              <span className="flex size-12 items-center justify-center rounded-2xl bg-primary-soft text-primary">
                <BadgeCheck aria-hidden="true" className="size-6" />
              </span>
              <h2 className="mt-5 text-lg font-black">تأیید راننده و خودرو</h2>
              <p className="mt-2 text-sm leading-relaxed text-muted">
                تمام رانندگان و خودروها پیش از شروع خدمت، مراحل تأیید مدارک و بازرسی را طی می‌کنند.
                اطلاعات تأیید در سامانه قابل مشاهده است.
              </p>
            </div>
            <div className="rounded-[var(--radius-card)] border border-border/60 bg-surface-paper p-6 shadow-[var(--shadow-raised)]">
              <span className="flex size-12 items-center justify-center rounded-2xl bg-primary-soft text-primary">
                <FileSearch aria-hidden="true" className="size-6" />
              </span>
              <h2 className="mt-5 text-lg font-black">چرخه خدمت شفاف</h2>
              <p className="mt-2 text-sm leading-relaxed text-muted">
                از درخواست اولیه تا قرارداد و پرداخت، هر مرحله از خدمت به صورت شفاف ثبت و قابل
                پیگیری است.
              </p>
            </div>
            <div className="rounded-[var(--radius-card)] border border-border/60 bg-surface-paper p-6 shadow-[var(--shadow-raised)]">
              <span className="flex size-12 items-center justify-center rounded-2xl bg-primary-soft text-primary">
                <LifeBuoy aria-hidden="true" className="size-6" />
              </span>
              <h2 className="mt-5 text-lg font-black">پشتیبانی و گزارش</h2>
              <p className="mt-2 text-sm leading-relaxed text-muted">
                تیم پشتیبانی در تمام مراحل پاسخگوی سؤالات و گزارش‌های شماست. هرگونه مشکل یا ابهام را
                می‌توانید ثبت کنید.
              </p>
            </div>
          </div>
          <div className="mt-10 text-center">
            <ButtonLink href="/contact" variant="secondary">
              تماس با پشتیبانی
            </ButtonLink>
          </div>
        </PageContainer>
      </section>
    </>
  );
}
