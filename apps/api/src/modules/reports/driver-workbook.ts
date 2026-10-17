import ExcelJS from 'exceljs';
import { asc } from 'drizzle-orm';
import type { DatabaseService } from '../../database/database.service';
import { drivers, schools, transportDocuments, transportServiceRuns, vehicles } from '../../database/schemas';
import { ValidationError } from '../../common/errors';
import { formatIranianExportDate } from './student-workbook';

export const DRIVER_PROFILE_COLUMNS = [
  ['firstName', 'نام'], ['lastName', 'نام خانوادگی'], ['nationalId', 'کد ملی'],
  ['phoneNumber', 'شماره همراه'], ['secondaryPhoneNumber', 'شماره همراه دوم'],
  ['homePhoneNumber', 'تلفن منزل'], ['emergencyName', 'نام و نام خانوادگی اضطراری'],
  ['emergencyRelationship', 'نسبت اضطراری'], ['emergencyPhoneNumber', 'تماس اضطراری'],
  ['referrerName', 'نام معرف'], ['referrerPhoneNumber', 'تماس معرف'],
  ['province', 'استان'], ['city', 'شهر'], ['municipalityDistrict', 'منطقه'],
  ['streetAddress', 'نشانی'], ['postalCode', 'کدپستی'], ['education', 'تحصیلات'],
  ['gender', 'جنسیت'], ['vehicleType', 'نوع خودرو'], ['system', 'سیستم'],
  ['modelYear', 'سال ساخت'], ['plateNumber', 'پلاک'], ['capacity', 'ظرفیت'],
  ['usageType', 'وضعیت خودرو'], ['ownershipType', 'مالکیت'], ['createdAt', 'تاریخ ثبت نام'],
] as const;

export const DRIVER_DOCUMENT_COLUMNS = [
  ['firstName', 'نام'], ['lastName', 'نام خانوادگی'], ['nationalId', 'کد ملی'],
  ['phoneNumber', 'شماره همراه'], ['insuranceExpiresAt', 'تاریخ انقضا بیمه شخص ثالث'],
  ['technicalInspectionExpiresAt', 'تاریخ انقضای معاینه فنی'],
  ['DRIVER_PHOTO', 'عکس راننده'], ['NATIONAL_CARD_FRONT', 'روی کارت ملی'],
  ['BIRTH_CERTIFICATE_PAGE_1', 'صفحه اول شناسنامه'],
  ['BIRTH_CERTIFICATE_PAGE_2', 'صفحه دوم شناسنامه'],
  ['DRIVER_LICENSE_FRONT', 'روی گواهینامه'], ['DRIVER_LICENSE_BACK', 'پشت گواهینامه'],
  ['CRIMINAL_RECORD_CERTIFICATE', 'سوءپیشینه'], ['ADDICTION_TEST_CERTIFICATE', 'عدم اعتیاد'],
  ['EDUCATION_CERTIFICATE', 'مدرک تحصیلی'], ['POSTAL_CODE_CONFIRMATION', 'تاییدیه کدپستی'],
  ['SCHOOL_SERVICE_INSURANCE_ENDORSEMENT', 'الحاقیه سرویس مدرسه'],
  ['TAXI_OPERATION_LICENSE', 'پروانه تاکسیرانی'], ['VEHICLE_PHOTO', 'عکس خودرو'],
  ['VEHICLE_CARD_FRONT', 'روی کارت خودرو'], ['VEHICLE_CARD_BACK', 'پشت کارت خودرو'],
  ['VEHICLE_TITLE_DOCUMENT', 'برگ سند خودرو'],
  ['TECHNICAL_INSPECTION_DOCUMENT', 'معاینه فنی'],
  ['INSURANCE_POLICY_DOCUMENT', 'بیمه نامه'],
] as const;

