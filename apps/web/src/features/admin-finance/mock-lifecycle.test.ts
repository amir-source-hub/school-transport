import { describe, expect, it } from 'vitest';

import { demoFinanceLifecycles, getContractAction, getPriceAction } from './mock-lifecycle';

describe('admin finance lifecycle presentation', () => {
  it('allows pricing presentation only before acceptance or payment activity', () => {
    expect(getPriceAction(demoFinanceLifecycles[0]!).allowed).toBe(true);
    expect(getPriceAction(demoFinanceLifecycles[1]!).allowed).toBe(true);
    expect(getPriceAction(demoFinanceLifecycles[2]!).allowed).toBe(false);
  });

  it('never describes an accepted contract as directly editable', () => {
    expect(getContractAction(demoFinanceLifecycles[2]!).label).toBe('جایگزینی کنترل‌شده');
    expect(getContractAction(demoFinanceLifecycles[2]!).reason).toContain('نسخه تازه');
  });
});
