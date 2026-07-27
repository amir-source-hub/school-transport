import { Inject, Injectable } from '@nestjs/common';
import { DatabaseService } from '../../database/database.service';
import {
  paymentTransactions,
  paymentScheduleItems,
  paymentPlans,
  registrationPrices,
  serviceRegistrations,
  students,
  parents,
} from '../../database/schemas';
import { eq, and } from 'drizzle-orm';
import { NotFoundError, ConflictError, ValidationError } from '../../common/errors';
import { generateId } from '../../common/utils';
import { assertGatewayVerification, PAYMENT_GATEWAY, PaymentGateway } from './payment-gateway';
import { InAppNotificationService } from '../../infrastructure/notifications/in-app-notification.service';

@Injectable()
export class PaymentsService {
  constructor(
    private readonly db: DatabaseService,
    @Inject(PAYMENT_GATEWAY) private readonly gateway: PaymentGateway,
    private readonly notifications: InAppNotificationService,
  ) {}

  private async getOwnedScheduleItem(scheduleItemId: string, userId: string) {
    const result = await this.db.db
      .select({ item: paymentScheduleItems })
      .from(paymentScheduleItems)
      .innerJoin(paymentPlans, eq(paymentPlans.id, paymentScheduleItems.paymentPlanId))
      .innerJoin(registrationPrices, eq(registrationPrices.id, paymentPlans.registrationPriceId))
      .innerJoin(
        serviceRegistrations,
        eq(serviceRegistrations.id, registrationPrices.registrationId),
      )
      .innerJoin(students, eq(students.id, serviceRegistrations.studentId))
      .where(and(eq(paymentScheduleItems.id, scheduleItemId), eq(students.userId, userId)))
      .limit(1);

    if (result.length === 0) throw new NotFoundError('Schedule item');
    return result[0].item;
  }

  async startOnlinePayment(scheduleItemId: string, userId: string, idempotencyKey: string) {
    const item = await this.getOwnedScheduleItem(scheduleItemId, userId);
    if (item.itemStatus === 'PAID') {
      throw new ConflictError('PAYMENT_ALREADY_COMPLETED', 'This item has already been paid.');
    }

    const existing = await this.db.db
      .select()
      .from(paymentTransactions)
      .where(eq(paymentTransactions.idempotencyKey, idempotencyKey))
      .limit(1);
    if (existing.length > 0) return existing[0];

    const txId = generateId();
    await this.db.db.insert(paymentTransactions).values({
      id: txId,
      paymentPlanId: item.paymentPlanId,
      paymentScheduleItemId: scheduleItemId,
      userId,
      amount: item.amount,
      paymentMethod: 'ONLINE_GATEWAY',
      idempotencyKey,
      transactionStatus: 'CREATED',
    });

    return this.db.db
      .select()
      .from(paymentTransactions)
      .where(eq(paymentTransactions.id, txId))
      .limit(1)
      .then((r) => r[0]);
  }

