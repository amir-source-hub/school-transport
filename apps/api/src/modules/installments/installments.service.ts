import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../../database/database.service';
import { paymentPlans, paymentScheduleItems, registrationPrices } from '../../database/schemas';
import { eq, and } from 'drizzle-orm';
import { NotFoundError, ValidationError } from '../../common/errors';
import { generateId, calculateInstallmentAmounts } from '../../common/utils';
import { addMonths } from 'date-fns';

@Injectable()
export class InstallmentsService {
  constructor(private readonly db: DatabaseService) {}

  async createPlan(priceId: string, planType: string): Promise<string> {
    const price = await this.db.db
      .select()
      .from(registrationPrices)
      .where(eq(registrationPrices.id, priceId))
      .limit(1);

    if (price.length === 0) throw new NotFoundError('Price');

    if (planType === 'FULL') {
      return this.createFullPaymentPlan(price[0]);
    }

    return this.createInstallmentPlan(price[0]);
  }

  private async createFullPaymentPlan(
    price: typeof registrationPrices.$inferSelect,
  ): Promise<string> {
    const planId = generateId();
    await this.db.db.insert(paymentPlans).values({
      id: planId,
      registrationPriceId: price.id,
      planType: 'FULL',
      totalAmount: price.totalAmount,
      prepaymentAmount: price.totalAmount,
      remainingInstallmentAmount: 0,
      installmentCount: 1,
      planStatus: 'PENDING',
    });

    await this.db.db.insert(paymentScheduleItems).values({
      id: generateId(),
      paymentPlanId: planId,
      itemType: 'PREPAYMENT',
      sequenceNumber: 0,
      amount: price.totalAmount,
    });

    return planId;
  }

  private async createInstallmentPlan(
    price: typeof registrationPrices.$inferSelect,
  ): Promise<string> {
    const planId = generateId();
    const prepayment = price.prepaymentAmount;
    const installments = calculateInstallmentAmounts(
      price.totalAmount,
      prepayment,
      price.installmentCount,
    );
    const remainingTotal = price.totalAmount - prepayment;

    await this.db.db.insert(paymentPlans).values({
      id: planId,
      registrationPriceId: price.id,
      planType: 'PREPAYMENT_PLUS_FOUR_INSTALLMENTS',
      totalAmount: price.totalAmount,
      prepaymentAmount: prepayment,
      remainingInstallmentAmount: remainingTotal,
      installmentCount: price.installmentCount,
      planStatus: 'PENDING',
    });

    const now = new Date();

    await this.db.db.insert(paymentScheduleItems).values({
      id: generateId(),
      paymentPlanId: planId,
      itemType: 'PREPAYMENT',
      sequenceNumber: 0,
      amount: prepayment,
      dueDate: now,
    });

    for (let i = 0; i < installments.length; i++) {
      await this.db.db.insert(paymentScheduleItems).values({
        id: generateId(),
        paymentPlanId: planId,
        itemType: 'INSTALLMENT',
        sequenceNumber: i + 1,
        amount: installments[i],
        dueDate: addMonths(now, i + 1),
      });
    }

    return planId;
  }

  async getPlanByPriceId(priceId: string) {
    const plans = await this.db.db
      .select()
      .from(paymentPlans)
      .where(eq(paymentPlans.registrationPriceId, priceId))
      .limit(1);
    if (plans.length === 0) throw new NotFoundError('Payment plan');
    return plans[0];
  }

  async getPlanWithItems(planId: string) {
    const plan = await this.db.db
      .select()
      .from(paymentPlans)
      .where(eq(paymentPlans.id, planId))
      .limit(1);
    if (plan.length === 0) throw new NotFoundError('Payment plan');

    const items = await this.db.db
      .select()
      .from(paymentScheduleItems)
      .where(eq(paymentScheduleItems.paymentPlanId, planId))
      .orderBy(paymentScheduleItems.sequenceNumber);

    return { plan: plan[0], items };
  }
}
