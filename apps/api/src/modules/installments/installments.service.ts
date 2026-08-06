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
import { NotFoundError } from '../../common/errors';
import { createPaymentPlanInTransaction, PaymentPlanType } from '../../database/payment-plan';

@Injectable()
export class InstallmentsService {
  constructor(private readonly db: DatabaseService) {}

  async createPlan(priceId: string, planType: string): Promise<string> {
    const normalizedType: PaymentPlanType =
      planType === 'FULL' ? 'FULL' : 'PREPAYMENT_PLUS_FOUR_INSTALLMENTS';
    return this.db.db.transaction(async (txn) => {
      const [price] = await txn
        .select()
        .from(registrationPrices)
        .where(eq(registrationPrices.id, priceId))
        .for('update')
        .limit(1);
      if (!price) throw new NotFoundError('Price');
      return createPaymentPlanInTransaction(txn, price, normalizedType);
    });
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

  async getPlanWithItems(planId: string, userId: string) {
    const plan = await this.db.db
      .select({ plan: paymentPlans })
      .from(paymentPlans)
      .innerJoin(registrationPrices, eq(registrationPrices.id, paymentPlans.registrationPriceId))
      .innerJoin(
        serviceRegistrations,
        eq(serviceRegistrations.id, registrationPrices.registrationId),
      )
      .innerJoin(students, eq(students.id, serviceRegistrations.studentId))
      .where(and(eq(paymentPlans.id, planId), eq(students.userId, userId)))
      .limit(1);
    if (plan.length === 0) throw new NotFoundError('Payment plan');

    const items = await this.db.db
      .select()
      .from(paymentScheduleItems)
      .where(eq(paymentScheduleItems.paymentPlanId, planId))
      .orderBy(paymentScheduleItems.sequenceNumber);

    return { plan: plan[0].plan, items };
  }
}
