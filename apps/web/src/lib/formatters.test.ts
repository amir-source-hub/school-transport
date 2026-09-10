import { describe, expect, it } from 'vitest';
import { formatJalaliDate, formatJalaliDateTime } from './formatters';

describe('Persian date formatters', () => {
  it('renders canonical stored dates with the Persian calendar', () => {
    expect(formatJalaliDate('2026-09-10')).toBe('۱۴۰۵/۰۶/۱۹');
  });

  it('uses Tehran time consistently for timestamps', () => {
    const rendered = formatJalaliDateTime('2026-03-20T21:00:00.000Z');
    expect(rendered).toContain('۱۴۰۵/۰۱/۰۱');
  });
});
