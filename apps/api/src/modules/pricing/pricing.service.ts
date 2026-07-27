import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../../database/database.service';
import {
  paymentPlans,
  paymentScheduleItems,
  registrationPrices,
  serviceRegistrations,
  students,
} from '../../database/schemas';
import { eq, and } from 'drizzle-orm';
import { NotFoundError, ValidationError, ConflictError } from '../../common/errors';
import { calculateInstallmentAmounts, generateId } from '../../common/utils';
import { addMonths } from 'date-fns';
import { InAppNotificationService } from '../../infrastructure/notifications/in-app-notification.service';

@Injectable()
export class PricingService {
  constructor(
    private readonly db: DatabaseService,
    private readonly notifications: InAppNotificationService,
  ) {}

  async getByRegistration(registrationId: string) {
    return this.db.db
      .select()
      .from(registrationPrices)
      .where(eq(registrationPrices.registrationId, registrationId))
      .orderBy(registrationPrices.versionNumber);
  }

  async getByRegistrationForFamily(registrationId: string, userId: string) {
    const owned = await this.db.db
      .select({ id: serviceRegistrations.id })
      .from(serviceRegistrations)
      .innerJoin(students, eq(students.id, serviceRegistrations.studentId))
      .where(and(eq(serviceRegistrations.id, registrationId), eq(students.userId, userId)))
      .limit(1);
    if (!owned[0]) throw new NotFoundError('Registration', registrationId);
    return this.getByRegistration(registrationId);
  }

  async getLatest(registrationId: string) {
    const prices = await this.getByRegistration(registrationId);
    return prices.length > 0 ? prices[prices.length - 1] : null;
  }

  async create(
    registrationId: string,
    adminId: string,
    data: {
      totalAmount: number;
      currency?: string;
      fullPaymentAllowed?: boolean;
      installmentPaymentAllowed?: boolean;
      prepaymentAmount?: number;
      installmentCount?: number;
      description?: string;
    },
  ) {
    const existing = await this.getLatest(registrationId);
    const versionNumber = existing ? existing.versionNumber + 1 : 1;

    if (existing && existing.priceStatus === 'ACCEPTED') {
      throw new ConflictError(
        'PRICE_ALREADY_ACCEPTED',
        'Price has already been accepted. Create a new contract version.',
      );
    }

    const id = generateId();
    await this.db.db.insert(registrationPrices).values({
      id,
      registrationId,
      versionNumber,
      totalAmount: data.totalAmount,
      currency: data.currency || 'IRR',
      fullPaymentAllowed: data.fullPaymentAllowed ?? true,
      installmentPaymentAllowed: data.installmentPaymentAllowed ?? true,
      prepaymentAmount: data.prepaymentAmount || 0,
      installmentCount: data.installmentCount || 4,
      priceStatus: 'OFFERED',
      setByAdminId: adminId,
    });

    if (existing && existing.priceStatus !== 'ACCEPTED') {
      await this.db.db
        .update(registrationPrices)
        .set({ priceStatus: 'REPLACED', replacedByPriceId: id, updatedAt: new Date() })
        .where(eq(registrationPrices.id, existing.id));
    }

    const [owner] = await this.db.db
      .select({ userId: students.userId })
      .from(serviceRegistrations)
      .innerJoin(students, eq(students.id, serviceRegistrations.studentId))
      .where(eq(serviceRegistrations.id, registrationId))
      .limit(1);
    if (owner) {
      await this.notifications.create({
        userId: owner.userId,
        notificationType: 'PRICE_OFFERED',
        title: 'قیمت سرویس اعلام شد',
        message: `قیمت پیشنهادی ${data.totalAmount.toLocaleString('fa-IR')} ریال است. لطفاً آن را بررسی کنید.`,
        relatedEntityType: 'REGISTRATION',
        relatedEntityId: registrationId,
      });
    }

    return this.getByRegistration(registrationId);
  }

  async acceptPrice(priceId: string, userId: string) {
    const price = await this.db.db
      .select()
      .from(registrationPrices)
      .where(eq(registrationPrices.id, priceId))
      .limit(1);

    if (price.length === 0) throw new NotFoundError('Price');
    if (price[0].priceStatus !== 'OFFERED') {
      throw new ValidationError('This price is not available for acceptance.');
    }

    const reg = await this.db.db
      .select({ registration: serviceRegistrations })
      .from(serviceRegistrations)
      .innerJoin(students, eq(students.id, serviceRegistrations.studentId))
      .where(and(eq(serviceRegistrations.id, price[0].registrationId), eq(students.userId, userId)))
      .limit(1);

    if (reg.length === 0) throw new NotFoundError('Registration');
    if (reg[0].registration.registrationStatus !== 'APPROVED') {
      throw new ValidationError('Registration must be approved before accepting a price.');
    }

    await this.db.db
      .update(registrationPrices)
      .set({ priceStatus: 'ACCEPTED', parentConfirmedAt: new Date(), updatedAt: new Date() })
      .where(eq(registrationPrices.id, priceId));

    await this.db.db
      .update(serviceRegistrations)
      .set({ registrationStatus: 'CONTRACT_PENDING', updatedAt: new Date() })
      .where(eq(serviceRegistrations.id, reg[0].registration.id));

    await this.notifications.create({
      userId,
      notificationType: 'PRICE_ACCEPTED',
      title: 'قیمت پذیرفته شد',
      message: 'پذیرش قیمت ثبت شد و درخواست وارد مرحله صدور قرارداد شد.',
      relatedEntityType: 'REGISTRATION',
      relatedEntityId: price[0].registrationId,
    });

    return priceId;
  }

  async createPaymentPlan(priceId: string, planType: 'FULL' | 'PREPAYMENT_PLUS_FOUR_INSTALLMENTS') {
    const [existing] = await this.db.db
      .select({ id: paymentPlans.id })
      .from(paymentPlans)
      .where(eq(paymentPlans.registrationPriceId, priceId))
      .limit(1);
    if (existing) return existing.id;
    const [price] = await this.db.db
      .select()
      .from(registrationPrices)
      .where(eq(registrationPrices.id, priceId))
      .limit(1);
    if (!price) throw new NotFoundError('Price');

    const id = generateId();
    const isFull = planType === 'FULL';
    const prepayment = isFull ? price.totalAmount : price.prepaymentAmount;
    const installments = isFull
      ? []
      : calculateInstallmentAmounts(price.totalAmount, prepayment, price.installmentCount);
    await this.db.db.insert(paymentPlans).values({
      id,
      registrationPriceId: price.id,
      planType,
      totalAmount: price.totalAmount,
      prepaymentAmount: prepayment,
      remainingInstallmentAmount: price.totalAmount - prepayment,
      installmentCount: isFull ? 1 : price.installmentCount,
      planStatus: 'PENDING',
    });
    const now = new Date();
    await this.db.db.insert(paymentScheduleItems).values({
      id: generateId(),
      paymentPlanId: id,
      itemType: 'PREPAYMENT',
      sequenceNumber: 0,
      amount: prepayment,
      dueDate: now,
    });
    if (installments.length) {
      await this.db.db.insert(paymentScheduleItems).values(
        installments.map((amount, index) => ({
          id: generateId(),
          paymentPlanId: id,
          itemType: 'INSTALLMENT',
          sequenceNumber: index + 1,
          amount,
          dueDate: addMonths(now, index + 1),
        })),
      );
    }
    return id;
  }
}
