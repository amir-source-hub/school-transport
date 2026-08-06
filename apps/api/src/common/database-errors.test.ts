import { describe, expect, it } from 'vitest';
import { DATABASE_ERROR_MARKER, markDatabaseError, translateDatabaseError } from './database-errors';

const translate = (code: string, constraint?: string) =>
  translateDatabaseError({ code, constraint, message: 'SQL and private values must not leak' });

describe('translateDatabaseError', () => {
  it.each([
    ['23505', 'unknown_constraint', 409, 'DATABASE_CONFLICT', 'unique', false],
    ['23503', undefined, 409, 'RELATED_RESOURCE_CONFLICT', 'foreign_key', false],
    ['23514', undefined, 400, 'VALIDATION_ERROR', 'check', false],
    ['23502', undefined, 400, 'VALIDATION_ERROR', 'check', false],
    ['40001', undefined, 503, 'DATABASE_RETRY_REQUIRED', 'serialization', true],
    ['40P01', undefined, 503, 'DATABASE_RETRY_REQUIRED', 'serialization', true],
    ['57014', undefined, 503, 'DATABASE_TIMEOUT', 'timeout', true],
    ['08006', undefined, 503, 'DATABASE_UNAVAILABLE', 'availability', true],
    ['57P03', undefined, 503, 'DATABASE_UNAVAILABLE', 'availability', true],
  ] as const)(
    'maps database error %s safely',
    (code, constraint, status, appCode, category, retryable) => {
      const result = translate(code, constraint);
      expect(result).toMatchObject({
        error: { status, code: appCode },
        diagnostics: { databaseCode: code, category, retryable },
      });
      expect(JSON.stringify(result)).not.toContain('SQL and private values');
      expect(JSON.stringify(result)).not.toContain('unknown_constraint');
    },
  );

  it.each([
    ['parents_national_id_unique', 'DUPLICATE_NATIONAL_ID'],
    ['students_national_id_unique', 'DUPLICATE_NATIONAL_ID'],
    ['users_phone_number_unique', 'DUPLICATE_PHONE_NUMBER'],
    ['idx_users_phone', 'DUPLICATE_PHONE_NUMBER'],
    ['idx_parents_user_type', 'PARENT_TYPE_EXISTS'],
  ])('preserves the safe mapping for known unique constraint %s', (constraint, code) => {
    expect(translate('23505', constraint)?.error).toMatchObject({ status: 409, code });
  });

  it('unwraps driver causes and leaves unknown failures to the generic 500 fallback', () => {
    expect(translateDatabaseError({ cause: { code: '40001' } })?.error.code).toBe(
      'DATABASE_RETRY_REQUIRED',
    );
    expect(translateDatabaseError({ code: 'XX000' })).toBeUndefined();
    expect(translateDatabaseError(new Error('ordinary failure'))).toBeUndefined();
  });

  it.each(['ETIMEDOUT', 'ECONNREFUSED', 'ECONNRESET'])(
    'does not misclassify an unmarked dependency error with code %s as a database error',
    (code) => {
      expect(translateDatabaseError({ code, provider: 'otp-or-redis' })).toBeUndefined();
    },
  );

  it.each([
    ['ETIMEDOUT', 'DATABASE_TIMEOUT'],
    ['ECONNREFUSED', 'DATABASE_UNAVAILABLE'],
    ['ECONNRESET', 'DATABASE_UNAVAILABLE'],
  ])('translates marked PostgreSQL network error %s', (code, appCode) => {
    const driverError = { code };
    const databaseBoundaryError = {
      [DATABASE_ERROR_MARKER]: true as const,
      cause: driverError,
    };
    expect(translateDatabaseError(databaseBoundaryError)?.error).toMatchObject({
      code: appCode,
      status: 503,
    });
    expect(markDatabaseError(driverError)[DATABASE_ERROR_MARKER]).toBe(true);
  });
});
