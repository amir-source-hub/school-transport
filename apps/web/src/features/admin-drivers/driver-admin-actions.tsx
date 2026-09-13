'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { JalaliDateInput } from '@/components/forms/jalali-date-input';
import { getApiErrorFeedback } from '@/lib/api-error-feedback';
import { deactivateAdminDriver, permanentlyDeleteAdminDriver, restoreAdminDriver, updateAdminDriver, type DriverDetail } from './admin-drivers-api';

const driverFields = [
  ['firstName','نام'],['lastName','نام خانوادگی'],['fatherName','نام پدر'],['nationalId','کد ملی'],
  ['phoneNumber','شماره همراه'],['secondaryPhoneNumber','شماره همراه دوم'],['homePhoneNumber','تلفن منزل'],
  ['emergencyFirstName','نام تماس اضطراری'],['emergencyLastName','نام خانوادگی تماس اضطراری'],
  ['emergencyRelationship','نسبت تماس اضطراری'],['emergencyPhoneNumber','شماره اضطراری'],
  ['gender','جنسیت (MALE/FEMALE)'],['education','تحصیلات'],['iban','شماره شبا'],['cardNumber','شماره کارت'],['bankName','بانک'],
  ['province','استان'],['city','شهر'],['municipalityDistrict','منطقه'],['streetAddress','نشانی'],
  ['postalCode','کد پستی'],['latitude','عرض جغرافیایی'],['longitude','طول جغرافیایی'],
  ['referrerName','معرف'],['referrerPhoneNumber','شماره معرف'],
] as const;
const vehicleFields = [
  ['vehicleType','نوع خودرو (CAR/VAN/MINIBUS/BUS)'],['system','سیستم'],['modelYear','سال ساخت'],
  ['plateNumber','پلاک'],['capacity','ظرفیت'],['usageType','نوع استفاده (PERSONAL/TAXI)'],
  ['ownershipType','مالکیت (SELF/OTHER)'],['insuranceExpiresAt','انقضای بیمه (شمسی)'],
  ['technicalInspectionExpiresAt','انقضای معاینه فنی (شمسی)'],
] as const;

export function DriverAdminActions({ driver, vehicle }: { driver: DriverDetail['driver']; vehicle: DriverDetail['vehicle'] }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [dates, setDates] = useState({ insuranceExpiresAt: String(vehicle?.insuranceExpiresAt ?? ''), technicalInspectionExpiresAt: String(vehicle?.technicalInspectionExpiresAt ?? '') });
  async function run(action: () => Promise<unknown>, redirect = false) {
    setBusy(true); setError('');
    try { await action(); if (redirect) router.push('/admin/drivers'); else router.refresh(); }
    catch (caught) { setError(getApiErrorFeedback(caught).message); }
    finally { setBusy(false); }
  }
  return <div className="flex flex-wrap gap-2">
    <Dialog><DialogTrigger asChild><Button variant="secondary">ویرایش کامل پرونده</Button></DialogTrigger>
      <DialogContent title="ویرایش راننده و خودرو" description="تغییر شماره همراه اول، شماره ورود حساب مشترک خانواده و راننده را نیز به‌روزرسانی می‌کند.">
        <form className="max-h-[70vh] space-y-5 overflow-y-auto p-1" onSubmit={(event) => {
          event.preventDefault();
          const data = Object.fromEntries(new FormData(event.currentTarget).entries()) as Record<string,string>;
          const changes = Object.fromEntries(Object.entries(data).filter(([, value]) => value.trim() !== ''));
          void run(() => updateAdminDriver(driver.id, changes));
        }}>
          <div className="grid gap-3 sm:grid-cols-2">{driverFields.map(([key,label]) => <label key={key} className="text-sm font-bold">{label}<Input name={key} defaultValue={String(driver[key] ?? '')} className="mt-1" dir={['nationalId','phoneNumber','secondaryPhoneNumber','homePhoneNumber','emergencyPhoneNumber','iban','postalCode','latitude','longitude','referrerPhoneNumber'].includes(key)?'ltr':undefined}/></label>)}</div>
          <h3 className="font-black">خودرو</h3>
          <div className="grid gap-3 sm:grid-cols-2">{vehicleFields.map(([key,label]) => key === 'insuranceExpiresAt' || key === 'technicalInspectionExpiresAt' ? <div key={key} className="text-sm font-bold">{label}<JalaliDateInput value={dates[key]} onChange={value=>setDates(current=>({...current,[key]:value}))} label={label}/><input type="hidden" name={key} value={dates[key]}/></div> : <label key={key} className="text-sm font-bold">{label}<Input name={key} defaultValue={String(vehicle?.[key] ?? '')} className="mt-1" dir={['modelYear','plateNumber','capacity'].includes(key)?'ltr':undefined}/></label>)}</div>
          <Button loading={busy}>ذخیره همه تغییرات</Button>
        </form>
      </DialogContent>
    </Dialog>
    {driver.status === 'INACTIVE' ? <Button variant="secondary" disabled={busy} onClick={() => void run(() => restoreAdminDriver(driver.id))}>بازگردانی از آرشیو</Button> : <Button variant="secondary" disabled={busy} onClick={() => { if (window.confirm('راننده و مسیرهای فعال او آرشیو شوند؟')) void run(() => deactivateAdminDriver(driver.id)); }}>آرشیو راننده</Button>}
    <Button variant="danger" disabled={busy} onClick={() => { if (window.prompt('برای حذف دائمی نام خانوادگی راننده را وارد کنید:') === driver.lastName) void run(() => permanentlyDeleteAdminDriver(driver.id), true); }}>حذف دائمی</Button>
    {error && <p role="alert" className="w-full text-sm text-danger">{error}</p>}
  </div>;
}
