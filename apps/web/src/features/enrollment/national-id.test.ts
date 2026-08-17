import { describe, expect, it } from 'vitest';

import { isValidIranianNationalId, nationalIdError, normalizeDigits } from './national-id';

describe('Iranian national ID utilities', () => {
  it('normalizes Persian and Arabic digits', () => {
    expect(normalizeDigits('۰۱۲٣٤')).toBe('01234');
  });

  it('accepts numeric national IDs of exactly 10 digits including leading zeros', () => {
    expect(isValidIranianNationalId('0023518805')).toBe(true);
    expect(isValidIranianNationalId('0013542419')).toBe(true);
    expect(isValidIranianNationalId('۰۰۱۳۵۴۲۴۱۹')).toBe(true);
    expect(isValidIranianNationalId(' 0013542419 ')).toBe(true);
    expect(isValidIranianNationalId('1234567890')).toBe(true);
    expect(isValidIranianNationalId('0000000000')).toBe(true);
  });

  it('rejects non-numeric and over-length national IDs', () => {
    expect(isValidIranianNationalId('12345678901')).toBe(false);
    expect(isValidIranianNationalId('12345678901234567890')).toBe(false);
    expect(isValidIranianNationalId('123A')).toBe(false);
    expect(isValidIranianNationalId('00 23518805')).toBe(false);
    expect(isValidIranianNationalId('')).toBe(false);
    expect(isValidIranianNationalId('1')).toBe(false);
    expect(isValidIranianNationalId('123')).toBe(false);
  });

  it('exposes the shared Persian error message', () => {
    expect(nationalIdError).toBe('کد ملی باید دقیقاً ۱۰ رقم باشد.');
  });
});
