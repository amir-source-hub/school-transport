import { ConflictError } from '../../common/errors';
import { normalizeIranianDigits } from '../../common/iranian-national-id';

export type AdminEnrollmentActions = {
  signContractOnBehalf?: {
    reason?: string;
    source?: string;
  };
  cashPrepayment?: {
    referenceNumber: string;
    paidAt?: string;
    description?: string;
  };
};

export function normalizeAndValidateAdminEnrollmentActions(
  input: AdminEnrollmentActions | undefined,
): AdminEnrollmentActions | undefined {
  if (!input) return undefined;
  const actions: AdminEnrollmentActions = {};
  if (input.signContractOnBehalf) {
    actions.signContractOnBehalf = {
      reason: input.signContractOnBehalf.reason?.trim() || undefined,
      source: input.signContractOnBehalf.source?.trim() || undefined,
    };
  }
  if (input.cashPrepayment) {
    const referenceNumber = normalizeIranianDigits(input.cashPrepayment.referenceNumber).trim();
    if (!referenceNumber) {
      throw new ConflictError(
        'CASH_RECEIPT_REQUIRED',
        'A receipt or reference number is required for a cash prepayment.',
      );
    }
    let paidAt: string | undefined;
    if (input.cashPrepayment.paidAt) {
      const parsed = new Date(input.cashPrepayment.paidAt);
      if (Number.isNaN(parsed.getTime())) {
        throw new ConflictError('INVALID_PAYMENT_DATE', 'The payment date is invalid.');
      }
      paidAt = input.cashPrepayment.paidAt;
    }
    actions.cashPrepayment = {
      referenceNumber,
      paidAt,
      description: input.cashPrepayment.description?.trim() || undefined,
    };
  }
  if (!actions.signContractOnBehalf && !actions.cashPrepayment) return undefined;
  return actions;
}
