'use client';

import { Download } from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { apiRequest } from '@/lib/api-client';
import { getApiErrorFeedback } from '@/lib/api-error-feedback';
import type { ManagerDriver, ManagerDriverDetail, ManagerStudent } from './manager-api';

type ReportColumn = { key: string; header: string; width?: number };
type ReportRow = Record<string, unknown>;

function safeCell(value: unknown) {
  if (typeof value !== 'string') return value ?? '';
  return /^[=+\-@]/.test(value) ? `'${value}` : value;
}

async function saveWorkbook(
  filename: string,
  sheetName: string,
  columns: ReportColumn[],
  rows: ReportRow[],
) {
  const ExcelJS = await import('exceljs');
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'سامانه سرویس مدرسه';
  workbook.created = new Date();
  const sheet = workbook.addWorksheet(sheetName, {
    views: [{ state: 'frozen', ySplit: 1, rightToLeft: true }],
    properties: { defaultRowHeight: 22 },
  });

  sheet.columns = columns.map(({ key, header, width }) => ({
    key,
    header,
    width: width ?? Math.min(42, Math.max(14, header.length + 5)),
  }));
  sheet.addRows(
    rows.map((row) =>
      Object.fromEntries(Object.entries(row).map(([key, value]) => [key, safeCell(value)])),
    ),
  );
  sheet.autoFilter = {
    from: { row: 1, column: 1 },
    to: { row: Math.max(1, sheet.rowCount), column: columns.length },
  };
  sheet.getRow(1).height = 28;
  sheet.getRow(1).eachCell((cell) => {
    cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF163A5F' } };
    cell.alignment = { horizontal: 'center', vertical: 'middle' };
  });
  sheet.eachRow((row, rowNumber) => {
    if (rowNumber === 1) return;
    row.alignment = { vertical: 'top', readingOrder: 'rtl' };
    if (rowNumber % 2 === 0) {
      row.eachCell((cell) => {
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF3F6FA' } };
      });
    }
  });

  const output = await workbook.xlsx.writeBuffer();
  const blob = new Blob([new Uint8Array(output)], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.style.display = 'none';
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1_000);
}

export function ManagerReportButtons({
  schoolName,
  username,
}: {
  schoolName: string;
  username: string;
}) {
  const [loading, setLoading] = useState<string>();
  const [error, setError] = useState<string>();

  async function run(name: string, action: () => Promise<void>) {
    setLoading(name);
    setError(undefined);
    try {
      await action();
    } catch (caught) {
      setError(getApiErrorFeedback(caught).message);
    } finally {
      setLoading(undefined);
    }
  }

  async function students() {
    const all: ManagerStudent[] = [];
    let page = 1;
    let total = 1;
    while (all.length < total) {
      const response = await apiRequest<ManagerStudent[]>(
        `/manager/students?page=${page}&pageSize=100`,
      );
      all.push(...response.data);
      total = Number(response.pagination?.totalItems ?? all.length);
      if (response.data.length === 0) break;
      page += 1;
    }
    await saveWorkbook(
      'students.xlsx',
      'دانش‌آموزان',
      [
        { key: 'school', header: 'مدرسه' },
        { key: 'manager', header: 'نام کاربری مدیر' },
        { key: 'firstName', header: 'نام' },
        { key: 'lastName', header: 'نام خانوادگی' },
        { key: 'nationalId', header: 'کد ملی' },
        { key: 'educationLevel', header: 'مقطع' },
        { key: 'grade', header: 'پایه' },
        { key: 'guardian', header: 'سرپرست' },
      ],
      all.map((student) => ({
        school: schoolName,
        manager: username,
        firstName: student.firstName,
        lastName: student.lastName,
        nationalId: student.nationalId,
        educationLevel: student.educationLevel,
        grade: student.grade,
        guardian: student.guardianName,
      })),
    );
  }

  async function drivers() {
    const list = (await apiRequest<ManagerDriver[]>('/manager/drivers')).data;
    const details = await Promise.all(list.map((driver) => apiRequest<ManagerDriverDetail>(`/manager/drivers/${driver.id}`).then((response) => response.data)));
    await saveWorkbook(
      'drivers.xlsx',
      'رانندگان',
      [
        { key: 'school', header: 'مدرسه' },
        { key: 'firstName', header: 'نام' },
        { key: 'lastName', header: 'نام خانوادگی' },
        { key: 'nationalId', header: 'کد ملی' },
        { key: 'education', header: 'تحصیلات' },
        { key: 'fatherName', header: 'نام پدر' },
        { key: 'gender', header: 'جنسیت' },
        { key: 'licenseExpiresAt', header: 'انقضای گواهینامه' },
        { key: 'vehicle', header: 'خودرو' },
        { key: 'plate', header: 'پلاک' },
      ],
      details.map(({ driver, vehicle }) => ({
        school: schoolName,
        firstName: driver.firstName,
        lastName: driver.lastName,
        nationalId: driver.nationalId,
        education: driver.education,
        fatherName: driver.fatherName,
        gender: driver.gender,
        licenseExpiresAt: driver.licenseExpiresAt,
        vehicle: `${vehicle?.vehicleType ?? ''} ${vehicle?.system ?? ''}`,
        plate: vehicle?.plateNumber,
      })),
    );
  }

  async function routes() {
    const list = (await apiRequest<ManagerDriver[]>('/manager/drivers')).data;
    const details = await Promise.all(list.map((driver) => apiRequest<ManagerDriverDetail>(`/manager/drivers/${driver.id}`).then((response) => response.data)));
    await saveWorkbook(
      'routes.xlsx',
      'مسیرها',
      [
        { key: 'school', header: 'مدرسه' },
        { key: 'title', header: 'نوبت سرویس' },
        { key: 'direction', header: 'جهت' },
        { key: 'startTime', header: 'زمان شروع' },
        { key: 'arrivalTime', header: 'زمان رسیدن' },
        { key: 'area', header: 'محدوده' },
        { key: 'driver', header: 'راننده' },
        { key: 'student', header: 'دانش‌آموز' },
      ],
      details.flatMap(({ driver, runs }) =>
        runs.flatMap((route) =>
          route.students.map((student) => ({
            school: schoolName,
            title: route.title,
            direction: route.direction === 'TO_SCHOOL' ? 'رفت به مدرسه' : 'برگشت از مدرسه',
            startTime: route.scheduledStartTime,
            arrivalTime: route.scheduledArrivalTime,
            area: route.areaDescription,
            driver: `${driver.firstName} ${driver.lastName}`,
            student: `${student.firstName} ${student.lastName}`,
          })),
        ),
      ),
    );
  }

  return (
    <div>
      <div className="grid gap-3 sm:grid-cols-3">
        <Button
          className="w-full"
          loading={loading === 'students'}
          onClick={() => run('students', students)}
        >
          <Download className="size-4" />
          گزارش دانش‌آموزان
        </Button>
        <Button
          className="w-full"
          loading={loading === 'drivers'}
          onClick={() => run('drivers', drivers)}
        >
          <Download className="size-4" />
          گزارش رانندگان
        </Button>
        <Button
          className="w-full"
          loading={loading === 'routes'}
          onClick={() => run('routes', routes)}
        >
          <Download className="size-4" />
          گزارش مسیرها
        </Button>
      </div>
      {error && <p className="mt-3 text-sm text-danger">{error}</p>}
    </div>
  );
}
