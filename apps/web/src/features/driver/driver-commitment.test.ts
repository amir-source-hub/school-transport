import { describe, expect, it } from 'vitest';
import type { DriverRun } from './driver-api';
import { summarizeDriverCommitment } from './driver-commitment';

const route = (id: string, price: number | null, date: string | null) => ({ id, contractPriceRials: price, contractDate: date }) as DriverRun;

describe('driver commitment', () => {
  it('sums only the current route list and uses one route date', () => {
    const first = route('a', 1_000_000, '1405/06/22');
    const second = route('b', 2_000_000, '1405/06/23');
    expect(summarizeDriverCommitment([first, second])).toEqual({ totalPriceRials: 3_000_000, contractDate: '1405/06/22', routesComplete: true });
    expect(summarizeDriverCommitment([second]).totalPriceRials).toBe(2_000_000);
  });

  it('does not complete a document without priced and dated routes', () => {
    expect(summarizeDriverCommitment([]).routesComplete).toBe(false);
    expect(summarizeDriverCommitment([route('a', null, '1405/06/22')]).routesComplete).toBe(false);
  });
});