  async verifyOnlinePayment(txId: string, userId: string, gatewayAuthority: string) {
    const tx = await this.db.db
      .select()
      .from(paymentTransactions)
      .where(and(eq(paymentTransactions.id, txId), eq(paymentTransactions.userId, userId)))
      .limit(1);
    if (tx.length === 0) throw new NotFoundError('Transaction');

    if (tx[0].transactionStatus === 'SUCCEEDED') {
      return tx[0];
    }

    const gatewayResult = await this.gateway.verify({
      authority: gatewayAuthority,
      amount: tx[0].amount,
    });
    const gatewayTransactionId = assertGatewayVerification(tx[0].amount, gatewayResult);

    const result = await this.db.db.transaction(async (txn) => {
      const item = await txn
        .select()
        .from(paymentScheduleItems)
        .where(eq(paymentScheduleItems.id, tx[0].paymentScheduleItemId))
        .for('update')
        .limit(1);

      if (item[0].itemStatus === 'PAID') {
        throw new ConflictError('PAYMENT_ALREADY_COMPLETED', 'Already paid.');
      }

      await txn
        .update(paymentTransactions)
        .set({
          transactionStatus: 'SUCCEEDED',
          gatewayTransactionId,
          verifiedAt: new Date(),
        })
        .where(eq(paymentTransactions.id, txId));

      await txn
        .update(paymentScheduleItems)
        .set({
          itemStatus: 'PAID',
          paidAmount: tx[0].amount,
          paidAt: new Date(),
        })
        .where(eq(paymentScheduleItems.id, tx[0].paymentScheduleItemId));

      const planItems = await txn
        .select()
        .from(paymentScheduleItems)
        .where(eq(paymentScheduleItems.paymentPlanId, tx[0].paymentPlanId));

      const allPaid = planItems.every((i) => i.itemStatus === 'PAID');
      const prepaid = planItems.some((i) => i.itemType === 'PREPAYMENT' && i.itemStatus === 'PAID');

      if (prepaid) {
        await txn
          .update(paymentPlans)
          .set({
            planStatus: prepaid ? (allPaid ? 'COMPLETED' : 'ACTIVE') : 'PENDING',
            activatedAt: new Date(),
          })
          .where(eq(paymentPlans.id, tx[0].paymentPlanId));
        const [registration] = await txn
          .select({ id: serviceRegistrations.id })
          .from(paymentPlans)
          .innerJoin(
            registrationPrices,
            eq(registrationPrices.id, paymentPlans.registrationPriceId),
          )
          .innerJoin(
            serviceRegistrations,
            eq(serviceRegistrations.id, registrationPrices.registrationId),
          )
          .where(eq(paymentPlans.id, tx[0].paymentPlanId))
          .limit(1);
        if (registration) {
          await txn
            .update(serviceRegistrations)
            .set({ registrationStatus: 'ENROLLED', updatedAt: new Date() })
            .where(eq(serviceRegistrations.id, registration.id));
        }
      }

      return txn
        .select()
        .from(paymentTransactions)
        .where(eq(paymentTransactions.id, txId))
        .limit(1)
        .then((r) => r[0]);
    });
    await this.notifications.create({
      userId,
      notificationType: 'PAYMENT_SUCCEEDED',
      title: 'پرداخت با موفقیت انجام شد',
      message: `پرداخت ${tx[0].amount.toLocaleString('fa-IR')} ریال با موفقیت ثبت شد.`,
      relatedEntityType: 'PAYMENT',
      relatedEntityId: txId,
    });
    return result;
  }

  async createOfflineSubmission(
    scheduleItemId: string,
    userId: string,
    _data: {
      paidAt: string;
      referenceNumber: string;
      description?: string;
    },
  ) {
    const item = await this.getOwnedScheduleItem(scheduleItemId, userId);
    if (item.itemStatus === 'PAID') {
      throw new ConflictError('PAYMENT_ALREADY_COMPLETED', 'Already paid.');
    }

    const txId = generateId();
    await this.db.db.insert(paymentTransactions).values({
      id: txId,
      paymentPlanId: item.paymentPlanId,
      paymentScheduleItemId: scheduleItemId,
      userId,
      amount: item.amount,
      paymentMethod: 'MANUAL_ADMIN_ENTRY',
      gatewayTransactionId: _data.referenceNumber,
      transactionStatus: 'CREATED',
    });

    return txId;
  }

  async approveOfflinePayment(txId: string, adminId: string) {
    const result = await this.db.db.transaction(async (txn) => {
      const tx = await txn
        .select()
        .from(paymentTransactions)
        .where(eq(paymentTransactions.id, txId))
        .limit(1);
      if (tx.length === 0) throw new NotFoundError('Transaction');

      if (tx[0].transactionStatus === 'SUCCEEDED') {
        throw new ConflictError('PAYMENT_ALREADY_COMPLETED', 'Already processed.');
      }

      const item = await txn
        .select()
        .from(paymentScheduleItems)
        .where(eq(paymentScheduleItems.id, tx[0].paymentScheduleItemId))
        .for('update')
        .limit(1);

      if (item[0].itemStatus === 'PAID') {
        throw new ConflictError('PAYMENT_ALREADY_COMPLETED', 'Schedule item already paid.');
      }

      await txn
        .update(paymentTransactions)
        .set({
          transactionStatus: 'SUCCEEDED',
          recordedByAdminId: adminId,
          verifiedAt: new Date(),
        })
        .where(eq(paymentTransactions.id, txId));

      await txn
        .update(paymentScheduleItems)
        .set({
          itemStatus: 'PAID',
          paidAmount: tx[0].amount,
          paidAt: new Date(),
        })
        .where(eq(paymentScheduleItems.id, tx[0].paymentScheduleItemId));

      if (item[0].itemType === 'PREPAYMENT') {
        await txn
          .update(paymentPlans)
          .set({ planStatus: 'ACTIVE', activatedAt: new Date(), updatedAt: new Date() })
          .where(eq(paymentPlans.id, tx[0].paymentPlanId));
        const [registration] = await txn
          .select({ id: serviceRegistrations.id })
          .from(paymentPlans)
          .innerJoin(
            registrationPrices,
            eq(registrationPrices.id, paymentPlans.registrationPriceId),
          )
          .innerJoin(
            serviceRegistrations,
            eq(serviceRegistrations.id, registrationPrices.registrationId),
          )
          .where(eq(paymentPlans.id, tx[0].paymentPlanId))
          .limit(1);
        if (registration) {
          await txn
            .update(serviceRegistrations)
            .set({ registrationStatus: 'ENROLLED', updatedAt: new Date() })
            .where(eq(serviceRegistrations.id, registration.id));
        }
      }

      return tx[0];
    });
    if (result.userId) {
      await this.notifications.create({
        userId: result.userId,
        notificationType: 'PAYMENT_APPROVED',
        title: 'پرداخت تأیید شد',
        message: `پرداخت ${result.amount.toLocaleString('fa-IR')} ریال توسط مدیریت تأیید شد.`,
        relatedEntityType: 'PAYMENT',
        relatedEntityId: txId,
      });
    }
    return result;
  }

