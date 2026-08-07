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
  users,
} from '../../database/schemas';
import { students } from '../../database/schemas';
import { familyAddresses, parents, schools } from '../../database/schemas';
import { getTableColumns, sql } from 'drizzle-orm';
import { eq, and, inArray, notInArray } from 'drizzle-orm';
import { ConflictError, NotFoundError } from '../../common/errors';
import { withParentNationalIdConflict } from '../../common/parent-national-id-conflict';
import { generateContractNumber, generateId } from '../../common/utils';
import { assertRegistrationTransition } from './registration-lifecycle';
import { InAppNotificationService } from '../../infrastructure/notifications/in-app-notification.service';
import {
  guidedContractText,
  normalizeAndValidateGuidedEnrollment,
  type GuidedEnrollmentData,
} from './guided-enrollment';
import { AUDIT_PORT, AuditPort } from '../../common/audit.port';
import { Inject } from '@nestjs/common';
import type { DatabaseTransaction } from '../../database/payment-plan';

type AdminEnrollmentAudit = { adminId: string; ipAddress?: string };

@Injectable()
export class RegistrationsService {
  constructor(
    private readonly db: DatabaseService,
    private readonly notifications: InAppNotificationService,
    @Inject(AUDIT_PORT) private readonly auditService: AuditPort,
  ) {}

