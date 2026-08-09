import { createHash } from 'node:crypto';
import { Injectable } from '@nestjs/common';
import { AppError } from '../../common/errors';
import { ConfigService } from '../../config/config.service';

type KavenegarEntry = {
  messageid: number | string;
  status: number;
  statustext?: string;
};

type KavenegarResponse = {
  return?: { status?: number; message?: string };
  entries?: KavenegarEntry[] | KavenegarEntry;
};

const TRANSIENT_STATUSES = new Set([408, 409, 429, 500, 502, 503, 504]);

export class KavenegarProviderError extends AppError {
  constructor(
    public readonly providerStatus: number,
    public readonly transient: boolean,
  ) {
    super(
      transient ? 'SMS_PROVIDER_TEMPORARY_FAILURE' : 'SMS_PROVIDER_REJECTED',
      'ارسال پیامک در حال حاضر امکان‌پذیر نیست. لطفاً دوباره تلاش کنید.',
      transient ? 503 : 502,
    );
  }
}

@Injectable()
export class KavenegarClient {
  constructor(private readonly config: ConfigService) {}

  async sendMessage(input: {
    receptor: string;
    message: string;
    idempotencyKey: string;
  }): Promise<KavenegarEntry> {
    const params = new URLSearchParams({
      receptor: input.receptor,
      message: input.message,
      localid: numericLocalId(input.idempotencyKey),
      hide: '1',
    });
    if (this.config.kavenegarSender) params.set('sender', this.config.kavenegarSender);
    return this.request('sms/send.json', params);
  }

  async sendOtp(input: { receptor: string; token: string }): Promise<KavenegarEntry> {
    const template = this.config.kavenegarOtpTemplate;
    if (!template) throw new KavenegarProviderError(424, false);
    return this.request(
      'verify/lookup.json',
      new URLSearchParams({ receptor: input.receptor, token: input.token, template, type: 'sms' }),
    );
  }

  private async request(path: string, body: URLSearchParams): Promise<KavenegarEntry> {
    const apiKey = this.config.kavenegarApiKey;
    if (!apiKey) throw new KavenegarProviderError(403, false);
    const url = `${this.config.kavenegarBaseUrl.replace(/\/$/, '')}/${encodeURIComponent(apiKey)}/${path}`;
    let response: Response;
    try {
      response = await fetch(url, {
        method: 'POST',
        headers: { 'content-type': 'application/x-www-form-urlencoded' },
        body,
        signal: AbortSignal.timeout(this.config.kavenegarTimeoutMs),
      });
    } catch (error) {
      const timeout = error instanceof Error && error.name === 'TimeoutError';
      throw new KavenegarProviderError(timeout ? 408 : 503, true);
    }
    let payload: KavenegarResponse;
    try {
      payload = (await response.json()) as KavenegarResponse;
    } catch {
      throw new KavenegarProviderError(response.status || 502, true);
    }
    const providerStatus = payload.return?.status ?? response.status;
    if (!response.ok || providerStatus !== 200) {
      throw new KavenegarProviderError(providerStatus, TRANSIENT_STATUSES.has(providerStatus));
    }
    const entry = Array.isArray(payload.entries) ? payload.entries[0] : payload.entries;
    if (!entry?.messageid) throw new KavenegarProviderError(502, true);
    return entry;
  }
}

export function numericLocalId(value: string): string {
  const firstTwelveHex = createHash('sha256').update(value).digest('hex').slice(0, 12);
  return Number.parseInt(firstTwelveHex, 16).toString(10);
}
