import { describe, expect, it, vi } from 'vitest';
import type { DatabaseService } from '../../../database/database.service';
import { ADMIN_FAMILY_LIST_LIMIT, FamiliesService } from './families.service';

describe('FamiliesService admin list bound', () => {
  it('caps and stably orders accounts before loading related family data', async () => {
    const limit = vi.fn(async () => []);
    const database = {
      db: {
        select: vi.fn(() => ({
          from: () => ({ orderBy: () => ({ limit }) }),
        })),
      },
    } as unknown as DatabaseService;

    await expect(new FamiliesService(database, {} as never).getAllForAdmin()).resolves.toEqual([]);
    expect(limit).toHaveBeenCalledWith(ADMIN_FAMILY_LIST_LIMIT);
    expect(database.db.select).toHaveBeenCalledOnce();
  });
});
