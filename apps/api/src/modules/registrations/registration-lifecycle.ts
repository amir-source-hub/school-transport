import { ValidationError } from '../../common/errors';

export const REGISTRATION_STATUSES = [
  'DRAFT',
  'SUBMITTED',
  'UNDER_REVIEW',
  'NEEDS_CORRECTION',
  'APPROVED',
  'REJECTED',
  'CANCELLED',
] as const;

export type RegistrationStatus = (typeof REGISTRATION_STATUSES)[number];

const VALID_TRANSITIONS: Record<RegistrationStatus, readonly RegistrationStatus[]> = {
  DRAFT: ['SUBMITTED', 'CANCELLED'],
  SUBMITTED: ['UNDER_REVIEW', 'CANCELLED'],
  UNDER_REVIEW: ['NEEDS_CORRECTION', 'APPROVED', 'REJECTED'],
  NEEDS_CORRECTION: ['SUBMITTED', 'CANCELLED'],
  APPROVED: ['CANCELLED'],
  REJECTED: [],
  CANCELLED: [],
};

export function assertRegistrationTransition(current: string, next: RegistrationStatus): void {
  const allowed = VALID_TRANSITIONS[current as RegistrationStatus];
  if (!allowed?.includes(next)) {
    throw new ValidationError(`Cannot transition from ${current} to ${next}.`);
  }
}
