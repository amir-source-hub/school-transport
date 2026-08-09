import { Injectable, Inject } from '@nestjs/common';
import { DatabaseService } from '../../database/database.service';
import {
  contracts,
  emergencyContacts,
  familyAddresses,
  parents,
  paymentPlans,
  paymentScheduleItems,
  registrationPrices,
  schools,
  serviceRegistrations,
  studentLimitRequests,
  students,
  users,
} from '../../database/schemas';
import { eq, and, sql, desc, inArray } from 'drizzle-orm';
import { getTableColumns } from 'drizzle-orm';
import { NotFoundError, ConflictError } from '../../common/errors';
import { generateId } from '../../common/utils';
import { EditableStudentFields, parseEditableStudentFields } from './student-update';
import {
  AdminEditableStudentFields,
  parseAdminEditableStudentFields,
} from './student-admin-update';
import { InAppNotificationService } from '../../infrastructure/notifications/in-app-notification.service';
import { assertStudentCapacity, getStudentCapacity } from '../../database/student-capacity';
import { AUDIT_PORT, AuditPort } from '../../common/audit.port';
import type { AdminStudentListQueryDto } from './student-list.dto';
import type { AdminUpdateStudentDto } from './student.dto';
import { buildAdminStudentArchiveWhere, buildAdminStudentOrderBy } from './student-list.sort';

export const MAX_STUDENTS_PER_GUARDIAN = 5;
export const STUDENT_LIMIT_REQUEST_LIST_LIMIT = 500;
export const FAMILY_LIMIT_REQUEST_HISTORY_LIMIT = 100;

@Injectable()
export class StudentsService {
  constructor(
    private readonly db: DatabaseService,
    private readonly notifications: InAppNotificationService,
    @Inject(AUDIT_PORT) private readonly auditService: AuditPort,
  ) {}

  async getAllByFamily(userId: string) {
    return this.db.db
      .select({ ...getTableColumns(students), schoolName: schools.name })
      .from(students)
      .innerJoin(schools, eq(schools.id, students.schoolId))
      .where(and(eq(students.userId, userId), eq(students.isActive, true)));
  }

  async getById(studentId: string, userId?: string) {
    const conditions = [eq(students.id, studentId)];
    if (userId) conditions.push(eq(students.userId, userId));
    const result = await this.db.db
      .select({ ...getTableColumns(students), schoolName: schools.name })
      .from(students)
      .innerJoin(schools, eq(schools.id, students.schoolId))
      .where(and(...conditions))
      .limit(1);
    if (result.length === 0) throw new NotFoundError('Student', studentId);
    return result[0];
  }

  async create(
    userId: string,
    data: {
      schoolId: string;
      firstName: string;
      lastName: string;
      nationalId: string;
      birthDate?: string;
      gender?: string;
      grade: string;
      className?: string;
    },
    notifyAdminAddition = false,
  ) {
    const existing = await this.db.db
      .select({ id: students.id })
      .from(students)
      .where(eq(students.nationalId, data.nationalId))
      .limit(1);

    if (existing.length > 0) {
      throw new ConflictError(
        'DUPLICATE_NATIONAL_ID',
        'A student with this national ID already exists.',
      );
    }

    const id = generateId();
    await this.db.db.transaction(async (txn) => {
      await assertStudentCapacity(txn, userId);
      await txn.insert(students).values({
        id,
        userId,
        schoolId: data.schoolId,
        firstName: data.firstName,
        lastName: data.lastName,
        nationalId: data.nationalId,
        birthDate: data.birthDate || null,
        gender: data.gender || null,
        grade: data.grade || null,
        className: data.className || null,
      });
      if (notifyAdminAddition) {
        await this.notifications.enqueueInTransaction(txn, {
          eventId: `ADMIN_STUDENT_ADDED:${id}:${userId}`,
          userId,
          notificationType: 'ADMIN_STUDENT_ADDED',
          title: 'دانش‌آموز به حساب خانواده افزوده شد',
          message:
            'مدیریت دانش‌آموز جدیدی را به حساب خانواده افزود. برای ادامه فرایند به بخش ثبت‌نام بروید.',
          relatedEntityType: 'STUDENT',
          relatedEntityId: id,
        });
      }
    });

    return this.getById(id);
  }

