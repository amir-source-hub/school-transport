import ExcelJS from 'exceljs';
import { describe, expect, it } from 'vitest';
import type { DatabaseService } from '../../database/database.service';
import { ReportsService } from './reports.service';

describe('ReportsService', () => {
  it('creates a valid multi-sheet Excel workbook even when no records exist', async () => {
    const database = {
      db: {
        select: () => ({
          from: async () => [],
        }),
      },
    } as unknown as DatabaseService;
    const service = new ReportsService(database);

    const report = await service.createComprehensiveWorkbook();
    const workbook = new ExcelJS.Workbook();
    const reportArrayBuffer = report.buffer.slice(
      report.byteOffset,
      report.byteOffset + report.byteLength,
    ) as ArrayBuffer;
    await workbook.xlsx.load(reportArrayBuffer);

    expect(workbook.worksheets.map((sheet) => sheet.name)).toEqual([
      'دانش‌آموزان',
      'خانواده‌ها و نشانی‌ها',
      'ثبت‌نام‌ها',
      'پرداخت‌ها',
      'قراردادها',
    ]);
    expect(workbook.getWorksheet('دانش‌آموزان')?.getCell('A1').value).toBe('شناسه دانش‌آموز');
    expect(workbook.getWorksheet('پرداخت‌ها')?.autoFilter).toBeTruthy();
    expect(report.byteLength).toBeGreaterThan(1_000);
  });
});
