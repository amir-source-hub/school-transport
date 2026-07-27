import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../../database/database.service';
import {
  serviceRegistrations,
  registrationSnapshots,
  registrationReviews,
  registrationPrices,
  paymentPlans,
  paymentScheduleItems,
  contracts,
  emergencyContacts,
} from '../../database/schemas';
import { students } from '../../database/schemas';
import { familyAddresses, parents, schools } from '../../database/schemas';
import { getTableColumns } from 'drizzle-orm';
import { eq, and, inArray, notInArray } from 'drizzle-orm';
import { ConflictError, NotFoundError } from '../../common/errors';
import { generateContractNumber, generateId } from '../../common/utils';
import { assertRegistrationTransition } from './registration-lifecycle';
import { isIranianNationalId, normalizeIranianDigits } from '../../common/iranian-national-id';

@Injectable()
export class RegistrationsService {
  constructor(private readonly db: DatabaseService) {}

  async createGuidedEnrollment(
    userId: string,
    data: {
      student: {
        firstName: string;
        lastName: string;
        nationalId: string;
        birthDate?: string;
        gender?: string;
      };
      father: { firstName: string; lastName: string; nationalId: string; phoneNumber: string };
      mother: { firstName: string; lastName: string; nationalId: string; phoneNumber: string };
      emergencyContact: {
        firstName: string;
        lastName: string;
        relationship: string;
        phoneNumber: string;
      };
      address: {
        title: string;
        province: string;
        city: string;
        district?: string;
        streetAddress: string;
        postalCode: string;
        latitude: number;
        longitude: number;
      };
      school: { schoolId: string; educationLevel: string; grade: string };
      service: { serviceType: string; parentNotes?: string };
    },
  ) {
    data.student.nationalId = normalizeIranianDigits(data.student.nationalId).trim();
    data.father.nationalId = normalizeIranianDigits(data.father.nationalId).trim();
    data.mother.nationalId = normalizeIranianDigits(data.mother.nationalId).trim();
    const required = [
      data.student.firstName,
      data.student.lastName,
      data.student.nationalId,
      data.father.firstName,
      data.father.lastName,
      data.father.phoneNumber,
      data.mother.firstName,
      data.mother.lastName,
      data.mother.phoneNumber,
      data.emergencyContact.firstName,
      data.emergencyContact.phoneNumber,
      data.address.streetAddress,
      data.address.postalCode,
      data.school.schoolId,
      data.school.educationLevel,
      data.school.grade,
      data.service.serviceType,
    ];
    if (required.some((value) => !String(value ?? '').trim())) {
      throw new ConflictError(
        'INCOMPLETE_ENROLLMENT',
        'All required enrollment fields must be completed.',
      );
    }
    if (
      ![data.student.nationalId, data.father.nationalId, data.mother.nationalId].every(
        isIranianNationalId,
      )
    ) {
      throw new ConflictError(
        'INVALID_NATIONAL_ID',
        'A valid national ID is required for the student and both parents.',
      );
    }
    if (
      !/^09\d{9}$/.test(data.father.phoneNumber) ||
      !/^09\d{9}$/.test(data.mother.phoneNumber) ||
      !/^09\d{9}$/.test(data.emergencyContact.phoneNumber)
    ) {
      throw new ConflictError('INVALID_PHONE_NUMBER', 'Valid Iranian mobile numbers are required.');
    }
    if (!Number.isFinite(data.address.latitude) || !Number.isFinite(data.address.longitude)) {
      throw new ConflictError('INVALID_LOCATION', 'A valid map location is required.');
    }
    if (!['BUS', 'MINIBUS', 'CAR', 'VAN'].includes(data.service.serviceType)) {
      throw new ConflictError(
        'INVALID_VEHICLE_TYPE',
        'The selected vehicle type is not supported.',
      );
    }
    const [school] = await this.db.db
      .select({
        id: schools.id,
        educationOptions: schools.educationOptions,
      })
      .from(schools)
      .where(and(eq(schools.id, data.school.schoolId), eq(schools.isActive, true)))
      .limit(1);
    if (!school) throw new NotFoundError('School', data.school.schoolId);
    const selectedLevel = school.educationOptions.find(
      ({ level }) => level === data.school.educationLevel,
    );
    if (!selectedLevel?.grades.includes(data.school.grade)) {
      throw new ConflictError(
        'INVALID_SCHOOL_PROGRAM',
        'The selected education level or grade is not offered by this school.',
      );
    }
    const duplicate = await this.db.db
      .select({ id: students.id })
      .from(students)
      .where(eq(students.nationalId, data.student.nationalId))
      .limit(1);
    if (duplicate[0])
      throw new ConflictError('DUPLICATE_NATIONAL_ID', 'This student is already registered.');

    return this.db.db.transaction(async (txn) => {
      const existingFamilyParents = await txn
        .select({ id: parents.id, isPrimaryContact: parents.isPrimaryContact })
        .from(parents)
        .where(eq(parents.userId, userId));
      for (const [parentType, parent] of [
        ['FATHER', data.father],
        ['MOTHER', data.mother],
      ] as const) {
        const [existing] = await txn
          .select({ id: parents.id })
          .from(parents)
          .where(and(eq(parents.userId, userId), eq(parents.parentType, parentType)))
          .limit(1);
        if (existing) {
          await txn
            .update(parents)
            .set({ ...parent, updatedAt: new Date() })
            .where(eq(parents.id, existing.id));
        } else {
          await txn.insert(parents).values({
            id: generateId(),
            userId,
            parentType,
            ...parent,
            isPrimaryContact: existingFamilyParents.length === 0 && parentType === 'FATHER',
          });
          existingFamilyParents.push({ id: '', isPrimaryContact: parentType === 'FATHER' });
        }
      }
      const [emergency] = await txn
        .select({ id: emergencyContacts.id })
        .from(emergencyContacts)
        .where(eq(emergencyContacts.userId, userId))
        .limit(1);
      if (emergency) {
        await txn
          .update(emergencyContacts)
          .set({ ...data.emergencyContact, updatedAt: new Date() })
          .where(eq(emergencyContacts.id, emergency.id));
      } else {
        await txn
          .insert(emergencyContacts)
          .values({ id: generateId(), userId, ...data.emergencyContact });
      }

      const addressId = generateId();
      await txn.insert(familyAddresses).values({ id: addressId, userId, ...data.address });
      const studentId = generateId();
      await txn.insert(students).values({
        id: studentId,
        userId,
        schoolId: data.school.schoolId,
        firstName: data.student.firstName,
        lastName: data.student.lastName,
        nationalId: data.student.nationalId,
        birthDate: data.student.birthDate || null,
        gender: data.student.gender || null,
        grade: data.school.grade,
        className: data.school.educationLevel,
      });
      const registrationId = generateId();
      await txn.insert(serviceRegistrations).values({
        id: registrationId,
        studentId,
        academicYear: '1405-1406',
        serviceType: data.service.serviceType,
        selectedAddressId: addressId,
        parentNotes: data.service.parentNotes || null,
        registrationStatus: 'CONTRACT_READY',
        submittedAt: new Date(),
      });
      const priceId = generateId();
      const prepaymentAmount = 40_000_000;
      await txn.insert(registrationPrices).values({
        id: priceId,
        registrationId,
        totalAmount: prepaymentAmount,
        prepaymentAmount,
        installmentCount: 4,
        priceStatus: 'ACCEPTED',
        parentConfirmedAt: new Date(),
        setByAdminId: null,
      });
      const planId = generateId();
      await txn.insert(paymentPlans).values({
        id: planId,
        registrationPriceId: priceId,
        planType: 'PREPAYMENT_PLUS_FOUR_INSTALLMENTS',
        totalAmount: prepaymentAmount,
        prepaymentAmount,
        remainingInstallmentAmount: 0,
        installmentCount: 4,
        planStatus: 'PENDING',
      });
      const scheduleItemId = generateId();
      await txn.insert(paymentScheduleItems).values({
        id: scheduleItemId,
        paymentPlanId: planId,
        itemType: 'PREPAYMENT',
        sequenceNumber: 0,
        amount: prepaymentAmount,
        dueDate: new Date(),
      });
      const contractId = generateId();
      const snapshot = {
        student: data.student,
        father: data.father,
        mother: data.mother,
        emergencyContact: data.emergencyContact,
        address: data.address,
        school: data.school,
        service: data.service,
        prepaymentAmount,
      };
      await txn.insert(contracts).values({
        id: contractId,
        registrationId,
        registrationPriceId: priceId,
        paymentPlanId: planId,
        contractNumber: generateContractNumber(),
        contractStatus: 'GENERATED',
        selectedAddressId: addressId,
        contractDataSnapshot: JSON.stringify(snapshot),
        generatedAt: new Date(),
      });
      return {
        registrationId,
        studentId,
        contractId,
        scheduleItemId,
        prepaymentAmount,
        contractText: this.guidedContractText(data.student.firstName, data.student.lastName),
      };
    });
  }

