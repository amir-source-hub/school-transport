import { describe, expect, it } from 'vitest';
import { isIranianNationalId, normalizeIranianDigits } from './national-id';

describe('Iranian national ID', () => {
  it('normalizes Persian and Arabic digits', () => {
    expect(normalizeIranianDigits('۱۲۳۴۵۶۷۸۹۱')).toBe('1234567891');
  });

  it.each([
    '1234567891',
    '0013542419',
    '0023518805',
    '۰۰۱۳۵۴۲۴۱۹',
    '٠٤٩٩٣٧٠٨٩٩',
    ' 0013542419 ',
  ] as const)('accepts a numeric national ID of exactly ten digits: %s', (value) => {
    expect(isIranianNationalId(value)).toBe(true);
  });

  it.each([
    '',
    'abcdefghij',
    '12345678901',
    '12345678901234567890',
    '123A',
    '00 23518805',
    '002453',
    '123',
    '1',
  ] as const)('rejects an invalid national ID: %s', (value) => {
    expect(isIranianNationalId(value)).toBe(false);
  });
});