  async update(studentId: string, userId: string, data: EditableStudentFields) {
    await this.getById(studentId, userId);
    const editableFields = parseEditableStudentFields(data);
    await this.db.db
      .update(students)
      .set({ ...editableFields, updatedAt: new Date() })
      .where(eq(students.id, studentId));
    return this.getById(studentId);
  }

  async archive(studentId: string, userId: string) {
    await this.getById(studentId, userId);
    await this.db.db
      .update(students)
      .set({ isActive: false, updatedAt: new Date() })
      .where(eq(students.id, studentId));
  }

  async getAllForAdmin() {
    const rows = await this.db.db
      .select({
        ...getTableColumns(students),
        schoolName: schools.name,
        username: users.username,
      })
      .from(students)
      .innerJoin(schools, eq(schools.id, students.schoolId))
      .innerJoin(users, eq(users.id, students.userId));

    const parentRows = await this.db.db.select().from(parents);

    return rows.map((student) => {
      const familyParent =
        parentRows.find((parent) => parent.userId === student.userId && parent.isPrimaryContact) ??
        parentRows.find((parent) => parent.userId === student.userId);
      return {
        ...student,
        familyName: familyParent
          ? `${familyParent.firstName} ${familyParent.lastName}`
          : student.username,
      };
    });
  }

  async getStudentsForAdminPage(query: AdminStudentListQueryDto) {
    const { archive, sort, direction, page, pageSize } = query;
    const archiveFilter = buildAdminStudentArchiveWhere(archive) ?? sql`1 = 1`;
    const [countRow] = await this.db.db
      .select({ total: sql<number>`count(*)::int` })
      .from(students)
      .where(archiveFilter);

    const rows = await this.db.db
      .select({
        ...getTableColumns(students),
        schoolName: schools.name,
        username: users.username,
      })
      .from(students)
      .innerJoin(schools, eq(schools.id, students.schoolId))
      .innerJoin(users, eq(users.id, students.userId))
      .where(archiveFilter)
      .orderBy(...buildAdminStudentOrderBy(sort, direction))
      .offset((page - 1) * pageSize)
      .limit(pageSize);

    const parentRows = await this.db.db.select().from(parents);
    const items = rows.map((student) => {
      const familyParent =
        parentRows.find((parent) => parent.userId === student.userId && parent.isPrimaryContact) ??
        parentRows.find((parent) => parent.userId === student.userId);
      return {
        ...student,
        familyName: familyParent
          ? `${familyParent.firstName} ${familyParent.lastName}`
          : student.username,
      };
    });
    return { items, total: countRow?.total ?? 0 };
  }

