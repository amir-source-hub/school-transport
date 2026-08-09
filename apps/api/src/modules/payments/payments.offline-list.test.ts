import { describe, expect, it, vi } from 'vitest';
import type { DatabaseService } from '../../database/database.service';
import { PaymentsService } from './payments.service';

function query(rows: unknown[]) {
  const chain: Record<string, unknown> = {};
  Object.assign(chain, {
    from: vi.fn(() => chain),
    innerJoin: vi.fn(() => chain),
    where: vi.fn(() => chain),
    orderBy: vi.fn(() => chain),
    limit: vi.fn(() => chain),
    offset: vi.fn(async () => rows),
    then: (resolve: (value: unknown[]) => unknown) => Promise.resolve(rows).then(resolve),
  });
  return chain;
}

describe('offline payment admin history', () => {
  it('applies bounded stable paging and enriches student/family review context', async () => {
    const submission = {
      id: 'submission-1',
      payerUserId: 'user-1',
      status: 'PENDING_REVIEW',
      submittedAmount: 2_000_000,
    };
    const results = [
      [
        {
          submission,
          itemType: 'PREPAYMENT',
          sequenceNumber: 0,
          expectedAmount: 2_000_000,
          dueDate: null,
          studentId: 'student-1',
          studentFirstName: 'علی',
          studentLastName: 'احمدی',
        },
      ],
      [{ value: 61 }],
      [
        {
          userId: 'user-1',
          firstName: 'رضا',
          lastName: 'احمدی',
          isPrimaryContact: true,
        },
      ],
    ];
    const select = vi.fn(() => query(results.shift() ?? []));
    const service = new PaymentsService(
      { db: { select } } as unknown as DatabaseService,
      {} as never,
      {} as never,
    );

    const response = await service.listOfflineSubmissionsForAdmin({
      status: 'PENDING_REVIEW',
      itemType: 'PREPAYMENT',
      page: 2,
      pageSize: 999,
    });

    expect(response).toMatchObject({ total: 61, page: 2, pageSize: 50 });
    expect(response.items[0]).toMatchObject({
      id: 'submission-1',
      studentName: 'علی احمدی',
      familyName: 'رضا احمدی',
      itemType: 'PREPAYMENT',
      expectedAmount: 2_000_000,
    });
    const itemQuery = select.mock.results[0].value;
    expect(itemQuery.orderBy).toHaveBeenCalledWith(expect.anything(), expect.anything());
    expect(itemQuery.limit).toHaveBeenCalledWith(50);
    expect(itemQuery.offset).toHaveBeenCalledWith(50);
  });

  it('returns an empty bounded page without issuing a family lookup', async () => {
    const results = [[], [{ value: 0 }]];
    const select = vi.fn(() => query(results.shift() ?? []));
    const service = new PaymentsService(
      { db: { select } } as unknown as DatabaseService,
      {} as never,
      {} as never,
    );
    await expect(service.listOfflineSubmissionsForAdmin()).resolves.toEqual({
      items: [],
      total: 0,
      page: 1,
      pageSize: 20,
    });
    expect(select).toHaveBeenCalledTimes(2);
  });
});
