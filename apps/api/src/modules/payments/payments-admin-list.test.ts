import { describe, expect, it, vi } from 'vitest';
import type { DatabaseService } from '../../database/database.service';
import { ADMIN_PAYMENT_PLAN_LIST_LIMIT, PaymentsService } from './payments.service';

describe('PaymentsService admin list bound', () => {
  it('caps and stably orders plans before loading financial child rows', async () => {
    const limit = vi.fn(async () => []);
    const chain: Record<string, unknown> = {};
    chain.innerJoin = vi.fn(() => chain);
    chain.orderBy = vi.fn(() => ({ limit }));
    const database = {
      db: { select: vi.fn(() => ({ from: () => chain })) },
    } as unknown as DatabaseService;
    const service = new PaymentsService(
      database,
      {} as never,
      {} as never,
      {} as never,
      {} as never,
      {} as never,
    );

    await expect(service.getAllForAdmin()).resolves.toEqual([]);
    expect(chain.orderBy).toHaveBeenCalledOnce();
    expect(limit).toHaveBeenCalledWith(ADMIN_PAYMENT_PLAN_LIST_LIMIT);
  });
});
