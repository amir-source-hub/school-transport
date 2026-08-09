import { describe, expect, it, vi } from 'vitest';
import type { DatabaseService } from '../../database/database.service';
import {
  ADMIN_ENROLLMENT_MATERIALIZATION_LIMIT,
  RegistrationsService,
} from './registrations.service';

describe('RegistrationsService admin list bound', () => {
  it('fails closed when pre-pagination materialization exceeds its ceiling', async () => {
    const rows = Array.from({ length: ADMIN_ENROLLMENT_MATERIALIZATION_LIMIT + 1 }, (_, index) => ({
      id: `registration-${index}`,
    }));
    const limit = vi.fn(async () => rows);
    const chain: Record<string, unknown> = {};
    chain.innerJoin = vi.fn(() => chain);
    chain.orderBy = vi.fn(() => ({ limit }));
    const database = {
      db: { select: vi.fn(() => ({ from: () => chain })) },
    } as unknown as DatabaseService;
    const service = new RegistrationsService(database, {} as never, {} as never);

    await expect(
      service.getEnrollmentsForAdminPage({
        page: 1,
        pageSize: 20,
        status: 'ALL',
        sort: 'createdAt',
        direction: 'desc',
      } as never),
    ).rejects.toMatchObject({ code: 'VALIDATION_ERROR' });
    expect(limit).toHaveBeenCalledWith(ADMIN_ENROLLMENT_MATERIALIZATION_LIMIT + 1);
  });
});
