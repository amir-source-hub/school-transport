import { describe, expect, it } from 'vitest';
import { isIranianNationalId, normalizeIranianDigits } from './national-id';

describe('Iranian national ID', () => {
  it('normalizes Persian and Arabic digits', () => {
    expect(normalizeIranianDigits('۱۲۳۴۵۶۷۸۹۱')).toBe('1234567891');
  });

  it.each(['1234567891', '0013542419', '0084575948', '۰۴۹۹۳۷۰۸۹۹', '٠٤٩٩٣٧٠٨٩٩'] as const)(
    'accepts a national ID that passes the checksum: %s',
    (value) => {
      expect(isIranianNationalId(value)).toBe(true);
    },
  );

  it.each(['', '123', '1234567890', '002453', 'abcdefghij', '12345678901234567890', '0000000000'] as const)(
    'rejects an invalid national ID: %s',
    (value) => {
      expect(isIranianNationalId(value)).toBe(false);
    },
  );
});