import { addMonths } from 'date-fns';
import { eq } from 'drizzle-orm';
import { ConflictError } from '../common/errors';
import { calculateInstallmentAmounts, generateId } from '../common/utils';
import { DatabaseService } from './database.service';
import { paymentPlans, paymentScheduleItems, registrationPrices } from './schemas';

export type PaymentPlanType = 'FULL' | 'PREPAYMENT_PLUS_FOUR_INSTALLMENTS';
export type DatabaseTransaction = Parameters<
  Parameters<DatabaseService['db']['transaction']>[0]
>[0];

export async function createPaymentPlanInTransaction(
  txn: DatabaseTransaction,
  price: typeof registrationPrices.$inferSelect,
  planType: PaymentPlanType,
): Promise<string> {
  const isFull = planType === 'FULL';
  if (isFull && !price.fullPaymentAllowed) {
    throw new ConflictError(
      'PAYMENT_PLAN_NOT_ALLOWED',
      'Full payment is not allowed for this price.',
    );
  }
  if (!isFull && !price.installmentPaymentAllowed) {
    throw new ConflictError(
      'PAYMENT_PLAN_NOT_ALLOWED',
      'Installment payment is not allowed for this price.',
    );
  }

  const prepayment = isFull ? price.totalAmount : price.prepaymentAmount;
  const planId = generateId();
  const [created] = await txn
    .insert(paymentPlans)
    .values({
      id: planId,
      registrationPriceId: price.id,
      planType,
      totalAmount: price.totalAmount,
      prepaymentAmount: prepayment,
      remainingInstallmentAmount: price.totalAmount - prepayment,
      installmentCount: isFull ? 1 : price.installmentCount,
      planStatus: 'PENDING',
    })
    .onConflictDoNothing({ target: paymentPlans.registrationPriceId })
    .returning({ id: paymentPlans.id });

  if (!created) {
    const [existing] = await txn
      .select({ id: paymentPlans.id, planType: paymentPlans.planType })
      .from(paymentPlans)
      .where(eq(paymentPlans.registrationPriceId, price.id))
      .limit(1);
    if (!existing || existing.planType !== planType) {
      throw new ConflictError(
        'PAYMENT_PLAN_ALREADY_SELECTED',
        'A different payment plan has already been selected for this price.',
      );
    }
    return existing.id;
  }

  const now = new Date();
  const installments = isFull
    ? []
    : calculateInstallmentAmounts(price.totalAmount, prepayment, price.installmentCount);
  await txn.insert(paymentScheduleItems).values([
    {
      id: generateId(),
      paymentPlanId: planId,
      itemType: 'PREPAYMENT',
      sequenceNumber: 0,
      amount: prepayment,
      dueDate: now,
    },
    ...installments.map((amount, index) => ({
      id: generateId(),
      paymentPlanId: planId,
      itemType: 'INSTALLMENT',
      sequenceNumber: index + 1,
      amount,
      dueDate: addMonths(now, index + 1),
    })),
  ]);
  return planId;
}
