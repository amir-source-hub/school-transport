import ExcelJS from 'exceljs';
import { describe, expect, it } from 'vitest';
import type { DatabaseService } from '../../database/database.service';
import {
  neutralizeSpreadsheetFormula,
  REPORT_EXPORT_MAX_ROWS_PER_SOURCE,
  ReportsService,
} from './reports.service';
import { schools, students } from '../../database/schemas';

describe('ReportsService', () => {
  it('neutralizes spreadsheet formula injection without changing typed values', () => {
    expect(neutralizeSpreadsheetFormula('=HYPERLINK("https://attacker.invalid")')).toBe(
      '\'=HYPERLINK("https://attacker.invalid")',
    );
    expect(neutralizeSpreadsheetFormula('  +1+1')).toBe("'  +1+1");
    expect(neutralizeSpreadsheetFormula('@SUM(A1:A2)')).toBe("'@SUM(A1:A2)");
    expect(neutralizeSpreadsheetFormula('خانواده احمدی')).toBe('خانواده احمدی');
    expect(neutralizeSpreadsheetFormula(125_000)).toBe(125_000);
  });
  it('creates a valid multi-sheet Excel workbook even when no records exist', async () => {
    const database = {
      db: {
        select: () => ({
          from: () => ({
            orderBy: () => ({ limit: async () => [] }),
          }),
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

  it('fails closed before building an oversized in-memory workbook', async () => {
    const oversized = Array.from({ length: REPORT_EXPORT_MAX_ROWS_PER_SOURCE + 1 }, (_, index) => ({
      id: `row-${index}`,
    }));
    const database = {
      db: {
        select: () => ({
          from: () => ({
            orderBy: () => ({ limit: async () => oversized }),
          }),
        }),
      },
    } as unknown as DatabaseService;

    await expect(new ReportsService(database).createComprehensiveWorkbook()).rejects.toMatchObject({
      code: 'VALIDATION_ERROR',
    });
  });

  it('still downloads a workbook and identifies a production source that is unavailable', async () => {
    let queryNumber = 0;
    const database = {
      db: {
        select: () => ({
          from: () => ({
            orderBy: () => ({
              limit: async () => {
                queryNumber += 1;
                if (queryNumber === 1) throw new Error('column does not exist');
                return [];
              },
            }),
          }),
        }),
      },
    } as unknown as DatabaseService;

    const report = await new ReportsService(database).createComprehensiveWorkbook();
    const workbook = new ExcelJS.Workbook();
    const reportArrayBuffer = report.buffer.slice(
      report.byteOffset,
      report.byteOffset + report.byteLength,
    ) as ArrayBuffer;
    await workbook.xlsx.load(reportArrayBuffer);

    expect(workbook.getWorksheet('وضعیت گزارش')?.getCell('A2').value).toBe('users');
    expect(workbook.getWorksheet('دانش‌آموزان')).toBeTruthy();
  });

  it('returns a bounded, ordered preview without sensitive student fields', async () => {
    const createdAt = new Date('2026-08-02T10:00:00.000Z');
    const database = {
      db: {
        select: () => ({
          from: async (table: unknown) => {
            if (table === students) {
              return [
                {
                  id: 'student-1',
                  firstName: 'سارا',
                  lastName: 'احمدی',
                  nationalId: '0012345678',
                  schoolId: 'school-1',
                  grade: 'اول',
                  className: 'ابتدایی',
                  isActive: true,
                  createdAt,
                },
              ];
            }
            if (table === schools) return [{ id: 'school-1', name: 'مدرسه نمونه' }];
            return [];
          },
        }),
      },
    } as unknown as DatabaseService;

    const preview = await new ReportsService(database).getComprehensivePreview({
      section: 'students',
      page: 1,
      pageSize: 10,
    });

    expect(preview.pagination).toEqual({ page: 1, pageSize: 10, total: 1, totalPages: 1 });
    expect(preview.rows[0]).toMatchObject({
      studentName: 'سارا احمدی',
      schoolName: 'مدرسه نمونه',
    });
    expect(preview.rows[0]).not.toHaveProperty('nationalId');
    expect(preview.columns.map(({ key }) => key)).not.toContain('nationalId');
  });
});
