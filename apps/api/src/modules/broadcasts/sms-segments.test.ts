import { describe, expect, it } from 'vitest';
import { smsSegmentCount } from './sms-segments';

describe('smsSegmentCount', () => {
  it('uses Unicode segment limits for Persian broadcasts', () => {
    expect(smsSegmentCount('پیام کوتاه')).toBe(1);
    expect(smsSegmentCount('ش'.repeat(71))).toBe(2);
    expect(smsSegmentCount('ش'.repeat(135))).toBe(3);
  });

  it('uses basic Latin segment limits when possible', () => {
    expect(smsSegmentCount('a'.repeat(160))).toBe(1);
    expect(smsSegmentCount('a'.repeat(161))).toBe(2);
  });
});
