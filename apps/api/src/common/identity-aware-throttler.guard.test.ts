import { describe, expect, it } from 'vitest';
import { IdentityAwareThrottlerGuard } from './identity-aware-throttler.guard';

describe('IdentityAwareThrottlerGuard', () => {
  const tracker = (request: Record<string, unknown>) =>
    (
      IdentityAwareThrottlerGuard.prototype as unknown as {
        getTracker: (value: Record<string, unknown>) => Promise<string>;
      }
    ).getTracker(request);

  it('uses a stable non-secret fingerprint for a bearer session', async () => {
    const first = await tracker({ headers: { authorization: 'Bearer secret-access-token' } });
    const second = await tracker({ headers: { authorization: 'Bearer secret-access-token' } });
    const other = await tracker({ headers: { authorization: 'Bearer another-access-token' } });

    expect(first).toBe(second);
    expect(first).not.toBe(other);
    expect(first).not.toContain('secret-access-token');
  });
});
