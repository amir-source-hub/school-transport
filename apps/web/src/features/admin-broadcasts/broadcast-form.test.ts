import { describe, expect, it } from 'vitest';
import { tehranLocalToIso } from './broadcast-form';

describe('broadcast Tehran scheduling', () => {
  it('converts the explicitly labelled Tehran time to an absolute instant', () => {
    expect(tehranLocalToIso('2026-03-21T09:00')).toBe('2026-03-21T05:30:00.000Z');
  });
});
