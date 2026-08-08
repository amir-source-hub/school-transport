import { Injectable, Inject } from '@nestjs/common';
import { DatabaseService } from '../../database/database.service';
import {
  parents,
  schools,
  studentLimitRequests,
  students,
  users,
} from '../../database/schemas';
import { eq, and } from 'drizzle-orm';
import { getTableColumns } from 'drizzle-orm';
import { NotFoundError, ConflictError } from '../../common/errors';
import { generateId } from '../../common/utils';
import { EditableStudentFields, parseEditableStudentFields } from './student-update';
import { InAppNotificationService } from '../../infrastructure/notifications/in-app-notification.service';
import { assertStudentCapacity, getStudentCapacity } from '../../database/student-capacity';
import { AUDIT_PORT, AuditPort } from '../../common/audit.port';

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

  async getCapacity(userId: string) {
    return getStudentCapacity(this.db.db, userId);
  }

  async getLimitRequests(userId: string) {
    return this.db.db
      .select()
      .from(studentLimitRequests)
      .where(eq(studentLimitRequests.userId, userId))
      .orderBy(studentLimitRequests.createdAt);
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
          and(
            eq(studentLimitRequests.userId, userId),
            eq(studentLimitRequests.status, 'PENDING'),
          ),
        )
        .limit(1);
      if (pending) {
        throw new ConflictError(
          'LIMIT_REQUEST_ALREADY_PENDING',
          'A limit increase request is already pending for this account.',
        );
      }
      const currentLimit = account.studentLimit;
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
      .orderBy(studentLimitRequests.createdAt);

    const parentRows = await this.db.db.select().from(parents);
    return rows.map((request) => {
      const familyParent =
        parentRows.find(
          (parent) => parent.userId === request.userId && parent.isPrimaryContact,
        ) ?? parentRows.find((parent) => parent.userId === request.userId);
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

  async updateByAdmin(studentId: string, data: EditableStudentFields) {
    const student = await this.getById(studentId);
    return this.update(studentId, student.userId, data);
  }

  async createByAdmin(userId: string, data: Parameters<StudentsService['create']>[1]) {
    return this.create(userId, data, true);
  }

  async setActiveByAdmin(studentId: string, isActive: boolean) {
    await this.getById(studentId);
    await this.db.db
      .update(students)
      .set({ isActive, updatedAt: new Date() })
      .where(eq(students.id, studentId));
    return this.getById(studentId);
  }
}
