import { Breadcrumbs } from '@/components/navigation/breadcrumbs';
import { DriverEnrollmentForm } from '@/features/driver-enrollment/driver-enrollment-form';

export const metadata = { title: 'ثبت‌نام راننده' };
export default function DriverEnrollmentPage() {
  return <div className="space-y-6"><Breadcrumbs items={[{label:'خانه',href:'/'},{label:'ثبت‌نام راننده'}]}/><div><p className="text-sm font-bold text-primary">پنل رانندگان</p><h1 className="mt-1 text-2xl font-black sm:text-3xl">تکمیل ثبت‌نام راننده</h1><p className="mt-3 text-sm leading-7 text-muted">اطلاعات فردی، محل سکونت، خودرو و قرارداد را مرحله‌به‌مرحله تکمیل کنید.</p></div><DriverEnrollmentForm/></div>;
}
