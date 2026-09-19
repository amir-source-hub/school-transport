import { forwardRef, Inject, Injectable } from '@nestjs/common';
import ExcelJS from 'exceljs';
import { DatabaseService } from '../../database/database.service';
import {
  contracts,
  familyAddresses,
  parents,
  paymentPlans,
  paymentScheduleItems,
  registrationPrices,
  schools,
  serviceRegistrations,
  students,
  users,
} from '../../database/schemas';
import type { ReportPreviewSection } from './reports.dto';
import { createStudentWorkbook } from './student-workbook';
import { createDriverWorkbook } from './driver-workbook';

type CellValue = string | number | boolean | Date | null;

export const REPORT_EXPORT_MAX_ROWS_PER_SOURCE = 10_000;

export function neutralizeSpreadsheetFormula(value: CellValue): CellValue {
  if (typeof value !== 'string') return value;
  return /^[\t\r ]*[=+\-@]/.test(value) ? `'${value}` : value;
}

export function filterEnrolledStudents<T extends { id: string }>(
  studentRows: T[],
  registrationRows: Array<{ studentId: string; registrationStatus: string }>,
): T[] {
  const enrolledStudentIds = new Set(
    registrationRows
      .filter((registration) => registration.registrationStatus === 'ENROLLED')
      .map((registration) => registration.studentId),
  );
  return studentRows.filter((student) => enrolledStudentIds.has(student.id));
}

@Injectable()
export class ReportsService {
  constructor(@Inject(forwardRef(() => DatabaseService)) private readonly db: DatabaseService) {}

  async createDriversWorkbook(): Promise<Buffer> {
    return createDriverWorkbook(this.db, REPORT_EXPORT_MAX_ROWS_PER_SOURCE);
  }