  private guidedContractText(firstName: string, lastName: string) {
    return `قرارداد ارائه خدمات حمل‌ونقل دانش‌آموزی

این قرارداد میان سامانه سرویس مدرسه و خانواده دانش‌آموز ${firstName} ${lastName} منعقد می‌شود. سامانه متعهد است با رعایت الزامات ایمنی، برنامه‌ریزی مسیر و هماهنگی با مدرسه، بیشترین تلاش خود را برای ارائه نوع سرویس درخواستی انجام دهد.

نوع خودرو، ساعت حرکت، مسیر و حتی نوع سرویس ممکن است بر اساس ظرفیت، شرایط ترافیکی، محدوده پوشش، تصمیم مدرسه و الزامات ایمنی تغییر کند. هر تغییر مؤثر پیش از شروع خدمت به خانواده اطلاع داده خواهد شد.

مبلغ ۴٬۰۰۰٬۰۰۰ تومان به‌عنوان پیش‌پرداخت ثابت ثبت‌نام دریافت می‌شود. مبلغ باقی‌مانده، تعداد اقساط و تاریخ سررسید هر قسط پس از برنامه‌ریزی نهایی توسط مدیریت تعیین و در حساب خانواده نمایش داده خواهد شد.

خانواده مسئول صحت اطلاعات دانش‌آموز، والدین، تماس اضطراری، نشانی و موقعیت ثبت‌شده است و متعهد می‌شود تغییرات را به‌موقع اعلام کند. آغاز نهایی سرویس منوط به تأیید ظرفیت و برنامه مسیر است.

با پذیرش این قرارداد، خانواده اعلام می‌کند تمام بندها را مطالعه کرده و با شرایط فوق موافق است.`;
  }