  async createGuidedEnrollment(
    userId: string,
    input: GuidedEnrollmentData,
    adminAudit?: AdminEnrollmentAudit,
  ) {
    const data = normalizeAndValidateGuidedEnrollment(input);
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
    if (data.student.id) {
      const [existingStudent] = await this.db.db
        .select({ id: students.id, nationalId: students.nationalId })
        .from(students)
        .where(and(eq(students.id, data.student.id), eq(students.userId, userId)))
        .limit(1);
      if (!existingStudent) throw new NotFoundError('Student', data.student.id);
      if (existingStudent.nationalId !== data.student.nationalId) {
        throw new ConflictError(
          'STUDENT_PROFILE_CHANGED',
          'Saved student identity must be changed from the student profile.',
        );
      }
      const [existingEnrollment] = await this.db.db
        .select({ id: serviceRegistrations.id })
        .from(serviceRegistrations)
        .where(
          and(
            eq(serviceRegistrations.studentId, existingStudent.id),
            notInArray(serviceRegistrations.registrationStatus, ['REJECTED', 'CANCELLED']),
          ),
        )
        .limit(1);
      if (existingEnrollment) {
        throw new ConflictError(
          'DUPLICATE_ACTIVE_ENROLLMENT',
          'This student already has an active enrollment.',
        );
      }
    } else {
      const duplicate = await this.db.db
        .select({ id: students.id })
        .from(students)
        .where(eq(students.nationalId, data.student.nationalId))
        .limit(1);
      if (duplicate[0]) {
        throw new ConflictError('DUPLICATE_NATIONAL_ID', 'This student is already registered.');
      }
    }

    const result = await withParentNationalIdConflict(() =>
      this.db.db.transaction(async (txn) => {
        // Serialize guided enrollment creation per family so concurrent admin/parent submissions
        // cannot both pass the duplicate checks and create parallel active workflows.
        await txn.execute(sql`select pg_advisory_xact_lock(hashtext(${userId}))`);
        if (data.student.id) {
          const [duplicateActive] = await txn
            .select({ id: serviceRegistrations.id })
            .from(serviceRegistrations)
            .where(
              and(
                eq(serviceRegistrations.studentId, data.student.id),
                notInArray(serviceRegistrations.registrationStatus, ['REJECTED', 'CANCELLED']),
              ),
            )
            .limit(1);
          if (duplicateActive) {
            throw new ConflictError(
              'DUPLICATE_ACTIVE_ENROLLMENT',
              'This student already has an active enrollment.',
            );
          }
        } else {
          const [duplicateStudent] = await txn
            .select({ id: students.id })
            .from(students)
            .where(eq(students.nationalId, data.student.nationalId))
            .limit(1);
          if (duplicateStudent) {
            throw new ConflictError('DUPLICATE_NATIONAL_ID', 'This student is already registered.');
          }
        }
        const [account] = await txn
          .select({ phoneNumber: users.phoneNumber })
          .from(users)
          .where(eq(users.id, userId))
          .limit(1);
        const guardianPhone = account?.phoneNumber;
        if (!guardianPhone) {
          throw new ConflictError(
            'ACCOUNT_PHONE_REQUIRED',
            'A verified phone number is required for the guardian.',
          );
        }
        const existingFamilyParents = await txn
          .select({
            id: parents.id,
            parentType: parents.parentType,
            firstName: parents.firstName,
            lastName: parents.lastName,
            nationalId: parents.nationalId,
            phoneNumber: parents.phoneNumber,
            relationshipType: parents.relationshipType,
            isPrimaryContact: parents.isPrimaryContact,
          })
          .from(parents)
          .where(eq(parents.userId, userId));
        const parentSections: Array<{
          parentType: 'GUARDIAN' | 'FATHER' | 'MOTHER';
          section: {
            firstName: string;
            lastName: string;
            nationalId: string;
            phoneNumber: string;
            relationshipType?: string;
            relationshipDescription?: string | null;
          } | null;
        }> = [
          {
            parentType: 'GUARDIAN',
            section: {
              firstName: data.guardian.firstName,
              lastName: data.guardian.lastName,
              nationalId: data.guardian.nationalId,
              phoneNumber: guardianPhone,
              relationshipType: data.guardian.relationshipType,
              relationshipDescription:
                data.guardian.relationshipType === 'OTHER'
                  ? (data.guardian.relationshipDescription ?? null)
                  : null,
            },
          },
          { parentType: 'FATHER', section: data.father ?? null },
          { parentType: 'MOTHER', section: data.mother ?? null },
        ];
        for (const { parentType, section } of parentSections) {
          if (!section) continue;
          const existing = existingFamilyParents.find((item) => item.parentType === parentType);
          if (existing) {
            const unchanged =
              existing.firstName === section.firstName &&
              existing.lastName === section.lastName &&
              existing.nationalId === section.nationalId &&
              existing.phoneNumber === section.phoneNumber &&
              (!existing.relationshipType || existing.relationshipType === section.relationshipType);
            if (!unchanged) {
              throw new ConflictError(
                'PARENT_PROFILE_CHANGED',
                'Saved parent information must be changed from the family profile.',
              );
            }
          } else {
            await txn.insert(parents).values({
              id: generateId(),
              userId,
              parentType,
              firstName: section.firstName,
              lastName: section.lastName,
              nationalId: section.nationalId,
              phoneNumber: section.phoneNumber,
              relationshipType: section.relationshipType,
              relationshipDescription: section.relationshipDescription,
              isPrimaryContact: false,
            });
          }
        }
        await txn
          .update(parents)
          .set({ isPrimaryContact: false, updatedAt: new Date() })
          .where(eq(parents.userId, userId));
        await txn
          .update(parents)
          .set({ isPrimaryContact: true, phoneVerifiedAt: new Date(), updatedAt: new Date() })
          .where(and(eq(parents.userId, userId), eq(parents.parentType, 'GUARDIAN')));
        if (data.emergencyContact) {
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
        }

        const addressId = generateId();
        await txn.insert(familyAddresses).values({ id: addressId, userId, ...data.address });
        const studentId = data.student.id ?? generateId();
        if (data.student.id) {
          await txn
            .update(students)
            .set({
              schoolId: data.school.schoolId,
              birthDate: data.student.birthDate || null,
              gender: data.student.gender || null,
              grade: data.school.grade,
              className: data.school.educationLevel,
              updatedAt: new Date(),
            })
            .where(and(eq(students.id, studentId), eq(students.userId, userId)));
        } else {
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
        }
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
          planType:
            data.service.paymentPlanType === 'FULL' ? 'FULL' : 'PREPAYMENT_PLUS_FOUR_INSTALLMENTS',
          totalAmount: prepaymentAmount,
          prepaymentAmount,
          remainingInstallmentAmount: 0,
          installmentCount: data.service.paymentPlanType === 'FULL' ? 1 : 4,
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
          guardian: { ...data.guardian, phoneNumber: guardianPhone },
          father: data.father ?? null,
          mother: data.mother ?? null,
          emergencyContact: data.emergencyContact ?? null,
          address: data.address,
          school: data.school,
          service: data.service,
          prepaymentAmount,
          contractText: guidedContractText(data.student.firstName, data.student.lastName),
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
        if (adminAudit) {
          await this.auditService.recordInTransaction(txn, {
            actorType: 'ADMIN',
            actorId: adminAudit.adminId,
            action: 'ADMIN_FAMILY_ENROLLMENT_CREATED',
            entityType: 'REGISTRATION',
            entityId: registrationId,
            newValues: { familyId: userId, studentId, status: 'CONTRACT_READY' },
            ipAddress: adminAudit.ipAddress,
          });
        }
        await this.notifications.enqueueInTransaction(txn, {
          eventId: `ENROLLMENT_CREATED:${registrationId}:${userId}`,
          userId,
          notificationType: 'ENROLLMENT_CREATED',
          title: 'ثبت‌نام دانش‌آموز انجام شد',
          message: `ثبت‌نام دانش‌آموز ${data.student.firstName} ${data.student.lastName} انجام شد و قرارداد آماده بررسی است.`,
          relatedEntityType: 'REGISTRATION',
          relatedEntityId: registrationId,
        });
        return {
          registrationId,
          studentId,
          contractId,
          scheduleItemId,
          prepaymentAmount,
          contractText: guidedContractText(data.student.firstName, data.student.lastName),
        };
      }),
    );
    return result;
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
    const paymentRows = await this.db.db
      .select({
        registrationId: registrationPrices.registrationId,
        itemType: paymentScheduleItems.itemType,
        itemStatus: paymentScheduleItems.itemStatus,
      })
      .from(registrationPrices)
      .innerJoin(paymentPlans, eq(paymentPlans.registrationPriceId, registrationPrices.id))
      .innerJoin(paymentScheduleItems, eq(paymentScheduleItems.paymentPlanId, paymentPlans.id))
      .where(eq(registrationPrices.priceStatus, 'ACCEPTED'));

    return rows.map((registration) => {
      const parent =
        parentRows.find(
          (entry) => entry.userId === registration.familyId && entry.isPrimaryContact,
        ) ?? parentRows.find((entry) => entry.userId === registration.familyId);
      const schedule = paymentRows.filter((payment) => payment.registrationId === registration.id);
      const installments = schedule.filter((payment) => payment.itemType === 'INSTALLMENT');
      const paidInstallments = installments.filter(
        (payment) => payment.itemStatus === 'PAID',
      ).length;
      const prepaymentPaid = schedule.some(
        (payment) => payment.itemType === 'PREPAYMENT' && payment.itemStatus === 'PAID',
      );
      const allPaymentsPaid =
        installments.length > 0 && schedule.every((payment) => payment.itemStatus === 'PAID');
      const derivedStatus = allPaymentsPaid
        ? 'PAYMENT_COMPLETED'
        : prepaymentPaid && paidInstallments > 0
          ? 'INSTALLMENTS_IN_PROGRESS'
          : registration.registrationStatus;
      return {
        ...registration,
        registrationStatus: derivedStatus,
        studentName: `${registration.studentFirstName} ${registration.studentLastName}`,
        familyName: parent ? `${parent.firstName} ${parent.lastName}` : '—',
        paidInstallmentCount: paidInstallments,
        installmentCount: installments.length,
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
    await this.db.db.transaction(async (txn) => {
      const [updated] = await txn
        .update(serviceRegistrations)
        .set({ registrationStatus: 'SUBMITTED', submittedAt: new Date(), updatedAt: new Date() })
        .where(
          and(
            eq(serviceRegistrations.id, registrationId),
            eq(serviceRegistrations.registrationStatus, reg.registrationStatus),
          ),
        )
        .returning({ id: serviceRegistrations.id });
      if (!updated) throw this.transitionConflict();
      await this.createSnapshotInTransaction(txn, reg, 'SUBMISSION');
    });
    return this.getById(registrationId);
  }

  async cancel(registrationId: string, userId: string) {
    const reg = await this.getById(registrationId, userId);
    assertRegistrationTransition(reg.registrationStatus, 'CANCELLED');

    const [updated] = await this.db.db
      .update(serviceRegistrations)
      .set({ registrationStatus: 'CANCELLED', updatedAt: new Date() })
      .where(
        and(
          eq(serviceRegistrations.id, registrationId),
          eq(serviceRegistrations.registrationStatus, reg.registrationStatus),
        ),
      )
      .returning({ id: serviceRegistrations.id });
    if (!updated) throw this.transitionConflict();

    return this.getById(registrationId);
  }

  async startReview(registrationId: string, adminId: string) {
    const reg = await this.getById(registrationId);
    assertRegistrationTransition(reg.registrationStatus, 'UNDER_REVIEW');

    await this.db.db.transaction(async (txn) => {
      const [updated] = await txn
        .update(serviceRegistrations)
        .set({
          registrationStatus: 'UNDER_REVIEW',
          reviewedByAdminId: adminId,
          reviewedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(serviceRegistrations.id, registrationId),
            eq(serviceRegistrations.registrationStatus, reg.registrationStatus),
          ),
        )
        .returning({ id: serviceRegistrations.id });
      if (!updated) throw this.transitionConflict();
      await this.addReviewInTransaction(txn, registrationId, adminId, 'START_REVIEW');
      await this.enqueueOwnerInTransaction(
        txn,
        registrationId,
        'ENROLLMENT_UNDER_REVIEW',
        'بررسی ثبت‌نام آغاز شد',
        'مدیریت بررسی درخواست سرویس دانش‌آموز را آغاز کرد.',
      );
    });
    return this.getById(registrationId);
  }

  async approve(registrationId: string, adminId: string) {
    const reg = await this.getById(registrationId);
    assertRegistrationTransition(reg.registrationStatus, 'APPROVED');

    await this.db.db.transaction(async (txn) => {
      const [updated] = await txn
        .update(serviceRegistrations)
        .set({
          registrationStatus: 'APPROVED',
          reviewedByAdminId: adminId,
          reviewedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(serviceRegistrations.id, registrationId),
            eq(serviceRegistrations.registrationStatus, reg.registrationStatus),
          ),
        )
        .returning({ id: serviceRegistrations.id });
      if (!updated) throw this.transitionConflict();
      await this.addReviewInTransaction(txn, registrationId, adminId, 'APPROVE');
      await this.enqueueOwnerInTransaction(
        txn,
        registrationId,
        'ENROLLMENT_APPROVED',
        'ثبت‌نام تأیید شد',
        'درخواست سرویس توسط مدیریت تأیید شد و وارد مرحله قیمت‌گذاری شده است.',
      );
    });
    return this.getById(registrationId);
  }

  async reject(registrationId: string, adminId: string, reason?: string) {
    const reg = await this.getById(registrationId);
    assertRegistrationTransition(reg.registrationStatus, 'REJECTED');

    await this.db.db.transaction(async (txn) => {
      const [updated] = await txn
        .update(serviceRegistrations)
        .set({
          registrationStatus: 'REJECTED',
          reviewedByAdminId: adminId,
          reviewedAt: new Date(),
          rejectionReason: reason || null,
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(serviceRegistrations.id, registrationId),
            eq(serviceRegistrations.registrationStatus, reg.registrationStatus),
          ),
        )
        .returning({ id: serviceRegistrations.id });
      if (!updated) throw this.transitionConflict();
      await this.addReviewInTransaction(txn, registrationId, adminId, 'REJECT', reason);
      await this.enqueueOwnerInTransaction(
        txn,
        registrationId,
        'ENROLLMENT_REJECTED',
        'ثبت‌نام رد شد',
        reason || 'درخواست سرویس توسط مدیریت رد شد.',
      );
    });
    return this.getById(registrationId);
  }

  async requestCorrection(registrationId: string, adminId: string, message: string) {
    const reg = await this.getById(registrationId);
    assertRegistrationTransition(reg.registrationStatus, 'NEEDS_CORRECTION');

    await this.db.db.transaction(async (txn) => {
      const [updated] = await txn
        .update(serviceRegistrations)
        .set({
          registrationStatus: 'NEEDS_CORRECTION',
          reviewedByAdminId: adminId,
          reviewedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(serviceRegistrations.id, registrationId),
            eq(serviceRegistrations.registrationStatus, reg.registrationStatus),
          ),
        )
        .returning({ id: serviceRegistrations.id });
      if (!updated) throw this.transitionConflict();
      await this.addReviewInTransaction(
        txn,
        registrationId,
        adminId,
        'REQUEST_CORRECTION',
        message,
      );
      await this.enqueueOwnerInTransaction(
        txn,
        registrationId,
        'ENROLLMENT_NEEDS_CORRECTION',
        'اصلاح اطلاعات لازم است',
        message,
      );
    });
    return this.getById(registrationId);
  }

  private async addReviewInTransaction(
    txn: DatabaseTransaction,
    registrationId: string,
    adminId: string,
    action: string,
    comment?: string,
  ) {
    await txn.insert(registrationReviews).values({
      id: generateId(),
      registrationId,
      adminId,
      reviewAction: action,
      comment: comment || null,
    });
  }

  private transitionConflict() {
    return new ConflictError(
      'REGISTRATION_STATE_CHANGED',
      'Registration state changed while this action was being processed.',
    );
  }

  private async enqueueOwnerInTransaction(
    txn: DatabaseTransaction,
    registrationId: string,
    notificationType: string,
    title: string,
    message: string,
  ) {
    const [owner] = await txn
      .select({ userId: students.userId })
      .from(serviceRegistrations)
      .innerJoin(students, eq(students.id, serviceRegistrations.studentId))
      .where(eq(serviceRegistrations.id, registrationId))
      .limit(1);
    if (!owner) return;
    await this.notifications.enqueueInTransaction(txn, {
      eventId: `${notificationType}:${registrationId}:${owner.userId}`,
      userId: owner.userId,
      notificationType,
      title,
      message,
      relatedEntityType: 'REGISTRATION',
      relatedEntityId: registrationId,
    });
  }

  private async createSnapshotInTransaction(
    txn: DatabaseTransaction,
    reg: typeof serviceRegistrations.$inferSelect,
    type: string,
  ) {
    const student = await txn
      .select()
      .from(students)
      .where(eq(students.id, reg.studentId))
      .limit(1);

    await txn.insert(registrationSnapshots).values({
      id: generateId(),
      registrationId: reg.id,
      snapshotType: type,
      studentData: JSON.stringify(student[0] || {}),
      parentData: '{}',
      selectedAddressData: '{}',
      emergencyContactData: '{}',
    });
  }
}
