'use client';
import { Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { apiRequest } from '@/lib/api-client';
import { mockDrivers } from '@/features/manager-drivers/mock-drivers';
import type { ManagerStudent } from './manager-api';

const escape = (x: unknown) =>
  String(x ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;');
function save(name: string, headers: string[], rows: unknown[][]) {
  const table = `<html dir="rtl"><meta charset="utf-8"><table border="1"><tr>${headers.map((x) => `<th>${escape(x)}</th>`).join('')}</tr>${rows.map((r) => `<tr>${r.map((x) => `<td>${escape(x)}</td>`).join('')}</tr>`).join('')}</table></html>`;
  const url = URL.createObjectURL(
    new Blob(['\ufeff', table], { type: 'application/vnd.ms-excel;charset=utf-8' }),
  );
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
export function ManagerReportButtons({
  schoolName,
  username,
}: {
  schoolName: string;
  username: string;
}) {
  async function students() {
    const all: ManagerStudent[] = [];
    let page = 1;
    let total = 1;
    while (all.length < total) {
      const r = await apiRequest<ManagerStudent[]>(`/manager/students?page=${page}&pageSize=100`);
      all.push(...r.data);
      total = Number(r.pagination?.totalItems ?? all.length);
      if (r.data.length === 0) break;
      page += 1;
    }
    save(
      'students.xls',
      ['مدرسه', 'نام کاربری مدیر', 'نام', 'نام خانوادگی', 'کد ملی', 'مقطع', 'پایه', 'سرپرست'],
      all.map((x) => [
        schoolName,
        username,
        x.firstName,
        x.lastName,
        x.nationalId,
        x.educationLevel,
        x.grade,
        x.guardianName,
      ]),
    );
  }
  function drivers() {
    save(
      'drivers.xls',
      [
        'مدرسه',
        'نام',
        'نام خانوادگی',
        'کد ملی',
        'تحصیلات',
        'نام پدر',
        'جنسیت',
        'انقضای گواهینامه',
        'خودرو',
        'پلاک',
      ],
      mockDrivers.map((d) => [
        schoolName,
        d.firstName,
        d.lastName,
        d.nationalId,
        d.education,
        d.fatherName,
        d.gender,
        d.licenseExpiresAt,
        `${d.vehicleType} ${d.system}`,
        d.plate,
      ]),
    );
  }
  function routes() {
    save(
      'routes.xls',
      ['مدرسه', 'نوبت سرویس', 'جهت', 'زمان شروع', 'زمان رسیدن', 'محدوده', 'راننده', 'دانش‌آموز'],
      mockDrivers.flatMap((d) =>
        d.routes.flatMap((r) =>
          r.students.map((s) => [
            schoolName,
            r.title,
            r.direction === 'TO_SCHOOL' ? 'رفت به مدرسه' : 'برگشت از مدرسه',
            r.scheduledStartTime,
            r.scheduledArrivalTime,
            r.area,
            `${d.firstName} ${d.lastName}`,
            s,
          ]),
        ),
      ),
    );
  }
  return (
    <div className="grid gap-3 sm:grid-cols-3">
      <Button onClick={students}>
        <Download className="size-4" />
        گزارش دانش‌آموزان
      </Button>
      <Button onClick={drivers}>
        <Download className="size-4" />
        گزارش رانندگان
      </Button>
      <Button onClick={routes}>
        <Download className="size-4" />
        گزارش مسیرها
      </Button>
    </div>
  );
}
