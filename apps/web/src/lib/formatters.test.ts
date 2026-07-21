import { describe, expect, it } from 'vitest';
import { formatIrr, formatPersianNumber } from '@/lib/formatters';

describe('Persian formatters', () => {
  it('formats numbers with Persian digits and grouping', () => {
    expect(formatPersianNumber(150000000)).toBe('۱۵۰٬۰۰۰٬۰۰۰');
  });

  it('formats documented IRR amounts without converting to toman', () => {
    expect(formatIrr(50000000)).toBe('۵۰٬۰۰۰٬۰۰۰ ریال');
  });
});
