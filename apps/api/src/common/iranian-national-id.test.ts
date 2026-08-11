import { describe, expect, it } from 'vitest';

import { isIranianNationalId, normalizeIranianDigits } from './iranian-national-id';

describe('Iranian national ID contract', () => {
  it('normalizes Persian and Arabic digits', () => {
    expect(normalizeIranianDigits('۰۱۲٣٤')).toBe('01234');
  });

  it('accepts numeric national IDs of 1-10 digits including leading zeros', () => {
    expect(isIranianNationalId('1')).toBe(true);
    expect(isIranianNationalId('123')).toBe(true);
    expect(isIranianNationalId('0023518805')).toBe(true);
    expect(isIranianNationalId('۰۰۱۳۵۴۲۴۱۹')).toBe(true);
    expect(isIranianNationalId('0013542419')).toBe(true);
    expect(isIranianNationalId('0084575948')).toBe(true);
    expect(isIranianNationalId('1234567890')).toBe(true);
    expect(isIranianNationalId('0000000000')).toBe(true);
  });

  it('rejects non-numeric, over-length, and empty national IDs', () => {
    expect(isIranianNationalId('')).toBe(false);
    expect(isIranianNationalId('12345678901')).toBe(false);
    expect(isIranianNationalId('12345678901234567890')).toBe(false);
    expect(isIranianNationalId('123A')).toBe(false);
    expect(isIranianNationalId('00 23518805')).toBe(false);
  });
});
