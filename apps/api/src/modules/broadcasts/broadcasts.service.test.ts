import { describe, expect, it, vi } from 'vitest';
import type { ConfigService } from '../../config/config.service';
import type { DatabaseService } from '../../database/database.service';
import { KavenegarProviderError } from '../../infrastructure/sms/kavenegar.client';
import { BroadcastsService } from './broadcasts.service';

function database(rows: unknown[]): DatabaseService {
  const chain = {
    from: vi.fn(),
    innerJoin: vi.fn(),
    where: vi.fn(async () => rows),
  };
  chain.from.mockReturnValue(chain);
  chain.innerJoin.mockReturnValue(chain);
  return { db: { select: vi.fn(() => chain) } } as unknown as DatabaseService;
}

const input = {
  name: 'تبریک سال نو',
  smsContent: 'ثمین گشت: سال نو مبارک',
  scheduledAt: new Date(Date.now() + 3_600_000).toISOString(),
  expiresAt: new Date(Date.now() + 86_400_000).toISOString(),
  featureEnabled: true,
};

function config(overrides: Partial<ConfigService> = {}) {
  return {
    featureSmsBroadcasts: true,
    smsProvider: 'kavenegar',
    smsBroadcastMaxSegments: 3,
    smsBroadcastMaxRecipients: 100,
    smsBroadcastPricePerSegmentRial: 1_000,
    ...overrides,
  } as ConfigService;
}

describe('BroadcastsService preview', () => {
  it('deduplicates normalized phones and estimates segment cost', async () => {
    const service = new BroadcastsService(
      database([
        { id: 'user-1', phoneNumber: '09120000000' },
        { id: 'user-2', phoneNumber: '09120000000' },
        { id: 'user-3', phoneNumber: 'invalid' },
      ]),
      config(),
      { send: vi.fn() } as never,
      { record: vi.fn(), recordInTransaction: vi.fn() } as never,
    );

    await expect(service.preview(input)).resolves.toEqual({
      segmentCount: 1,
      estimatedRecipients: 1,
      estimatedCostRial: 1_000,
    });
  });

  it('fails closed when the feature is disabled', async () => {
    const service = new BroadcastsService(
      database([]),
      config({ featureSmsBroadcasts: false } as Partial<ConfigService>),
      { send: vi.fn() } as never,
      { record: vi.fn(), recordInTransaction: vi.fn() } as never,
    );
    await expect(service.preview(input)).rejects.toMatchObject({ code: 'SMS_BROADCASTS_DISABLED' });
  });

  it('enforces the configured campaign spend cap', async () => {
    const service = new BroadcastsService(
      database([{ id: 'user-1', phoneNumber: '09120000000' }]),
      config({ smsBroadcastMaxCostRial: 999 } as Partial<ConfigService>),
      { send: vi.fn() } as never,
      { record: vi.fn(), recordInTransaction: vi.fn() } as never,
    );
    await expect(service.preview(input)).rejects.toMatchObject({ code: 'BROADCAST_COST_LIMIT' });
  });
});

function selectLimitChain(rows: unknown[]) {
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

function trackedUpdateChain(
  updates: Array<Record<string, unknown>>,
  returned: unknown[] = [],
): Record<string, unknown> {
  const chain: Record<string, unknown> = {};
  chain.set = vi.fn((value) => {
    updates.push(value);
    return chain;
  });
  chain.where = vi.fn(() => chain);
  chain.returning = vi.fn(async () => returned);
  return chain;
}

const campaign = {
  id: 'campaign-1',
  creatorId: 'admin-1',
  status: 'PENDING_APPROVAL',
  featureEnabled: true,
  name: 'کمپین',
  smsContent: 'پیام',
  inAppTitle: null,
  inAppContent: null,
  segmentCount: 1,
  audience: { accountStatus: 'ACTIVE' },
  scheduledAt: new Date(Date.now() + 1000),
  expiresAt: new Date(Date.now() + 100_000),
};

describe('BroadcastsService workflow safeguards', () => {
  it('requires approval by a different super-administrator identity', async () => {
    const select = vi.fn(() => selectLimitChain([campaign]));
    const db = {
      db: {
        transaction: vi.fn(async (callback: (txn: unknown) => Promise<unknown>) =>
          callback({ select }),
        ),
      },
    } as unknown as DatabaseService;
    const service = new BroadcastsService(
      db,
      config(),
      { send: vi.fn() } as never,
      { record: vi.fn(), recordInTransaction: vi.fn() } as never,
    );

    await expect(service.approve(campaign.id, campaign.creatorId)).rejects.toMatchObject({
      code: 'DUAL_APPROVAL_REQUIRED',
      status: 403,
    });
  });

  it('rechecks consent and account/phone eligibility before sending', async () => {
    const updates: Array<Record<string, unknown>> = [];
    const updateChain = trackedUpdateChain(updates);
    const db = {
      db: { select: vi.fn(() => selectLimitChain([])), update: vi.fn(() => updateChain) },
    } as unknown as DatabaseService;
    const send = vi.fn();
    const service = new BroadcastsService(
      db,
      config(),
      { send } as never,
      { record: vi.fn(), recordInTransaction: vi.fn() } as never,
    );

    await (
      service as unknown as { deliver: (campaign: unknown, recipient: unknown) => Promise<void> }
    ).deliver(
      { ...campaign, status: 'PROCESSING' },
      { id: 'recipient-1', userId: 'user-1', normalizedPhone: '09120000000', attemptCount: 1 },
    );

    expect(send).not.toHaveBeenCalled();
    expect(updates).toContainEqual(expect.objectContaining({ status: 'SKIPPED_NO_CONSENT' }));
  });

  it.each([
    [new Error('network'), 'RETRY'],
    [new KavenegarProviderError(424, false), 'FAILED'],
  ])(
    'classifies recipient delivery failures without exposing provider details',
    async (failure, expectedStatus) => {
      const updates: Array<Record<string, unknown>> = [];
      const updateChain = trackedUpdateChain(updates);
      const db = {
        db: {
          select: vi.fn(() => selectLimitChain([{ id: 'user-1' }])),
          update: vi.fn(() => updateChain),
        },
      } as unknown as DatabaseService;
      const service = new BroadcastsService(
        db,
        config(),
        { send: vi.fn(async () => Promise.reject(failure)) } as never,
        { record: vi.fn(), recordInTransaction: vi.fn() } as never,
      );

      await (
        service as unknown as { deliver: (campaign: unknown, recipient: unknown) => Promise<void> }
      ).deliver(
        { ...campaign, status: 'PROCESSING' },
        { id: 'recipient-1', userId: 'user-1', normalizedPhone: '09120000000', attemptCount: 1 },
      );

      expect(updates).toContainEqual(expect.objectContaining({ status: expectedStatus }));
    },
  );

  it('pauses an active campaign and records the privileged action', async () => {
    const updates: Array<Record<string, unknown>> = [];
    const updateChain = trackedUpdateChain(updates, [{ ...campaign, status: 'PAUSED' }]);
    const audit = { record: vi.fn(), recordInTransaction: vi.fn() };
    const service = new BroadcastsService(
      { db: { update: vi.fn(() => updateChain) } } as unknown as DatabaseService,
      config(),
      { send: vi.fn() } as never,
      audit as never,
    );

    await expect(service.pause(campaign.id, 'admin-2')).resolves.toMatchObject({
      status: 'PAUSED',
    });
    expect(updates).toContainEqual(expect.objectContaining({ status: 'PAUSED' }));
    expect(audit.record).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'SMS_BROADCAST_PAUSED' }),
    );
  });
});