  async getForAdmin(studentId: string) {
    const student = await this.getById(studentId);
    const [schoolRow] = await this.db.db
      .select({ schoolType: schools.schoolType })
      .from(schools)
      .where(eq(schools.id, student.schoolId))
      .limit(1);

    const [parentRows, addressRows, emergencyRows, registrationRows] = await Promise.all([
      this.db.db.select().from(parents).where(eq(parents.userId, student.userId)),
      this.db.db.select().from(familyAddresses).where(eq(familyAddresses.userId, student.userId)),
      this.db.db
        .select()
        .from(emergencyContacts)
        .where(eq(emergencyContacts.userId, student.userId)),
      this.db.db
        .select()
        .from(serviceRegistrations)
        .where(eq(serviceRegistrations.studentId, studentId))
        .orderBy(desc(serviceRegistrations.createdAt)),
    ]);

    const latestRegistration = registrationRows[0] ?? null;
    let enrollmentSummary: unknown = null;
    if (latestRegistration) {
      const [contractRow, priceRow] = await Promise.all([
        this.db.db
          .select()
          .from(contracts)
          .where(eq(contracts.registrationId, latestRegistration.id))
          .orderBy(desc(contracts.versionNumber))
          .limit(1),
        this.db.db
          .select()
          .from(registrationPrices)
          .where(eq(registrationPrices.registrationId, latestRegistration.id))
          .orderBy(desc(registrationPrices.versionNumber))
          .limit(1),
      ]);
      const contract = contractRow[0] ?? null;
      const price = priceRow[0] ?? null;
      let plan = null;
      if (price) {
        const [planRow] = await this.db.db
          .select()
          .from(paymentPlans)
          .where(eq(paymentPlans.registrationPriceId, price.id))
          .limit(1);
        plan = planRow ?? null;
      }
      let scheduleItems: (typeof paymentScheduleItems.$inferSelect)[] = [];
      if (plan) {
        scheduleItems = await this.db.db
          .select()
          .from(paymentScheduleItems)
          .where(eq(paymentScheduleItems.paymentPlanId, plan.id));
      }
      enrollmentSummary = {
        registrationId: latestRegistration.id,
        registrationStatus: latestRegistration.registrationStatus,
        academicYear: latestRegistration.academicYear,
        serviceType: latestRegistration.serviceType,
        requestedStartDate: latestRegistration.requestedStartDate,
        submittedAt: latestRegistration.submittedAt,
        reviewedAt: latestRegistration.reviewedAt,
        createdAt: latestRegistration.createdAt,
        contract: contract
          ? {
              id: contract.id,
              contractNumber: contract.contractNumber,
              contractStatus: contract.contractStatus,
              versionNumber: contract.versionNumber,
              generatedAt: contract.generatedAt,
              acceptedAt: contract.acceptedAt,
            }
          : null,
        price: price
          ? {
              id: price.id,
              totalAmount: price.totalAmount,
              prepaymentAmount: price.prepaymentAmount,
              installmentCount: price.installmentCount,
              priceStatus: price.priceStatus,
            }
          : null,
        plan: plan
          ? {
              id: plan.id,
              planType: plan.planType,
              totalAmount: plan.totalAmount,
              prepaymentAmount: plan.prepaymentAmount,
              remainingInstallmentAmount: plan.remainingInstallmentAmount,
              installmentCount: plan.installmentCount,
              planStatus: plan.planStatus,
              paidInstallmentCount: scheduleItems.filter(
                (item) => item.itemType === 'INSTALLMENT' && item.itemStatus === 'PAID',
              ).length,
              scheduleItems: scheduleItems.map((item) => ({
                itemType: item.itemType,
                sequenceNumber: item.sequenceNumber,
                amount: item.amount,
                dueDate: item.dueDate,
                itemStatus: item.itemStatus,
                paidAt: item.paidAt,
              })),
            }
          : null,
      };
    }

    return {
      ...student,
      schoolType: schoolRow?.schoolType ?? null,
      parents: parentRows.map((parent) => ({
        id: parent.id,
        parentType: parent.parentType,
        firstName: parent.firstName,
        lastName: parent.lastName,
        nationalId: parent.nationalId,
        phoneNumber: parent.phoneNumber,
        isPrimaryContact: parent.isPrimaryContact,
      })),
      addresses: addressRows.map((address) => ({
        id: address.id,
        title: address.title,
        province: address.province,
        city: address.city,
        district: address.district,
        streetAddress: address.streetAddress,
        postalCode: address.postalCode,
        latitude: address.latitude,
        longitude: address.longitude,
        isActive: address.isActive,
      })),
      emergencyContacts: emergencyRows.map((contact) => ({
        id: contact.id,
        firstName: contact.firstName,
        lastName: contact.lastName,
        relationship: contact.relationship,
        phoneNumber: contact.phoneNumber,
        isActive: contact.isActive,
      })),
      enrollmentSummary,
    };
  }

  async getCapacity(userId: string) {
    return getStudentCapacity(this.db.db, userId);
  }

  async getLimitRequests(userId: string) {
    return this.db.db
      .select()
      .from(studentLimitRequests)
      .where(eq(studentLimitRequests.userId, userId))
      .orderBy(desc(studentLimitRequests.createdAt), desc(studentLimitRequests.id))
      .limit(FAMILY_LIMIT_REQUEST_HISTORY_LIMIT);
  }

