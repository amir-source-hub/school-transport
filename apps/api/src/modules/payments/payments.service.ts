import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../../database/database.service';
import {
  paymentTransactions,
  paymentScheduleItems,
  paymentPlans,
  users,
} from '../../database/schemas';
import { eq, and, isNull } from 'drizzle-orm';
import { NotFoundError, ValidationError, ConflictError } from '../../common/errors';
import { generateId } from '../../common/utils';

@Injectable()
export class PaymentsService {
  constructor(private readonly db: DatabaseService) {}

  async startOnlinePayment(scheduleItemId: string, userId: string, idempotencyKey: string) {
    const item = await this.db.db
      .select()
      .from(paymentScheduleItems)
      .where(eq(paymentScheduleItems.id, scheduleItemId))
      .limit(1);
    if (item.length === 0) throw new NotFoundError('Schedule item');
    if (item[0].itemStatus === 'PAID') {
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
      paymentPlanId: item[0].paymentPlanId,
      paymentScheduleItemId: scheduleItemId,
      userId,
      amount: item[0].amount,
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

  async verifyOnlinePayment(txId: string, gatewayTransactionId: string) {
    const tx = await this.db.db
      .select()
      .from(paymentTransactions)
      .where(eq(paymentTransactions.id, txId))
      .limit(1);
    if (tx.length === 0) throw new NotFoundError('Transaction');

    if (tx[0].transactionStatus === 'SUCCEEDED') {
      return tx[0];
    }

    return await this.db.db.transaction(async (txn) => {
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
      }

      return txn
        .select()
        .from(paymentTransactions)
        .where(eq(paymentTransactions.id, txId))
        .limit(1)
        .then((r) => r[0]);
    });
  }

  async createOfflineSubmission(
    scheduleItemId: string,
    userId: string,
    data: {
      paidAt: string;
      referenceNumber: string;
      description?: string;
    },
  ) {
    const item = await this.db.db
      .select()
      .from(paymentScheduleItems)
      .where(eq(paymentScheduleItems.id, scheduleItemId))
      .limit(1);
    if (item.length === 0) throw new NotFoundError('Schedule item');
    if (item[0].itemStatus === 'PAID') {
      throw new ConflictError('PAYMENT_ALREADY_COMPLETED', 'Already paid.');
    }

    const txId = generateId();
    await this.db.db.insert(paymentTransactions).values({
      id: txId,
      paymentPlanId: item[0].paymentPlanId,
      paymentScheduleItemId: scheduleItemId,
      userId,
      amount: item[0].amount,
      paymentMethod: 'MANUAL_ADMIN_ENTRY',
      transactionStatus: 'CREATED',
    });

    return txId;
  }

  async approveOfflinePayment(txId: string, adminId: string) {
    return this.db.db.transaction(async (txn) => {
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

      return tx[0];
    });
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
}
