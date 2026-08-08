import { getTableConfig } from 'drizzle-orm/pg-core';
import { describe, expect, it, vi } from 'vitest';
import type { AppLogger } from '../../common/logger';
import type { DatabaseService } from '../../database/database.service';
import { notificationOutbox, notifications } from '../../database/schemas';
import { InAppNotificationService, notificationRetryDecision } from './in-app-notification.service';

describe('notification transactional outbox', () => {
  it('deduplicates both stable intents and delivered notifications by event ID', () => {
    const outboxIndexes = getTableConfig(notificationOutbox).indexes.map(
      (index) => index.config.name,
    );
    const notificationIndexes = getTableConfig(notifications).indexes.map(
      (index) => index.config.name,
    );
    expect(outboxIndexes).toContain('idx_notification_outbox_event');
    expect(notificationIndexes).toContain('idx_notifications_event');
  });

  it('uses bounded exponential retry and dead-letters poison events', () => {
    expect(notificationRetryDecision(1)).toEqual({ status: 'RETRY', delayMs: 5_000 });
    expect(notificationRetryDecision(4)).toEqual({ status: 'RETRY', delayMs: 40_000 });
    expect(notificationRetryDecision(5)).toEqual({ status: 'DEAD', delayMs: 80_000 });
    expect(notificationRetryDecision(20).delayMs).toBe(60 * 60 * 1_000);
  });

  it('does not report an already committed command as failed when outbox enqueue is unavailable', async () => {
    const database = {
      db: { transaction: vi.fn().mockRejectedValue(new Error('database unavailable')) },
    } as unknown as DatabaseService;
    const logger = { error: vi.fn() } as unknown as AppLogger;
    const service = new InAppNotificationService(database, logger, {
      dispatch: vi.fn(async () => ({ status: 'DISABLED', purpose: 'SERVICE_NOTICE' })),
    } as never);

    await expect(
      service.create({
        eventId: 'PROFILE_UPDATED:parent-1:revision-2',
        userId: 'user-1',
        notificationType: 'PROFILE_UPDATED',
        title: 'updated',
        message: 'updated',
      }),
    ).resolves.toBeUndefined();
    expect(logger.error).toHaveBeenCalledWith(
      'Notification outbox enqueue failed after command commit.',
    );
  });

  it('replays a stale processing event after worker restart and marks it delivered', async () => {
    const event = {
      id: 'event-row-1',
      eventId: 'CONTRACT_READY:contract-1:user-1',
      userId: 'user-1',
      notificationType: 'CONTRACT_READY',
      title: 'ready',
      message: 'ready',
      relatedEntityType: 'CONTRACT',
      relatedEntityId: 'contract-1',
      outboxStatus: 'PROCESSING',
      attemptCount: 1,
      nextAttemptAt: new Date(0),
      lockedAt: new Date(0),
      deliveredAt: null,
      failureCode: null,
      createdAt: new Date(0),
      updatedAt: new Date(0),
    };
    const selectResults = [[event], []];
    const select = vi.fn(() => {
      const rows = selectResults.shift() ?? [];
      const chain = {
        from: vi.fn(),
        where: vi.fn(),
        for: vi.fn(),
        limit: vi.fn(async () => rows),
      };
      chain.from.mockReturnValue(chain);
      chain.where.mockReturnValue(chain);
      chain.for.mockReturnValue(chain);
      return chain;
    });
    const deliveredStates: unknown[] = [];
    const update = vi.fn(() => {
      type UpdateChain = {
        set: (state: unknown) => UpdateChain;
        where: (...args: unknown[]) => UpdateChain;
        returning: () => Promise<unknown[]>;
        then: (resolve: (value: unknown) => unknown) => Promise<unknown>;
      };
      const chain = {} as UpdateChain;
      chain.set = vi.fn((state: unknown) => {
        deliveredStates.push(state);
        return chain;
      });
      chain.where = vi.fn(() => chain);
      chain.returning = vi.fn(async () => [{ ...event, attemptCount: 2 }]);
      chain.then = (resolve: (value: unknown) => unknown) =>
        Promise.resolve(undefined).then(resolve);
      return chain;
    });
    const insert = vi.fn(() => ({
      values: vi.fn(() => ({ onConflictDoNothing: vi.fn(async () => undefined) })),
    }));
    const txn = { select, update, insert };
    const database = {
      db: {
        transaction: vi.fn((callback: (value: typeof txn) => Promise<unknown>) => callback(txn)),
        update,
      },
    } as unknown as DatabaseService;
    const service = new InAppNotificationService(
      database,
      { error: vi.fn(), warn: vi.fn() } as unknown as AppLogger,
      {
        dispatch: vi.fn(async () => ({ status: 'DISABLED', purpose: 'SERVICE_NOTICE' })),
      } as never,
    );

    await expect(service.dispatchAvailable()).resolves.toBe(1);
    expect(insert).toHaveBeenCalledTimes(1);
    expect(deliveredStates).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ outboxStatus: 'PROCESSING', attemptCount: 2 }),
        expect.objectContaining({ outboxStatus: 'DELIVERED' }),
      ]),
    );
  });
});