  async getByFamily(userId: string) {
    const userStudents = await this.db.db
      .select({ id: students.id })
      .from(students)
      .where(eq(students.userId, userId));

    const studentIds = userStudents.map((s) => s.id);
    if (studentIds.length === 0) return [];

    return this.db.db
      .select()
      .from(serviceRegistrations)
      .where(inArray(serviceRegistrations.studentId, studentIds));
  }

  async getAll() {
    return this.db.db.select().from(serviceRegistrations);
  }

  async getAllForAdmin() {
    const rows = await this.db.db
      .select({
        ...getTableColumns(serviceRegistrations),
        studentFirstName: students.firstName,
        studentLastName: students.lastName,
        familyId: students.userId,
        schoolId: schools.id,
        schoolName: schools.name,
      })
      .from(serviceRegistrations)
      .innerJoin(students, eq(students.id, serviceRegistrations.studentId))
      .innerJoin(schools, eq(schools.id, students.schoolId));
    const parentRows = await this.db.db.select().from(parents);
    return rows.map((registration) => {
      const parent =
        parentRows.find(
          (entry) => entry.userId === registration.familyId && entry.isPrimaryContact,
        ) ?? parentRows.find((entry) => entry.userId === registration.familyId);
      return {
        ...registration,
        studentName: `${registration.studentFirstName} ${registration.studentLastName}`,
        familyName: parent ? `${parent.firstName} ${parent.lastName}` : '—',
      };
    });
  }

  async getForAdmin(registrationId: string) {
    const record = (await this.getAllForAdmin()).find(({ id }) => id === registrationId);
    if (!record) throw new NotFoundError('Registration', registrationId);
    return record;
  }

  async getById(registrationId: string, userId?: string) {
    const result = await this.db.db
      .select()
      .from(serviceRegistrations)
      .where(eq(serviceRegistrations.id, registrationId))
      .limit(1);

    if (result.length === 0) throw new NotFoundError('Registration', registrationId);

    if (userId) {
      const student = await this.db.db
        .select({ userId: students.userId })
        .from(students)
        .where(eq(students.id, result[0].studentId))
        .limit(1);
      if (student.length === 0 || student[0].userId !== userId) {
        throw new NotFoundError('Registration', registrationId);
      }
    }

    return result[0];
  }

  async create(
    userId: string,
    data: {
      studentId: string;
      academicYear: string;
      serviceType: string;
      requestedStartDate?: string;
      parentNotes?: string;
    },
  ) {
    const student = await this.db.db
      .select()
      .from(students)
      .where(and(eq(students.id, data.studentId), eq(students.userId, userId)))
      .limit(1);
    if (student.length === 0) throw new NotFoundError('Student', data.studentId);

    const duplicate = await this.db.db
      .select({ id: serviceRegistrations.id })
      .from(serviceRegistrations)
      .where(
        and(
          eq(serviceRegistrations.studentId, data.studentId),
          eq(serviceRegistrations.academicYear, data.academicYear),
          notInArray(serviceRegistrations.registrationStatus, ['REJECTED', 'CANCELLED']),
        ),
      )
      .limit(1);
    if (duplicate.length > 0) {
      throw new ConflictError(
        'DUPLICATE_ACTIVE_ENROLLMENT',
        'An active enrollment already exists for this student and academic year.',
      );
    }

    const [selectedAddress] = await this.db.db
      .select({ id: familyAddresses.id })
      .from(familyAddresses)
      .where(and(eq(familyAddresses.userId, userId), eq(familyAddresses.isActive, true)))
      .limit(1);
    if (!selectedAddress) {
      throw new ConflictError(
        'ACTIVE_ADDRESS_REQUIRED',
        'Add an active family address before requesting transport service.',
      );
    }

    const id = generateId();
    await this.db.db.insert(serviceRegistrations).values({
      id,
      studentId: data.studentId,
      academicYear: data.academicYear,
      serviceType: data.serviceType,
      selectedAddressId: selectedAddress.id,
      requestedStartDate: data.requestedStartDate ? new Date(data.requestedStartDate) : null,
      parentNotes: data.parentNotes || null,
      registrationStatus: 'DRAFT',
    });

    return this.getById(id);
  }

