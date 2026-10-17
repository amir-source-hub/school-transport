import { Breadcrumbs } from '@/components/navigation/breadcrumbs';
import { Printer } from 'lucide-react';
import Link from 'next/link';
import { DriverDocuments } from '@/features/driver/driver-documents';
import { getDriverDocuments } from '@/features/driver/driver-api';

export const metadata = { title: 'مدارک شخصی من' };
const definitions = [
  { type: 'DRIVER_PHOTO', label: 'عکس راننده', hint: 'عکس واضح، رنگی و روبه‌رو' },
  { type: 'NATIONAL_CARD_FRONT', label: 'روی کارت ملی', hint: 'تمام لبه‌ها و نوشته‌ها واضح باشند' },
  {
    type: 'BIRTH_CERTIFICATE_PAGE_1',
    label: 'صفحه اول شناسنامه',
    hint: 'صفحه مشخصات کامل و خوانا باشد',
  },
  {
    type: 'BIRTH_CERTIFICATE_PAGE_2',
    label: 'صفحه دوم شناسنامه',
    hint: 'صفحه دوم کامل و خوانا باشد',
  },
  {
    type: 'DRIVER_LICENSE_FRONT',
    label: 'روی گواهینامه',
    hint: 'عکس و اطلاعات گواهینامه واضح باشند',
  },
  {
    type: 'DRIVER_LICENSE_BACK',
    label: 'پشت گواهینامه',
    hint: 'تمام نوشته‌های پشت کارت واضح باشند',
  },
  {
    type: 'CRIMINAL_RECORD_CERTIFICATE',
    label: 'گواهی سوءپیشینه',
    hint: 'تصویر کامل یک صفحه گواهی',
  },
  {
    type: 'ADDICTION_TEST_CERTIFICATE',
    label: 'گواهی عدم اعتیاد',
    hint: 'تصویر کامل یک صفحه گواهی',
  },
  {
    type: 'EDUCATION_CERTIFICATE',
    label: 'تصویر مدرک تحصیلی',
    hint: 'تصویر یا PDF خوانای مدرک تحصیلی',
  },
  {
    type: 'POSTAL_CODE_CONFIRMATION',
    label: 'تأییدیه کدپستی',
    hint: 'تصویر یا PDF کامل تأییدیه کدپستی',
  },
  {
    type: 'SCHOOL_SERVICE_INSURANCE_ENDORSEMENT',
    label: 'الحاقیه بیمه‌نامه سرویس مدرسه',
    hint: 'تصویر یا PDF کامل الحاقیه بیمه‌نامه',
  },
  {
    type: 'TAXI_OPERATION_LICENSE',
    label: 'پروانه تاکسیرانی (مخصوص خودرو تاکسی)',
    hint: 'تصویر یا PDF خوانای پروانه تاکسیرانی؛ فقط برای خودروهای تاکسی',
  },
] as const;
export default async function Page() {
  const documents = await getDriverDocuments();
  return (
    <div className="space-y-6">
      <Breadcrumbs
        items={[{ label: 'پنل راننده', href: '/driver/dashboard' }, { label: 'مدارک شخصی من' }]}
      />
      <header>
        <p className="text-sm font-bold text-primary">پرونده هویتی و صلاحیت</p>
        <h1 className="text-2xl font-black">مدارک شخصی من</h1>
        <p className="mt-2 text-sm text-muted">
          هر مدرک را در جایگاه خودش بارگذاری کنید. فایل‌های JPG، PNG و PDF مستقیماً در فضای امن
          اسناد ذخیره می‌شوند.
        </p>
      </header>
      <Link
        href="/driver/personal-documents/letters/addiction"
        className="flex min-h-20 items-center gap-4 rounded-2xl border border-border bg-white p-4 font-black transition hover:border-primary/40"
      >
        <span className="grid size-11 place-items-center rounded-xl bg-primary-soft text-primary">
          <Printer />
        </span>
        چاپ نامه عدم اعتیاد
      </Link>
      <DriverDocuments documents={documents} definitions={definitions} />
    </div>
  );
}
