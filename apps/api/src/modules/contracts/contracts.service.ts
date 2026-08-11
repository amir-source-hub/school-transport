import { forwardRef, Inject, Injectable } from '@nestjs/common';
import { DatabaseService } from '../../database/database.service';
import {
  contracts,
  serviceRegistrations,
  registrationPrices,
  paymentPlans,
  paymentScheduleItems,
  paymentTransactions,
  students,
  parents,
  familyAddresses,
  emergencyContacts,
  schools,
} from '../../database/schemas';
import { eq, and, inArray, desc } from 'drizzle-orm';
import { getTableColumns } from 'drizzle-orm';
import { NotFoundError, ValidationError } from '../../common/errors';
import { generateId, generateContractNumber } from '../../common/utils';
import { InAppNotificationService } from '../../infrastructure/notifications/in-app-notification.service';
import { AUDIT_PORT, AuditPort } from '../../common/audit.port';
import {
  OFFLINE_CONTRACT_TEMPLATE_HASH,
  OFFLINE_PREPAYMENT_AMOUNT_IRR,
} from '../../common/offline-contract-template';
import {
  buildOfflineContractSnapshot,
  type OfflineContractEnrollmentData,
} from '../../common/offline-contract-snapshot';

type ContractAcceptanceContext = {
  reviewedPages?: number[];
  templateHash?: string;
  ipAddress?: string;
  userAgent?: string;
  adminId?: string;
  signerReason?: string;
  signerSource?: string;
};

export function assertContractAcceptanceProof(
  snapshot: Record<string, unknown>,
  context: ContractAcceptanceContext,
) {
  if (!snapshot.templateHash) return;
  const reviewed = context.reviewedPages ?? [];
  if (
    snapshot.templateHash !== OFFLINE_CONTRACT_TEMPLATE_HASH ||
    context.templateHash !== snapshot.templateHash ||
    reviewed.join(',') !== '1,2,3'
  ) {
    throw new ValidationError(
      'پیش از پذیرش، هر سه صفحه همین نسخه قرارداد را به ترتیب مطالعه کنید.',
    );
  }
}

export const FAMILY_CONTRACT_LIST_LIMIT = 100;
export const ADMIN_CONTRACT_LIST_LIMIT = 500;

@Injectable()
export class ContractsService {
  constructor(
    @Inject(forwardRef(() => DatabaseService)) private readonly db: DatabaseService,
    @Inject(forwardRef(() => InAppNotificationService))
    private readonly notifications: InAppNotificationService,
    @Inject(AUDIT_PORT) private readonly audit: AuditPort,
  ) {}

  async getByFamily(userId: string) {
    const result = await this.db.db
      .select({
        ...getTableColumns(contracts),
        studentName: students.firstName,
        studentLastName: students.lastName,
        academicYear: serviceRegistrations.academicYear,
        serviceType: serviceRegistrations.serviceType,
        totalAmount: registrationPrices.totalAmount,
      })
      .from(contracts)
      .innerJoin(serviceRegistrations, eq(serviceRegistrations.id, contracts.registrationId))
      .innerJoin(students, eq(students.id, serviceRegistrations.studentId))
      .innerJoin(registrationPrices, eq(registrationPrices.id, contracts.registrationPriceId))
      .where(eq(students.userId, userId))
      .orderBy(desc(contracts.createdAt), desc(contracts.id))
      .limit(FAMILY_CONTRACT_LIST_LIMIT);
    return result;
  }

