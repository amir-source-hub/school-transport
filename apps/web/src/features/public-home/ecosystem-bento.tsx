import { Bell, FileText, GraduationCap, Route, UserRound, WalletCards } from 'lucide-react';
import Image from 'next/image';
import { ButtonLink } from '@/components/ui/button';
import { PageContainer } from '@/components/common/page-container';

const features = [
  ['قرارداد شفاف', 'متن قرارداد، هزینه‌ها و وضعیت پذیرش همیشه در دسترس است.', FileText],
  ['پرداخت امن', 'رسید و وضعیت تمام پرداخت‌ها را یک‌جا پیگیری کنید.', WalletCards],
  ['اعلان به‌موقع', 'برای هر تغییر مهم، دقیق و سریع باخبر شوید.', Bell],
  ['چند فرزند، یک حساب', 'همه فرزندان خانواده را بدون حساب‌های پراکنده مدیریت کنید.', UserRound],
] as const;

export function EcosystemBento() {
  return (
    <section className="bg-slate-50 py-20 lg:py-28">
      <PageContainer>
        <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
          <div>
            <p className="font-bold text-primary">همه چیز در یک سامانه</p>
            <h2 className="mt-2 text-3xl font-black sm:text-4xl">کنترل بیشتر، نگرانی کمتر</h2>
          </div>
          <p className="max-w-lg leading-7 text-muted">
            یک تجربه منظم برای خانواده‌ها؛ از اولین ثبت‌نام تا پرداخت و پیگیری روزانه.
          </p>
        </div>
        <div className="mt-12 grid gap-5 lg:grid-cols-12">
          <article className="relative min-h-[430px] overflow-hidden rounded-[2rem] bg-navy p-8 text-white lg:col-span-7">
            <Image
              src="/images/illustration-parent-students-school-bus-wide-left-space.png"
              alt=""
              fill
              className="object-cover object-center opacity-80"
              loading="lazy"
              sizes="(max-width: 1024px) 100vw, 58vw"
            />
            <div className="absolute inset-0 bg-gradient-to-l from-navy/95 via-navy/75 to-transparent" />
            <div className="relative z-10 flex h-full max-w-sm flex-col">
              <span className="flex size-12 items-center justify-center rounded-2xl bg-sun text-navy">
                <GraduationCap />
              </span>
              <h3 className="mt-7 text-3xl font-black">ثبت‌نامی که واقعاً ساده است</h3>
              <p className="mt-4 leading-7 text-white/70">
                چهار مرحله روشن، ذخیره اطلاعات در حساب و پیگیری کامل تا شروع سرویس.
              </p>
              <ButtonLink href="/login" className="mt-auto w-fit bg-sun text-navy hover:bg-sun/90">
                شروع ثبت‌نام
              </ButtonLink>
            </div>
          </article>
          <div className="grid gap-5 sm:grid-cols-2 lg:col-span-5">
            {features.map(([title, description, Icon]) => (
              <article
                key={title}
                className="rounded-[1.5rem] border border-slate-200 bg-white p-6 shadow-sm transition hover:-translate-y-1 hover:border-primary/25 hover:shadow-xl hover:shadow-slate-200/60"
              >
                <span className="flex size-11 items-center justify-center rounded-2xl bg-primary-soft text-primary">
                  <Icon className="size-5" />
                </span>
                <h3 className="mt-5 text-lg font-black">{title}</h3>
                <p className="mt-2 text-sm leading-6 text-muted">{description}</p>
              </article>
            ))}
          </div>
        </div>
        <div className="mt-5 flex items-center gap-4 rounded-2xl border border-primary/10 bg-white p-5">
          <span className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-primary text-white">
            <Route />
          </span>
          <div>
            <p className="font-black">همیشه قدم بعدی را می‌دانید</p>
            <p className="mt-1 text-sm text-muted">
              وضعیت درخواست، قرارداد و پرداخت با زبان ساده نمایش داده می‌شود.
            </p>
          </div>
        </div>
      </PageContainer>
    </section>
  );
}
