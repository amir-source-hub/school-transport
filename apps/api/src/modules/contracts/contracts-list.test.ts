import { describe, expect, it, vi } from 'vitest';
import type { DatabaseService } from '../../database/database.service';
import {
  ADMIN_CONTRACT_LIST_LIMIT,
  ContractsService,
  FAMILY_CONTRACT_LIST_LIMIT,
} from './contracts.service';

function dependencies(database: DatabaseService) {
  return new ContractsService(
    database,
    {} as never,
    { record: vi.fn(), recordInTransaction: vi.fn() } as never,
  );
}

function joinedQuery(rows: unknown[]) {
  const limit = vi.fn(async () => rows);
  const chain: Record<string, unknown> = {};
  chain.innerJoin = vi.fn(() => chain);
  chain.where = vi.fn(() => chain);
  chain.orderBy = vi.fn(() => ({ limit }));
  return { chain, limit };
}

describe('ContractsService bounded lists', () => {
  it('caps and orders family contract history', async () => {
    const query = joinedQuery([]);
    const database = {
      db: { select: vi.fn(() => ({ from: () => query.chain })) },
    } as unknown as DatabaseService;

    await expect(dependencies(database).getByFamily('family-1')).resolves.toEqual([]);
    expect(query.chain.orderBy).toHaveBeenCalledOnce();
    expect(query.limit).toHaveBeenCalledWith(FAMILY_CONTRACT_LIST_LIMIT);
  });

  it('caps and orders the admin contract collection before loading related rows', async () => {
    const query = joinedQuery([]);
    const database = {
      db: { select: vi.fn(() => ({ from: () => query.chain })) },
    } as unknown as DatabaseService;

    await expect(dependencies(database).getAll()).resolves.toEqual([]);
    expect(query.chain.orderBy).toHaveBeenCalledOnce();
    expect(query.limit).toHaveBeenCalledWith(ADMIN_CONTRACT_LIST_LIMIT);
  });
});