  async createLimitRequest(userId: string, reason: string) {
    return this.db.db.transaction(async (txn) => {
      const [account] = await txn
        .select({ studentLimit: users.studentLimit })
        .from(users)
        .where(eq(users.id, userId))
        .for('update');
      if (!account) {
        throw new ConflictError('ACCOUNT_PHONE_REQUIRED', 'Account not found.');
      }
      const [pending] = await txn
        .select({ id: studentLimitRequests.id })
        .from(studentLimitRequests)
        .where(
          and(eq(studentLimitRequests.userId, userId), eq(studentLimitRequests.status, 'PENDING')),
        )
        .limit(1);
      if (pending) {
        throw new ConflictError(
          'LIMIT_REQUEST_ALREADY_PENDING',
          'A limit increase request is already pending for this account.',
        );
      }
      const currentLimit = account.studentLimit;
      if (currentLimit >= MAX_STUDENTS_PER_GUARDIAN) {
        throw new ConflictError(
          'STUDENT_LIMIT_MAX_REACHED',
          `Student capacity cannot exceed ${MAX_STUDENTS_PER_GUARDIAN}.`,
        );
      }
      const id = generateId();
      await txn.insert(studentLimitRequests).values({
        id,
        userId,
        currentLimit,
        requestedLimit: currentLimit + 1,
        reason,
        status: 'PENDING',
      });
      await this.notifications.enqueueInTransaction(txn, {
        eventId: `LIMIT_REQUEST_CREATED:${id}:${userId}`,
        userId,
        notificationType: 'LIMIT_REQUEST_CREATED',
        title: 'درخواست افزایش ظرفیت ثبت شد',
        message:
          'درخواست افزایش ظرفیت دانش‌آموز برای بررسی مدیریت ارسال شد. نتیجه به اطلاع شما می‌رسد.',
        relatedEntityType: 'LIMIT_REQUEST',
        relatedEntityId: id,
      });
      const [created] = await txn
        .select()
        .from(studentLimitRequests)
        .where(eq(studentLimitRequests.id, id))
        .limit(1);
      return created;
    });
  }

  async getAllLimitRequestsForAdmin() {
    const rows = await this.db.db
      .select({
        ...getTableColumns(studentLimitRequests),
        username: users.username,
      })
      .from(studentLimitRequests)
      .innerJoin(users, eq(users.id, studentLimitRequests.userId))
      .orderBy(desc(studentLimitRequests.createdAt), desc(studentLimitRequests.id))
      .limit(STUDENT_LIMIT_REQUEST_LIST_LIMIT);

    if (rows.length === 0) return [];
    const parentRows = await this.db.db
      .select()
      .from(parents)
      .where(inArray(parents.userId, [...new Set(rows.map((request) => request.userId))]));
    return rows.map((request) => {
      const familyParent =
        parentRows.find((parent) => parent.userId === request.userId && parent.isPrimaryContact) ??
        parentRows.find((parent) => parent.userId === request.userId);
      return {
        ...request,
        familyName: familyParent
          ? `${familyParent.firstName} ${familyParent.lastName}`
          : request.username,
      };
    });
  }

