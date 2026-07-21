import { describe, expect, it } from 'vitest';
import { isIranianNationalId, normalizeIranianDigits } from './national-id';

describe('Iranian national ID', () => {
  it('normalizes Persian and Arabic digits', () => {
    expect(normalizeIranianDigits('۱۲۳٤٥٦۷۸۹۱')).toBe('1234567891');
  });

  it.each(['1234567891', '۱۲۳۴۵۶۷۸۹۱', '١٢٣٤٥٦٧٨٩١'])(
    'accepts a valid normalized checksum: %s',
    (value) => {
      expect(isIranianNationalId(value)).toBe(true);
    },
  );

  it.each(['1234567890', '1111111111', '123456789', '12345678912', 'abcdefghij'])(
    'rejects an invalid national ID: %s',
    (value) => {
      expect(isIranianNationalId(value)).toBe(false);
    },
  );
});
