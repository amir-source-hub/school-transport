import { describe, expect, it } from 'vitest';
import { ValidationError } from '../../common/errors';
import { assertRegistrationTransition, REGISTRATION_STATUSES } from './registration-lifecycle';

const allowedTransitions = [
  ['DRAFT', 'SUBMITTED'],
  ['DRAFT', 'CANCELLED'],
  ['SUBMITTED', 'UNDER_REVIEW'],
  ['SUBMITTED', 'CANCELLED'],
  ['UNDER_REVIEW', 'NEEDS_CORRECTION'],
  ['UNDER_REVIEW', 'APPROVED'],
  ['UNDER_REVIEW', 'REJECTED'],
  ['NEEDS_CORRECTION', 'SUBMITTED'],
  ['NEEDS_CORRECTION', 'CANCELLED'],
  ['APPROVED', 'CANCELLED'],
] as const;

describe('registration lifecycle', () => {
  it.each(allowedTransitions)('allows %s -> %s', (current, next) => {
    expect(() => assertRegistrationTransition(current, next)).not.toThrow();
  });

  it('rejects every transition not explicitly allowed', () => {
    const allowed = new Set(allowedTransitions.map(([current, next]) => `${current}:${next}`));

    for (const current of REGISTRATION_STATUSES) {
      for (const next of REGISTRATION_STATUSES) {
        if (allowed.has(`${current}:${next}`)) continue;
        expect(() => assertRegistrationTransition(current, next)).toThrow(ValidationError);
      }
    }
  });

  it('rejects unknown persisted statuses', () => {
    expect(() => assertRegistrationTransition('UNKNOWN', 'SUBMITTED')).toThrow(ValidationError);
  });
});