  async approveLimitRequest(requestId: string, adminId: string, ipAddress?: string) {
    return this.db.db.transaction(async (txn) => {
      const [request] = await txn
        .select()
        .from(studentLimitRequests)
        .where(eq(studentLimitRequests.id, requestId))
        .for('update');
      if (!request) throw new NotFoundError('Limit request', requestId);
      if (request.status !== 'PENDING') {
        throw new ConflictError(
          'LIMIT_REQUEST_NOT_PENDING',
          'This limit request is no longer pending.',
        );
      }
      if (request.requestedLimit > MAX_STUDENTS_PER_GUARDIAN) {
        throw new ConflictError(
          'STUDENT_LIMIT_MAX_REACHED',
          `Student capacity cannot exceed ${MAX_STUDENTS_PER_GUARDIAN}.`,
        );
      }
      await txn
        .update(users)
        .set({ studentLimit: request.requestedLimit, updatedAt: new Date() })
        .where(eq(users.id, request.userId));
      await txn
        .update(studentLimitRequests)
        .set({
          status: 'APPROVED',
          reviewedByAdminId: adminId,
          reviewedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(studentLimitRequests.id, requestId));
      await this.auditService.recordInTransaction(txn, {
        actorType: 'ADMIN',
        actorId: adminId,
        action: 'LIMIT_REQUEST_APPROVED',
        entityType: 'LIMIT_REQUEST',
        entityId: requestId,
        previousValues: { status: 'PENDING', requestedLimit: request.requestedLimit },
        newValues: { status: 'APPROVED', studentLimit: request.requestedLimit },
        ipAddress,
      });
      await this.notifications.enqueueInTransaction(txn, {
        eventId: `LIMIT_REQUEST_APPROVED:${requestId}:${request.userId}`,
        userId: request.userId,
        notificationType: 'LIMIT_REQUEST_APPROVED',
        title: 'درخواست افزایش ظرفیت تأیید شد',
        message: `ظرفیت دانش‌آموز حساب شما به ${request.requestedLimit} افزایش یافت.`,
        relatedEntityType: 'LIMIT_REQUEST',
        relatedEntityId: requestId,
      });
      const [updated] = await txn
        .select()
        .from(studentLimitRequests)
        .where(eq(studentLimitRequests.id, requestId))
        .limit(1);
      return updated;
    });
  }

  async rejectLimitRequest(
    requestId: string,
    adminId: string,
    reason?: string,
    ipAddress?: string,
  ) {
    return this.db.db.transaction(async (txn) => {
      const [request] = await txn
        .select()
        .from(studentLimitRequests)
        .where(eq(studentLimitRequests.id, requestId))
        .for('update');
      if (!request) throw new NotFoundError('Limit request', requestId);
      if (request.status !== 'PENDING') {
        throw new ConflictError(
          'LIMIT_REQUEST_NOT_PENDING',
          'This limit request is no longer pending.',
        );
      }
      await txn
        .update(studentLimitRequests)
        .set({
          status: 'REJECTED',
          reviewedByAdminId: adminId,
          reviewedAt: new Date(),
          rejectionReason: reason || null,
          updatedAt: new Date(),
        })
        .where(eq(studentLimitRequests.id, requestId));
      await this.auditService.recordInTransaction(txn, {
        actorType: 'ADMIN',
        actorId: adminId,
        action: 'LIMIT_REQUEST_REJECTED',
        entityType: 'LIMIT_REQUEST',
        entityId: requestId,
        previousValues: { status: 'PENDING' },
        newValues: { status: 'REJECTED', rejectionReason: reason || null },
        ipAddress,
      });
      await this.notifications.enqueueInTransaction(txn, {
        eventId: `LIMIT_REQUEST_REJECTED:${requestId}:${request.userId}`,
        userId: request.userId,
        notificationType: 'LIMIT_REQUEST_REJECTED',
        title: 'درخواست افزایش ظرفیت رد شد',
        message: reason || 'درخواست افزایش ظرفیت دانش‌آموز رد شد.',
        relatedEntityType: 'LIMIT_REQUEST',
        relatedEntityId: requestId,
      });
      const [updated] = await txn
        .select()
        .from(studentLimitRequests)
        .where(eq(studentLimitRequests.id, requestId))
        .limit(1);
      return updated;
    });
  }

  async updateByAdmin(
    studentId: string,
    data: AdminUpdateStudentDto,
    context: { adminId: string; ipAddress?: string } = { adminId: '' },
  ) {
    const current = await this.getById(studentId);

    const expectedUpdatedAt = data.expectedUpdatedAt ? new Date(data.expectedUpdatedAt) : null;
    if (expectedUpdatedAt && current.updatedAt.toISOString() !== expectedUpdatedAt.toISOString()) {
      throw new ConflictError(
        'STUDENT_CONCURRENT_MODIFIED',
        'This student was modified by another admin. Refresh the page and try again.',
      );
    }

    const payload: Record<string, string | undefined> = { ...data };
    delete payload.expectedUpdatedAt;
    if (payload.educationLevel !== undefined) {
      payload.className = payload.educationLevel;
    }
    delete payload.educationLevel;

    const editable = parseAdminEditableStudentFields(payload);

    if (editable.nationalId !== undefined && editable.nationalId !== current.nationalId) {
      const duplicate = await this.db.db
        .select({ id: students.id })
        .from(students)
        .where(eq(students.nationalId, editable.nationalId))
        .limit(1);
      if (duplicate[0]) {
        throw new ConflictError(
          'DUPLICATE_NATIONAL_ID',
          'A student with this national ID already exists.',
        );
      }
    }

    if (
      editable.schoolId !== undefined ||
      editable.className !== undefined ||
      editable.grade !== undefined
    ) {
      await this.assertValidSchoolProgram(editable, current);
    }

    const changedKeys = Object.keys(editable) as (keyof AdminEditableStudentFields)[];
    const previousValues = Object.fromEntries(
      changedKeys.map((key) => [key, current[key] ?? null]),
    );
    const newValues: Record<string, unknown> = { ...editable };

    await this.db.db.transaction(async (txn) => {
      const conditions = [eq(students.id, studentId)];
      if (expectedUpdatedAt) conditions.push(eq(students.updatedAt, expectedUpdatedAt));
      const updated = await txn
        .update(students)
        .set({ ...editable, updatedAt: new Date() })
        .where(and(...conditions))
        .returning({ id: students.id });
      if (updated.length === 0) {
        throw new ConflictError(
          'STUDENT_CONCURRENT_MODIFIED',
          'This student was modified by another admin. Refresh the page and try again.',
        );
      }
      await this.auditService.recordInTransaction(txn, {
        actorType: 'ADMIN',
        actorId: context.adminId,
        action: 'STUDENT_UPDATED_BY_ADMIN',
        entityType: 'STUDENT',
        entityId: studentId,
        previousValues,
        newValues,
        ipAddress: context.ipAddress,
      });
    });

    return this.getById(studentId);
  }

  private async assertValidSchoolProgram(
    editable: AdminEditableStudentFields,
    current: Awaited<ReturnType<StudentsService['getById']>>,
  ) {
    const targetSchoolId = editable.schoolId ?? current.schoolId;
    const [school] = await this.db.db
      .select({
        id: schools.id,
        isActive: schools.isActive,
        educationOptions: schools.educationOptions,
      })
      .from(schools)
      .where(eq(schools.id, targetSchoolId))
      .limit(1);
    if (!school || !school.isActive) {
      throw new ConflictError('INVALID_SCHOOL', 'The selected school is not active.');
    }
    const level = editable.className ?? current.className;
    const grade = editable.grade ?? current.grade;
    if (level || grade) {
      const selectedLevel = school.educationOptions.find(
        ({ level: candidate }) => candidate === level,
      );
      if (!selectedLevel || !selectedLevel.grades.includes(grade ?? '')) {
        throw new ConflictError(
          'INVALID_SCHOOL_PROGRAM',
          'The selected education level or grade is not offered by this school.',
        );
      }
    }
  }

  async createByAdmin(userId: string, data: Parameters<StudentsService['create']>[1]) {
    return this.create(userId, data, true);
  }

  async setActiveByAdmin(
    studentId: string,
    isActive: boolean,
    context: { adminId: string; ipAddress?: string; reason?: string } = { adminId: '' },
  ) {
    const student = await this.getById(studentId);
    await this.db.db.transaction(async (txn) => {
      await txn
        .update(students)
        .set({ isActive, updatedAt: new Date() })
        .where(eq(students.id, studentId));
      await this.auditService.recordInTransaction(txn, {
        actorType: 'ADMIN',
        actorId: context.adminId,
        action: isActive ? 'STUDENT_ACTIVATED' : 'STUDENT_ARCHIVED',
        entityType: 'STUDENT',
        entityId: studentId,
        previousValues: {
          isActive: student.isActive,
          archiveReason: context.reason ?? null,
        },
        newValues: { isActive },
        ipAddress: context.ipAddress,
      });
    });
    return this.getById(studentId);
  }
}
