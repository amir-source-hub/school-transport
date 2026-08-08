import { describe, expect, it, vi } from 'vitest';
import type { ConfigService } from '../../config/config.service';
import type { DatabaseService } from '../../database/database.service';
import { SmsNotificationService } from './sms-notification.service';
import type { SmsProvider } from './sms-provider.port';

function databaseWith(rows: unknown[][]): DatabaseService {
  const queue = [...rows];
  const select = vi.fn(() => ({
    from: vi.fn(() => ({
      where: vi.fn(() => ({
        limit: vi.fn(async () => queue.shift() ?? []),
      })),
    })),
  }));
  return { db: { select } } as unknown as DatabaseService;
}

function provider() {
  const send = vi.fn<[Parameters<SmsProvider['send']>[0]], ReturnType<SmsProvider['send']>>(
    async (_input) => ({ providerMessageId: '42', status: 1 }),
  );
  return { adapter: { send } satisfies SmsProvider, send };
}

const config = { smsProvider: 'kavenegar' } as ConfigService;

describe('SmsNotificationService', () => {
  it('re-checks optional SMS consent at dispatch time', async () => {
    const smsProvider = provider();
    const service = new SmsNotificationService(
      databaseWith([[{ phoneNumber: '09121234567' }], [{ granted: false }]]),
      config,
      smsProvider.adapter,
    );

    await expect(
      service.dispatch({ eventId: 'event-1', userId: 'user-1', notificationType: 'WELCOME' }),
    ).resolves.toEqual({ status: 'SKIPPED_NO_CONSENT', purpose: 'OPTIONAL_UPDATES' });
    expect(smsProvider.send).not.toHaveBeenCalled();
  });

  it('sends an optional SMS only after current consent is granted', async () => {
    const smsProvider = provider();
    const service = new SmsNotificationService(
      databaseWith([[{ phoneNumber: '09121234567' }], [{ granted: true }]]),
      config,
      smsProvider.adapter,
    );

    await expect(
      service.dispatch({
        eventId: 'event-2',
        userId: 'user-1',
        notificationType: 'PROFILE_UPDATED',
      }),
    ).resolves.toEqual({
      status: 'SENT',
      purpose: 'OPTIONAL_UPDATES',
      providerMessageId: '42',
    });
    expect(smsProvider.send).toHaveBeenCalledOnce();
  });

  it('sends required service notices independently of optional consent', async () => {
    const smsProvider = provider();
    const service = new SmsNotificationService(
      databaseWith([[{ phoneNumber: '09121234567' }]]),
      config,
      smsProvider.adapter,
    );

    await expect(
      service.dispatch({
        eventId: 'event-3',
        userId: 'user-1',
        notificationType: 'PAYMENT_VERIFIED',
      }),
    ).resolves.toMatchObject({ status: 'SENT', purpose: 'SERVICE_NOTICE' });
    expect(smsProvider.send).toHaveBeenCalledOnce();
  });
});
