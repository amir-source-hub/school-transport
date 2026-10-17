import { describe, expect, it } from 'vitest';
import { buildDriverEnrollmentPayload } from './driver-enrollment-api';

describe('driver enrollment API payload', () => {
  it('combines the plate and removes every UI-only field rejected by the API whitelist', () => {
    const payload = buildDriverEnrollmentPayload({
      locationSelected: true,
      plateLeft: '12',
      plateLetter: 'ب',
      plateMiddle: '345',
      plateIran: '67',
      secondaryPhoneNumber: '09',
      modelYear: 1400,
    } as never);

    expect(payload).toMatchObject({ plateNumber: '12ب34567', secondaryPhoneNumber: '', modelYear: 1400 });
    expect(payload).not.toHaveProperty('locationSelected');
    expect(payload).not.toHaveProperty('plateLeft');
    expect(payload).not.toHaveProperty('plateLetter');
    expect(payload).not.toHaveProperty('plateMiddle');
    expect(payload).not.toHaveProperty('plateIran');
  });
});
