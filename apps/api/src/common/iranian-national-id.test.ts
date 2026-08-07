import { describe, expect, it } from 'vitest';

import { isIranianNationalId, normalizeIranianDigits } from './iranian-national-id';

describe('Iranian national ID checksum', () => {
  it('normalizes Persian and Arabic digits', () => {
    expect(normalizeIranianDigits('۰۱۲٣٤')).toBe('01234');
  });

  it('accepts only ten-digit identifiers that pass the checksum', () => {
    expect(isIranianNationalId('۰۰۱۳۵۴۲۴۱۹')).toBe(true);
    expect(isIranianNationalId('0013542419')).toBe(true);
    expect(isIranianNationalId('0084575948')).toBe(true);
    expect(isIranianNationalId('123')).toBe(false);
    expect(isIranianNationalId('0013547839')).toBe(false);
    expect(isIranianNationalId('1234567890')).toBe(false);
    expect(isIranianNationalId('12345678901234567890')).toBe(false);
    expect(isIranianNationalId('0000000000')).toBe(false);
  });
});
