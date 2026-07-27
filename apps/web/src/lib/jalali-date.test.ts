import { describe, expect, it } from 'vitest';
import { isoToJalaliDate, jalaliToIsoDate } from './jalali-date';

describe('Jalali dates', () => {
  it('converts a Jalali date to ISO Gregorian', () => {
    expect(jalaliToIsoDate('۱۴۰۵/۰۱/۰۱')).toBe('2026-03-21');
  });

  it('converts an ISO date to a Jalali input value', () => {
    expect(isoToJalaliDate('2026-03-21')).toBe('1405/01/01');
  });

  it('rejects malformed dates', () => {
    expect(jalaliToIsoDate('1405/13/01')).toBeNull();
  });
});
