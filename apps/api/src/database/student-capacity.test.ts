import { describe, expect, it, vi } from 'vitest';
import {
  assertStudentCapacity,
  getStudentCapacity,
  StudentCapacityLimitError,
} from './student-capacity';

function buildChain(rows: unknown[]) {
  const thenable = {
    from: vi.fn(),
    where: vi.fn(),
    for: vi.fn(),
    limit: vi.fn(),
    then: (onFulfilled: (value: unknown) => unknown) =>
      Promise.resolve(rows).then(onFulfilled),
  };
  thenable.from.mockReturnValue(thenable);
  thenable.where.mockReturnValue(thenable);
  thenable.for.mockReturnValue(thenable);
  thenable.limit.mockReturnValue(thenable);
  return thenable;
}

function capacityTx(selectResults: unknown[][]) {
  const select = vi.fn(() => buildChain(selectResults.shift() ?? []));
  const execute = vi.fn();
  return { select, execute } as never;
}

describe('assertStudentCapacity', () => {
  it('allows a student creation when the account is below its limit', async () => {
    const txn = capacityTx([[{ studentLimit: 2 }], [{ count: 1 }]]);

    await expect(assertStudentCapacity(txn, 'account-1')).resolves.toBeUndefined();
  });

  it('throws STUDENT_LIMIT_REACHED when the active count equals the limit', async () => {
    const txn = capacityTx([[{ studentLimit: 2 }], [{ count: 2 }]]);

    await expect(assertStudentCapacity(txn, 'account-1')).rejects.toMatchObject({
      code: 'STUDENT_LIMIT_REACHED',
      status: 409,
    });
    const freshTxn = capacityTx([[{ studentLimit: 2 }], [{ count: 2 }]]);
    await expect(assertStudentCapacity(freshTxn, 'account-1')).rejects.toBeInstanceOf(
      StudentCapacityLimitError,
    );
  });

  it('throws STUDENT_LIMIT_REACHED when the active count exceeds the limit', async () => {
    const txn = capacityTx([[{ studentLimit: 2 }], [{ count: 3 }]]);

    await expect(assertStudentCapacity(txn, 'account-1')).rejects.toMatchObject({
      code: 'STUDENT_LIMIT_REACHED',
    });
  });

  it('locks the owner row FOR UPDATE before counting', async () => {
    const txn = capacityTx([[{ studentLimit: 2 }], [{ count: 0 }]]);

    await assertStudentCapacity(txn, 'account-1');
    const userChain = (txn as { select: ReturnType<typeof vi.fn> }).select.mock.results[0]
      .value;
    expect(userChain.for).toHaveBeenCalledWith('update');
  });

  it('counts only active profiles so archived students free capacity', async () => {
    const txn = capacityTx([[{ studentLimit: 2 }], [{ count: 1 }]]);

    await assertStudentCapacity(txn, 'account-1');
    const countChain = (txn as { select: ReturnType<typeof vi.fn> }).select.mock.results[1]
      .value as { where: ReturnType<typeof vi.fn> };
    const query = (countChain.where.mock.calls[0][0] as {
      toQuery: (config: unknown) => { sql: string; params: unknown[] };
    }).toQuery({
      escapeName: (name: string) => `"${name}"`,
      escapeParam: (num: number) => `$${num + 1}`,
      escapeString: (value: string) => `'${value}'`,
    });
    expect(query.sql).toContain('is_active');
    expect(query.params).toContain(true);
  });
});

describe('getStudentCapacity', () => {
  function db(accountRows: unknown[], countRows: unknown[]) {
    const select = vi
      .fn()
      .mockReturnValueOnce(buildChain(accountRows))
      .mockReturnValueOnce(buildChain(countRows));
    return { select } as never;
  }

  it('returns limit, active count, and remaining capacity', async () => {
    const database = db([{ studentLimit: 2 }], [{ count: 1 }]);

    const result = await getStudentCapacity(database, 'account-1');

    expect(result).toEqual({ studentLimit: 2, activeStudentCount: 1, remaining: 1 });
  });

  it('clamps remaining to zero and defaults the limit when no account row exists', async () => {
    const database = db([], [{ count: 5 }]);

    const result = await getStudentCapacity(database, 'account-1');

    expect(result).toEqual({ studentLimit: 2, activeStudentCount: 5, remaining: 0 });
  });
});
