import { describe, expect, it, vi } from 'vitest';
import { DriverEnrollmentService } from './driver-enrollment.service';

const input = {
  driverId: 'driver',
  schoolId: 'school',
  title: 'مسیر اول',
  academicYear: '1405-1406',
  direction: 'TO_SCHOOL' as const,
  scheduledStartTime: '07:00',
  scheduledArrivalTime: '14:30',
  contractPriceRials: 90_000_000,
  contractDate: '1405/07/01',
  activeWeekdays: [0, 1, 2, 3, 4],
};

function query(rows: unknown[]) {
  const chain: Record<string, unknown> = {
    then: (resolve: (value: unknown[]) => unknown) => Promise.resolve(rows).then(resolve),
  };
  for (const method of ['from', 'where', 'orderBy', 'limit']) chain[method] = () => chain;
  return chain;
}

function harness(auditFailure = false) {
  const selections = [
    [{ id: 'driver', status: 'ACTIVE' }],
    [{ id: 'school', openingTime: '07:00', closingTime: '14:30', closingTimes: [] }],
    [{ id: 'vehicle', status: 'ACTIVE' }],
  ];
  const execute = vi.fn(async () => undefined);
  const values = vi.fn(() => ({ returning: async () => [{ id: 'route', title: input.title }] }));
  const audit = vi.fn(async () => {
    if (auditFailure) throw new Error('audit unavailable');
  });
  const txn = {
    execute,
    select: vi.fn(() => query([{ value: 2 }])),
    insert: vi.fn(() => ({ values })),
  };
  const transaction = vi.fn(async (callback: (value: typeof txn) => Promise<unknown>) =>
    callback(txn),
  );
  const database = {
    db: {
      select: vi.fn(() => query(selections.shift() ?? [])),
      transaction,
    },
  };
  const service = new DriverEnrollmentService(
    database as never,
    {} as never,
    { recordInTransaction: audit } as never,
    {} as never,
  );
  return { service, transaction, execute, values, audit };
}

describe('admin route creation', () => {
  it('serializes sequence allocation and writes the route and audit in one transaction', async () => {
    const h = harness();
    await expect(h.service.createAdminRoute(input, 'admin')).resolves.toMatchObject({
      id: 'route',
    });
    expect(h.transaction).toHaveBeenCalledOnce();
    expect(h.execute).toHaveBeenCalledOnce();
    expect(h.values).toHaveBeenCalledWith(expect.objectContaining({ sequenceNumber: 3 }));
    expect(h.audit).toHaveBeenCalledOnce();
  });

  it('does not report success if the transactional audit write fails', async () => {
    const h = harness(true);
    await expect(h.service.createAdminRoute(input, 'admin')).rejects.toThrow('audit unavailable');
    expect(h.audit).toHaveBeenCalledOnce();
    expect(h.transaction).toHaveBeenCalledOnce();
  });

  it('creates one round-trip route with a large but safe rial contract price', async () => {
    const h = harness();
    await h.service.createAdminRoute(
      { ...input, direction: 'ROUND_TRIP', contractPriceRials: 1_111_111_111_110 },
      'admin',
    );
    expect(h.values).toHaveBeenCalledOnce();
    expect(h.values).toHaveBeenCalledWith(
      expect.objectContaining({
        direction: 'ROUND_TRIP',
        contractPriceRials: 1_111_111_111_110,
      }),
    );
  });
});
