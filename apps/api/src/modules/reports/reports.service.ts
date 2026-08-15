import { forwardRef, Inject, Injectable } from '@nestjs/common';
import ExcelJS from 'exceljs';
import { asc } from 'drizzle-orm';
import { DatabaseService } from '../../database/database.service';
import { ValidationError } from '../../common/errors';
import {
  contracts,
  familyAddresses,
  parents,
  paymentPlans,
  paymentScheduleItems,
  paymentTransactions,
  registrationPrices,
  schools,
  serviceRegistrations,
  students,
  users,
} from '../../database/schemas';
import type { ReportPreviewSection } from './reports.dto';

type CellValue = string | number | boolean | Date | null;

export const REPORT_EXPORT_MAX_ROWS_PER_SOURCE = 10_000;

export function neutralizeSpreadsheetFormula(value: CellValue): CellValue {
  if (typeof value !== 'string') return value;
  return /^[\t\r ]*[=+\-@]/.test(value) ? `'${value}` : value;
}

@Injectable()
export class ReportsService {
  constructor(@Inject(forwardRef(() => DatabaseService)) private readonly db: DatabaseService) {}

  async createComprehensiveWorkbook(): Promise<Buffer> {
    // Keep production database pressure bounded. A comprehensive export touches many tables and
    // opening all queries at once can exhaust small managed-database pools.
    const limit = REPORT_EXPORT_MAX_ROWS_PER_SOURCE + 1;
    const userRows = await this.db.db.select().from(users).orderBy(asc(users.id)).limit(limit);
    const parentRows = await this.db.db
      .select()
      .from(parents)
      .orderBy(asc(parents.id))
      .limit(limit);
    const addressRows = await this.db.db
      .select()
      .from(familyAddresses)
      .orderBy(asc(familyAddresses.id))
      .limit(limit);
    const schoolRows = await this.db.db
      .select()
      .from(schools)
      .orderBy(asc(schools.id))
      .limit(limit);
    const studentRows = await this.db.db
      .select({
        id: students.id,
        userId: students.userId,
        schoolId: students.schoolId,
        firstName: students.firstName,
        lastName: students.lastName,
        nationalId: students.nationalId,
        birthDate: students.birthDate,
        gender: students.gender,
        grade: students.grade,
        className: students.className,
        isActive: students.isActive,
        createdAt: students.createdAt,
      })
      .from(students)
      .orderBy(asc(students.id))
      .limit(limit);
    const registrationRows = await this.db.db
      .select()
      .from(serviceRegistrations)
      .orderBy(asc(serviceRegistrations.id))
      .limit(limit);
    const priceRows = await this.db.db
      .select()
      .from(registrationPrices)
      .orderBy(asc(registrationPrices.id))
      .limit(limit);
    const planRows = await this.db.db
      .select()
      .from(paymentPlans)
      .orderBy(asc(paymentPlans.id))
      .limit(limit);
    const scheduleRows = await this.db.db
      .select()
      .from(paymentScheduleItems)
      .orderBy(asc(paymentScheduleItems.id))
      .limit(limit);
    const transactionRows = await this.db.db
      .select()
      .from(paymentTransactions)
      .orderBy(asc(paymentTransactions.id))
      .limit(limit);
    const contractRows = await this.db.db
      .select()
      .from(contracts)
      .orderBy(asc(contracts.id))
      .limit(limit);

    if (
      [
        userRows,
        parentRows,
        addressRows,
        schoolRows,
        studentRows,
        registrationRows,
        priceRows,
        planRows,
        scheduleRows,
        transactionRows,
        contractRows,
      ].some((rows) => rows.length > REPORT_EXPORT_MAX_ROWS_PER_SOURCE)
    ) {
      throw new ValidationError(
        'گزارش برای خروجی هم‌زمان بیش از حد بزرگ است. بازه کوچک‌تری انتخاب کنید.',
      );
    }

    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'سامانه سرویس مدارس';
    workbook.created = new Date();
    workbook.modified = new Date();

    this.addSheet(
      workbook,
      'دانش‌آموزان',
      [
        ['studentId', 'شناسه دانش‌آموز'],
        ['firstName', 'نام'],
        ['lastName', 'نام خانوادگی'],
        ['nationalId', 'کد ملی'],
        ['birthDate', 'تاریخ تولد'],
        ['gender', 'جنسیت'],
        ['grade', 'پایه'],
        ['className', 'مقطع / کلاس'],
        ['schoolName', 'مدرسه'],
        ['familyName', 'خانواده'],
        ['familyPhone', 'تلفن خانواده'],
        ['address', 'نشانی فعال'],
        ['active', 'وضعیت'],
        ['createdAt', 'تاریخ ایجاد'],
      ],
      studentRows.map((student) => {
        const school = schoolRows.find((row) => row.id === student.schoolId);
        const familyParents = parentRows.filter((row) => row.userId === student.userId);
        const primaryParent = familyParents.find((row) => row.isPrimaryContact) ?? familyParents[0];
        const address = addressRows.find((row) => row.userId === student.userId && row.isActive);
        return {
          studentId: student.id,
          firstName: student.firstName,
          lastName: student.lastName,
          nationalId: student.nationalId,
          birthDate: student.birthDate,
          gender: student.gender === 'FEMALE' ? 'دختر' : student.gender === 'MALE' ? 'پسر' : '',
          grade: student.grade,
          className: student.className,
          schoolName: school?.name ?? '',
          familyName: primaryParent ? `${primaryParent.firstName} ${primaryParent.lastName}` : '',
          familyPhone: primaryParent?.phoneNumber ?? '',
          address: address
            ? [address.province, address.city, address.district, address.streetAddress]
                .filter(Boolean)
                .join('، ')
            : '',
          active: student.isActive ? 'فعال' : 'بایگانی‌شده',
          createdAt: student.createdAt,
        };
      }),
    );

    this.addSheet(
      workbook,
      'خانواده‌ها و نشانی‌ها',
      [
        ['familyId', 'شناسه خانواده'],
        ['username', 'نام کاربری'],
        ['accountPhone', 'تلفن حساب'],
        ['parentType', 'نسبت'],
        ['parentName', 'نام والد'],
        ['nationalId', 'کد ملی والد'],
        ['parentPhone', 'تلفن والد'],
        ['primary', 'مخاطب اصلی'],
        ['addressTitle', 'عنوان نشانی'],
        ['province', 'استان'],
        ['city', 'شهر'],
        ['district', 'منطقه'],
        ['streetAddress', 'نشانی'],
        ['postalCode', 'کد پستی'],
        ['active', 'وضعیت نشانی'],
      ],
      userRows.flatMap((user) => {
        const familyParents = parentRows.filter((row) => row.userId === user.id);
        const familyAddresses = addressRows.filter((row) => row.userId === user.id);
        const combinations = familyParents.flatMap((parent) =>
          (familyAddresses.length ? familyAddresses : [null]).map((address) => ({
            familyId: user.id,
            username: user.username,
            accountPhone: user.phoneNumber,
            parentType:
              parent.parentType === 'MOTHER'
                ? 'مادر'
                : parent.parentType === 'FATHER'
                  ? 'پدر'
                  : parent.parentType,
            parentName: `${parent.firstName} ${parent.lastName}`,
            nationalId: parent.nationalId,
            parentPhone: parent.phoneNumber,
            primary: parent.isPrimaryContact ? 'بله' : 'خیر',
            addressTitle: address?.title ?? '',
            province: address?.province ?? '',
            city: address?.city ?? '',
            district: address?.district ?? '',
            streetAddress: address?.streetAddress ?? '',
            postalCode: address?.postalCode ?? '',
            active: address ? (address.isActive ? 'فعال' : 'غیرفعال') : '',
          })),
        );
        return combinations;
      }),
    );

    this.addSheet(
      workbook,
      'ثبت‌نام‌ها',
      [
        ['registrationId', 'شناسه ثبت‌نام'],
        ['studentName', 'دانش‌آموز'],
        ['schoolName', 'مدرسه'],
        ['academicYear', 'سال تحصیلی'],
        ['serviceType', 'نوع سرویس'],
        ['status', 'وضعیت'],
        ['requestedStartDate', 'تاریخ شروع درخواستی'],
        ['submittedAt', 'تاریخ ارسال'],
        ['reviewedAt', 'تاریخ بررسی'],
        ['parentNotes', 'یادداشت خانواده'],
        ['rejectionReason', 'دلیل رد'],
      ],
      registrationRows.map((registration) => {
        const student = studentRows.find((row) => row.id === registration.studentId);
        const school = student ? schoolRows.find((row) => row.id === student.schoolId) : undefined;
        return {
          registrationId: registration.id,
          studentName: student ? `${student.firstName} ${student.lastName}` : '',
          schoolName: school?.name ?? '',
          academicYear: registration.academicYear,
          serviceType: registration.serviceType,
          status: registration.registrationStatus,
          requestedStartDate: registration.requestedStartDate,
          submittedAt: registration.submittedAt,
          reviewedAt: registration.reviewedAt,
          parentNotes: registration.parentNotes,
          rejectionReason: registration.rejectionReason,
        };
      }),
    );

    this.addSheet(
      workbook,
      'پرداخت‌ها',
      [
        ['studentName', 'دانش‌آموز'],
        ['schoolName', 'مدرسه'],
        ['academicYear', 'سال تحصیلی'],
        ['planType', 'نوع برنامه'],
        ['planStatus', 'وضعیت برنامه'],
        ['itemType', 'نوع پرداخت'],
        ['sequence', 'شماره قسط'],
        ['amount', 'مبلغ مورد انتظار (ریال)'],
        ['dueDate', 'سررسید'],
        ['itemStatus', 'وضعیت پرداخت'],
        ['paidAmount', 'مبلغ پرداخت‌شده (ریال)'],
        ['paidAt', 'زمان پرداخت'],
        ['transactionStatus', 'وضعیت تراکنش'],
        ['paymentMethod', 'روش پرداخت'],
        ['reference', 'شماره مرجع'],
      ],
      scheduleRows.map((item) => {
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
        const school = student ? schoolRows.find((row) => row.id === student.schoolId) : undefined;
        const transaction = transactionRows
          .filter((row) => row.paymentScheduleItemId === item.id)
          .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())[0];
        return {
          studentName: student ? `${student.firstName} ${student.lastName}` : '',
          schoolName: school?.name ?? '',
          academicYear: registration?.academicYear ?? '',
          planType: plan?.planType ?? '',
          planStatus: plan?.planStatus ?? '',
          itemType: item.itemType === 'PREPAYMENT' ? 'پیش‌پرداخت' : 'قسط',
          sequence: item.sequenceNumber,
          amount: item.amount,
          dueDate: item.dueDate,
          itemStatus: item.itemStatus === 'PAID' ? 'پرداخت شده' : 'پرداخت نشده',
          paidAmount: item.paidAmount,
          paidAt: item.paidAt,
          transactionStatus: transaction?.transactionStatus ?? '',
          paymentMethod: transaction?.paymentMethod ?? '',
          reference: transaction?.gatewayTransactionId ?? '',
        };
      }),
      new Set(['amount', 'paidAmount']),
    );

