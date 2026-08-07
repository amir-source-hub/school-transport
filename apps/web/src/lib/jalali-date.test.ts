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

  it('accepts a leap-year Esfand 30 and rejects it in a non-leap year', () => {
    expect(jalaliToIsoDate('1403/12/30')).toBe('2025-03-20');
    expect(jalaliToIsoDate('1404/12/30')).toBeNull();
    expect(jalaliToIsoDate('1408/12/30')).toBe('2030-03-20');
  });

  it('round-trips the last day of each Jalali month', () => {
    for (const [j, iso] of [
      ['1405/01/31', '2026-04-20'],
      ['1405/06/31', '2026-09-22'],
      ['1405/07/30', '2026-10-22'],
      ['1405/12/29', '2027-03-20'],
    ] as const) {
      expect(jalaliToIsoDate(j)).toBe(iso);
      expect(isoToJalaliDate(iso)).toBe(j);
    }
  });

  it('rejects invalid days within a month', () => {
    expect(jalaliToIsoDate('1405/01/32')).toBeNull();
    expect(jalaliToIsoDate('1405/07/31')).toBeNull();
    expect(jalaliToIsoDate('1405/00/10')).toBeNull();
    expect(jalaliToIsoDate('1405/01/00')).toBeNull();
  });

  it('accepts Persian, Arabic, and English numerals for input', () => {
    expect(jalaliToIsoDate('۱۴۰۵/۰۱/۰۱')).toBe('2026-03-21');
    expect(jalaliToIsoDate('١٤٠٥/٠١/٠١')).toBe('2026-03-21');
    expect(jalaliToIsoDate('1405/1/1')).toBe('2026-03-21');
  });

  it('is timezone-safe: converts via the fixed noon boundary', () => {
    expect(isoToJalaliDate('2025-03-20')).toBe('1403/12/30');
    expect(isoToJalaliDate('2026-03-20')).toBe('1404/12/29');
    expect(isoToJalaliDate('2026-03-21')).toBe('1405/01/01');
  });
});
