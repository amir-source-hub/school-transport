import { describe, expect, it } from 'vitest';

import { isValidIranianNationalId, normalizeDigits } from './national-id';

describe('Iranian national ID utilities', () => {
  it('normalizes Persian and Arabic digits', () => {
    expect(normalizeDigits('۰۱۲٣٤')).toBe('01234');
  });

  it('accepts forward-compatible numeric identifiers', () => {
    expect(isValidIranianNationalId('۱۲۳')).toBe(true);
    expect(isValidIranianNationalId('0013547839')).toBe(true);
    expect(isValidIranianNationalId('12345678901234567890')).toBe(true);
    expect(isValidIranianNationalId('123A')).toBe(false);
    expect(isValidIranianNationalId('123456789012345678901')).toBe(false);
  });
});
