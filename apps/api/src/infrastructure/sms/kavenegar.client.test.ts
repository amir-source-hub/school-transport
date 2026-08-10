import { afterEach, describe, expect, it, vi } from 'vitest';
import type { ConfigService } from '../../config/config.service';
import { KavenegarClient, numericLocalId } from './kavenegar.client';

const config = {
  kavenegarApiKey: 'secret-api-key',
  kavenegarBaseUrl: 'https://api.kavenegar.com/v1',
  kavenegarSender: '10004346',
  kavenegarOtpTemplate: 'schooltransportotp',
  kavenegarTimeoutMs: 1_000,
} as ConfigService;

afterEach(() => {
  vi.unstubAllGlobals();
});

type FetchMock = ReturnType<
  typeof vi.fn<(input: string | URL | Request, init?: RequestInit) => Promise<Response>>
>;

describe('KavenegarClient', () => {
  it('uses VerifyLookup for OTP with the approved template', async () => {
    const fetchMock: FetchMock = vi.fn(
      async (_input, _init) =>
        new Response(
          JSON.stringify({
            return: { status: 200, message: 'ok' },
            entries: [{ messageid: 42, status: 5 }],
          }),
          { status: 200, headers: { 'content-type': 'application/json' } },
        ),
    );
    vi.stubGlobal('fetch', fetchMock);

    await expect(
      new KavenegarClient(config).sendOtp({ receptor: '09121234567', token: '123456' }),
    ).resolves.toMatchObject({ messageid: 42 });
    const [url, request] = fetchMock.mock.calls[0]!;
    expect(url).toContain('/verify/lookup.json');
    expect(String(request?.body)).toContain('template=schooltransportotp');
    expect(String(request?.body)).toContain('token=123456');
  });

  it('uses a stable numeric localid for ordinary SMS retries', async () => {
    const fetchMock: FetchMock = vi.fn(
      async (_input, _init) =>
        new Response(
          JSON.stringify({ return: { status: 200 }, entries: [{ messageid: 84, status: 1 }] }),
          { status: 200 },
        ),
    );
    vi.stubGlobal('fetch', fetchMock);
    const client = new KavenegarClient(config);

    await client.sendMessage({
      receptor: '09121234567',
      message: 'پیام امن',
      idempotencyKey: 'event-1:SMS',
    });
    const body = String(fetchMock.mock.calls[0]![1]?.body);
    expect(body).toContain(`localid=${numericLocalId('event-1:SMS')}`);
    expect(numericLocalId('event-1:SMS')).toMatch(/^\d+$/);
  });

  it('classifies provider rejection as permanent and network failure as transient', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response(JSON.stringify({ return: { status: 424 } }), { status: 424 })),
    );
    await expect(
      new KavenegarClient(config).sendOtp({ receptor: '09121234567', token: '123456' }),
    ).rejects.toMatchObject({ transient: false, providerStatus: 424 });

    vi.stubGlobal(
      'fetch',
      vi.fn(async () => Promise.reject(new Error('timeout'))),
    );
    await expect(
      new KavenegarClient(config).sendOtp({ receptor: '09121234567', token: '123456' }),
    ).rejects.toMatchObject({ transient: true });
  });
});
