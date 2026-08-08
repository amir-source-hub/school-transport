import { describe, expect, it } from 'vitest';
import { redactSensitiveData, serializeSafeAuditValues } from './sensitive-data';

describe('sensitive data redaction', () => {
  it('redacts nested sensitive aliases without changing safe values', () => {
    expect(
      redactSensitiveData({
        user: { password_hash: 'hash', nationalId: '1234567891', name: 'Sara' },
        headers: { authorization: 'Bearer secret', cookie: 'refresh=secret' },
        attempts: [{ otpCode: '123456' }],
      }),
    ).toEqual({
      user: { password_hash: '[REDACTED]', nationalId: '[REDACTED]', name: 'Sara' },
      headers: { authorization: '[REDACTED]', cookie: '[REDACTED]' },
      attempts: [{ otpCode: '[REDACTED]' }],
    });
  });

  it('serializes and redacts JSON audit snapshots', () => {
    expect(serializeSafeAuditValues('{"refreshToken":"secret","status":"ACTIVE"}')).toBe(
      '{"refreshToken":"[REDACTED]","status":"ACTIVE"}',
    );
  });

  it('censors opaque strings instead of persisting unverifiable content', () => {
    expect(serializeSafeAuditValues('password=secret')).toBe('"[REDACTED_NON_JSON_AUDIT_VALUE]"');
  });

  it('redacts contact, home-location, contract, and payment-reference fields', () => {
    expect(
      redactSensitiveData({
        phoneNumber: '09123456789',
        streetAddress: 'تهران',
        postalCode: '1234567890',
        latitude: 35.7,
        longitude: 51.4,
        contractDataSnapshot: '{...}',
        receiptReference: 'cash-1',
        status: 'ACTIVE',
      }),
    ).toEqual({
      phoneNumber: '[REDACTED]',
      streetAddress: '[REDACTED]',
      postalCode: '[REDACTED]',
      latitude: '[REDACTED]',
      longitude: '[REDACTED]',
      contractDataSnapshot: '[REDACTED]',
      receiptReference: '[REDACTED]',
      status: 'ACTIVE',
    });
  });
});