    this.addSheet(
      workbook,
      'قراردادها',
      [
        ['contractNumber', 'شماره قرارداد'],
        ['studentName', 'دانش‌آموز'],
        ['schoolName', 'مدرسه'],
        ['academicYear', 'سال تحصیلی'],
        ['totalAmount', 'مبلغ قرارداد (ریال)'],
        ['status', 'وضعیت'],
        ['version', 'نسخه'],
        ['generatedAt', 'تاریخ صدور'],
        ['acceptedAt', 'تاریخ پذیرش'],
        ['cancelledAt', 'تاریخ لغو'],
      ],
      contractRows.map((contract) => {
        const registration = registrationRows.find((row) => row.id === contract.registrationId);
        const student = registration
          ? studentRows.find((row) => row.id === registration.studentId)
          : undefined;
        const school = student ? schoolRows.find((row) => row.id === student.schoolId) : undefined;
        const price = priceRows.find((row) => row.id === contract.registrationPriceId);
        return {
          contractNumber: contract.contractNumber,
          studentName: student ? `${student.firstName} ${student.lastName}` : '',
          schoolName: school?.name ?? '',
          academicYear: registration?.academicYear ?? '',
          totalAmount: price?.totalAmount ?? 0,
          status: contract.contractStatus,
          version: contract.versionNumber,
          generatedAt: contract.generatedAt,
          acceptedAt: contract.acceptedAt,
          cancelledAt: contract.cancelledAt,
        };
      }),
      new Set(['totalAmount']),
    );

