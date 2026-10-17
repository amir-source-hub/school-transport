import { describe, expect, it } from 'vitest';
import type { PaymentOverview } from '@/features/finance/payments-api';
import { buildJourneyStatus } from './journey-status';

const payment = (installments: PaymentOverview['items'], remaining = 2_000): PaymentOverview => ({
  studentId: 'student-1',
  studentFirstName: 'آرین',
  studentLastName: 'احمدی',
  plan: {
    id: 'plan-1',
    totalAmount: 3_000,
    prepaymentAmount: 1_000,
    remainingInstallmentAmount: remaining,
    installmentCount: installments.length,
    planStatus: 'ACTIVE',
    planType: 'ADMIN_CONFIGURED',
  },
  items: [
    {
      id: 'prepay',
      itemType: 'PREPAYMENT',
      sequenceNumber: 0,
      amount: 1_000,
      paidAmount: 1_000,
      itemStatus: 'PAID',
      dueDate: null,
    },
    ...installments,
  ],
  transactions: [],
});

const installment = (
  id: string,
  sequenceNumber: number,
  paid = false,
): PaymentOverview['items'][number] => ({
  id,
  itemType: 'INSTALLMENT',
  sequenceNumber,
  amount: 1_000,
  paidAmount: paid ? 1_000 : 0,
  itemStatus: paid ? 'PAID' : 'PENDING',
  dueDate: new Date('2026-11-01T00:00:00.000Z'),
});

describe('student journey payment status', () => {
  const base = {
    enrollmentCode: 'ENROLLED',
    hasEnrollment: true,
    hasContract: true,
    contractAccepted: true,
  };

  it('keeps service active while showing unpaid installments separately', () => {
    const journey = buildJourneyStatus({
      ...base,
      payment: payment([installment('first', 1, true), installment('second', 2)]),
      receipts: [],
    });
    expect(journey.enrollment.find((item) => item.key === 'active')?.state).toBe('complete');
    expect(journey.payments.map((item) => item.state)).toEqual(['complete', 'complete', 'current']);
    expect(journey.payments[2]).toMatchObject({
      label: 'قسط ۲',
      amount: expect.any(String),
      dueDate: expect.any(String),
    });
  });

  it('does not mark a receipt awaiting review as a paid installment', () => {
    const journey = buildJourneyStatus({
      ...base,
      payment: payment([installment('first', 1)]),
      receipts: [
        {
          paymentScheduleItemId: 'first',
          status: 'PENDING_REVIEW',
          submittedAt: new Date('2026-10-13'),
        },
      ],
    });
    expect(journey.payments[1]).toMatchObject({ state: 'current', detail: 'رسید در انتظار بررسی' });
  });

  it('uses the latest receipt and shows rejected receipts as needing action', () => {
    const journey = buildJourneyStatus({
      ...base,
      payment: payment([installment('first', 1)]),
      receipts: [
        {
          paymentScheduleItemId: 'first',
          status: 'PENDING_REVIEW',
          submittedAt: new Date('2026-10-12'),
        },
        { paymentScheduleItemId: 'first', status: 'REJECTED', submittedAt: new Date('2026-10-13') },
      ],
    });
    expect(journey.payments[1]?.state).toBe('attention');
  });

  it('shows an awaiting-admin schedule after the prepayment', () => {
    const journey = buildJourneyStatus({ ...base, payment: payment([]), receipts: [] });
    expect(journey.payments[1]).toMatchObject({ label: 'برنامه اقساط', state: 'current' });
  });
});
