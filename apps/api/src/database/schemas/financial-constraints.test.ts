import { getTableConfig } from 'drizzle-orm/pg-core';
import { describe, expect, it } from 'vitest';
import { registrationPrices } from './pricing.schema';
import { paymentPlans, paymentScheduleItems, paymentTransactions } from './payments.schema';

function constraintNames(table: Parameters<typeof getTableConfig>[0]) {
  const config = getTableConfig(table);
  return {
    checks: config.checks.map((constraint) => constraint.name),
    indexes: config.indexes.map((index) => index.config.name),
  };
}

describe('documented financial database constraints', () => {
  it('protects registration price amounts and installment count', () => {
    expect(constraintNames(registrationPrices).checks).toEqual(
      expect.arrayContaining([
        'registration_prices_total_amount_positive',
        'registration_prices_prepayment_non_negative',
        'registration_prices_installment_count',
      ]),
    );
  });

  it('protects payment-plan totals and installment structure', () => {
    expect(constraintNames(paymentPlans).checks).toEqual(
      expect.arrayContaining([
        'payment_plans_total_amount_positive',
        'payment_plans_prepayment_non_negative',
        'payment_plans_remaining_amount_non_negative',
        'payment_plans_amount_balance',
        'payment_plans_installment_structure',
      ]),
    );
  });

  it('rejects invalid schedule amounts, sequences, and partial payments', () => {
    expect(constraintNames(paymentScheduleItems).checks).toEqual(
      expect.arrayContaining([
        'payment_schedule_amount_positive',
        'payment_schedule_valid_sequence',
        'payment_schedule_no_partial_payment',
      ]),
    );
  });

  it('protects transaction amount and financial uniqueness', () => {
    const constraints = constraintNames(paymentTransactions);
    expect(constraints.checks).toContain('payment_transactions_amount_positive');
    expect(constraints.indexes).toEqual(
      expect.arrayContaining([
        'idx_transactions_idempotency',
        'idx_transactions_gateway_transaction',
        'idx_transactions_one_success_per_schedule_item',
      ]),
    );
  });
});