  async submit(registrationId: string, userId: string) {
    const reg = await this.getById(registrationId, userId);
    assertRegistrationTransition(reg.registrationStatus, 'SUBMITTED');

    await this.db.db
      .update(serviceRegistrations)
      .set({ registrationStatus: 'SUBMITTED', submittedAt: new Date(), updatedAt: new Date() })
      .where(eq(serviceRegistrations.id, registrationId));

    await this.createSnapshot(registrationId, 'SUBMISSION');
    return this.getById(registrationId);
  }

  async cancel(registrationId: string, userId: string) {
    const reg = await this.getById(registrationId, userId);
    assertRegistrationTransition(reg.registrationStatus, 'CANCELLED');

    await this.db.db
      .update(serviceRegistrations)
      .set({ registrationStatus: 'CANCELLED', updatedAt: new Date() })
      .where(eq(serviceRegistrations.id, registrationId));

    return this.getById(registrationId);
  }

  async startReview(registrationId: string, adminId: string) {
    const reg = await this.getById(registrationId);
    assertRegistrationTransition(reg.registrationStatus, 'UNDER_REVIEW');

    await this.db.db
      .update(serviceRegistrations)
      .set({
        registrationStatus: 'UNDER_REVIEW',
        reviewedByAdminId: adminId,
        reviewedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(serviceRegistrations.id, registrationId));

    await this.addReview(registrationId, adminId, 'START_REVIEW');
    return this.getById(registrationId);
  }

  async approve(registrationId: string, adminId: string) {
    const reg = await this.getById(registrationId);
    assertRegistrationTransition(reg.registrationStatus, 'APPROVED');

    await this.db.db
      .update(serviceRegistrations)
      .set({
        registrationStatus: 'APPROVED',
        reviewedByAdminId: adminId,
        reviewedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(serviceRegistrations.id, registrationId));

    await this.addReview(registrationId, adminId, 'APPROVE');
    return this.getById(registrationId);
  }

  async reject(registrationId: string, adminId: string, reason?: string) {
    const reg = await this.getById(registrationId);
    assertRegistrationTransition(reg.registrationStatus, 'REJECTED');

    await this.db.db
      .update(serviceRegistrations)
      .set({
        registrationStatus: 'REJECTED',
        reviewedByAdminId: adminId,
        reviewedAt: new Date(),
        rejectionReason: reason || null,
        updatedAt: new Date(),
      })
      .where(eq(serviceRegistrations.id, registrationId));

    await this.addReview(registrationId, adminId, 'REJECT', reason);
    return this.getById(registrationId);
  }

  async requestCorrection(registrationId: string, adminId: string, message: string) {
    const reg = await this.getById(registrationId);
    assertRegistrationTransition(reg.registrationStatus, 'NEEDS_CORRECTION');

    await this.db.db
      .update(serviceRegistrations)
      .set({
        registrationStatus: 'NEEDS_CORRECTION',
        reviewedByAdminId: adminId,
        reviewedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(serviceRegistrations.id, registrationId));

    await this.addReview(registrationId, adminId, 'REQUEST_CORRECTION', message);
    return this.getById(registrationId);
  }

  private async addReview(
    registrationId: string,
    adminId: string,
    action: string,
    comment?: string,
  ) {
    await this.db.db.insert(registrationReviews).values({
      id: generateId(),
      registrationId,
      adminId,
      reviewAction: action,
      comment: comment || null,
    });
  }

  private async createSnapshot(registrationId: string, type: string) {
    const reg = await this.getById(registrationId);
    const student = await this.db.db
      .select()
      .from(students)
      .where(eq(students.id, reg.studentId))
      .limit(1);

    await this.db.db.insert(registrationSnapshots).values({
      id: generateId(),
      registrationId,
      snapshotType: type,
      studentData: JSON.stringify(student[0] || {}),
      parentData: '{}',
      selectedAddressData: '{}',
      emergencyContactData: '{}',
    });
  }
}