    const buffer = await workbook.xlsx.writeBuffer();
    return Buffer.from(buffer);
  }

  async getComprehensivePreview(input: {
    section: ReportPreviewSection;
    page: number;
    pageSize: number;
  }) {
    const { section, page, pageSize } = input;
    let columns: { key: string; label: string; kind?: 'money' | 'date' }[] = [];
    let rows: Record<string, CellValue>[] = [];

    if (section === 'students') {
      const [studentRows, schoolRows] = await Promise.all([
        this.db.db.select().from(students),
        this.db.db.select().from(schools),
      ]);
      columns = [
        { key: 'studentName', label: 'دانش‌آموز' },
        { key: 'schoolName', label: 'مدرسه' },
        { key: 'grade', label: 'پایه' },
        { key: 'className', label: 'مقطع / کلاس' },
        { key: 'status', label: 'وضعیت' },
        { key: 'createdAt', label: 'تاریخ ایجاد', kind: 'date' },
      ];
      rows = studentRows
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
      rows = userRows.map((user) => {
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
        { key: 'submittedAt', label: 'تاریخ ارسال', kind: 'date' },
      ];
      rows = registrationRows
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
      rows = scheduleRows
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
            status: item.itemStatus === 'PAID' ? 'پرداخت شده' : 'پرداخت نشده',
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
        { key: 'generatedAt', label: 'تاریخ صدور', kind: 'date' },
      ];
      rows = contractRows
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
      if (/Date|At$/.test(key)) column.numFmt = 'yyyy-mm-dd hh:mm';
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
