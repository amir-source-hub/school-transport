import { Inject, Injectable } from '@nestjs/common';
import { DatabaseService } from '../../database/database.service';
import {
  contracts,
  serviceRegistrations,
  registrationPrices,
  paymentPlans,
  paymentScheduleItems,
  paymentTransactions,
  students,
} from '../../database/schemas';
import { eq, and, inArray, desc } from 'drizzle-orm';
import { getTableColumns } from 'drizzle-orm';
import { NotFoundError, ValidationError } from '../../common/errors';
import { generateId, generateContractNumber } from '../../common/utils';
import { InAppNotificationService } from '../../infrastructure/notifications/in-app-notification.service';
import { AUDIT_PORT, AuditPort } from '../../common/audit.port';

@Injectable()
export class ContractsService {
  constructor(
    private readonly db: DatabaseService,
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
      .where(eq(students.userId, userId));
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
      .innerJoin(registrationPrices, eq(registrationPrices.id, contracts.registrationPriceId));

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

      await txn.insert(contracts).values({
        id: newContractId,
        registrationId: enrollmentId,
        registrationPriceId: price[0].id,
        contractNumber,
        contractStatus: 'GENERATED',
        selectedAddressId: reg[0].selectedAddressId,
        generatedByAdminId: adminId,
        generatedAt: new Date(),
        contractDataSnapshot: JSON.stringify({ price: price[0] }),
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

  async accept(contractId: string, userId: string) {
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
        throw new ValidationError('Contract cannot be accepted in its current state.');
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
        eventId: `CONTRACT_ACCEPTED:${contractId}:${userId}`,
        userId,
        notificationType: 'CONTRACT_ACCEPTED',
        title: 'قرارداد پذیرفته شد',
        message: 'پذیرش قرارداد با موفقیت ثبت شد.',
        relatedEntityType: 'CONTRACT',
        relatedEntityId: contractId,
      });
      await this.audit.recordInTransaction(txn, {
        actorType: 'PARENT',
        actorId: userId,
        action: 'CONTRACT_ACCEPTED',
        entityType: 'CONTRACT',
        entityId: contractId,
        previousValues: { contractStatus: contract.contractStatus },
        newValues: {
          contractStatus: 'ACCEPTED',
          registrationStatus: 'CONTRACT_ACCEPTED',
          planId: plan[0].id,
        },
      });
    });

    return this.getDetails(contractId, userId);
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
