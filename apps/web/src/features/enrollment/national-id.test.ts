import { describe, expect, it } from 'vitest';

import { isValidIranianNationalId, normalizeDigits } from './national-id';

describe('Iranian national ID utilities', () => {
  it('normalizes Persian and Arabic digits', () => {
    expect(normalizeDigits('۰۱۲٣٤')).toBe('01234');
  });

  it('validates checksum and rejects repeated digits', () => {
    expect(isValidIranianNationalId('۰۰۱۳۵۴۷۸۳۶')).toBe(true);
    expect(isValidIranianNationalId('0013547839')).toBe(false);
    expect(isValidIranianNationalId('1111111111')).toBe(false);
  });
});
