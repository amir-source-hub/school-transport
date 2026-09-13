import { describe, expect, it } from 'vitest';
import { formatJalaliDate, formatJalaliDateTime, formatPersianTime } from './formatters';

describe('Persian date formatters', () => {
  it('renders canonical stored dates with the Persian calendar', () => {
    expect(formatJalaliDate('2026-09-10')).toBe('۱۴۰۵/۰۶/۱۹');
  });

  it('uses Tehran time consistently for timestamps', () => {
    const rendered = formatJalaliDateTime('2026-03-20T21:00:00.000Z');
    expect(rendered).toContain('۱۴۰۵/۰۱/۰۱');
    expect(formatJalaliDateTime('2026-09-13T15:40:00Z')).toContain('۱۹:۱۰');
  });
  it('preserves a stored Jalali route date and renders 24-hour Persian times', () => {
    expect(formatJalaliDate('1405/06/22')).toBe('۱۴۰۵/۰۶/۲۲');
    expect(formatPersianTime('07:05:00')).toBe('۰۷:۰۵');
    expect(formatPersianTime('17:30')).toBe('۱۷:۳۰');
  });
});
