import { describe, expect, it } from 'vitest';
import { resolveRequestId } from './middleware';
import { RequestContext } from './request-context';

describe('request correlation', () => {
  it('preserves a safe caller-provided correlation ID', () => {
    expect(resolveRequestId('client.request-123')).toBe('client.request-123');
  });

  it.each(['', 'contains spaces', 'line\nbreak', 'x'.repeat(129)])(
    'replaces an unsafe correlation ID: %j',
    (value) => {
      expect(resolveRequestId(value)).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/,
      );
    },
  );

  it('keeps request IDs isolated across asynchronous work', async () => {
    const context = new RequestContext();
    const first = context.run('request-a', async () => {
      await Promise.resolve();
      return context.requestId;
    });
    const second = context.run('request-b', async () => {
      await Promise.resolve();
      return context.requestId;
    });

    await expect(Promise.all([first, second])).resolves.toEqual(['request-a', 'request-b']);
    expect(context.requestId).toBeUndefined();
  });
});
