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
import { eq, and, inArray } from 'drizzle-orm';
import { NotFoundError, ConflictError, ValidationError } from '../../common/errors';
import { generateId } from '../../common/utils';
import { assertGatewayVerification, PAYMENT_GATEWAY, PaymentGateway } from './payment-gateway';
import { InAppNotificationService } from '../../infrastructure/notifications/in-app-notification.service';
import { createHash } from 'node:crypto';

const onlinePaymentResult = {
  id: paymentTransactions.id,
  paymentPlanId: paymentTransactions.paymentPlanId,
  paymentScheduleItemId: paymentTransactions.paymentScheduleItemId,
  amount: paymentTransactions.amount,
  paymentMethod: paymentTransactions.paymentMethod,
  transactionStatus: paymentTransactions.transactionStatus,
  requestedAt: paymentTransactions.requestedAt,
};

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

  private async getPaymentEventDetails(txId: string) {
    const [detail] = await this.db.db
      .select({
        amount: paymentTransactions.amount,
        verifiedAt: paymentTransactions.verifiedAt,
        requestedAt: paymentTransactions.requestedAt,
        itemType: paymentScheduleItems.itemType,
        sequenceNumber: paymentScheduleItems.sequenceNumber,
        studentFirstName: students.firstName,
        studentLastName: students.lastName,
        userId: students.userId,
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
      .innerJoin(students, eq(students.id, serviceRegistrations.studentId))
      .where(eq(paymentTransactions.id, txId))
      .limit(1);
    if (!detail) return null;
    const familyParents = await this.db.db
      .select()
      .from(parents)
      .where(eq(parents.userId, detail.userId));
    const parent = familyParents.find((item) => item.isPrimaryContact) ?? familyParents[0];
    const invoice =
      detail.itemType === 'PREPAYMENT'
        ? 'پیش‌پرداخت'
        : `قسط شماره ${detail.sequenceNumber.toLocaleString('fa-IR')}`;
    const parentName = parent ? `${parent.firstName} ${parent.lastName}` : 'خانواده';
    const studentName = `${detail.studentFirstName} ${detail.studentLastName}`;
    const amountToman = Math.round(detail.amount / 10).toLocaleString('fa-IR');
    const date = (detail.verifiedAt ?? detail.requestedAt).toLocaleString('fa-IR', {
      dateStyle: 'full',
      timeStyle: 'short',
      timeZone: 'Asia/Tehran',
    });
    return {
      userId: detail.userId,
      message: `${parentName}، ${invoice} دانش‌آموز ${studentName} را به مبلغ ${amountToman} تومان در تاریخ ${date} پرداخت کرد.`,
    };
  }

  async startOnlinePayment(scheduleItemId: string, userId: string, idempotencyKey: string) {
    const key = idempotencyKey.trim();
    if (!/^[A-Za-z0-9][A-Za-z0-9._:-]{7,127}$/.test(key)) {
      throw new ValidationError(
        'Idempotency-Key must be 8 to 128 characters using letters, numbers, dot, underscore, colon, or hyphen.',
      );
    }
    const item = await this.getOwnedScheduleItem(scheduleItemId, userId);
    if (item.itemStatus === 'PAID') {
      throw new ConflictError('PAYMENT_ALREADY_COMPLETED', 'This item has already been paid.');
    }

    const fingerprint = createHash('sha256')
      .update(`${userId}\0ONLINE_GATEWAY\0${scheduleItemId}\0${item.amount}`)
      .digest('hex');
    return this.db.db.transaction(async (txn) => {
      const [inserted] = await txn
        .insert(paymentTransactions)
        .values({
          id: generateId(),
          paymentPlanId: item.paymentPlanId,
          paymentScheduleItemId: scheduleItemId,
          userId,
          amount: item.amount,
          paymentMethod: 'ONLINE_GATEWAY',
          idempotencyKey: key,
          idempotencyFingerprint: fingerprint,
          transactionStatus: 'CREATED',
        })
        .onConflictDoNothing()
        .returning(onlinePaymentResult);
      if (inserted) return inserted;

      const [existing] = await txn
        .select({
          ...onlinePaymentResult,
          idempotencyFingerprint: paymentTransactions.idempotencyFingerprint,
        })
        .from(paymentTransactions)
        .where(
          and(
            eq(paymentTransactions.userId, userId),
            eq(paymentTransactions.paymentMethod, 'ONLINE_GATEWAY'),
            eq(paymentTransactions.idempotencyKey, key),
          ),
        )
        .limit(1);
      if (!existing) {
        throw new ConflictError(
          'IDEMPOTENCY_CONFLICT',
          'The payment request conflicts with an existing operation.',
        );
      }
      const legacyMatch =
        existing.idempotencyFingerprint === null &&
        existing.paymentScheduleItemId === scheduleItemId &&
        existing.amount === item.amount;
      if (existing.idempotencyFingerprint !== fingerprint && !legacyMatch) {
        throw new ConflictError(
          'IDEMPOTENCY_CONFLICT',
          'This idempotency key was already used for a different payment request.',
        );
      }
      return {
        id: existing.id,
        paymentPlanId: existing.paymentPlanId,
        paymentScheduleItemId: existing.paymentScheduleItemId,
        amount: existing.amount,
        paymentMethod: existing.paymentMethod,
        transactionStatus: existing.transactionStatus,
        requestedAt: existing.requestedAt,
      };
    });
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

      const allPaid = planItems.length > 0 && planItems.every((i) => i.itemStatus === 'PAID');
      const prepaid = planItems.some((i) => i.itemType === 'PREPAYMENT' && i.itemStatus === 'PAID');

      if (prepaid) {
        await txn
          .update(paymentPlans)
          .set({
            planStatus: allPaid ? 'COMPLETED' : 'ACTIVE',
            activatedAt: new Date(),
            completedAt: allPaid ? new Date() : null,
            updatedAt: new Date(),
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

      await this.notifications.enqueueInTransaction(txn, {
        eventId: `PAYMENT_SUCCEEDED:${txId}:${userId}`,
        userId,
        notificationType: 'PAYMENT_SUCCEEDED',
        title: 'پرداخت با موفقیت انجام شد',
        message: `پرداخت ${tx[0].amount.toLocaleString('fa-IR')} ریال با موفقیت ثبت شد.`,
        relatedEntityType: 'PAYMENT',
        relatedEntityId: txId,
      });

      return txn
        .select()
        .from(paymentTransactions)
        .where(eq(paymentTransactions.id, txId))
        .limit(1)
        .then((r) => r[0]);
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
    const [pendingSubmission] = await this.db.db
      .select({ id: paymentTransactions.id })
      .from(paymentTransactions)
      .where(
        and(
          eq(paymentTransactions.paymentScheduleItemId, scheduleItemId),
          eq(paymentTransactions.paymentMethod, 'MANUAL_ADMIN_ENTRY'),
          eq(paymentTransactions.transactionStatus, 'CREATED'),
        ),
      )
      .limit(1);
    if (pendingSubmission) {
      throw new ConflictError(
        'OFFLINE_PAYMENT_PENDING',
        'An offline payment receipt is already awaiting admin review for this installment.',
      );
    }
    const paidAt = new Date(_data.paidAt);
    if (Number.isNaN(paidAt.getTime()) || !_data.referenceNumber.trim()) {
      throw new ValidationError('A valid payment date and reference number are required.');
    }

    const txId = generateId();
    const [created] = await this.db.db
      .insert(paymentTransactions)
      .values({
        id: txId,
        paymentPlanId: item.paymentPlanId,
        paymentScheduleItemId: scheduleItemId,
        userId,
        amount: item.amount,
        paymentMethod: 'MANUAL_ADMIN_ENTRY',
        gatewayTransactionId: _data.referenceNumber.trim(),
        transactionStatus: 'CREATED',
        requestedAt: paidAt,
      })
      .onConflictDoNothing()
      .returning({ id: paymentTransactions.id });
    if (!created) {
      throw new ConflictError(
        'OFFLINE_PAYMENT_PENDING',
        'An offline payment receipt is already awaiting admin review for this installment.',
      );
    }

    return txId;
  }

  async approveOfflinePayment(txId: string, adminId: string) {
    const result = await this.db.db.transaction(async (txn) => {
      const tx = await txn
        .select()
        .from(paymentTransactions)
        .where(eq(paymentTransactions.id, txId))
        .for('update')
        .limit(1);
      if (tx.length === 0) throw new NotFoundError('Transaction');

      if (tx[0].paymentMethod !== 'MANUAL_ADMIN_ENTRY' || tx[0].transactionStatus !== 'CREATED') {
        throw new ConflictError(
          'OFFLINE_PAYMENT_NOT_PENDING',
          'Only a pending offline payment can be approved.',
        );
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

      const [approved] = await txn
        .update(paymentTransactions)
        .set({
          transactionStatus: 'SUCCEEDED',
          recordedByAdminId: adminId,
          verifiedAt: new Date(),
        })
        .where(
          and(
            eq(paymentTransactions.id, txId),
            eq(paymentTransactions.paymentMethod, 'MANUAL_ADMIN_ENTRY'),
            eq(paymentTransactions.transactionStatus, 'CREATED'),
          ),
        )
        .returning({ id: paymentTransactions.id });
      if (!approved) {
        throw new ConflictError(
          'OFFLINE_PAYMENT_NOT_PENDING',
          'Only a pending offline payment can be approved.',
        );
      }

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
      const prepaid = planItems.some(
        (scheduleItem) =>
          scheduleItem.itemType === 'PREPAYMENT' && scheduleItem.itemStatus === 'PAID',
      );
      const allPaid =
        planItems.length > 0 &&
        planItems.every((scheduleItem) => scheduleItem.itemStatus === 'PAID');

      if (prepaid) {
        await txn
          .update(paymentPlans)
          .set({
            planStatus: allPaid ? 'COMPLETED' : 'ACTIVE',
            activatedAt: new Date(),
            completedAt: allPaid ? new Date() : null,
            updatedAt: new Date(),
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

      if (tx[0].userId) {
        await this.notifications.enqueueInTransaction(txn, {
          eventId: `PAYMENT_APPROVED:${txId}:${tx[0].userId}`,
          userId: tx[0].userId,
          notificationType: 'PAYMENT_APPROVED',
          title: 'پرداخت تأیید شد',
          message: `پرداخت ${tx[0].amount.toLocaleString('fa-IR')} ریال توسط مدیریت تأیید شد.`,
          relatedEntityType: 'PAYMENT',
          relatedEntityId: txId,
        });
      }

      return tx[0];
    });
    return result;
  }

  async rejectOfflinePayment(txId: string, adminId: string, reason?: string) {
    await this.db.db.transaction(async (txn) => {
      const [pending] = await txn
        .select()
        .from(paymentTransactions)
        .where(eq(paymentTransactions.id, txId))
        .for('update')
        .limit(1);
      if (!pending) throw new NotFoundError('Transaction');
      if (
        pending.paymentMethod !== 'MANUAL_ADMIN_ENTRY' ||
        pending.transactionStatus !== 'CREATED'
      ) {
        throw new ConflictError(
          'OFFLINE_PAYMENT_NOT_PENDING',
          'Only a pending offline payment can be rejected.',
        );
      }
      const [rejected] = await txn
        .update(paymentTransactions)
        .set({
          transactionStatus: 'FAILED',
          failureCode: 'REJECTED',
          failureMessage: reason || null,
          recordedByAdminId: adminId,
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(paymentTransactions.id, txId),
            eq(paymentTransactions.paymentMethod, 'MANUAL_ADMIN_ENTRY'),
            eq(paymentTransactions.transactionStatus, 'CREATED'),
          ),
        )
        .returning();
      if (!rejected) {
        throw new ConflictError(
          'OFFLINE_PAYMENT_NOT_PENDING',
          'Only a pending offline payment can be rejected.',
        );
      }
      if (rejected.userId) {
        await this.notifications.enqueueInTransaction(txn, {
          eventId: `PAYMENT_REJECTED:${txId}:${rejected.userId}`,
          userId: rejected.userId,
          notificationType: 'PAYMENT_REJECTED',
          title: 'پرداخت تأیید نشد',
          message: reason || 'پرداخت ارسالی توسط مدیریت رد شد. لطفاً اطلاعات پرداخت را بررسی کنید.',
          relatedEntityType: 'PAYMENT',
          relatedEntityId: txId,
        });
      }
      return rejected;
    });

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
            .where(eq(paymentScheduleItems.paymentPlanId, plan.id))
            .orderBy(paymentScheduleItems.sequenceNumber),
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
    const plans = await this.db.db
      .select({
        plan: paymentPlans,
        studentId: students.id,
        studentFirstName: students.firstName,
        studentLastName: students.lastName,
        userId: students.userId,
      })
      .from(paymentPlans)
      .innerJoin(registrationPrices, eq(registrationPrices.id, paymentPlans.registrationPriceId))
      .innerJoin(
        serviceRegistrations,
        eq(serviceRegistrations.id, registrationPrices.registrationId),
      )
      .innerJoin(students, eq(students.id, serviceRegistrations.studentId));

    if (plans.length === 0) return [];

    const planIds = plans.map(({ plan }) => plan.id);
    const items = await this.db.db
      .select()
      .from(paymentScheduleItems)
      .where(inArray(paymentScheduleItems.paymentPlanId, planIds));
    const itemIds = items.map((item) => item.id);
    const transactions =
      itemIds.length === 0
        ? []
        : await this.db.db
            .select()
            .from(paymentTransactions)
            .where(inArray(paymentTransactions.paymentScheduleItemId, itemIds));
    const parentRows = await this.db.db.select().from(parents);

    return plans
      .map(({ plan, studentId, studentFirstName, studentLastName, userId }) => {
        const planItems = items
          .filter((item) => item.paymentPlanId === plan.id)
          .sort((a, b) => a.sequenceNumber - b.sequenceNumber);
        const prepayment = planItems.find((item) => item.itemType === 'PREPAYMENT');
        if (!prepayment) return null;
        const mapItem = (item: typeof paymentScheduleItems.$inferSelect) => {
          const itemTransactions = transactions
            .filter((transaction) => transaction.paymentScheduleItemId === item.id)
            .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
          const latestTransaction = itemTransactions[0];
          return {
            id: item.id,
            type: item.itemType,
            sequenceNumber: item.sequenceNumber,
            amount: item.amount,
            dueDate: item.dueDate?.toISOString() ?? null,
            paidAmount: item.paidAmount,
            paidAt: item.paidAt?.toISOString() ?? null,
            paid: item.itemStatus === 'PAID',
            transaction: latestTransaction
              ? {
                  id: latestTransaction.id,
                  submittedAmount: latestTransaction.amount,
                  reference: latestTransaction.gatewayTransactionId ?? '—',
                  submittedAt:
                    latestTransaction.verifiedAt?.toISOString() ??
                    latestTransaction.requestedAt.toISOString(),
                  status:
                    latestTransaction.transactionStatus === 'SUCCEEDED'
                      ? 'تأییدشده'
                      : latestTransaction.transactionStatus === 'FAILED'
                        ? 'ردشده'
                        : 'در انتظار بررسی',
                }
              : null,
          };
        };
        const parent =
          parentRows.find((entry) => entry.userId === userId && entry.isPrimaryContact) ??
          parentRows.find((entry) => entry.userId === userId);
        return {
          studentId,
          planId: plan.id,
          planType: plan.planType,
          planStatus: plan.planStatus,
          planConfigured: plan.planType === 'ADMIN_CONFIGURED',
          studentName: `${studentFirstName} ${studentLastName}`,
          familyName: parent ? `${parent.firstName} ${parent.lastName}` : '—',
          totalAmount: plan.totalAmount,
          prepayment: mapItem(prepayment),
          installments: planItems.filter((item) => item.itemType === 'INSTALLMENT').map(mapItem),
        };
      })
      .filter((account) => account !== null && account.prepayment.transaction !== null);
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
      const [owner] = await txn
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
        await this.notifications.enqueueInTransaction(txn, {
          eventId: `PAYMENT_PLAN_READY:${planId}:${owner.userId}`,
          userId: owner.userId,
          notificationType: 'PAYMENT_PLAN_READY',
          title: 'برنامه پرداخت آماده است',
          message: 'برنامه پرداخت جدید ثبت شد. لطفاً مبالغ و تاریخ‌های سررسید را بررسی کنید.',
          relatedEntityType: 'PAYMENT_PLAN',
          relatedEntityId: planId,
        });
      }
      return { planId, totalAmount: total, installmentCount: items.length };
    });
    return result;
  }
}