  async rejectOfflinePayment(txId: string, adminId: string, reason?: string) {
    const tx = await this.db.db
      .select()
      .from(paymentTransactions)
      .where(eq(paymentTransactions.id, txId))
      .limit(1);
    if (tx.length === 0) throw new NotFoundError('Transaction');

    await this.db.db
      .update(paymentTransactions)
      .set({
        transactionStatus: 'FAILED',
        failureCode: 'REJECTED',
        failureMessage: reason || null,
        recordedByAdminId: adminId,
      })
      .where(eq(paymentTransactions.id, txId));

    if (tx[0].userId) {
      await this.notifications.create({
        userId: tx[0].userId,
        notificationType: 'PAYMENT_REJECTED',
        title: 'پرداخت تأیید نشد',
        message: reason || 'پرداخت ارسالی توسط مدیریت رد شد. لطفاً اطلاعات پرداخت را بررسی کنید.',
        relatedEntityType: 'PAYMENT',
        relatedEntityId: txId,
      });
    }

    return { rejected: true };
  }

  async getPayments(userId: string) {
    return this.db.db
      .select()
      .from(paymentTransactions)
      .where(
        and(
          eq(paymentTransactions.userId, userId),
          eq(paymentTransactions.paymentMethod, 'MANUAL_ADMIN_ENTRY'),
        ),
      );
  }

  async getOverview(userId: string) {
    const plans = await this.db.db
      .select({
        plan: paymentPlans,
        studentId: students.id,
        studentFirstName: students.firstName,
        studentLastName: students.lastName,
      })
      .from(paymentPlans)
      .innerJoin(registrationPrices, eq(registrationPrices.id, paymentPlans.registrationPriceId))
      .innerJoin(
        serviceRegistrations,
        eq(serviceRegistrations.id, registrationPrices.registrationId),
      )
      .innerJoin(students, eq(students.id, serviceRegistrations.studentId))
      .where(eq(students.userId, userId));

    return Promise.all(
      plans.map(async ({ plan, ...student }) => {
        const [items, transactions] = await Promise.all([
          this.db.db
            .select()
            .from(paymentScheduleItems)
            .where(eq(paymentScheduleItems.paymentPlanId, plan.id)),
          this.db.db
            .select()
            .from(paymentTransactions)
            .where(eq(paymentTransactions.paymentPlanId, plan.id)),
        ]);
        return { plan, ...student, items, transactions };
      }),
    );
  }

