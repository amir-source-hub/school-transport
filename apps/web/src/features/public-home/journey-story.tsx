import { StaggerContainer, StaggerItem } from '@/components/motion/stagger';
import { PageContainer } from '@/components/common/page-container';

const steps = [
  ['ثبت اطلاعات', 'اطلاعات خانواده و دانش‌آموز را در فرایند ثبت‌نام وارد کنید.', '۱'],
  ['بررسی درخواست', 'درخواست ثبت‌شده بررسی می‌شود و وضعیت آن به شما اطلاع داده خواهد شد.', '۲'],
  ['قرارداد و پرداخت', 'پس از تعیین قیمت، قرارداد و روش‌های پرداخت را در سامانه مشاهده کنید.', '۳'],
] as const;

export function JourneyStory() {
  return (
    <section className="surface-paper py-16 sm:py-20">
      <PageContainer>
        <div className="mx-auto max-w-2xl text-center">
          <p className="font-bold text-primary">چطور کار می‌کند؟</p>
          <h2 className="mt-2 text-3xl font-black">از درخواست تا شروع خدمت، با مراحل مشخص</h2>
          <p className="mt-3 text-muted">
            سامانه وضعیت هر مرحله و اقدام موردنیاز را به زبان ساده نمایش می‌دهد.
          </p>
        </div>
        <StaggerContainer className="mt-12 grid gap-6 md:grid-cols-3">
          {steps.map(([title, description, number]) => (
            <StaggerItem key={number}>
              <div className="flex h-full flex-col rounded-[var(--radius-card)] border border-border bg-surface-paper p-6 shadow-[var(--shadow-raised)]">
                <span className="grid size-11 place-items-center rounded-xl bg-primary text-lg font-black text-white">
                  {number}
                </span>
                <h3 className="mt-5 text-lg font-black">{title}</h3>
                <p className="mt-2 text-sm text-muted">{description}</p>
              </div>
            </StaggerItem>
          ))}
        </StaggerContainer>
      </PageContainer>
    </section>
  );
}
