import { PageContainer } from '@/components/common/page-container';
import { Badge } from '@/components/ui/badge';
import { ButtonLink } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

const steps = [
  ['۱', 'ثبت اطلاعات', 'اطلاعات خانواده و دانش‌آموز را در فرایند ثبت‌نام وارد کنید.'],
  ['۲', 'بررسی درخواست', 'درخواست ثبت‌شده بررسی می‌شود و وضعیت آن به شما اطلاع داده خواهد شد.'],
  ['۳', 'قرارداد و پرداخت', 'پس از تعیین قیمت، قرارداد و روش‌های پرداخت را در سامانه مشاهده کنید.'],
] as const;

const benefits = [
  ['فرایند شفاف', 'وضعیت درخواست و اقدام بعدی را در هر مرحله به‌روشنی ببینید.'],
  ['مدیریت یکپارچه', 'اطلاعات دانش‌آموزان، قراردادها، پرداخت‌ها و اعلان‌ها در یک حساب خانوادگی.'],
  ['طراحی برای خانواده‌ها', 'تجربه فارسی، راست‌به‌چپ، واکنش‌گرا و مناسب استفاده با تلفن همراه.'],
] as const;

export default function HomePage() {
  return (
    <>
      <section className="overflow-hidden border-b border-border bg-surface">
        <PageContainer className="grid items-center gap-10 py-16 lg:grid-cols-[1.05fr_.95fr] lg:py-24">
          <div>
            <Badge tone="info">ثبت‌نام و مدیریت آنلاین</Badge>
            <h1 className="mt-5 max-w-2xl text-4xl font-black leading-[1.35] tracking-tight sm:text-5xl">
              مسیر ساده‌تر برای مدیریت سرویس مدرسه
            </h1>
            <p className="mt-5 max-w-xl text-lg text-muted">
              از ثبت درخواست تا مشاهده قرارداد و پیگیری پرداخت‌ها، مراحل خدمات سرویس مدرسه را در یک
              سامانه دنبال کنید.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <ButtonLink href="/register">شروع ثبت‌نام</ButtonLink>
              <ButtonLink href="/registration-guide" variant="secondary">
                مشاهده مراحل
              </ButtonLink>
            </div>
          </div>
          <div
            className="relative min-h-80 rounded-[2rem] bg-primary-soft p-6 sm:p-9"
            aria-label="نمای کلی مراحل استفاده از سامانه"
          >
            <div
              className="absolute -start-10 -top-10 size-40 rounded-full bg-white/60"
              aria-hidden="true"
            />
            <Card className="relative mt-8 shadow-[var(--shadow-md)]">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted">وضعیت درخواست</p>
                  <p className="mt-1 text-lg font-black">پیگیری مرحله‌به‌مرحله</p>
                </div>
                <Badge tone="warning">در انتظار اقدام</Badge>
              </div>
              <div className="mt-6 h-2 overflow-hidden rounded-full bg-surface-muted">
                <div className="h-full w-2/3 rounded-full bg-primary" />
              </div>
              <div className="mt-5 grid grid-cols-3 gap-2 text-center text-xs text-muted">
                <span>ثبت اطلاعات</span>
                <span>بررسی</span>
                <span>قرارداد</span>
              </div>
            </Card>
          </div>
        </PageContainer>
      </section>

      <section className="py-16 sm:py-20">
        <PageContainer>
          <div className="max-w-2xl">
            <p className="font-bold text-primary">چطور کار می‌کند؟</p>
            <h2 className="mt-2 text-3xl font-black">از درخواست تا شروع خدمت، با مراحل مشخص</h2>
            <p className="mt-3 text-muted">
              سامانه وضعیت هر مرحله و اقدام موردنیاز را به زبان ساده نمایش می‌دهد.
            </p>
          </div>
          <ol className="mt-9 grid gap-4 md:grid-cols-3">
            {steps.map(([number, title, description]) => (
              <li key={number}>
                <Card className="h-full">
                  <span className="grid size-11 place-items-center rounded-xl bg-primary text-lg font-black text-white">
                    {number}
                  </span>
                  <h3 className="mt-5 text-lg font-black">{title}</h3>
                  <p className="mt-2 text-sm text-muted">{description}</p>
                </Card>
              </li>
            ))}
          </ol>
        </PageContainer>
      </section>

      <section className="border-y border-border bg-surface py-16 sm:py-20">
        <PageContainer>
          <div className="text-center">
            <p className="font-bold text-primary">با تمرکز بر اعتماد و سادگی</p>
            <h2 className="mt-2 text-3xl font-black">اطلاعات مهم، همیشه در دسترس</h2>
          </div>
          <div className="mt-9 grid gap-6 md:grid-cols-3">
            {benefits.map(([title, description], index) => (
              <div key={title} className="flex gap-4">
                <span
                  aria-hidden="true"
                  className="grid size-11 shrink-0 place-items-center rounded-xl bg-success-soft font-black text-success"
                >
                  {index + 1}
                </span>
                <div>
                  <h3 className="font-black">{title}</h3>
                  <p className="mt-1 text-sm text-muted">{description}</p>
                </div>
              </div>
            ))}
          </div>
        </PageContainer>
      </section>

      <section className="py-16 sm:py-20">
        <PageContainer>
          <div className="rounded-[2rem] bg-primary px-6 py-10 text-white sm:px-10 lg:flex lg:items-center lg:justify-between">
            <div>
              <h2 className="text-2xl font-black sm:text-3xl">برای ثبت درخواست آماده‌اید؟</h2>
              <p className="mt-2 text-blue-100">
                فرایند ثبت‌نام را آغاز کنید یا ابتدا راهنمای مراحل را بخوانید.
              </p>
            </div>
            <div className="mt-6 flex flex-col gap-3 sm:flex-row lg:mt-0">
              <ButtonLink href="/register" className="bg-white text-primary hover:bg-blue-50">
                شروع ثبت‌نام
              </ButtonLink>
              <ButtonLink
                href="/registration-guide"
                className="border border-white/40 bg-transparent text-white hover:bg-white/10"
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
