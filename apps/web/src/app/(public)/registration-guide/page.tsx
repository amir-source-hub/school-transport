import type { Metadata } from 'next';
import { PublicPageIntro } from '@/components/common/public-page-intro';
import { PageContainer } from '@/components/common/page-container';
import { Alert } from '@/components/feedback/alert';
import { ButtonLink } from '@/components/ui/button';

export const metadata: Metadata = { title: 'راهنمای ثبت‌نام' };

const steps = [
  [
    'ایجاد حساب خانواده',
    'یک حساب خانوادگی ایجاد کنید. این حساب می‌تواند چند دانش‌آموز را مدیریت کند.',
  ],
  ['ثبت اطلاعات دانش‌آموز', 'اطلاعات لازم هر دانش‌آموز و درخواست خدمت مرتبط با او را وارد کنید.'],
  ['ارسال برای بررسی', 'پس از مرور اطلاعات، درخواست را ارسال کنید تا مدیریت آن را بررسی کند.'],
  ['پیگیری نتیجه', 'وضعیت تأیید، رد یا نیاز به اصلاح را از پنل خانواده دنبال کنید.'],
  [
    'مشاهده قیمت و قرارداد',
    'پس از تأیید و تعیین قیمت، جزئیات قرارداد و گزینه‌های پرداخت نمایش داده می‌شوند.',
  ],
] as const;

export default function RegistrationGuidePage() {
  return (
    <>
      <PublicPageIntro
        eyebrow="راهنمای شروع"
        title="مراحل ثبت‌نام را پیش از شروع بشناسید"
        description="این راهنما نمای کلی فرایند مستندشده را نشان می‌دهد؛ فرم نهایی پس از تأیید مشخصات کامل خواهد شد."
      >
        <ButtonLink href="/register">شروع ثبت‌نام</ButtonLink>
      </PublicPageIntro>
      <PageContainer className="py-14">
        <Alert title="توجه درباره اطلاعات موردنیاز">
          جزئیات نهایی فیلدها و ترتیب فرم ثبت‌نام هنوز در سند اختصاصی فرم تأیید نشده است؛ هنگام
          آماده‌شدن فرم، موارد الزامی در همان مرحله به‌روشنی نمایش داده می‌شوند.
        </Alert>
        <ol className="mx-auto mt-10 max-w-3xl border-r-2 border-primary-soft pr-7">
          {steps.map(([title, description], index) => (
            <li key={title} className="relative pb-9 last:pb-0">
              <span className="absolute -right-[2.45rem] grid size-9 place-items-center rounded-full bg-primary font-black text-white">
                {index + 1}
              </span>
              <h2 className="font-black">{title}</h2>
              <p className="mt-1 text-sm text-muted">{description}</p>
            </li>
          ))}
        </ol>
      </PageContainer>
    </>
  );
}
