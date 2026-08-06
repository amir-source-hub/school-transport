import { Inject, Injectable } from '@nestjs/common';
import { DatabaseService } from '../../database/database.service';
import { registrationPrices, serviceRegistrations, students } from '../../database/schemas';
import { eq, and, desc } from 'drizzle-orm';
import { NotFoundError, ValidationError, ConflictError } from '../../common/errors';
import { generateId } from '../../common/utils';
import { InAppNotificationService } from '../../infrastructure/notifications/in-app-notification.service';
import { createPaymentPlanInTransaction, PaymentPlanType } from '../../database/payment-plan';
import { AUDIT_PORT, AuditPort } from '../../common/audit.port';

@Injectable()
export class PricingService {
  constructor(
    private readonly db: DatabaseService,
    private readonly notifications: InAppNotificationService,
    @Inject(AUDIT_PORT) private readonly audit: AuditPort,
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
    await this.db.db.transaction(async (txn) => {
      const [registration] = await txn
        .select({ id: serviceRegistrations.id })
        .from(serviceRegistrations)
        .where(eq(serviceRegistrations.id, registrationId))
        .for('update')
        .limit(1);
      if (!registration) throw new NotFoundError('Registration', registrationId);

      const [existing] = await txn
        .select()
        .from(registrationPrices)
        .where(eq(registrationPrices.registrationId, registrationId))
        .orderBy(desc(registrationPrices.versionNumber))
        .limit(1);
      if (existing?.priceStatus === 'ACCEPTED') {
        throw new ConflictError(
          'PRICE_ALREADY_ACCEPTED',
          'Price has already been accepted. Create a new contract version.',
        );
      }

      const id = generateId();
      await txn.insert(registrationPrices).values({
        id,
        registrationId,
        versionNumber: (existing?.versionNumber ?? 0) + 1,
        totalAmount: data.totalAmount,
        currency: data.currency || 'IRR',
        fullPaymentAllowed: data.fullPaymentAllowed ?? true,
        installmentPaymentAllowed: data.installmentPaymentAllowed ?? true,
        prepaymentAmount: data.prepaymentAmount || 0,
        installmentCount: data.installmentCount || 4,
        priceStatus: 'OFFERED',
        setByAdminId: adminId,
      });
      if (existing) {
        const [replaced] = await txn
          .update(registrationPrices)
          .set({ priceStatus: 'REPLACED', replacedByPriceId: id, updatedAt: new Date() })
          .where(
            and(
              eq(registrationPrices.id, existing.id),
              eq(registrationPrices.priceStatus, existing.priceStatus),
            ),
          )
          .returning({ id: registrationPrices.id });
        if (!replaced) {
          throw new ConflictError(
            'PRICE_STATE_CHANGED',
            'Price state changed while the replacement was being created.',
          );
        }
      }
      const [owner] = await txn
        .select({ userId: students.userId })
        .from(serviceRegistrations)
        .innerJoin(students, eq(students.id, serviceRegistrations.studentId))
        .where(eq(serviceRegistrations.id, registrationId))
        .limit(1);
      if (owner) {
        await this.notifications.enqueueInTransaction(txn, {
          eventId: `PRICE_OFFERED:${id}:${owner.userId}`,
          userId: owner.userId,
          notificationType: 'PRICE_OFFERED',
          title: 'قیمت سرویس اعلام شد',
          message: `قیمت پیشنهادی ${data.totalAmount.toLocaleString('fa-IR')} ریال است. لطفاً آن را بررسی کنید.`,
          relatedEntityType: 'REGISTRATION',
          relatedEntityId: registrationId,
        });
      }
      await this.audit.recordInTransaction(txn, {
        actorType: 'ADMIN',
        actorId: adminId,
        action: 'PRICE_OFFERED',
        entityType: 'PRICE',
        entityId: id,
        previousValues: existing
          ? { priceStatus: existing.priceStatus, totalAmount: existing.totalAmount }
          : undefined,
        newValues: {
          registrationId,
          priceStatus: 'OFFERED',
          totalAmount: data.totalAmount,
          prepaymentAmount: data.prepaymentAmount || 0,
          installmentCount: data.installmentCount || 4,
        },
      });
    });

    return this.getByRegistration(registrationId);
  }

  async acceptPrice(priceId: string, userId: string, planType: PaymentPlanType) {
    const result = await this.db.db.transaction(async (txn) => {
      const price = await txn
        .select()
        .from(registrationPrices)
        .where(eq(registrationPrices.id, priceId))
        .for('update')
        .limit(1);

      if (price.length === 0) throw new NotFoundError('Price');
      if (price[0].priceStatus !== 'OFFERED') {
        throw new ValidationError('This price is not available for acceptance.');
      }

      const reg = await txn
        .select({ registration: serviceRegistrations })
        .from(serviceRegistrations)
        .innerJoin(students, eq(students.id, serviceRegistrations.studentId))
        .where(
          and(eq(serviceRegistrations.id, price[0].registrationId), eq(students.userId, userId)),
        )
        .for('update')
        .limit(1);

      if (reg.length === 0) throw new NotFoundError('Registration');
      if (reg[0].registration.registrationStatus !== 'APPROVED') {
        throw new ValidationError('Registration must be approved before accepting a price.');
      }

      const [accepted] = await txn
        .update(registrationPrices)
        .set({ priceStatus: 'ACCEPTED', parentConfirmedAt: new Date(), updatedAt: new Date() })
        .where(
          and(eq(registrationPrices.id, priceId), eq(registrationPrices.priceStatus, 'OFFERED')),
        )
        .returning({ id: registrationPrices.id });
      if (!accepted) {
        throw new ConflictError(
          'PRICE_ALREADY_PROCESSED',
          'This price has already been processed.',
        );
      }

      const [registrationUpdated] = await txn
        .update(serviceRegistrations)
        .set({ registrationStatus: 'CONTRACT_PENDING', updatedAt: new Date() })
        .where(
          and(
            eq(serviceRegistrations.id, reg[0].registration.id),
            eq(serviceRegistrations.registrationStatus, 'APPROVED'),
          ),
        )
        .returning({ id: serviceRegistrations.id });
      if (!registrationUpdated) {
        throw new ConflictError(
          'REGISTRATION_STATE_CHANGED',
          'Registration state changed while the price was being accepted.',
        );
      }
      const paymentPlanId = await createPaymentPlanInTransaction(txn, price[0], planType);
      await this.notifications.enqueueInTransaction(txn, {
        eventId: `PRICE_ACCEPTED:${priceId}:${userId}`,
        userId,
        notificationType: 'PRICE_ACCEPTED',
        title: 'قیمت پذیرفته شد',
        message: 'پذیرش قیمت ثبت شد و درخواست وارد مرحله صدور قرارداد شد.',
        relatedEntityType: 'REGISTRATION',
        relatedEntityId: price[0].registrationId,
      });
      await this.audit.recordInTransaction(txn, {
        actorType: 'PARENT',
        actorId: userId,
        action: 'PRICE_ACCEPTED',
        entityType: 'PRICE',
        entityId: priceId,
        previousValues: { priceStatus: price[0].priceStatus },
        newValues: {
          priceStatus: 'ACCEPTED',
          registrationStatus: 'CONTRACT_PENDING',
          planId: paymentPlanId,
          planType,
        },
      });
      return { paymentPlanId, registrationId: price[0].registrationId };
    });

    return result.paymentPlanId;
  }
}
