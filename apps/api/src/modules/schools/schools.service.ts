import { forwardRef, Inject, Injectable } from '@nestjs/common';
import { DatabaseService } from '../../database/database.service';
import {
  contracts,
  feedbackSubmissions,
  paymentPlans,
  paymentScheduleItems,
  paymentTransactions,
  registrationPrices,
  schoolManagerAssignments,
  schoolManagerUsers,
  schools,
  serviceRegistrations,
  students,
  transportServiceRuns,
  users,
} from '../../database/schemas';
import { and, asc, eq, inArray, sql } from 'drizzle-orm';
import { ConflictError, NotFoundError } from '../../common/errors';
import { generateId } from '../../common/utils';
import type { SchoolEducationOption } from '../../database/schemas/schools.schema';

export const SCHOOL_LIST_LIMIT = 500;

@Injectable()
export class SchoolsService {
  constructor(@Inject(forwardRef(() => DatabaseService)) private readonly db: DatabaseService) {}

  async getAll(includeInactive = false) {
    if (includeInactive) {
      const rows = await this.db.db
        .select({
          school: schools,
          managerId: schoolManagerUsers.id,
          managerUsername: schoolManagerUsers.username,
          managerFirstName: schoolManagerUsers.firstName,
          managerLastName: schoolManagerUsers.lastName,
          managerAccountPhone: schoolManagerUsers.phoneNumber,
          managerStatus: schoolManagerUsers.status,
        })
        .from(schools)
        .leftJoin(
          schoolManagerAssignments,
          and(
            eq(schoolManagerAssignments.schoolId, schools.id),
            eq(schoolManagerAssignments.status, 'ACTIVE'),
            eq(schoolManagerAssignments.isPrimary, true),
          ),
        )
        .leftJoin(
          schoolManagerUsers,
          eq(schoolManagerUsers.id, schoolManagerAssignments.managerUserId),
        )
        .orderBy(asc(schools.name), asc(schools.id))
        .limit(SCHOOL_LIST_LIMIT);
      return rows.map(({ school, ...manager }) => ({ ...school, ...manager }));
    }
    return this.db.db
      .select({
        id: schools.id,
        name: schools.name,
        schoolType: schools.schoolType,
        genderType: schools.genderType,
        province: schools.province,
        city: schools.city,
        district: schools.district,
        address: schools.address,
        phoneNumber: schools.phoneNumber,
        openingTime: schools.openingTime,
        closingTime: schools.closingTime,
        closingTimes: schools.closingTimes,
        latitude: schools.latitude,
        longitude: schools.longitude,
        educationOptions: schools.educationOptions,
      })
      .from(schools)
      .where(eq(schools.isActive, true))
      .orderBy(asc(schools.name), asc(schools.id))
      .limit(SCHOOL_LIST_LIMIT);
  }

  async getById(id: string) {
    const result = await this.db.db.select().from(schools).where(eq(schools.id, id)).limit(1);
    if (result.length === 0) throw new NotFoundError('School', id);
    return result[0];
  }

  async getPublicById(id: string) {
    const result = await this.db.db
      .select({
        id: schools.id,
        name: schools.name,
        schoolType: schools.schoolType,
        genderType: schools.genderType,
        province: schools.province,
        city: schools.city,
        district: schools.district,
        address: schools.address,
        phoneNumber: schools.phoneNumber,
        openingTime: schools.openingTime,
        closingTime: schools.closingTime,
        closingTimes: schools.closingTimes,
        latitude: schools.latitude,
        longitude: schools.longitude,
        educationOptions: schools.educationOptions,
      })
      .from(schools)
      .where(and(eq(schools.id, id), eq(schools.isActive, true)))
      .limit(1);
    if (result.length === 0) throw new NotFoundError('School', id);
    return result[0];
  }

  async create(data: {
    name: string;
    schoolType: string;
    genderType: string;
    province: string;
    city: string;
    district?: string;
    address: string;
    phoneNumber?: string;
    managerName?: string;
    managerPhone?: string;
    openingTime: string;
    closingTime: string;
    closingTimes?: string[];
    latitude?: number;
    longitude?: number;
    educationOptions?: SchoolEducationOption[];
  }) {
    const id = generateId();
    await this.db.db.insert(schools).values({
      id,
      ...data,
      district: data.district || null,
      phoneNumber: data.phoneNumber || null,
      managerName: data.managerName || null,
      managerPhone: data.managerPhone || null,
      educationOptions: data.educationOptions ?? [],
      closingTimes: data.closingTimes?.length ? data.closingTimes : [data.closingTime],
      latitude: data.latitude ?? null,
      longitude: data.longitude ?? null,
    });
    return this.getById(id);
  }

