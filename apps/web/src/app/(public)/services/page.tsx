import type { Metadata } from 'next';
import { PublicPageIntro } from '@/components/common/public-page-intro';
import { PageContainer } from '@/components/common/page-container';

export const metadata: Metadata = { title: 'خدمات' };

const services = [
  [
    'ثبت درخواست دانش‌آموز',
    'برای هر دانش‌آموز، پروفایل، درخواست ثبت‌نام و درخواست خدمت به‌صورت مستقل نگهداری می‌شود.',
  ],
  [
    'بررسی و اعلام وضعیت',
    'پس از ارسال، درخواست توسط مدیریت بررسی می‌شود و نتیجه یا درخواست اصلاح در سامانه نمایش داده خواهد شد.',
  ],
  [
    'قیمت و قرارداد',
    'قیمت پس از بررسی درخواست تعیین می‌شود و قرارداد مرتبط با همان دانش‌آموز برای مشاهده و پذیرش در دسترس قرار می‌گیرد.',
  ],
  [
    'پرداخت و سوابق',
    'پرداخت کامل یا اقساطی مطابق گزینه‌های ارائه‌شده و مشاهده وضعیت و سابقه پرداخت‌ها در سامانه انجام می‌شود.',
  ],
  [
    'اعلان‌ها',
    'رویدادهای مهم ثبت‌نام، قیمت، قرارداد، سررسیدها و پرداخت‌ها از طریق اعلان‌ها اطلاع‌رسانی می‌شوند.',
  ],
] as const;

export default function ServicesPage() {
  return (
    <>
      <PublicPageIntro
        eyebrow="خدمات سامانه"
        title="همه مراحل اصلی سرویس مدرسه در یک فضای مشخص"
        description="خدمات نسخه فعلی بر ثبت‌نام، بررسی، قیمت‌گذاری، قرارداد، پرداخت و اطلاع‌رسانی متمرکز است."
      />
      <PageContainer className="py-14">
        <ol className="grid gap-x-10 gap-y-8 md:grid-cols-2">
          {services.map(([title, description], index) => (
            <li key={title} className="flex gap-4">
              <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-primary-soft font-black text-primary">
                {index + 1}
              </span>
              <div>
                <h2 className="font-black">{title}</h2>
                <p className="mt-1 text-sm text-muted">{description}</p>
              </div>
            </li>
          ))}
        </ol>
      </PageContainer>
    </>
  );
}
