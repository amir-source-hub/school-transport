import ExcelJS from 'exceljs';
import { describe, expect, it } from 'vitest';
import type { DatabaseService } from '../../database/database.service';
import { drivers, schools, transportDocuments, transportServiceRuns, vehicles } from '../../database/schemas';
import { createDriverWorkbook, DRIVER_DOCUMENT_COLUMNS, DRIVER_PROFILE_COLUMNS } from './driver-workbook';

describe('createDriverWorkbook', () => {
  it('exports three Persian sheets with frozen names and document presence', async () => {
    const sources = new Map<unknown, unknown[]>([
      [drivers, [{ id: 'd1', firstName: 'سارا', lastName: 'احمدی', nationalId: '123', phoneNumber: '0912', emergencyFirstName: 'علی', emergencyLastName: 'احمدی', emergencyRelationship: 'پدر', emergencyPhoneNumber: '0913', province: 'تهران', city: 'تهران', municipalityDistrict: '۲', streetAddress: 'خیابان', postalCode: '123', education: 'DIPLOMA', gender: 'FEMALE', createdAt: new Date('2026-01-01') }]],
      [vehicles, [{ id: 'v1', driverId: 'd1', status: 'ACTIVE', createdAt: new Date('2026-01-01'), vehicleType: 'CAR', system: 'پراید', modelYear: 1396, plateNumber: '16س31210', capacity: 4, usageType: 'PERSONAL', ownershipType: 'SELF', insuranceExpiresAt: '2027-01-01', technicalInspectionExpiresAt: '2027-02-01' }]],
      [transportDocuments, [{ driverId: 'd1', vehicleId: null, documentType: 'DRIVER_PHOTO', reviewStatus: 'ACTIVE' }, { driverId: null, vehicleId: 'v1', documentType: 'VEHICLE_PHOTO', reviewStatus: 'ACTIVE' }, { driverId: 'd1', vehicleId: null, documentType: 'NATIONAL_CARD_FRONT', reviewStatus: 'REJECTED' }]],
      [transportServiceRuns, [{ driverId: 'd1', schoolId: 's1', academicYear: '۱۴۰۵', title: 'مسیر اول', direction: 'TO_SCHOOL', sequenceNumber: 1, scheduledStartTime: '07:00', scheduledArrivalTime: '08:00', isActive: true }]],
      [schools, [{ id: 's1', name: 'مدرسه نمونه' }]],
    ]);
    const database = { db: { select: () => ({ from(table: unknown) { const rows = sources.get(table) ?? []; return { orderBy: () => ({ limit: async () => rows }) }; } }) } } as unknown as DatabaseService;
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load((await createDriverWorkbook(database, 100)) as unknown as Parameters<typeof workbook.xlsx.load>[0]);
    expect(workbook.worksheets.map((sheet) => sheet.name)).toEqual(['مشخصات راننده', 'مدارک راننده', 'مسیربندی']);
    for (const sheet of workbook.worksheets) {
      expect(sheet.views[0]).toMatchObject({ state: 'frozen', xSplit: 2, ySplit: 1, rightToLeft: true });
    }
    expect(workbook.worksheets[0].getRow(1).values).toEqual([undefined, ...DRIVER_PROFILE_COLUMNS.map(([, header]) => header)]);
    expect(workbook.worksheets[1].getRow(1).values).toEqual([undefined, ...DRIVER_DOCUMENT_COLUMNS.map(([, header]) => header)]);
    expect(workbook.worksheets[0].getRow(2).getCell(17).value).toBe('دیپلم');
    expect(workbook.worksheets[0].getRow(2).getCell(19).value).toBe('سواری');
    expect(workbook.worksheets[1].getRow(2).getCell(7).value).toBe('دارد');
    expect(workbook.worksheets[1].getRow(2).getCell(8).value).toBe('ندارد');
    expect(workbook.worksheets[1].getRow(2).getCell(19).value).toBe('دارد');
    expect(workbook.worksheets[2].getRow(2).getCell(6).value).toBe('رفت');
  });
});
