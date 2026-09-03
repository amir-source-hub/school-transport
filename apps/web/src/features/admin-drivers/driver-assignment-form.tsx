'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Alert } from '@/components/feedback/alert';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { assignDriver, type DriverListItem } from './admin-drivers-api';

export function DriverAssignmentForm({ studentId, drivers, academicYear }: { studentId: string; drivers: DriverListItem[]; academicYear: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  async function submit(formData: FormData) {
    setBusy(true); setMessage(null);
    try {
      await assignDriver(studentId, {
        driverId: String(formData.get('driverId')), academicYear: String(formData.get('academicYear')),
        toSchoolStartTime: String(formData.get('toSchoolStartTime')), toSchoolArrivalTime: String(formData.get('toSchoolArrivalTime')),
        fromSchoolStartTime: String(formData.get('fromSchoolStartTime')), fromSchoolArrivalTime: String(formData.get('fromSchoolArrivalTime')),
        activeWeekdays: formData.getAll('activeWeekdays').map(Number),
      });
      setMessage('راننده و سرویس‌های رفت‌وبرگشت با موفقیت متصل شدند.'); router.refresh();
    } catch (error) { setMessage(error instanceof Error ? error.message : 'ثبت ارتباط انجام نشد.'); }
    finally { setBusy(false); }
  }
  return <form action={submit} className="space-y-4">
    {message && <Alert title="نتیجه ثبت">{message}</Alert>}
    <label className="block text-sm font-bold">راننده
      <select name="driverId" required className="mt-2 min-h-12 w-full rounded-xl border border-border bg-white px-3">
        <option value="">انتخاب راننده</option>{drivers.map((driver) => <option key={driver.id} value={driver.id}>{driver.firstName} {driver.lastName} · {driver.plateNumber ?? 'بدون خودرو'}</option>)}
      </select>
    </label>
    <label className="block text-sm font-bold">سال تحصیلی<Input className="mt-2" name="academicYear" defaultValue={academicYear} required /></label>
    <div className="grid gap-3 sm:grid-cols-2"><Time name="toSchoolStartTime" label="شروع سرویس رفت" value="07:00" /><Time name="toSchoolArrivalTime" label="رسیدن به مدرسه" value="08:00" /><Time name="fromSchoolStartTime" label="شروع سرویس برگشت" value="13:00" /><Time name="fromSchoolArrivalTime" label="پایان سرویس برگشت" value="14:00" /></div>
    <fieldset><legend className="text-sm font-bold">روزهای فعال</legend><div className="mt-2 flex flex-wrap gap-3">{['شنبه','یکشنبه','دوشنبه','سه‌شنبه','چهارشنبه','پنجشنبه','جمعه'].map((day, index) => <label key={day} className="flex items-center gap-1 text-sm"><input type="checkbox" name="activeWeekdays" value={index} defaultChecked={index < 5} />{day}</label>)}</div></fieldset>
    <Button type="submit" loading={busy} disabled={busy || !drivers.length}>ثبت ارتباط و اطلاع‌رسانی</Button>
  </form>;
}
function Time({ name, label, value }: { name: string; label: string; value: string }) { return <label className="text-sm font-bold">{label}<Input className="mt-2" type="time" name={name} defaultValue={value} required /></label>; }
