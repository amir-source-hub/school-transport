import ExcelJS from 'exceljs';
import { asc } from 'drizzle-orm';
import type { DatabaseService } from '../../database/database.service';
import { ValidationError } from '../../common/errors';
import { emergencyContacts, familyAddresses, parents, schools, serviceRegistrations, studentCompanions, students, users } from '../../database/schemas';

export const STUDENT_EXPORT_COLUMNS = [
  ['firstName', 'نام دانش آموز'], ['lastName', 'نام خانوادگی دانش آموز'],
  ['nationalId', 'کد ملی دانش آموز'], ['phoneNumber', 'تلفن دانش آموز'],
  ['birthDate', 'تاریخ تولد دانش آموز به تقویم ایرانی'], ['school', 'مدرسه'],
  ['educationLevel', 'مقطع تحصیلی'], ['grade', 'پایه'], ['guardianRelationship', 'نسبت سرپرست'],
  ['guardianName', 'نام و نام خانوادگی سرپرست'], ['guardianNationalId', 'کد ملی سرپرست'],
  ['guardianPhone', 'تلفن سرپرست'], ['fatherName', 'نام و نام خانوادگی پدر'],
  ['fatherNationalId', 'کدملی پدر'], ['fatherPhone', 'تلفن پدر'],
  ['motherName', 'نام و نام خانوادگی مادر'], ['motherNationalId', 'کد ملی مادر'],
  ['motherPhone', 'تلفن مادر'], ['emergencyName', 'نام و نام خانوادگی اضطراری'],
  ['emergencyRelationship', 'نسبت اضطراری'], ['emergencyPhone', 'تلفن اضطراری'],
  ['homePhone', 'تلفن منزل (ثابت)'], ['province', 'استان'], ['city', 'شهر'],
  ['district', 'منطقه'], ['address', 'نشانی'], ['postalCode', 'کد پستی'],
  ['gender', 'جنسیت دانش آموز'], ['hasCompanion', 'مراقب دانش آموز'],
  ['companionName', 'نام و نام خانوادگی مراقب'], ['companionNationalId', 'کد ملی مراقب'],
  ['companionPhone', 'تلفن مراقب'], ['serviceType', 'متقاضی سرویس'],
  ['physicalStatus', 'وضعیت جسمانی'], ['disabilityType', 'نوع معلولیت'],
  ['createdAt', 'تاریخ ایجاد حساب'], ['accountStatus', 'وضعیت حساب'],
] as const;