const ROUTE_COLUMNS = [
  ['firstName', 'نام'], ['lastName', 'نام خانوادگی'], ['school', 'مدرسه'],
  ['academicYear', 'سال تحصیلی'], ['title', 'عنوان مسیر'], ['direction', 'جهت مسیر'],
  ['sequenceNumber', 'شماره نوبت'], ['scheduledStartTime', 'زمان شروع'],
  ['scheduledArrivalTime', 'زمان پایان'], ['areaDescription', 'محدوده مسیر'],
  ['status', 'وضعیت مسیر'],
] as const;

const labels: Record<string, string> = {
  MALE: 'مرد', FEMALE: 'زن', BELOW_DIPLOMA: 'زیر دیپلم', DIPLOMA: 'دیپلم',
  ASSOCIATE: 'کاردانی', BACHELOR: 'کارشناسی', MASTER: 'کارشناسی ارشد',
  DOCTORATE: 'دکتری', CAR: 'سواری', VAN: 'ون', MINIBUS: 'مینی‌بوس',
  BUS: 'اتوبوس', PERSONAL: 'شخصی', TAXI: 'تاکسی', SELF: 'ملکی',
  OTHER: 'متعلق به دیگری', TO_SCHOOL: 'رفت', FROM_SCHOOL: 'برگشت',
  ROUND_TRIP: 'رفت و برگشت',
};
const label = (value: string | null | undefined) => value ? labels[value] ?? value : '';
const safe = (value: string | null | undefined) =>
  value && /^[\t\r ]*[=+\-@]/.test(value) ? `'${value}` : value ?? '';

function addSheet(workbook: ExcelJS.Workbook, name: string, columns: readonly (readonly [string, string])[], rows: Record<string, string | number>[]) {
  const sheet = workbook.addWorksheet(name, {
    views: [{ state: 'frozen', xSplit: 2, ySplit: 1, rightToLeft: true, showGridLines: false }],
    properties: { defaultRowHeight: 24 },
  });
  sheet.columns = columns.map(([key, header]) => ({ key, header, width: Math.min(38, Math.max(18, header.length + 4)) }));
  rows.forEach((row) => sheet.addRow(Object.fromEntries(Object.entries(row).map(([key, value]) => [key, typeof value === 'string' ? safe(value) : value]))));
  sheet.autoFilter = { from: { row: 1, column: 1 }, to: { row: Math.max(1, sheet.rowCount), column: columns.length } };
  sheet.getRow(1).height = 34;
  sheet.getRow(1).eachCell((cell) => {
    cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF163A5F' } };
    cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
  });
  sheet.eachRow((row, rowNumber) => {
    if (rowNumber === 1) return;
    row.alignment = { vertical: 'top', readingOrder: 'rtl' };
    if (rowNumber % 2 === 0) row.eachCell((cell) => {
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF3F6FA' } };
    });
  });
  return sheet;
}

