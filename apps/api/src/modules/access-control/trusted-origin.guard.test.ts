import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { describe, expect, it } from 'vitest';
import { ConfigService } from '../../config/config.service';
import { TrustedOriginGuard } from './trusted-origin.guard';

function contextWithHeaders(headers: Record<string, string | undefined>): ExecutionContext {
  return {
    switchToHttp: () => ({ getRequest: () => ({ headers }) }),
  } as ExecutionContext;
}

describe('TrustedOriginGuard', () => {
  const guard = new TrustedOriginGuard({
    corsOrigins: ['https://app.example.test'],
  } as ConfigService);

  it('allows an exact configured origin', () => {
    expect(guard.canActivate(contextWithHeaders({ origin: 'https://app.example.test' }))).toBe(
      true,
    );
  });

  it('allows an exact configured referrer origin when Origin is absent', () => {
    expect(
      guard.canActivate(
        contextWithHeaders({ referer: 'https://app.example.test/account/security' }),
      ),
    ).toBe(true);
  });

  it.each([
    {},
    { origin: 'https://evil.example.test' },
    { origin: 'https://app.example.test.evil.example' },
    { origin: 'not a URL' },
  ])('rejects missing, malformed, or unapproved origins: %j', (headers) => {
    expect(() => guard.canActivate(contextWithHeaders(headers))).toThrow(ForbiddenException);
  });
});
