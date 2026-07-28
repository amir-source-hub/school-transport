import { Injectable } from '@nestjs/common';
import ExcelJS from 'exceljs';
import { DatabaseService } from '../../database/database.service';
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

type CellValue = string | number | boolean | Date | null;

@Injectable()
export class ReportsService {
  constructor(private readonly db: DatabaseService) {}

  async createComprehensiveWorkbook(): Promise<Buffer> {
    const [
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
    ] = await Promise.all([
      this.db.db.select().from(users),
      this.db.db.select().from(parents),
      this.db.db.select().from(familyAddresses),
      this.db.db.select().from(schools),
      this.db.db.select().from(students),
      this.db.db.select().from(serviceRegistrations),
      this.db.db.select().from(registrationPrices),
      this.db.db.select().from(paymentPlans),
      this.db.db.select().from(paymentScheduleItems),
      this.db.db.select().from(paymentTransactions),
      this.db.db.select().from(contracts),
    ]);

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
    sheet.addRows(rows);
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
