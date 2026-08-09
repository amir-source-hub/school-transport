import { describe, expect, it, vi } from 'vitest';
import type { DatabaseService } from '../../database/database.service';
import { SCHOOL_LIST_LIMIT, SchoolsService } from './schools.service';

describe('SchoolsService list bounds', () => {
  it.each([false, true])(
    'caps and stably orders the school list (includeInactive=%s)',
    async (includeInactive) => {
      const limit = vi.fn(async () => []);
      const ordered = { limit };
      const chain: Record<string, unknown> = {};
      chain.where = vi.fn(() => chain);
      chain.orderBy = vi.fn(() => ordered);
      const database = {
        db: { select: vi.fn(() => ({ from: () => chain })) },
      } as unknown as DatabaseService;

      await expect(new SchoolsService(database).getAll(includeInactive)).resolves.toEqual([]);
      expect(chain.orderBy).toHaveBeenCalledOnce();
      expect(limit).toHaveBeenCalledWith(SCHOOL_LIST_LIMIT);
    },
  );
});
