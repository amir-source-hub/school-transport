import { BadgeCheck, FileSearch, LifeBuoy, ShieldCheck } from 'lucide-react';
import Image from 'next/image';
import { ButtonLink } from '@/components/ui/button';
import { PageContainer } from '@/components/common/page-container';

const proofPoints = [
  {
    icon: BadgeCheck,
    title: 'تأیید راننده و خودرو',
    description: 'همه رانندگان و خودروها پیش از ارائه خدمت تأیید و ثبت می‌شوند.',
  },
  {
    icon: FileSearch,
    title: 'چرخه خدمت شفاف',
    description: 'از درخواست تا قرارداد و پرداخت، هر مرحله قابل پیگیری است.',
  },
  {
    icon: LifeBuoy,
    title: 'پشتیبانی و گزارش',
    description: 'تیم پشتیبانی در تمام مراحل پاسخگوی سؤالات و گزارش‌های شماست.',
  },
];

export function SafetyStory() {
  return (
    <section className="relative overflow-hidden surface-paper py-16 sm:py-20 lg:py-24">
      <PageContainer>
        <div className="lg:grid lg:grid-cols-2 lg:items-center lg:gap-12">
          <div className="order-2 lg:order-1">
            <p className="font-bold text-sun flex items-center gap-2">
              <ShieldCheck aria-hidden="true" className="size-4" />
              ایمنی و اطمینان
            </p>
            <h2 className="mt-2 text-3xl font-black leading-tight">
              استانداردهای ایمنی و شفافیت در تمام مراحل
            </h2>
            <p className="mt-4 text-muted leading-relaxed">
              ما به ایمنی و آرامش خاطر خانواده‌ها اهمیت می‌دهیم. تمام مراحل خدمت
              با استانداردهای مشخص و قابل پیگیری طراحی شده است.
            </p>
            <div className="mt-8 space-y-5">
              {proofPoints.map((point) => (
                <div key={point.title} className="flex gap-4">
                  <span className="mt-0.5 flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary-soft text-primary">
                    <point.icon aria-hidden="true" className="size-5" />
                  </span>
                  <div>
                    <h3 className="font-bold">{point.title}</h3>
                    <p className="mt-1 text-sm text-muted">{point.description}</p>
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-8">
              <ButtonLink href="/safety" variant="secondary" size="md">
                بیشتر درباره ایمنی
                <span aria-hidden="true" className="mr-1">&larr;</span>
              </ButtonLink>
            </div>
          </div>
          <div className="order-1 mb-10 lg:order-2 lg:mb-0">
            <div className="relative overflow-hidden rounded-[var(--radius-canvas)]">
              <div className="relative aspect-[4/3]">
                <Image
                  src="/images/illustration-parent-driver-school-bus-pickup.png"
                  alt="تصویری از خانواده و سرویس مدرسه"
                  fill
                  className="object-cover"
                  sizes="(max-width: 1024px) 100vw, 50vw"
                />
              </div>
              <div className="absolute inset-0 bg-gradient-to-t from-navy/30 to-transparent" aria-hidden="true" />
            </div>
          </div>
        </div>
      </PageContainer>
    </section>
  );
}