export async function createDriverWorkbook(database: DatabaseService, maxRows: number): Promise<Buffer> {
  const limit = maxRows + 1;
  const [driverRows, vehicleRows, documentRows, routeRows, schoolRows] = await Promise.all([
    database.db.select().from(drivers).orderBy(asc(drivers.lastName), asc(drivers.firstName)).limit(limit),
    database.db.select().from(vehicles).orderBy(asc(vehicles.id)).limit(limit),
    database.db.select().from(transportDocuments).orderBy(asc(transportDocuments.id)).limit(limit),
    database.db.select().from(transportServiceRuns).orderBy(asc(transportServiceRuns.id)).limit(limit),
    database.db.select().from(schools).orderBy(asc(schools.id)).limit(limit),
  ]);
  if ([driverRows, vehicleRows, documentRows, routeRows, schoolRows].some((rows) => rows.length > maxRows))
    throw new ValidationError('داده‌های رانندگان برای خروجی هم‌زمان بیش از حد بزرگ است.');
  const vehicleByDriver = new Map<string, (typeof vehicleRows)[number]>();
  for (const vehicle of vehicleRows) {
    const previous = vehicleByDriver.get(vehicle.driverId);
    if (!previous || (vehicle.status === 'ACTIVE' && previous.status !== 'ACTIVE') ||
      (vehicle.status === previous.status && vehicle.createdAt > previous.createdAt))
      vehicleByDriver.set(vehicle.driverId, vehicle);
  }
  const documentTypes = new Map<string, Set<string>>();
  for (const document of documentRows) {
    if (document.reviewStatus === 'REJECTED') continue;
    const driverId = document.driverId ?? vehicleRows.find((vehicle) => vehicle.id === document.vehicleId)?.driverId;
    if (!driverId) continue;
    const types = documentTypes.get(driverId) ?? new Set<string>();
    types.add(document.documentType);
    documentTypes.set(driverId, types);
  }
  const schoolById = new Map(schoolRows.map((school) => [school.id, school.name]));
  const driverById = new Map(driverRows.map((driver) => [driver.id, driver]));
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'سامانه سرویس مدارس';
  addSheet(workbook, 'مشخصات راننده', DRIVER_PROFILE_COLUMNS, driverRows.map((driver) => {
    const vehicle = vehicleByDriver.get(driver.id);
    return {
      firstName: driver.firstName, lastName: driver.lastName, nationalId: driver.nationalId,
      phoneNumber: driver.phoneNumber, secondaryPhoneNumber: driver.secondaryPhoneNumber ?? '',
      homePhoneNumber: driver.homePhoneNumber ?? '',
      emergencyName: `${driver.emergencyFirstName} ${driver.emergencyLastName}`.trim(),
      emergencyRelationship: driver.emergencyRelationship, emergencyPhoneNumber: driver.emergencyPhoneNumber,
      referrerName: driver.referrerName ?? '', referrerPhoneNumber: driver.referrerPhoneNumber ?? '',
      province: driver.province, city: driver.city, municipalityDistrict: driver.municipalityDistrict,
      streetAddress: driver.streetAddress, postalCode: driver.postalCode,
      education: label(driver.education), gender: label(driver.gender),
      vehicleType: label(vehicle?.vehicleType), system: vehicle?.system ?? '',
      modelYear: vehicle?.modelYear ?? '', plateNumber: vehicle?.plateNumber ?? '',
      capacity: vehicle?.capacity ?? '', usageType: label(vehicle?.usageType),
      ownershipType: label(vehicle?.ownershipType), createdAt: formatIranianExportDate(driver.createdAt, true),
    };
  }));
  addSheet(workbook, 'مدارک راننده', DRIVER_DOCUMENT_COLUMNS, driverRows.map((driver) => {
    const vehicle = vehicleByDriver.get(driver.id);
    const types = documentTypes.get(driver.id) ?? new Set<string>();
    return {
      firstName: driver.firstName, lastName: driver.lastName, nationalId: driver.nationalId,
      phoneNumber: driver.phoneNumber,
      insuranceExpiresAt: formatIranianExportDate(vehicle?.insuranceExpiresAt),
      technicalInspectionExpiresAt: formatIranianExportDate(vehicle?.technicalInspectionExpiresAt),
      ...Object.fromEntries(DRIVER_DOCUMENT_COLUMNS.slice(6).map(([key]) => [key, types.has(key) ? 'دارد' : 'ندارد'])),
    };
  }));
  addSheet(workbook, 'مسیربندی', ROUTE_COLUMNS, routeRows.filter((run) => driverById.has(run.driverId)).map((run) => {
    const driver = driverById.get(run.driverId)!;
    return {
      firstName: driver.firstName, lastName: driver.lastName,
      school: schoolById.get(run.schoolId) ?? '', academicYear: run.academicYear,
      title: run.title, direction: label(run.direction), sequenceNumber: run.sequenceNumber,
      scheduledStartTime: run.scheduledStartTime, scheduledArrivalTime: run.scheduledArrivalTime,
      areaDescription: run.areaDescription ?? '', status: run.isActive ? 'فعال' : 'غیرفعال',
    };
  }));
  return Buffer.from(await workbook.xlsx.writeBuffer());
}
