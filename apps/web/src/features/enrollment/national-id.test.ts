import { describe, expect, it } from 'vitest';

import { isValidIranianNationalId, normalizeDigits } from './national-id';

describe('Iranian national ID utilities', () => {
  it('normalizes Persian and Arabic digits', () => {
    expect(normalizeDigits('۰۱۲٣٤')).toBe('01234');
  });

  it('accepts only ten-digit identifiers that pass the checksum', () => {
    expect(isValidIranianNationalId('۰۰۱۳۵۴۲۴۱۹')).toBe(true);
    expect(isValidIranianNationalId('0013542419')).toBe(true);
    expect(isValidIranianNationalId('0084575948')).toBe(true);
    expect(isValidIranianNationalId('123')).toBe(false);
    expect(isValidIranianNationalId('0013547839')).toBe(false);
    expect(isValidIranianNationalId('1234567890')).toBe(false);
    expect(isValidIranianNationalId('12345678901234567890')).toBe(false);
    expect(isValidIranianNationalId('0000000000')).toBe(false);
    expect(isValidIranianNationalId('123A')).toBe(false);
  });
});
