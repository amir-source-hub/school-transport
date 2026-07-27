import { describe, expect, it } from 'vitest';
import { isIranianNationalId, normalizeIranianDigits } from './national-id';

describe('Iranian national ID', () => {
  it('normalizes Persian and Arabic digits', () => {
    expect(normalizeIranianDigits('۱۲۳٤٥٦۷۸۹۱')).toBe('1234567891');
  });

  it.each(['1', '1234567891', '۱۲۳۴۵۶۷۸۹۱', '١٢٣٤٥٦٧٨٩١', '12345678901234567890'])(
    'accepts a numeric identifier: %s',
    (value) => {
      expect(isIranianNationalId(value)).toBe(true);
    },
  );

  it.each(['', '123-456', 'abcdefghij', '123456789012345678901'])(
    'rejects an invalid national ID: %s',
    (value) => {
      expect(isIranianNationalId(value)).toBe(false);
    },
  );
});