const dateOnly = new Intl.DateTimeFormat('fa-IR-u-ca-persian', { timeZone: 'Asia/Tehran', year: 'numeric', month: '2-digit', day: '2-digit' });
const dateTime = new Intl.DateTimeFormat('fa-IR-u-ca-persian', { timeZone: 'Asia/Tehran', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' });
export function formatIranianExportDate(value: Date | string | null | undefined, withTime = false): string {
  if (!value) return '';
  if (typeof value === 'string' && /^1[34]\d{2}[/-]\d{1,2}[/-]\d{1,2}$/.test(value)) return value.replace(/\d/g, digit => '۰۱۲۳۴۵۶۷۸۹'[Number(digit)]);
  const date = value instanceof Date ? value : new Date(/^\d{4}-\d{2}-\d{2}$/.test(value) ? `${value}T12:00:00Z` : value);
  return Number.isNaN(date.getTime()) ? '' : (withTime ? dateTime : dateOnly).format(date);
}

const name = (person?: { firstName: string; lastName: string }) => person ? `${person.firstName} ${person.lastName}`.trim() : '';
const relationship = (value?: string | null, description?: string | null) => value === 'FATHER' ? 'پدر' : value === 'MOTHER' ? 'مادر' : value === 'OTHER' ? (description || 'سایر') : (value || '');
const serviceLabel = (value?: string | null) => ({ VAN: 'ون', CAR: 'سواری', BUS: 'اتوبوس', MINIBUS: 'مینی بوس' })[value as 'VAN' | 'CAR' | 'BUS' | 'MINIBUS'] ?? '';

export async function createStudentWorkbook(database: DatabaseService, maxRows: number): Promise<Buffer> {
  const limit = maxRows + 1;
  const studentRows = await database.db.select().from(students).orderBy(asc(students.id)).limit(limit);
  if (studentRows.length > maxRows) throw new ValidationError('تعداد دانش‌آموزان برای خروجی هم‌زمان بیش از حد مجاز است.');
  const parentRows = await database.db.select().from(parents).orderBy(asc(parents.id)).limit(limit);
  const addressRows = await database.db.select().from(familyAddresses).orderBy(asc(familyAddresses.id)).limit(limit);
  const emergencyRows = await database.db.select().from(emergencyContacts).orderBy(asc(emergencyContacts.id)).limit(limit);
  const companionRows = await database.db.select().from(studentCompanions).orderBy(asc(studentCompanions.id)).limit(limit);
  const schoolRows = await database.db.select().from(schools).orderBy(asc(schools.id)).limit(limit);
  const registrationRows = await database.db.select().from(serviceRegistrations).orderBy(asc(serviceRegistrations.id)).limit(limit);
  const userRows = await database.db.select().from(users).orderBy(asc(users.id)).limit(limit);
  if ([parentRows, addressRows, emergencyRows, companionRows, schoolRows, registrationRows, userRows].some(rows => rows.length > maxRows)) throw new ValidationError('داده‌های گزارش برای خروجی هم‌زمان بیش از حد بزرگ است.');

  const familyParents = new Map<string, typeof parentRows>();
  for (const parent of parentRows) familyParents.set(parent.userId, [...(familyParents.get(parent.userId) ?? []), parent]);
  const activeAddress = new Map(addressRows.filter(row => row.isActive).map(row => [row.userId, row]));
  const addressById = new Map(addressRows.map(row => [row.id, row]));
  const activeEmergency = new Map(emergencyRows.filter(row => row.isActive).map(row => [row.userId, row]));
  const companions = new Map(companionRows.map(row => [row.studentId, row]));
  const schoolById = new Map(schoolRows.map(row => [row.id, row]));
  const userById = new Map(userRows.map(row => [row.id, row]));
  const latestRegistration = new Map<string, (typeof registrationRows)[number]>();
  for (const registration of registrationRows) {
    const previous = latestRegistration.get(registration.studentId);
    if (!previous || registration.createdAt > previous.createdAt) latestRegistration.set(registration.studentId, registration);
  }

  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'سامانه سرویس مدارس';
  const sheet = workbook.addWorksheet('دانش‌آموزان', { views: [{ state: 'frozen', xSplit: 3, ySplit: 1, rightToLeft: true, showGridLines: false }], properties: { defaultRowHeight: 24 } });
  sheet.columns = STUDENT_EXPORT_COLUMNS.map(([key, header]) => ({ key, header, width: Math.min(38, Math.max(18, header.length + 4)) }));
  for (const student of studentRows) {
    const relatives = familyParents.get(student.userId) ?? [];
    const guardian = relatives.find(row => row.isPrimaryContact) ?? relatives[0];
    const father = relatives.find(row => row.parentType === 'FATHER');
    const mother = relatives.find(row => row.parentType === 'MOTHER');
    const service = latestRegistration.get(student.id);
    const selectedAddress = service?.selectedAddressId ? addressById.get(service.selectedAddressId) : undefined;
    const address = selectedAddress?.userId === student.userId ? selectedAddress : activeAddress.get(student.userId);
    const emergency = activeEmergency.get(student.userId);
    const companion = companions.get(student.id);
    const school = schoolById.get(student.schoolId);
    const educationLevel = school?.educationOptions?.find(option => option.grades.includes(student.grade ?? ''))?.level ?? student.className ?? '';
    sheet.addRow({
      firstName: student.firstName, lastName: student.lastName, nationalId: student.nationalId,
      phoneNumber: student.phoneNumber ?? '', birthDate: formatIranianExportDate(student.birthDate),
      school: school?.name ?? '', educationLevel, grade: student.grade ?? '',
      guardianRelationship: relationship(guardian?.relationshipType ?? guardian?.parentType, guardian?.relationshipDescription),
      guardianName: name(guardian), guardianNationalId: guardian?.nationalId ?? '', guardianPhone: guardian?.phoneNumber ?? '',
      fatherName: name(father), fatherNationalId: father?.nationalId ?? '', fatherPhone: father?.phoneNumber ?? '',
      motherName: name(mother), motherNationalId: mother?.nationalId ?? '', motherPhone: mother?.phoneNumber ?? '',
      emergencyName: name(emergency), emergencyRelationship: emergency?.relationship ?? '', emergencyPhone: emergency?.phoneNumber ?? '',
      homePhone: guardian?.homePhone || father?.homePhone || mother?.homePhone || '',
      province: address?.province ?? '', city: address?.city ?? '', district: address?.district ?? '',
      address: address?.streetAddress ?? '', postalCode: address?.postalCode ?? '',
      gender: student.gender === 'FEMALE' ? 'دختر' : student.gender === 'MALE' ? 'پسر' : '',
      hasCompanion: companion ? 'دارد' : 'ندارد', companionName: name(companion),
      companionNationalId: companion?.nationalId ?? '', companionPhone: companion?.phoneNumber ?? '',
      serviceType: serviceLabel(service?.serviceType), physicalStatus: student.physicalStatus === 'SPECIAL' ? 'استثنائی' : student.physicalStatus === 'HEALTHY' ? 'سالم' : '',
      disabilityType: student.disabilityType ?? '', createdAt: formatIranianExportDate(userById.get(student.userId)?.createdAt ?? student.createdAt, true),
      accountStatus: student.isActive ? 'فعال' : 'بایگانی',
    });
  }
  sheet.autoFilter = { from: { row: 1, column: 1 }, to: { row: Math.max(1, sheet.rowCount), column: STUDENT_EXPORT_COLUMNS.length } };
  sheet.getRow(1).height = 34;
  sheet.getRow(1).eachCell(cell => { cell.font = { bold: true, color: { argb: 'FFFFFFFF' } }; cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF163A5F' } }; cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true }; });
  sheet.eachRow((row, rowNumber) => {
    if (rowNumber === 1) return;
    row.alignment = { vertical: 'top', readingOrder: 'rtl' };
    row.eachCell(cell => { if (typeof cell.value === 'string' && /^[\t\r ]*[=+\-@]/.test(cell.value)) cell.value = `'${cell.value}`; if (rowNumber % 2 === 0) cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF3F6FA' } }; });
  });
  return Buffer.from(await workbook.xlsx.writeBuffer());
}
