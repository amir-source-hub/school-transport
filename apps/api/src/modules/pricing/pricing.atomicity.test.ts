import { describe, expect, it, vi } from 'vitest';
import type { DatabaseService } from '../../database/database.service';
import type { InAppNotificationService } from '../../infrastructure/notifications/in-app-notification.service';
import { PricingService } from './pricing.service';

function selectChain(rows: unknown[]) {
  const chain = {
    from: vi.fn(),
    innerJoin: vi.fn(),
    where: vi.fn(),
    for: vi.fn(),
    limit: vi.fn(async () => rows),
  };
  chain.from.mockReturnValue(chain);
  chain.innerJoin.mockReturnValue(chain);
  chain.where.mockReturnValue(chain);
  chain.for.mockReturnValue(chain);
  return chain;
}

function updateChain(rows: unknown[]) {
  const chain = {
    set: vi.fn(),
    where: vi.fn(),
    returning: vi.fn(async () => rows),
  };
  chain.set.mockReturnValue(chain);
  chain.where.mockReturnValue(chain);
  return chain;
}

describe('price acceptance transaction', () => {
  it('rolls back acceptance and creates no plan when the registration transition updates zero rows', async () => {
    const price = {
      id: 'price-1',
      registrationId: 'registration-1',
      priceStatus: 'OFFERED',
      totalAmount: 100_000,
      prepaymentAmount: 20_000,
      installmentCount: 4,
      fullPaymentAllowed: true,
      installmentPaymentAllowed: true,
    };
    const selectResults = [
      [price],
      [{ registration: { id: 'registration-1', registrationStatus: 'APPROVED' } }],
    ];
    const select = vi.fn(() => selectChain(selectResults.shift() ?? []));
    let persistedPriceStatus = 'OFFERED';
    const updateResults = [[{ id: 'price-1' }], []];
    const update = vi.fn(() => {
      const result = updateResults.shift() ?? [];
      if (result.length > 0) persistedPriceStatus = 'ACCEPTED';
      return updateChain(result);
    });
    const insert = vi.fn();
    let rolledBack = false;
    const transaction = vi.fn(async (callback: (txn: unknown) => Promise<unknown>) => {
      try {
        return await callback({ select, update, insert });
      } catch (error) {
        rolledBack = true;
        persistedPriceStatus = 'OFFERED';
        throw error;
      }
    });
    const notifications = { enqueueInTransaction: vi.fn() };
    const service = new PricingService(
      { db: { transaction } } as unknown as DatabaseService,
      notifications as unknown as InAppNotificationService,
      { recordInTransaction: vi.fn() } as never,
    );

    await expect(
      service.acceptPrice('price-1', 'family-1', 'PREPAYMENT_PLUS_FOUR_INSTALLMENTS'),
    ).rejects.toMatchObject({ code: 'REGISTRATION_STATE_CHANGED', status: 409 });

    expect(rolledBack).toBe(true);
    expect(persistedPriceStatus).toBe('OFFERED');
    expect(update).toHaveBeenCalledTimes(2);
    expect(insert).not.toHaveBeenCalled();
    expect(notifications.enqueueInTransaction).not.toHaveBeenCalled();
  });
});
