import ExcelJS from 'exceljs';
import { describe, expect, it } from 'vitest';
import type { DatabaseService } from '../../database/database.service';
import {
  filterEnrolledStudents,
  neutralizeSpreadsheetFormula,
  REPORT_EXPORT_MAX_ROWS_PER_SOURCE,
  ReportsService,
} from './reports.service';
import { emergencyContacts, familyAddresses, parents, paymentPlans, paymentScheduleItems, registrationPrices, schools, serviceRegistrations, studentCompanions, students, users } from '../../database/schemas';
import { formatIranianExportDate, STUDENT_EXPORT_COLUMNS } from './student-workbook';

describe('ReportsService', () => {
  it('maps every requested column for each database student, including one without enrollment', async () => {
    const createdAt = new Date('2026-09-13T15:40:00Z');
    const sources = new Map<unknown, unknown[]>([
      [students, [{ id:'s1', userId:'u1', schoolId:'sc1', firstName:'سارا', lastName:'احمدی', nationalId:'0012345678', phoneNumber:'09120000000', birthDate:'2015-03-21', gender:'FEMALE', grade:'اول', className:'دبستان', physicalStatus:'SPECIAL', disabilityType:'حرکتی', isActive:true, createdAt }]],
      [parents, [{ id:'p1', userId:'u1', parentType:'FATHER', relationshipType:'FATHER', firstName:'علی', lastName:'احمدی', nationalId:'0012345679', phoneNumber:'09121111111', homePhone:'02144332211', isPrimaryContact:true }, { id:'p2', userId:'u1', parentType:'MOTHER', firstName:'مریم', lastName:'احمدی', nationalId:'0012345680', phoneNumber:'09122222222', isPrimaryContact:false }]],
      [familyAddresses, [{ id:'a1', userId:'u1', isActive:true, province:'تهران', city:'تهران', district:'۲', streetAddress:'خیابان پیش‌فرض', postalCode:'1234567890' }, { id:'a2', userId:'u1', isActive:false, province:'تهران', city:'تهران', district:'۳', streetAddress:'خیابان سرویس', postalCode:'1234567891' }]],
      [emergencyContacts, [{ id:'e1', userId:'u1', isActive:true, firstName:'رضا', lastName:'احمدی', relationship:'عمو', phoneNumber:'09123333333' }]],
      [studentCompanions, [{ id:'c1', studentId:'s1', firstName:'نرگس', lastName:'احمدی', nationalId:'0012345681', phoneNumber:'09124444444' }]],
      [schools, [{ id:'sc1', name:'مدرسه نمونه', educationOptions:[{ level:'دبستان', grades:['اول'] }] }]],
      [serviceRegistrations, [{ id:'r1', studentId:'s1', selectedAddressId:'a2', serviceType:'VAN', registrationStatus:'DRAFT', createdAt }]],
      [registrationPrices, [{ id:'price1', registrationId:'r1', versionNumber:1 }]],
      [paymentPlans, [{ id:'plan1', registrationPriceId:'price1', planStatus:'ACTIVE' }]],
      [paymentScheduleItems, [{ id:'item1', paymentPlanId:'plan1', itemStatus:'PAID' }, { id:'item2', paymentPlanId:'plan1', itemStatus:'PENDING' }]],
      [users, [{ id:'u1', accountStatus:'ACTIVE', createdAt: new Date('2026-09-12T10:00:00Z') }]],
    ]);
    const database = { db: { select: () => ({ from: (table: unknown) => ({ orderBy: () => ({ limit: async () => sources.get(table) ?? [] }) }) }) } } as unknown as DatabaseService;
    const buffer = await new ReportsService(database).createComprehensiveWorkbook();
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength) as ArrayBuffer);
    const sheet = workbook.worksheets[0];
    expect(STUDENT_EXPORT_COLUMNS).toHaveLength(38);
    expect(sheet.rowCount).toBe(2);
    expect(sheet.getCell('E2').value).toMatch(/^۱۳۹۴/);
    expect(sheet.getCell('I2').value).toBe('پدر');
    expect(sheet.getCell('V2').value).toBe('02144332211');
    expect(sheet.getCell('Z2').value).toBe('خیابان سرویس');
    expect(sheet.getCell('AC2').value).toBe('دارد');
    expect(sheet.getCell('AG2').value).toBe('ون');
    expect(sheet.getCell('AH2').value).toBe('استثنائی');
    expect(sheet.getCell('AJ2').value).toMatch(/۱۴۰۵.*۱۳:۳۰/);
    expect(sheet.getCell('AL2').value).toBe('پرداخت جزئی');
  });

  it('renders date-only values and 24-hour timestamps in the Iranian calendar', () => {
    expect(formatIranianExportDate('2026-03-21')).toMatch(/^۱۴۰۵/);
    expect(formatIranianExportDate(new Date('2026-09-13T15:40:00Z'), true)).toContain('۱۹:۱۰');
  });
  it('excludes students that have no enrolled registration from student reports', () => {
    const studentRows = [{ id: 'enrolled' }, { id: 'contract-ready' }, { id: 'draft' }];
    const registrationRows = [
      { studentId: 'enrolled', registrationStatus: 'ENROLLED' },
      { studentId: 'contract-ready', registrationStatus: 'CONTRACT_READY' },
      { studentId: 'draft', registrationStatus: 'DRAFT' },
    ];

    expect(filterEnrolledStudents(studentRows, registrationRows)).toEqual([{ id: 'enrolled' }]);
  });

  it('neutralizes spreadsheet formula injection without changing typed values', () => {
    expect(neutralizeSpreadsheetFormula('=HYPERLINK("https://attacker.invalid")')).toBe(
      '\'=HYPERLINK("https://attacker.invalid")',
    );
    expect(neutralizeSpreadsheetFormula('  +1+1')).toBe("'  +1+1");
    expect(neutralizeSpreadsheetFormula('@SUM(A1:A2)')).toBe("'@SUM(A1:A2)");
    expect(neutralizeSpreadsheetFormula('خانواده احمدی')).toBe('خانواده احمدی');
    expect(neutralizeSpreadsheetFormula(125_000)).toBe(125_000);
  });
  it('creates exactly one 38-column student worksheet even when no records exist', async () => {
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

    expect(workbook.worksheets.map((sheet) => sheet.name)).toEqual(['دانش‌آموزان']);
    expect(workbook.getWorksheet('دانش‌آموزان')?.columnCount).toBe(38);
    expect(workbook.getWorksheet('دانش‌آموزان')?.getCell('A1').value).toBe('نام دانش آموز');
    expect(workbook.getWorksheet('دانش‌آموزان')?.getCell('AK1').value).toBe('وضعیت حساب');
    expect(workbook.getWorksheet('دانش‌آموزان')?.getCell('AL1').value).toBe('وضعیت پرداخت');
    expect(workbook.getWorksheet('دانش‌آموزان')?.autoFilter).toBeTruthy();
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

  it('fails closed when a required production source is unavailable', async () => {
    const database = {
      db: {
        select: () => ({
          from: () => ({
            orderBy: () => ({
              limit: async () => {
                throw new Error('column does not exist');
              },
            }),
          }),
        }),
      },
    } as unknown as DatabaseService;

    await expect(new ReportsService(database).createComprehensiveWorkbook()).rejects.toThrow('column does not exist');
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
                  userId: 'user-1',
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
            if (table === users) return [{ id: 'user-1', accountStatus: 'ACTIVE' }];
            if (table === serviceRegistrations) {
              return [{ studentId: 'student-1', registrationStatus: 'ENROLLED' }];
            }
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

  it('excludes contract-ready students from the students preview', async () => {
    const database = {
      db: {
        select: () => ({
          from: async (table: unknown) => {
            if (table === students) {
              return [
                {
                  id: 'student-1',
                  userId: 'user-1',
                  firstName: 'سارا',
                  lastName: 'احمدی',
                  schoolId: 'school-1',
                  grade: 'اول',
                  className: 'ابتدایی',
                  isActive: true,
                  createdAt: new Date('2026-08-02T10:00:00.000Z'),
                },
              ];
            }
            if (table === schools) return [{ id: 'school-1', name: 'مدرسه نمونه' }];
            if (table === users) return [{ id: 'user-1', accountStatus: 'ACTIVE' }];
            if (table === serviceRegistrations) {
              return [{ studentId: 'student-1', registrationStatus: 'CONTRACT_READY' }];
            }
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

    expect(preview.rows).toEqual([]);
    expect(preview.pagination.total).toBe(0);
  });
});
