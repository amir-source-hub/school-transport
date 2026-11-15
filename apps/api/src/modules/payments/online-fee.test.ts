import { describe, expect, it } from 'vitest';
import { calculateOnlineFee } from './online-fee';

describe('Zibal gateway fee', () => {
  it.each([
    [100_000, 22_000, 122_000],
    [10_000_000, 110_000, 10_110_000],
    [20_000_000, 220_000, 20_220_000],
    [40_000_000, 220_000, 40_220_000],
  ])('prices %i rial', (amount, fee, total) => {
    expect(calculateOnlineFee(amount)).toMatchObject({ fee, total });
  });
});