  async getAllForAdmin() {
    const rows = await this.db.db
      .select({
        transaction: paymentTransactions,
        item: paymentScheduleItems,
        studentFirstName: students.firstName,
        studentLastName: students.lastName,
        userId: students.userId,
        planType: paymentPlans.planType,
        remainingAmount: paymentPlans.remainingInstallmentAmount,
      })
      .from(paymentTransactions)
      .innerJoin(
        paymentScheduleItems,
        eq(paymentScheduleItems.id, paymentTransactions.paymentScheduleItemId),
      )
      .innerJoin(paymentPlans, eq(paymentPlans.id, paymentTransactions.paymentPlanId))
      .innerJoin(registrationPrices, eq(registrationPrices.id, paymentPlans.registrationPriceId))
      .innerJoin(
        serviceRegistrations,
        eq(serviceRegistrations.id, registrationPrices.registrationId),
      )
      .innerJoin(students, eq(students.id, serviceRegistrations.studentId));
    const parentRows = await this.db.db.select().from(parents);
    return rows.map(
      ({
        transaction,
        item,
        studentFirstName,
        studentLastName,
        userId,
        planType,
        remainingAmount,
      }) => {
      const parent =
        parentRows.find((entry) => entry.userId === userId && entry.isPrimaryContact) ??
        parentRows.find((entry) => entry.userId === userId);
      return {
        id: transaction.id,
        planId: transaction.paymentPlanId,
        planType,
        planConfigured: remainingAmount > 0,
        studentName: `${studentFirstName} ${studentLastName}`,
        familyName: parent ? `${parent.firstName} ${parent.lastName}` : '—',
        invoice: item.itemType === 'PREPAYMENT' ? 'پیش‌پرداخت' : `قسط ${item.sequenceNumber}`,
        expectedAmount: item.amount,
        submittedAmount: transaction.amount,
        reference: transaction.gatewayTransactionId ?? '—',
        paidAt: transaction.verifiedAt?.toISOString() ?? transaction.requestedAt.toISOString(),
        status:
          transaction.transactionStatus === 'SUCCEEDED'
            ? 'تأییدشده'
            : transaction.transactionStatus === 'FAILED'
              ? 'ردشده'
              : 'در انتظار بررسی',
      };
      },
    );
  }

  async configureInstallments(planId: string, items: { amount: number; dueDate: string }[]) {
    if (items.length < 1 || items.length > 12) {
      throw new ValidationError('Installment count must be between 1 and 12.');
    }
    if (
      items.some(
        (item) =>
          !Number.isInteger(item.amount) ||
          item.amount <= 0 ||
          Number.isNaN(Date.parse(item.dueDate)),
      )
    ) {
      throw new ValidationError('Each installment requires a valid amount and due date.');
    }
    const result = await this.db.db.transaction(async (txn) => {
      const [plan] = await txn
        .select()
        .from(paymentPlans)
        .where(eq(paymentPlans.id, planId))
        .limit(1);
      if (!plan) throw new NotFoundError('Payment plan', planId);
      if (plan.planType === 'FULL' && items.length !== 1) {
        throw new ValidationError('Full payment requires exactly one remaining payment.');
      }
      const remaining = items.reduce((sum, item) => sum + item.amount, 0);
      const total = plan.prepaymentAmount + remaining;
      await txn
        .delete(paymentScheduleItems)
        .where(
          and(
            eq(paymentScheduleItems.paymentPlanId, planId),
            eq(paymentScheduleItems.itemType, 'INSTALLMENT'),
          ),
        );
      await txn.insert(paymentScheduleItems).values(
        items.map((item, index) => ({
          id: generateId(),
          paymentPlanId: planId,
          itemType: 'INSTALLMENT',
          sequenceNumber: index + 1,
          amount: item.amount,
          dueDate: new Date(item.dueDate),
        })),
      );
      await txn
        .update(paymentPlans)
        .set({
          planType: plan.planType === 'FULL' ? 'FULL' : 'ADMIN_CONFIGURED',
          totalAmount: total,
          remainingInstallmentAmount: remaining,
          installmentCount: items.length,
          updatedAt: new Date(),
        })
        .where(eq(paymentPlans.id, planId));
      return { planId, totalAmount: total, installmentCount: items.length };
    });
    const [owner] = await this.db.db
      .select({ userId: students.userId })
      .from(paymentPlans)
      .innerJoin(registrationPrices, eq(registrationPrices.id, paymentPlans.registrationPriceId))
      .innerJoin(
        serviceRegistrations,
        eq(serviceRegistrations.id, registrationPrices.registrationId),
      )
      .innerJoin(students, eq(students.id, serviceRegistrations.studentId))
      .where(eq(paymentPlans.id, planId))
      .limit(1);
    if (owner) {
      await this.notifications.create({
        userId: owner.userId,
        notificationType: 'PAYMENT_PLAN_READY',
        title: 'برنامه پرداخت آماده است',
        message:
          items.length === 1
            ? 'مبلغ باقی‌مانده و تاریخ پرداخت یکجا توسط مدیریت ثبت شد.'
            : 'مبالغ و تاریخ‌های برنامه اقساط توسط مدیریت ثبت شد.',
        relatedEntityType: 'PAYMENT_PLAN',
        relatedEntityId: planId,
      });
    }
    return result;
  }
}