  async createComprehensiveWorkbook(): Promise<Buffer> {
    return createStudentWorkbook(this.db, REPORT_EXPORT_MAX_ROWS_PER_SOURCE);
  }
  async getComprehensivePreview(input: {
    section: ReportPreviewSection;
    page: number;
    pageSize: number;
  }) {
    const { section, page, pageSize } = input;
    const activeUserIds = new Set(
      (await this.db.db.select().from(users))
        .filter((user) => user.accountStatus === 'ACTIVE')
        .map((user) => user.id),
    );
    const visibleStudent = (student: typeof students.$inferSelect) =>
      student.isActive && activeUserIds.has(student.userId);
    let columns: { key: string; label: string; kind?: 'money' | 'date' | 'datetime' }[] = [];
    let rows: Record<string, CellValue>[] = [];

    if (section === 'students') {
      const [studentRows, schoolRows, registrationRows] = await Promise.all([
        this.db.db.select().from(students),
        this.db.db.select().from(schools),
        this.db.db
          .select({
            studentId: serviceRegistrations.studentId,
            registrationStatus: serviceRegistrations.registrationStatus,
          })
          .from(serviceRegistrations),
      ]);
      columns = [
        { key: 'studentName', label: 'دانش‌آموز' },
        { key: 'schoolName', label: 'مدرسه' },
        { key: 'grade', label: 'پایه' },
        { key: 'className', label: 'مقطع / کلاس' },
        { key: 'status', label: 'وضعیت' },
        { key: 'createdAt', label: 'تاریخ ایجاد', kind: 'datetime' },
      ];
      rows = filterEnrolledStudents(studentRows.filter(visibleStudent), registrationRows)
        .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
        .map((student) => ({
          studentName: `${student.firstName} ${student.lastName}`,
          schoolName: schoolRows.find((school) => school.id === student.schoolId)?.name ?? '',
          grade: student.grade,
          className: student.className,
          status: student.isActive ? 'فعال' : 'بایگانی‌شده',
          createdAt: student.createdAt,
        }));
    } else if (section === 'families') {
      const [userRows, parentRows, addressRows] = await Promise.all([
        this.db.db.select().from(users),
        this.db.db.select().from(parents),
        this.db.db.select().from(familyAddresses),
      ]);
      columns = [
        { key: 'familyName', label: 'خانواده' },
        { key: 'parentCount', label: 'تعداد والدین' },
        { key: 'city', label: 'شهر نشانی فعال' },
        { key: 'addressCount', label: 'تعداد نشانی‌ها' },
        { key: 'status', label: 'وضعیت حساب' },
      ];
      rows = userRows.filter((user) => user.accountStatus === 'ACTIVE').map((user) => {
        const familyParents = parentRows.filter((parent) => parent.userId === user.id);
        const primary = familyParents.find((parent) => parent.isPrimaryContact) ?? familyParents[0];
        const familyAddressRows = addressRows.filter((address) => address.userId === user.id);
        return {
          familyName: primary ? `${primary.firstName} ${primary.lastName}` : user.username,
          parentCount: familyParents.length,
          city: familyAddressRows.find((address) => address.isActive)?.city ?? '',
          addressCount: familyAddressRows.length,
          status: user.accountStatus === 'ACTIVE' ? 'فعال' : 'غیرفعال',
        };
      });
    } else if (section === 'registrations') {
      const [registrationRows, studentRows, schoolRows] = await Promise.all([
        this.db.db.select().from(serviceRegistrations),
        this.db.db.select().from(students),
        this.db.db.select().from(schools),
      ]);
      columns = [
        { key: 'studentName', label: 'دانش‌آموز' },
        { key: 'schoolName', label: 'مدرسه' },
        { key: 'academicYear', label: 'سال تحصیلی' },
        { key: 'serviceType', label: 'نوع سرویس' },
        { key: 'status', label: 'وضعیت' },
        { key: 'submittedAt', label: 'تاریخ ارسال', kind: 'datetime' },
      ];
      const visibleStudentIds = new Set(studentRows.filter(visibleStudent).map((student) => student.id));
      rows = registrationRows
        .filter((registration) => visibleStudentIds.has(registration.studentId))
        .sort((a, b) => (b.submittedAt?.getTime() ?? 0) - (a.submittedAt?.getTime() ?? 0))
        .map((registration) => {
          const student = studentRows.find((row) => row.id === registration.studentId);
          return {
            studentName: student ? `${student.firstName} ${student.lastName}` : '',
            schoolName: student
              ? (schoolRows.find((school) => school.id === student.schoolId)?.name ?? '')
              : '',
            academicYear: registration.academicYear,
            serviceType: registration.serviceType,
            status: registration.registrationStatus,
            submittedAt: registration.submittedAt,
          };
        });
    } else if (section === 'payments') {
      const [scheduleRows, planRows, priceRows, registrationRows, studentRows] = await Promise.all([
        this.db.db.select().from(paymentScheduleItems),
        this.db.db.select().from(paymentPlans),
        this.db.db.select().from(registrationPrices),
        this.db.db.select().from(serviceRegistrations),
        this.db.db.select().from(students),
      ]);
      columns = [
        { key: 'studentName', label: 'دانش‌آموز' },
        { key: 'itemType', label: 'نوع پرداخت' },
        { key: 'amount', label: 'مبلغ مورد انتظار (ریال)', kind: 'money' },
        { key: 'dueDate', label: 'سررسید', kind: 'date' },
        { key: 'status', label: 'وضعیت' },
        { key: 'paidAmount', label: 'مبلغ پرداخت‌شده (ریال)', kind: 'money' },
      ];
      const visibleStudentIds = new Set(studentRows.filter(visibleStudent).map((student) => student.id));
      rows = scheduleRows
        .filter((item) => {
          const plan = planRows.find((row) => row.id === item.paymentPlanId);
          const price = plan ? priceRows.find((row) => row.id === plan.registrationPriceId) : undefined;
          const registration = price ? registrationRows.find((row) => row.id === price.registrationId) : undefined;
          return registration ? visibleStudentIds.has(registration.studentId) : false;
        })
        .sort((a, b) => (a.dueDate?.getTime() ?? 0) - (b.dueDate?.getTime() ?? 0))
        .map((item) => {
          const plan = planRows.find((row) => row.id === item.paymentPlanId);
          const price = plan
            ? priceRows.find((row) => row.id === plan.registrationPriceId)
            : undefined;
          const registration = price
            ? registrationRows.find((row) => row.id === price.registrationId)
            : undefined;
          const student = registration
            ? studentRows.find((row) => row.id === registration.studentId)
            : undefined;
          return {
            studentName: student ? `${student.firstName} ${student.lastName}` : '',
            itemType: item.itemType === 'PREPAYMENT' ? 'پیش‌پرداخت' : 'قسط',
            amount: item.amount,
            dueDate: item.dueDate,
            status:
              item.itemStatus === 'PAID'
                ? 'پرداخت شده'
                : item.itemStatus === 'CANCELLED'
                  ? 'معاف از پرداخت'
                  : 'پرداخت نشده',
            paidAmount: item.paidAmount,
          };
        });
    } else {
      const [contractRows, registrationRows, studentRows, priceRows] = await Promise.all([
        this.db.db.select().from(contracts),
        this.db.db.select().from(serviceRegistrations),
        this.db.db.select().from(students),
        this.db.db.select().from(registrationPrices),
      ]);
      columns = [
        { key: 'contractNumber', label: 'شماره قرارداد' },
        { key: 'studentName', label: 'دانش‌آموز' },
        { key: 'academicYear', label: 'سال تحصیلی' },
        { key: 'totalAmount', label: 'مبلغ قرارداد (ریال)', kind: 'money' },
        { key: 'status', label: 'وضعیت' },
        { key: 'generatedAt', label: 'تاریخ صدور', kind: 'datetime' },
      ];
      const visibleStudentIds = new Set(studentRows.filter(visibleStudent).map((student) => student.id));
      rows = contractRows
        .filter((contract) => {
          const registration = registrationRows.find((row) => row.id === contract.registrationId);
          return registration ? visibleStudentIds.has(registration.studentId) : false;
        })
        .sort((a, b) => (b.generatedAt?.getTime() ?? 0) - (a.generatedAt?.getTime() ?? 0))
        .map((contract) => {
          const registration = registrationRows.find((row) => row.id === contract.registrationId);
          const student = registration
            ? studentRows.find((row) => row.id === registration.studentId)
            : undefined;
          return {
            contractNumber: contract.contractNumber,
            studentName: student ? `${student.firstName} ${student.lastName}` : '',
            academicYear: registration?.academicYear ?? '',
            totalAmount:
              priceRows.find((row) => row.id === contract.registrationPriceId)?.totalAmount ?? 0,
            status: contract.contractStatus,
            generatedAt: contract.generatedAt,
          };
        });
    }

    const total = rows.length;
    const start = (page - 1) * pageSize;
    const moneyKeys = new Set(
      columns.filter((column) => column.kind === 'money').map(({ key }) => key),
    );
    const totals = Object.fromEntries(
      [...moneyKeys].map((key) => [
        key,
        rows.reduce((sum, row) => sum + (typeof row[key] === 'number' ? row[key] : 0), 0),
      ]),
    );
    return {
      section,
      columns,
      rows: rows.slice(start, start + pageSize),
      pagination: { page, pageSize, total, totalPages: Math.max(1, Math.ceil(total / pageSize)) },
      totals,
    };
  }

