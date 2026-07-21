import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../../database/database.service';
import { serviceRegistrations, registrationSnapshots, registrationReviews, registrationNotes } from '../../database/schemas';
import { students } from '../../database/schemas';
import { eq, and } from 'drizzle-orm';
import { NotFoundError, ValidationError, ConflictError } from '../../common/errors';
import { generateId } from '../../common/utils';

type RegistrationStatus = 'DRAFT' | 'SUBMITTED' | 'UNDER_REVIEW' | 'APPROVED' | 'REJECTED' | 'CANCELLED';
const VALID_TRANSITIONS: Record<RegistrationStatus, RegistrationStatus[]> = {
  DRAFT: ['SUBMITTED', 'CANCELLED'],
  SUBMITTED: ['UNDER_REVIEW', 'CANCELLED'],
  UNDER_REVIEW: ['APPROVED', 'REJECTED', 'SUBMITTED'],
  APPROVED: ['CANCELLED'],
  REJECTED: ['SUBMITTED'],
  CANCELLED: [],
};

@Injectable()
export class RegistrationsService {
  constructor(private readonly db: DatabaseService) {}

  private async checkTransition(current: string, next: string) {
    const allowed = VALID_TRANSITIONS[current as RegistrationStatus];
    if (!allowed || !allowed.includes(next as RegistrationStatus)) {
      throw new ValidationError(`Cannot transition from ${current} to ${next}.`);
    }
  }

  async getByFamily(userId: string) {
    const userStudents = await this.db.db.select({ id: students.id })
      .from(students)
      .where(eq(students.userId, userId));

    const studentIds = userStudents.map(s => s.id);
    if (studentIds.length === 0) return [];

    return this.db.db.select()
      .from(serviceRegistrations)
      .where(serviceRegistrations.studentId.in(studentIds));
  }

  async getById(registrationId: string, userId?: string) {
    const result = await this.db.db.select()
      .from(serviceRegistrations)
      .where(eq(serviceRegistrations.id, registrationId))
      .limit(1);

    if (result.length === 0) throw new NotFoundError('Registration', registrationId);

    if (userId) {
      const student = await this.db.db.select({ userId: students.userId })
        .from(students)
        .where(eq(students.id, result[0].studentId))
        .limit(1);
      if (student.length === 0 || student[0].userId !== userId) {
        throw new NotFoundError('Registration', registrationId);
      }
    }

    return result[0];
  }

  async create(userId: string, data: {
    studentId: string;
    academicYear: string;
    serviceType: string;
    requestedStartDate?: string;
    parentNotes?: string;
  }) {
    const student = await this.db.db.select()
      .from(students)
      .where(and(eq(students.id, data.studentId), eq(students.userId, userId)))
      .limit(1);
    if (student.length === 0) throw new NotFoundError('Student', data.studentId);

    const id = generateId();
    await this.db.db.insert(serviceRegistrations).values({
      id,
      studentId: data.studentId,
      academicYear: data.academicYear,
      serviceType: data.serviceType,
      requestedStartDate: data.requestedStartDate ? new Date(data.requestedStartDate) : null,
      parentNotes: data.parentNotes || null,
      registrationStatus: 'DRAFT',
    });

    return this.getById(id);
  }

  async submit(registrationId: string, userId: string) {
    const reg = await this.getById(registrationId, userId);
    await this.checkTransition(reg.registrationStatus, 'SUBMITTED');

    await this.db.db.update(serviceRegistrations)
      .set({ registrationStatus: 'SUBMITTED', submittedAt: new Date(), updatedAt: new Date() })
      .where(eq(serviceRegistrations.id, registrationId));

    await this.createSnapshot(registrationId, 'SUBMISSION');
    return this.getById(registrationId);
  }

  async cancel(registrationId: string, userId: string) {
    const reg = await this.getById(registrationId, userId);
    await this.checkTransition(reg.registrationStatus, 'CANCELLED');

    await this.db.db.update(serviceRegistrations)
      .set({ registrationStatus: 'CANCELLED', updatedAt: new Date() })
      .where(eq(serviceRegistrations.id, registrationId));

    return this.getById(registrationId);
  }

  async startReview(registrationId: string, adminId: string) {
    const reg = await this.getById(registrationId);
    await this.checkTransition(reg.registrationStatus, 'UNDER_REVIEW');

    await this.db.db.update(serviceRegistrations)
      .set({ registrationStatus: 'UNDER_REVIEW', reviewedByAdminId: adminId, reviewedAt: new Date(), updatedAt: new Date() })
      .where(eq(serviceRegistrations.id, registrationId));

    await this.addReview(registrationId, adminId, 'START_REVIEW');
    return this.getById(registrationId);
  }

  async approve(registrationId: string, adminId: string) {
    const reg = await this.getById(registrationId);
    await this.checkTransition(reg.registrationStatus, 'APPROVED');

    await this.db.db.update(serviceRegistrations)
      .set({ registrationStatus: 'APPROVED', reviewedByAdminId: adminId, reviewedAt: new Date(), updatedAt: new Date() })
      .where(eq(serviceRegistrations.id, registrationId));

    await this.addReview(registrationId, adminId, 'APPROVE');
    return this.getById(registrationId);
  }

  async reject(registrationId: string, adminId: string, reason?: string) {
    const reg = await this.getById(registrationId);
    await this.checkTransition(reg.registrationStatus, 'REJECTED');

    await this.db.db.update(serviceRegistrations)
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
    await this.addReview(registrationId, adminId, 'REQUEST_CORRECTION', message);
    return { message: 'Correction requested.' };
  }

  private async addReview(registrationId: string, adminId: string, action: string, comment?: string) {
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
    const student = await this.db.db.select().from(students).where(eq(students.id, reg.studentId)).limit(1);

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
