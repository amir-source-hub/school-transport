import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../../database/database.service';
import {
  serviceRegistrations,
  registrationSnapshots,
  registrationReviews,
} from '../../database/schemas';
import { students } from '../../database/schemas';
import { familyAddresses, parents, schools } from '../../database/schemas';
import { getTableColumns } from 'drizzle-orm';
import { eq, and, inArray, notInArray } from 'drizzle-orm';
import { ConflictError, NotFoundError } from '../../common/errors';
import { generateId } from '../../common/utils';
import { assertRegistrationTransition } from './registration-lifecycle';

@Injectable()
export class RegistrationsService {
  constructor(private readonly db: DatabaseService) {}

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
      const parent = parentRows.find((entry) => entry.userId === registration.familyId && entry.isPrimaryContact)
        ?? parentRows.find((entry) => entry.userId === registration.familyId);
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
