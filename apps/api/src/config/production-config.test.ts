import { describe, expect, it } from 'vitest';
import { validateEnvironment } from './config.service';

const production = {
  NODE_ENV: 'production',
  DATABASE_URL: 'postgresql://app:strong-password@db:5432/app',
  REDIS_URL: 'redis://:strong-password@redis:6379',
  JWT_SECRET: 'a-production-secret-with-more-than-32-characters',
  OTP_PROVIDER: 'none',
  PAYMENT_GATEWAY_PROVIDER: 'none',
  LOG_LEVEL: 'info',
  METRICS_BEARER_TOKEN: 'metrics-token-with-more-than-32-characters',
  SEED_DEMO_DATA: 'false',
};

describe('production configuration', () => {
  it('fails production API startup while the required OTP provider is absent', () => {
    const result = validateEnvironment(production);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.flatten().fieldErrors).toMatchObject({ OTP_PROVIDER: expect.any(Array) });
    }
  });

  it('allows a production worker to disable request-time providers', () => {
    expect(validateEnvironment({ ...production, SERVICE_ROLE: 'worker' }).success).toBe(true);
  });

  it.each([
    ['JWT_SECRET', 'demo-only-secret-that-is-long-enough'],
    ['DATABASE_URL', 'postgresql://db:5432/app'],
    ['REDIS_URL', 'redis://redis:6379'],
    ['OTP_PROVIDER', 'console'],
    ['PAYMENT_GATEWAY_PROVIDER', 'mock'],
    ['LOG_LEVEL', 'debug'],
    ['METRICS_BEARER_TOKEN', 'short'],
    ['SEED_DEMO_DATA', 'true'],
  ])('rejects unsafe production %s', (name, value) => {
    expect(
      validateEnvironment({ ...production, SERVICE_ROLE: 'worker', [name]: value }).success,
    ).toBe(false);
  });

  it('allows console OTP in development while online payment remains disabled', () => {
    expect(
      validateEnvironment({
        ...production,
        NODE_ENV: 'development',
        OTP_PROVIDER: 'console',
        PAYMENT_GATEWAY_PROVIDER: 'none',
        LOG_LEVEL: 'debug',
        SEED_DEMO_DATA: 'true',
      }).success,
    ).toBe(true);
    expect(
      validateEnvironment({
        ...production,
        NODE_ENV: 'development',
        PAYMENT_GATEWAY_PROVIDER: 'mock',
      }).success,
    ).toBe(false);
  });

  it('requires Kavenegar credentials and an approved OTP template when enabled', () => {
    const missing = validateEnvironment({
      ...production,
      OTP_PROVIDER: 'kavenegar',
      SMS_PROVIDER: 'kavenegar',
      SERVICE_ROLE: 'worker',
    });
    expect(missing.success).toBe(false);
    if (!missing.success) {
      expect(missing.error.flatten().fieldErrors).toMatchObject({
        KAVEHNEGAR_API_KEY: expect.any(Array),
        KAVEHNEGAR_OTP_TEMPLATE: expect.any(Array),
      });
    }
    expect(
      validateEnvironment({
        ...production,
        OTP_PROVIDER: 'kavenegar',
        SMS_PROVIDER: 'kavenegar',
        KAVEHNEGAR_API_KEY: 'provider-secret',
        KAVEHNEGAR_OTP_TEMPLATE: 'schooltransportotp',
        SERVICE_ROLE: 'worker',
      }).success,
    ).toBe(true);
  });

  it('requires a real SMS provider, current price, and finite spend cap for broadcasts', () => {
    const result = validateEnvironment({
      ...production,
      SERVICE_ROLE: 'worker',
      FEATURE_SMS_BROADCASTS: 'true',
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.flatten().fieldErrors).toMatchObject({
        SMS_PROVIDER: expect.any(Array),
        SMS_BROADCAST_PRICE_PER_SEGMENT_RIAL: expect.any(Array),
        SMS_BROADCAST_MAX_COST_RIAL: expect.any(Array),
      });
    }
  });
});
