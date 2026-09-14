import { Breadcrumbs } from '@/components/navigation/breadcrumbs';
import { DriverDocuments } from '@/features/driver/driver-documents';
import { getDriverDocuments, getDriverRuns } from '@/features/driver/driver-api';

export const metadata = { title: 'مدارک شخصی من' };
const definitions = [
  { type: 'DRIVER_PHOTO', label: 'عکس راننده', hint: 'عکس واضح، رنگی و روبه‌رو' },
  { type: 'NATIONAL_CARD_FRONT', label: 'روی کارت ملی', hint: 'تمام لبه‌ها و نوشته‌ها واضح باشند' },
  { type: 'BIRTH_CERTIFICATE_PAGE_1', label: 'صفحه اول شناسنامه', hint: 'صفحه مشخصات کامل و خوانا باشد' },
  { type: 'BIRTH_CERTIFICATE_PAGE_2', label: 'صفحه دوم شناسنامه', hint: 'صفحه دوم کامل و خوانا باشد' },
  { type: 'DRIVER_LICENSE_FRONT', label: 'روی گواهینامه', hint: 'عکس و اطلاعات گواهینامه واضح باشند' },
  { type: 'DRIVER_LICENSE_BACK', label: 'پشت گواهینامه', hint: 'تمام نوشته‌های پشت کارت واضح باشند' },
  { type: 'CRIMINAL_RECORD_CERTIFICATE', label: 'گواهی سوءپیشینه', hint: 'تصویر کامل یک صفحه گواهی' },
  { type: 'ADDICTION_TEST_CERTIFICATE', label: 'گواهی عدم اعتیاد', hint: 'تصویر کامل یک صفحه گواهی' },
  { type: 'COMMITMENT_LETTER_RETURNED', label: 'تعهدنامه تکمیل‌شده', hint: 'نسخه چاپ، امضا و تکمیل‌شده' },
  { type: 'ADDICTION_LETTER_RETURNED', label: 'نامه عدم اعتیاد تکمیل‌شده', hint: 'نسخه تکمیل و مهرشده' },
] as const;
export default async function Page() { const [documents, runs] = await Promise.all([getDriverDocuments(), getDriverRuns()]); return <div className="space-y-6"><Breadcrumbs items={[{ label: 'پنل راننده', href: '/driver/dashboard' }, { label: 'مدارک شخصی من' }]} /><header><p className="text-sm font-bold text-primary">پرونده هویتی و صلاحیت</p><h1 className="text-2xl font-black">مدارک شخصی من</h1><p className="mt-2 text-sm text-muted">هر صفحه را در جایگاه خودش بارگذاری کنید. نسخه جدید جایگزین نسخه قبلی می‌شود.</p></header><DriverDocuments documents={documents} definitions={definitions} printLetters runs={runs} /></div>; }