  async update(
    id: string,
    data: Partial<{
      name: string;
      schoolType: string;
      genderType: string;
      province: string;
      city: string;
      district: string;
      address: string;
      phoneNumber: string;
      managerName: string;
      managerPhone: string;
      openingTime: string;
      closingTime: string;
      closingTimes: string[];
      latitude: number;
      longitude: number;
      educationOptions: SchoolEducationOption[];
      isActive: boolean;
    }>,
  ) {
    const current = await this.getById(id);
    const next = { ...data } as Record<string, unknown>;
    if ('phoneNumber' in data) next.phoneNumber = data.phoneNumber || null;
    if ('managerName' in data) next.managerName = data.managerName || null;
    if ('managerPhone' in data) next.managerPhone = data.managerPhone || null;
    await this.db.db.transaction(async (txn) => {
      await txn
        .update(schools)
        .set({ ...(next as typeof data), updatedAt: new Date() })
        .where(eq(schools.id, id));

      if (current.schoolType !== 'SPECIAL' && data.schoolType === 'SPECIAL') {
        const affected = await txn
          .select({
            registrationId: serviceRegistrations.id,
            userId: students.userId,
          })
          .from(serviceRegistrations)
          .innerJoin(students, eq(students.id, serviceRegistrations.studentId))
          .where(
            and(
              eq(students.schoolId, id),
              inArray(serviceRegistrations.registrationStatus, [
                'CONTRACT_READY',
                'CONTRACT_ACCEPTED',
                'ENROLLED',
              ]),
            ),
          );
        const registrationIds = affected.map(({ registrationId }) => registrationId);
        const userIds = [...new Set(affected.map(({ userId }) => userId))];
        if (registrationIds.length > 0) {
          const registrationContracts = await txn
            .select({ id: contracts.id, paymentPlanId: contracts.paymentPlanId })
            .from(contracts)
            .where(inArray(contracts.registrationId, registrationIds));
          const planIds = registrationContracts
            .map(({ paymentPlanId }) => paymentPlanId)
            .filter((value): value is string => Boolean(value));
          const now = new Date();
          await txn
            .update(contracts)
            .set({ contractStatus: 'CANCELLED', cancelledAt: now, updatedAt: now })
            .where(
              and(
                inArray(contracts.registrationId, registrationIds),
                eq(contracts.contractStatus, 'GENERATED'),
              ),
            );
          await txn
            .update(registrationPrices)
            .set({ priceStatus: 'REPLACED', updatedAt: now })
            .where(
              and(
                inArray(registrationPrices.registrationId, registrationIds),
                eq(registrationPrices.priceStatus, 'ACCEPTED'),
              ),
            );
          if (planIds.length > 0) {
            await txn
              .update(paymentScheduleItems)
              .set({ itemStatus: 'CANCELLED', updatedAt: now })
              .where(
                and(
                  inArray(paymentScheduleItems.paymentPlanId, planIds),
                  eq(paymentScheduleItems.itemStatus, 'PENDING'),
                ),
              );
            await txn
              .update(paymentPlans)
              .set({ planStatus: 'CANCELLED', updatedAt: now })
              .where(
                and(
                  inArray(paymentPlans.id, planIds),
                  inArray(paymentPlans.planStatus, ['PENDING', 'ACTIVE']),
                ),
              );
            await txn
              .update(paymentTransactions)
              .set({
                transactionStatus: 'FAILED',
                failureCode: 'SPECIAL_SCHOOL_PAYMENT_WAIVED',
                failureMessage: 'Payment is not required for SPECIAL-school enrollment.',
                updatedAt: now,
              })
              .where(
                and(
                  inArray(paymentTransactions.paymentPlanId, planIds),
                  eq(paymentTransactions.transactionStatus, 'CREATED'),
                ),
              );
          }
          await txn
            .update(serviceRegistrations)
            .set({ registrationStatus: 'ENROLLED', updatedAt: now })
            .where(inArray(serviceRegistrations.id, registrationIds));
          if (userIds.length > 0) {
            await txn
              .update(users)
              .set({ accountStatus: 'ACTIVE', username: sql`${users.phoneNumber}`, updatedAt: now })
              .where(inArray(users.id, userIds));
          }
        }
      }
    });
    return this.getById(id);
  }

  async archive(id: string) {
    return this.update(id, { isActive: false });
  }

  async unarchive(id: string) {
    return this.update(id, { isActive: true });
  }

  async permanentlyDelete(id: string) {
    await this.getById(id);
    return this.db.db.transaction(async (tx) => {
      const dependencies = [
        { table: students, label: 'دانش‌آموز' },
        { table: transportServiceRuns, label: 'مسیر سرویس' },
        { table: feedbackSubmissions, label: 'پیام یا بازخورد' },
      ] as const;
      for (const dependency of dependencies) {
        const [record] = await tx
          .select({ id: dependency.table.id })
          .from(dependency.table)
          .where(eq(dependency.table.schoolId, id))
          .limit(1);
        if (record) {
          throw new ConflictError(
            'SCHOOL_HAS_DEPENDENCIES',
            `این مدرسه ${dependency.label} مرتبط دارد و حذف دائمی آن باعث از دست رفتن سابقه می‌شود. مدرسه را بایگانی‌شده نگه دارید.`,
          );
        }
      }

      // Manager assignments belong to this school and can be removed without
      // deleting the manager account or any student/route history.
      await tx.delete(schoolManagerAssignments).where(eq(schoolManagerAssignments.schoolId, id));
      const [deleted] = await tx
        .delete(schools)
        .where(eq(schools.id, id))
        .returning({ id: schools.id });
      return { deleted: Boolean(deleted) };
    });
  }
}
