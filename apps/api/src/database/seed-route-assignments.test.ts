import { describe, expect, it, vi } from 'vitest';
import { seedRouteAssignments } from './seed-route-assignments';

const pair = [
  { studentId: 'student', serviceRunId: 'out', pickupOrder: 1 },
  { studentId: 'student', serviceRunId: 'back', pickupOrder: 1 },
];
const routes = ['TO_SCHOOL', 'FROM_SCHOOL'].map((direction, i) => ({
  id: pair[i].serviceRunId,
  schoolId: 'school',
  driverId: 'driver',
  vehicleId: 'car',
  academicYear: '1405-1406',
  isActive: true,
  direction,
}));
function harness(rows: unknown[][]) {
  const values = vi.fn().mockResolvedValue(undefined);
  const insert = vi.fn(() => ({ values }));
  const select = vi.fn(() => {
    const result = rows.shift() ?? [];
    const chain: Record<string, unknown> = {
      then: (resolve: (r: unknown[]) => unknown) => Promise.resolve(result).then(resolve),
    };
    for (const method of ['from', 'where', 'for', 'limit', 'orderBy']) chain[method] = () => chain;
    return chain;
  });
  return {
    db: { transaction: (fn: (t: unknown) => unknown) => fn({ select, insert }) },
    insert,
    values,
  };
}
describe('seed route assignment preservation', () => {
  it('does not replay either direction for students with any assignment history', async () => {
    const h = harness([[{ isActive: true }], [{ id: 'old-inactive-membership' }]]);
    await seedRouteAssignments(h.db as never, pair);
    expect(h.insert).not.toHaveBeenCalled();
  });
  it('skips a pair when the student has changed school', async () => {
    const h = harness([[{ isActive: true, schoolId: 'new-school' }], [], routes]);
    await seedRouteAssignments(h.db as never, pair);
    expect(h.insert).not.toHaveBeenCalled();
  });
  it('does not partially seed a pair if either direction is full', async () => {
    const h = harness([
      [{ isActive: true, schoolId: 'school' }],
      [],
      routes,
      [{ id: 'car', status: 'ACTIVE', capacity: 1 }],
      [],
      [{ isActive: true, pickupOrder: 2 }],
    ]);
    await seedRouteAssignments(h.db as never, pair);
    expect(h.insert).not.toHaveBeenCalled();
  });
  it('inserts both directions for untouched students with available capacity', async () => {
    const h = harness([
      [{ isActive: true, schoolId: 'school' }],
      [],
      routes,
      [{ id: 'car', status: 'ACTIVE', capacity: 4 }],
      [],
      [],
    ]);
    await seedRouteAssignments(h.db as never, pair);
    expect(h.values).toHaveBeenCalledWith(pair);
  });
});