  async getAll() {
    const contractRows = await this.db.db
      .select({
        ...getTableColumns(contracts),
        studentName: students.firstName,
        studentLastName: students.lastName,
        academicYear: serviceRegistrations.academicYear,
        totalAmount: registrationPrices.totalAmount,
      })
      .from(contracts)
      .innerJoin(serviceRegistrations, eq(serviceRegistrations.id, contracts.registrationId))
      .innerJoin(students, eq(students.id, serviceRegistrations.studentId))
      .innerJoin(registrationPrices, eq(registrationPrices.id, contracts.registrationPriceId))
      .orderBy(desc(contracts.createdAt), desc(contracts.id))
      .limit(ADMIN_CONTRACT_LIST_LIMIT);

    if (contractRows.length === 0) return [];

    const priceIds = contractRows.map((contract) => contract.registrationPriceId);
    const plans = await this.db.db
      .select()
      .from(paymentPlans)
      .where(inArray(paymentPlans.registrationPriceId, priceIds));
    const planIds = plans.map((plan) => plan.id);
    const scheduleItems =
      planIds.length === 0
        ? []
        : await this.db.db
            .select()
            .from(paymentScheduleItems)
            .where(inArray(paymentScheduleItems.paymentPlanId, planIds));
    const scheduleItemIds = scheduleItems.map((item) => item.id);
    const transactions =
      scheduleItemIds.length === 0
        ? []
        : await this.db.db
            .select()
            .from(paymentTransactions)
            .where(inArray(paymentTransactions.paymentScheduleItemId, scheduleItemIds));

    return contractRows.map((contract) => {
      const plan = plans.find(
        (candidate) => candidate.registrationPriceId === contract.registrationPriceId,
      );
      const items = plan
        ? scheduleItems
            .filter((item) => item.paymentPlanId === plan.id)
            .sort((a, b) => a.sequenceNumber - b.sequenceNumber)
            .map((item) => ({
              ...item,
              transactions: transactions
                .filter((transaction) => transaction.paymentScheduleItemId === item.id)
                .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime()),
            }))
        : [];
      return { ...contract, paymentPlan: plan ? { ...plan, items } : null };
    });
  }

  async getById(contractId: string, userId?: string) {
    const result = await this.db.db
      .select()
      .from(contracts)
      .where(eq(contracts.id, contractId))
      .limit(1);
    if (result.length === 0) throw new NotFoundError('Contract', contractId);

    if (userId) {
      const owner = await this.db.db
        .select({ userId: students.userId })
        .from(serviceRegistrations)
        .innerJoin(students, eq(students.id, serviceRegistrations.studentId))
        .where(
          and(eq(serviceRegistrations.id, result[0].registrationId), eq(students.userId, userId)),
        )
        .limit(1);
      if (owner.length === 0) throw new NotFoundError('Contract', contractId);
    }

    return result[0];
  }

  async getDetails(contractId: string, userId?: string) {
    await this.getById(contractId, userId);
    const details = await this.db.db
      .select({
        ...getTableColumns(contracts),
        studentName: students.firstName,
        studentLastName: students.lastName,
        academicYear: serviceRegistrations.academicYear,
        serviceType: serviceRegistrations.serviceType,
        totalAmount: registrationPrices.totalAmount,
        prepaymentAmount: registrationPrices.prepaymentAmount,
      })
      .from(contracts)
      .innerJoin(serviceRegistrations, eq(serviceRegistrations.id, contracts.registrationId))
      .innerJoin(students, eq(students.id, serviceRegistrations.studentId))
      .innerJoin(registrationPrices, eq(registrationPrices.id, contracts.registrationPriceId))
      .where(eq(contracts.id, contractId))
      .limit(1);
    return details[0];
  }

  async generate(enrollmentId: string, adminId: string) {
    const contractId = await this.db.db.transaction(async (txn) => {
      const reg = await txn
        .select()
        .from(serviceRegistrations)
        .where(eq(serviceRegistrations.id, enrollmentId))
        .for('update')
        .limit(1);
      if (reg.length === 0) throw new NotFoundError('Registration', enrollmentId);

      if (
        reg[0].registrationStatus !== 'APPROVED' &&
        reg[0].registrationStatus !== 'CONTRACT_PENDING' &&
        reg[0].registrationStatus !== 'CONTRACT_READY'
      ) {
        throw new ValidationError('Registration must be approved before generating a contract.');
      }

      if (!reg[0].selectedAddressId) {
        throw new ValidationError('A pickup address must be selected before contract generation.');
      }

      const price = await txn
        .select()
        .from(registrationPrices)
        .where(
          and(
            eq(registrationPrices.registrationId, enrollmentId),
            eq(registrationPrices.priceStatus, 'ACCEPTED'),
          ),
        )
        .limit(1);
      if (price.length === 0)
        throw new NotFoundError(
          'Accepted price. The parent must accept the offered price before a contract can be generated.',
        );

      const [existing] = await txn
        .select()
        .from(contracts)
        .where(eq(contracts.registrationId, enrollmentId))
        .orderBy(desc(contracts.versionNumber))
        .for('update')
        .limit(1);
      if (existing) {
        if (
          existing.registrationPriceId === price[0].id &&
          existing.contractStatus === 'GENERATED'
        ) {
          return existing.id;
        }
        if (existing.contractStatus === 'ACCEPTED') {
          throw new ValidationError('An accepted contract cannot be replaced.');
        }
      }

      const newContractId = generateId();
      const contractNumber = generateContractNumber();

      if (price[0].prepaymentAmount !== OFFLINE_PREPAYMENT_AMOUNT_IRR) {
        throw new ValidationError('مبلغ پیش‌پرداخت با نسخه مصوب قرارداد همخوانی ندارد.');
      }
      const [contractSource] = await txn
        .select({
          studentId: students.id,
          userId: students.userId,
          studentFirstName: students.firstName,
          studentLastName: students.lastName,
          studentNationalId: students.nationalId,
          studentBirthDate: students.birthDate,
          studentGender: students.gender,
          grade: students.grade,
          educationLevel: students.className,
          schoolId: schools.id,
          schoolName: schools.name,
        })
        .from(serviceRegistrations)
        .innerJoin(students, eq(students.id, serviceRegistrations.studentId))
        .innerJoin(schools, eq(schools.id, students.schoolId))
        .where(eq(serviceRegistrations.id, enrollmentId))
        .limit(1);
      const familyParents = await txn
        .select()
        .from(parents)
        .where(eq(parents.userId, contractSource.userId));
      const guardian =
        familyParents.find((item) => item.parentType === 'GUARDIAN') ??
        familyParents.find((item) => item.isPrimaryContact);
      const [address] = await txn
        .select()
        .from(familyAddresses)
        .where(eq(familyAddresses.id, reg[0].selectedAddressId!))
        .limit(1);
      const [emergency] = await txn
        .select()
        .from(emergencyContacts)
        .where(
          and(
            eq(emergencyContacts.userId, contractSource.userId),
            eq(emergencyContacts.isActive, true),
          ),
        )
        .limit(1);
      if (!guardian || !address || !contractSource.educationLevel || !contractSource.grade) {
        throw new ValidationError(
          'اطلاعات الزامی اولیاء، آدرس، مقطع یا پایه برای صدور قرارداد ناقص است.',
        );
      }
      const parentData = (type: 'FATHER' | 'MOTHER') => {
        const value = familyParents.find((item) => item.parentType === type);
        return value
          ? {
              firstName: value.firstName,
              lastName: value.lastName,
              nationalId: value.nationalId,
              phoneNumber: value.phoneNumber,
            }
          : null;
      };
      const snapshotInput: OfflineContractEnrollmentData = {
        student: {
          id: contractSource.studentId,
          firstName: contractSource.studentFirstName,
          lastName: contractSource.studentLastName,
          nationalId: contractSource.studentNationalId,
          birthDate: contractSource.studentBirthDate ?? undefined,
          gender: contractSource.studentGender ?? undefined,
        },
        guardian: {
          firstName: guardian.firstName,
          lastName: guardian.lastName,
          nationalId: guardian.nationalId,
          relationshipType: (guardian.relationshipType || 'OTHER') as 'FATHER' | 'MOTHER' | 'OTHER',
          relationshipDescription: guardian.relationshipDescription ?? undefined,
        },
        homePhone: guardian.homePhone ?? '',
        father: parentData('FATHER'),
        mother: parentData('MOTHER'),
        emergencyContact: emergency
          ? {
              firstName: emergency.firstName,
              lastName: emergency.lastName,
              relationship: emergency.relationship,
              phoneNumber: emergency.phoneNumber,
            }
          : null,
        address: {
          title: address.title,
          province: address.province,
          city: address.city,
          streetAddress: address.streetAddress,
          postalCode: address.postalCode ?? '',
          latitude: address.latitude ?? 0,
          longitude: address.longitude ?? 0,
        },
        school: {
          schoolId: contractSource.schoolId,
          educationLevel: contractSource.educationLevel,
          grade: contractSource.grade,
        },
        service: { serviceType: reg[0].serviceType, paymentPlanType: 'INSTALLMENTS' },
      };
      const generatedAt = new Date();
      const immutableSnapshot = buildOfflineContractSnapshot(
        snapshotInput,
        guardian.phoneNumber,
        contractSource.schoolName,
        generatedAt,
        contractSource.studentId,
        reg[0].academicYear,
      );

      await txn.insert(contracts).values({
        id: newContractId,
        registrationId: enrollmentId,
        registrationPriceId: price[0].id,
        contractNumber,
        contractStatus: 'GENERATED',
        selectedAddressId: reg[0].selectedAddressId,
        generatedByAdminId: adminId,
        generatedAt,
        contractDataSnapshot: JSON.stringify(immutableSnapshot),
        versionNumber: (existing?.versionNumber ?? 0) + 1,
      });

      if (existing) {
        await txn
          .update(contracts)
          .set({ replacedByContractId: newContractId, updatedAt: new Date() })
          .where(eq(contracts.id, existing.id));
      }

      const [updated] = await txn
        .update(serviceRegistrations)
        .set({ registrationStatus: 'CONTRACT_READY', updatedAt: new Date() })
        .where(
          and(
            eq(serviceRegistrations.id, enrollmentId),
            inArray(serviceRegistrations.registrationStatus, ['APPROVED', 'CONTRACT_PENDING']),
          ),
        )
        .returning({ id: serviceRegistrations.id });
      if (!updated)
        throw new ValidationError('Registration state changed during contract generation.');
      const [owner] = await txn
        .select({ userId: students.userId })
        .from(serviceRegistrations)
        .innerJoin(students, eq(students.id, serviceRegistrations.studentId))
        .where(eq(serviceRegistrations.id, enrollmentId))
        .limit(1);
      if (owner) {
        await this.notifications.enqueueInTransaction(txn, {
          eventId: `CONTRACT_READY:${newContractId}:${owner.userId}`,
          userId: owner.userId,
          notificationType: 'CONTRACT_READY',
          title: 'قرارداد آماده بررسی است',
          message: 'قرارداد سرویس صادر شد. لطفاً متن و برنامه پرداخت را بررسی کنید.',
          relatedEntityType: 'CONTRACT',
          relatedEntityId: newContractId,
        });
      }
      await this.audit.recordInTransaction(txn, {
        actorType: 'ADMIN',
        actorId: adminId,
        action: 'CONTRACT_GENERATED',
        entityType: 'CONTRACT',
        entityId: newContractId,
        previousValues: existing ? { contractStatus: existing.contractStatus } : undefined,
        newValues: {
          contractStatus: 'GENERATED',
          registrationId: enrollmentId,
          priceId: price[0].id,
        },
      });
      return newContractId;
    });

    return this.getById(contractId);
  }

  async accept(contractId: string, userId: string, context: ContractAcceptanceContext = {}) {
    await this.getById(contractId, context.adminId ? undefined : userId);
    let ownerUserId = userId;
    if (context.adminId) {
      const [owner] = await this.db.db
        .select({ userId: students.userId })
        .from(contracts)
        .innerJoin(serviceRegistrations, eq(serviceRegistrations.id, contracts.registrationId))
        .innerJoin(students, eq(students.id, serviceRegistrations.studentId))
        .where(eq(contracts.id, contractId))
        .limit(1);
      if (!owner) throw new NotFoundError('Contract', contractId);
      ownerUserId = owner.userId;
    }
    await this.db.db.transaction(async (txn) => {
      const [contract] = await txn
        .select()
        .from(contracts)
        .where(eq(contracts.id, contractId))
        .for('update')
        .limit(1);
      if (!contract) throw new NotFoundError('Contract', contractId);

      if (contract.contractStatus !== 'GENERATED') {
        throw new ValidationError('Contract cannot be accepted in its current state.');
      }

      let immutableSnapshot: Record<string, unknown> | null = null;
      if (contract.contractDataSnapshot) {
        try {
          immutableSnapshot = JSON.parse(contract.contractDataSnapshot) as Record<string, unknown>;
        } catch {
          throw new ValidationError('نسخه قرارداد قابل اعتماد نیست و امکان پذیرش ندارد.');
        }
      }
      if (immutableSnapshot?.templateHash) {
        assertContractAcceptanceProof(immutableSnapshot, context);
      }

      const plan = await txn
        .select()
        .from(paymentPlans)
        .where(eq(paymentPlans.registrationPriceId, contract.registrationPriceId))
        .limit(1);

      if (plan.length === 0) {
        throw new ValidationError('Payment plan must be created before accepting the contract.');
      }

      const [accepted] = await txn
        .update(contracts)
        .set({
          contractStatus: 'ACCEPTED',
          acceptedAt: new Date(),
          paymentPlanId: plan[0].id,
          acceptedByAdminId: context.adminId ?? null,
          signerRole: context.adminId ? 'ADMIN' : 'PARENT',
          signerReason: context.adminId ? context.signerReason ?? null : null,
          signerSource: context.adminId ? context.signerSource ?? 'admin_console' : null,
          contractDataSnapshot: immutableSnapshot
            ? JSON.stringify({
                ...immutableSnapshot,
                acceptance: {
                  acceptedAt: new Date().toISOString(),
                  actorType: context.adminId ? 'ADMIN' : 'PARENT',
                  actorId: context.adminId ?? ownerUserId,
                  accountId: ownerUserId,
                  studentId:
                    (immutableSnapshot.enrollment as { student?: { id?: string } } | undefined)
                      ?.student?.id ?? null,
                  reviewedPages: [1, 2, 3],
                  templateHash: immutableSnapshot.templateHash,
                  ipAddress: context.ipAddress ?? null,
                  userAgent: context.userAgent?.slice(0, 500) ?? null,
                },
              })
            : contract.contractDataSnapshot,
        })
        .where(and(eq(contracts.id, contractId), eq(contracts.contractStatus, 'GENERATED')))
        .returning({ id: contracts.id });
      if (!accepted) throw new ValidationError('Contract state changed during acceptance.');

      const [registrationUpdated] = await txn
        .update(serviceRegistrations)
        .set({ registrationStatus: 'CONTRACT_ACCEPTED', updatedAt: new Date() })
        .where(
          and(
            eq(serviceRegistrations.id, contract.registrationId),
            eq(serviceRegistrations.registrationStatus, 'CONTRACT_READY'),
          ),
        )
        .returning({ id: serviceRegistrations.id });
      if (!registrationUpdated) {
        throw new ValidationError('Registration state changed during contract acceptance.');
      }
      await this.notifications.enqueueInTransaction(txn, {
        eventId: `CONTRACT_ACCEPTED:${contractId}:${ownerUserId}`,
        userId: ownerUserId,
        notificationType: 'CONTRACT_ACCEPTED',
        title: 'قرارداد پذیرفته شد',
        message: 'پذیرش قرارداد با موفقیت ثبت شد.',
        relatedEntityType: 'CONTRACT',
        relatedEntityId: contractId,
      });
      await this.audit.recordInTransaction(txn, {
        actorType: context.adminId ? 'ADMIN' : 'PARENT',
        actorId: context.adminId ?? ownerUserId,
        action: context.adminId ? 'CONTRACT_ACCEPTED_BY_ADMIN' : 'CONTRACT_ACCEPTED',
        entityType: 'CONTRACT',
        entityId: contractId,
        previousValues: { contractStatus: contract.contractStatus },
        newValues: {
          contractStatus: 'ACCEPTED',
          registrationStatus: 'CONTRACT_ACCEPTED',
          planId: plan[0].id,
          templateHash: immutableSnapshot?.templateHash,
          reviewedPages: immutableSnapshot?.templateHash ? [1, 2, 3] : undefined,
        },
        ipAddress: context.ipAddress,
      });
    });

    return this.getDetails(contractId, context.adminId ? undefined : ownerUserId);
  }

  async reject(contractId: string, userId: string) {
    await this.getById(contractId, userId);
    await this.db.db.transaction(async (txn) => {
      const [contract] = await txn
        .select()
        .from(contracts)
        .where(eq(contracts.id, contractId))
        .for('update')
        .limit(1);
      if (!contract) throw new NotFoundError('Contract', contractId);
      if (contract.contractStatus !== 'GENERATED') {
        throw new ValidationError('Contract cannot be rejected in its current state.');
      }
      const [rejected] = await txn
        .update(contracts)
        .set({ contractStatus: 'REJECTED' })
        .where(and(eq(contracts.id, contractId), eq(contracts.contractStatus, 'GENERATED')))
        .returning({ id: contracts.id });
      if (!rejected) throw new ValidationError('Contract state changed during rejection.');
      const [registrationUpdated] = await txn
        .update(serviceRegistrations)
        .set({ registrationStatus: 'CONTRACT_PENDING', updatedAt: new Date() })
        .where(
          and(
            eq(serviceRegistrations.id, contract.registrationId),
            eq(serviceRegistrations.registrationStatus, 'CONTRACT_READY'),
          ),
        )
        .returning({ id: serviceRegistrations.id });
      if (!registrationUpdated) {
        throw new ValidationError('Registration state changed during contract rejection.');
      }
      await this.notifications.enqueueInTransaction(txn, {
        eventId: `CONTRACT_REJECTED:${contractId}:${userId}`,
        userId,
        notificationType: 'CONTRACT_REJECTED',
        title: 'قرارداد رد شد',
        message: 'رد قرارداد ثبت شد و درخواست برای بازبینی به مدیریت بازگشت.',
        relatedEntityType: 'CONTRACT',
        relatedEntityId: contractId,
      });
      await this.audit.recordInTransaction(txn, {
        actorType: 'PARENT',
        actorId: userId,
        action: 'CONTRACT_REJECTED',
        entityType: 'CONTRACT',
        entityId: contractId,
        previousValues: { contractStatus: contract.contractStatus },
        newValues: {
          contractStatus: 'REJECTED',
          registrationStatus: 'CONTRACT_PENDING',
        },
      });
    });
    return this.getDetails(contractId, userId);
  }
}
