import { describe, expect, it, vi } from 'vitest';
import { DriverEnrollmentService } from './driver-enrollment.service';

const input = {
  studentId: 'student',
  toSchoolRouteId: 'to',
  fromSchoolRouteId: 'from',
  toSchoolStopTime: '07:10',
  fromSchoolStopTime: '14:10',
};
const to = {
  id: 'to',
  driverId: 'driver',
  vehicleId: 'vehicle',
  schoolId: 'school',
  academicYear: '1405-1406',
  isActive: true,
  direction: 'TO_SCHOOL',
  scheduledStartTime: '07:00:00',
  scheduledArrivalTime: '07:30:00',
};
const from = {
  ...to,
  id: 'from',
  direction: 'FROM_SCHOOL',
  scheduledStartTime: '14:00:00',
  scheduledArrivalTime: '14:30:00',
};
function harness(rows: unknown[][]) {
  const chain = (value: unknown[]) => {
    const result: Record<string, unknown> = {
      then: (resolve: (v: unknown[]) => unknown) => Promise.resolve(value).then(resolve),
    };
    for (const method of ['from', 'where', 'orderBy', 'for', 'innerJoin', 'limit'])
      result[method] = () => result;
    return result;
  };
  const insert = vi.fn(() => ({ values: vi.fn().mockResolvedValue(undefined) }));
  const update = vi.fn(() => ({ set: () => ({ where: vi.fn().mockResolvedValue(undefined) }) }));
  const txn = { select: () => chain(rows.shift() ?? []), insert, update };
  const notify = vi.fn();
  const audit = vi.fn();
  const service = new DriverEnrollmentService(
    { db: { transaction: (fn: (t: typeof txn) => unknown) => fn(txn) } } as never,
    {} as never,
    { recordInTransaction: audit } as never,
    { enqueueInTransaction: notify } as never,
  );
  return { service, insert, update, notify, audit };
}
const student = {
  id: 'student',
  userId: 'family',
  schoolId: 'school',
  firstName: 'علی',
  lastName: 'احمدی',
};
const driver = { id: 'driver', userId: 'driver-user', firstName: 'رضا', lastName: 'رضایی' };
describe('paired route assignment', () => {
  it('rejects different drivers without changing either direction', async () => {
    const h = harness([[student], [to, { ...from, driverId: 'other' }]]);
    await expect(h.service.assignStudentRoutes(input, 'admin')).rejects.toThrow();
    expect(h.insert).not.toHaveBeenCalled();
    expect(h.update).not.toHaveBeenCalled();
  });
  it('rejects different academic years', async () => {
    const h = harness([[student], [to, { ...from, academicYear: 'other' }]]);
    await expect(h.service.assignStudentRoutes(input, 'admin')).rejects.toThrow();
    expect(h.insert).not.toHaveBeenCalled();
  });
  it('allows admin assignment beyond nominal vehicle capacity', async () => {
    const h = harness([
      [student],
      [to, from],
      [driver],
      [{ id: 'vehicle', status: 'ACTIVE', capacity: 1 }],
      [],
      [],
      [{ value: 4 }],
      [],
      [{ value: 4 }],
    ]);
    await expect(h.service.assignStudentRoutes(input, 'admin')).resolves.toEqual({
      assigned: true,
    });
    expect(h.insert).toHaveBeenCalledTimes(2);
  });
  it('allows different schools and notifies family and driver', async () => {
    const h = harness([
      [{ ...student, schoolId: 'another-school' }],
      [to, from],
      [driver],
      [{ id: 'vehicle', status: 'ACTIVE', capacity: 4 }],
      [],
      [],
      [{ value: 2 }],
      [],
      [{ value: 0 }],
    ]);
    await expect(h.service.assignStudentRoutes(input, 'admin')).resolves.toEqual({
      assigned: true,
    });
    expect(h.insert).toHaveBeenCalledTimes(2);
    expect(h.notify).toHaveBeenCalledTimes(2);
    expect(h.audit).toHaveBeenCalledOnce();
  });
});
