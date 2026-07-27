import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../../database/database.service';
import {
  contracts,
  serviceRegistrations,
  registrationPrices,
  paymentPlans,
  students,
} from '../../database/schemas';
import { eq, and } from 'drizzle-orm';
import { getTableColumns } from 'drizzle-orm';
import { NotFoundError, ValidationError } from '../../common/errors';
import { generateId, generateContractNumber } from '../../common/utils';
import { InAppNotificationService } from '../../infrastructure/notifications/in-app-notification.service';

@Injectable()
export class ContractsService {
  constructor(
    private readonly db: DatabaseService,
    private readonly notifications: InAppNotificationService,
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
    return this.db.db
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
    const reg = await this.db.db
      .select()
      .from(serviceRegistrations)
      .where(eq(serviceRegistrations.id, enrollmentId))
      .limit(1);
    if (reg.length === 0) throw new NotFoundError('Registration', enrollmentId);

    if (
      reg[0].registrationStatus !== 'APPROVED' &&
      reg[0].registrationStatus !== 'CONTRACT_PENDING'
    ) {
      throw new ValidationError('Registration must be approved before generating a contract.');
    }

    if (!reg[0].selectedAddressId) {
      throw new ValidationError('A pickup address must be selected before contract generation.');
    }

    const price = await this.db.db
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

    const contractId = generateId();
    const contractNumber = generateContractNumber();

    await this.db.db.insert(contracts).values({
      id: contractId,
      registrationId: enrollmentId,
      registrationPriceId: price[0].id,
      contractNumber,
      contractStatus: 'GENERATED',
      selectedAddressId: reg[0].selectedAddressId,
      generatedByAdminId: adminId,
      generatedAt: new Date(),
      contractDataSnapshot: JSON.stringify({ price: price[0] }),
    });

    await this.db.db
      .update(serviceRegistrations)
      .set({ registrationStatus: 'CONTRACT_READY', updatedAt: new Date() })
      .where(eq(serviceRegistrations.id, enrollmentId));

    const [owner] = await this.db.db
      .select({ userId: students.userId })
      .from(serviceRegistrations)
      .innerJoin(students, eq(students.id, serviceRegistrations.studentId))
      .where(eq(serviceRegistrations.id, enrollmentId))
      .limit(1);
    if (owner) {
      await this.notifications.create({
        userId: owner.userId,
        notificationType: 'CONTRACT_READY',
        title: 'قرارداد آماده بررسی است',
        message: 'قرارداد سرویس صادر شد. لطفاً متن و برنامه پرداخت را بررسی کنید.',
        relatedEntityType: 'CONTRACT',
        relatedEntityId: contractId,
      });
    }

    return this.getById(contractId);
  }

  async accept(contractId: string, userId: string) {
    const contract = await this.getById(contractId, userId);

    if (contract.contractStatus !== 'GENERATED') {
      throw new ValidationError('Contract cannot be accepted in its current state.');
    }

    const plan = await this.db.db
      .select()
      .from(paymentPlans)
      .where(eq(paymentPlans.registrationPriceId, contract.registrationPriceId))
      .limit(1);

    if (plan.length === 0) {
      throw new ValidationError('Payment plan must be created before accepting the contract.');
    }

    await this.db.db
      .update(contracts)
      .set({
        contractStatus: 'ACCEPTED',
        acceptedAt: new Date(),
        paymentPlanId: plan[0].id,
      })
      .where(eq(contracts.id, contractId));

    await this.db.db
      .update(serviceRegistrations)
      .set({ registrationStatus: 'CONTRACT_ACCEPTED', updatedAt: new Date() })
      .where(eq(serviceRegistrations.id, contract.registrationId));

    await this.notifications.create({
      userId,
      notificationType: 'CONTRACT_ACCEPTED',
      title: 'قرارداد پذیرفته شد',
      message: 'پذیرش قرارداد با موفقیت ثبت شد.',
      relatedEntityType: 'CONTRACT',
      relatedEntityId: contractId,
    });

    return this.getDetails(contractId, userId);
  }

  async reject(contractId: string, userId: string) {
    const contract = await this.getById(contractId, userId);
    if (contract.contractStatus !== 'GENERATED') {
      throw new ValidationError('Contract cannot be rejected in its current state.');
    }
    await this.db.db
      .update(contracts)
      .set({ contractStatus: 'REJECTED' })
      .where(eq(contracts.id, contractId));
    await this.db.db
      .update(serviceRegistrations)
      .set({ registrationStatus: 'CONTRACT_PENDING', updatedAt: new Date() })
      .where(eq(serviceRegistrations.id, contract.registrationId));
    await this.notifications.create({
      userId,
      notificationType: 'CONTRACT_REJECTED',
      title: 'قرارداد رد شد',
      message: 'رد قرارداد ثبت شد و درخواست برای بازبینی به مدیریت بازگشت.',
      relatedEntityType: 'CONTRACT',
      relatedEntityId: contractId,
    });
    return this.getDetails(contractId, userId);
  }
}
