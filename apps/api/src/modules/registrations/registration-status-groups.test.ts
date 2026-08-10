import { describe, expect, it } from 'vitest';
import {
  expandRegistrationStatusGroup,
  REGISTRATION_STATUS_GROUP_VALUES,
  REGISTRATION_STATUS_GROUPS,
} from './registration-status-groups';

describe('registration status groups', () => {
  it('expands the contract groups to the lifecycle statuses that occur', () => {
    expect(expandRegistrationStatusGroup('waiting_contract')).toEqual(['CONTRACT_PENDING']);
    expect(expandRegistrationStatusGroup('contract_ready')).toEqual(['CONTRACT_READY']);
    expect(expandRegistrationStatusGroup('accepted_contract')).toEqual(['CONTRACT_ACCEPTED']);
  });

  it('expands prepayment, installment, and completion groups to detailed statuses', () => {
    expect(expandRegistrationStatusGroup('prepaid')).toEqual(['ENROLLED']);
    expect(expandRegistrationStatusGroup('installments')).toEqual(['INSTALLMENTS_IN_PROGRESS']);
    expect(expandRegistrationStatusGroup('completed')).toEqual(['PAYMENT_COMPLETED']);
  });

  it('returns null for the all group and unknown values', () => {
    expect(expandRegistrationStatusGroup('all')).toBeNull();
    expect(expandRegistrationStatusGroup('bogus')).toBeNull();
  });

  it('lists every group value so DTO validation can allowlist them', () => {
    expect(REGISTRATION_STATUS_GROUP_VALUES).toEqual(
      REGISTRATION_STATUS_GROUPS.map((group) => group.value),
    );
    expect(REGISTRATION_STATUS_GROUP_VALUES).toContain('submitted');
  });
});
