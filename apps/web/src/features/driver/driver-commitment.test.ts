import { describe, expect, it } from 'vitest';
import type { DriverRun } from './driver-api';
import { isDriverRouteContractReady } from './driver-commitment';

const route = (id: string, price: number | null, date: string | null) => ({ id, contractPriceRials: price, contractDate: date }) as DriverRun;

describe('driver commitment', () => {
  it('evaluates each route independently instead of aggregating route prices or dates', () => {
    const first = route('a', 1_000_000, '1405/06/22');
    const second = route('b', null, '1405/06/23');
    expect(isDriverRouteContractReady(first)).toBe(true);
    expect(isDriverRouteContractReady(second)).toBe(false);
  });

  it('does not complete a document without priced and dated routes', () => {
    expect(isDriverRouteContractReady(route('a', null, '1405/06/22'))).toBe(false);
    expect(isDriverRouteContractReady(route('a', 100, null))).toBe(false);
  });
});
