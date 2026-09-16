import { Breadcrumbs } from '@/components/navigation/breadcrumbs';
import { DriverDocuments } from '@/features/driver/driver-documents';
import { getDriverDocuments } from '@/features/driver/driver-api';

export const metadata = { title: 'مدارک خودروی من' };
const definitions = [
  { type: 'VEHICLE_PHOTO', label: 'عکس خودرو', hint: 'نمای روبه‌رو و پلاک کاملاً خوانا' },
  {
    type: 'VEHICLE_CARD_FRONT',
    label: 'روی کارت خودرو',
    hint: 'تمام مشخصات و لبه‌های کارت واضح باشند',
  },
  {
    type: 'VEHICLE_CARD_BACK',
    label: 'پشت کارت خودرو',
    hint: 'تمام نوشته‌های پشت کارت واضح باشند',
  },
  { type: 'VEHICLE_TITLE_DOCUMENT', label: 'برگ سند خودرو', hint: 'تصویر کامل یک صفحه سند' },
  {
    type: 'TECHNICAL_INSPECTION_DOCUMENT',
    label: 'معاینه فنی',
    hint: 'تصویر کامل و خوانای برگه معاینه فنی',
  },
  {
    type: 'INSURANCE_POLICY_DOCUMENT',
    label: 'بیمه‌نامه شخص ثالث',
    hint: 'تصویر یا PDF کامل و خوانای بیمه‌نامه شخص ثالث',
  },
] as const;
export default async function Page() {
  const documents = await getDriverDocuments();
  return (
    <div className="space-y-6">
      <Breadcrumbs
        items={[{ label: 'پنل راننده', href: '/driver/dashboard' }, { label: 'مدارک خودروی من' }]}
      />
      <header>
        <p className="text-sm font-bold text-primary">پرونده خودرو</p>
        <h1 className="text-2xl font-black">مدارک خودروی من</h1>
        <p className="mt-2 text-sm text-muted">
          کارت خودرو، سند، معاینه فنی و بیمه‌نامه شخص ثالث را جداگانه نگهداری و به‌روزرسانی کنید.
        </p>
      </header>
      <DriverDocuments documents={documents} definitions={definitions} />
    </div>
  );
}