  private addSheet(
    workbook: ExcelJS.Workbook,
    name: string,
    columns: [string, string][],
    rows: Record<string, CellValue>[],
    currencyKeys = new Set<string>(),
  ) {
    const sheet = workbook.addWorksheet(name, {
      views: [{ state: 'frozen', ySplit: 1, rightToLeft: true }],
      properties: { defaultRowHeight: 22 },
    });
    sheet.columns = columns.map(([key, header]) => ({
      key,
      header,
      width: Math.min(42, Math.max(14, header.length + 5)),
    }));
    sheet.addRows(
      rows.map((row) =>
        Object.fromEntries(
          Object.entries(row).map(([key, value]) => [key, neutralizeSpreadsheetFormula(value)]),
        ),
      ),
    );
    sheet.autoFilter = {
      from: { row: 1, column: 1 },
      to: { row: Math.max(1, sheet.rowCount), column: columns.length },
    };
    sheet.getRow(1).eachCell((cell) => {
      cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF163A5F' } };
      cell.alignment = { horizontal: 'center', vertical: 'middle' };
    });
    sheet.getRow(1).height = 28;
    columns.forEach(([key], index) => {
      const column = sheet.getColumn(index + 1);
      if (currencyKeys.has(key)) column.numFmt = '#,##0';
      if (['address', 'streetAddress', 'parentNotes', 'rejectionReason'].includes(key)) {
        column.width = 38;
        column.alignment = { wrapText: true, vertical: 'top' };
      }
    });
    sheet.eachRow((row, rowNumber) => {
      if (rowNumber === 1) return;
      row.alignment = { vertical: 'top', readingOrder: 'rtl' };
      if (rowNumber % 2 === 0) {
        row.eachCell((cell) => {
          cell.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FFF3F6FA' },
          };
        });
      }
    });
  }

}
