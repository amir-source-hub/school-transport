import { describe, expect, it, vi } from 'vitest';
import type { ArgumentsHost } from '@nestjs/common';
import { GlobalExceptionFilter } from './filters';

describe('GlobalExceptionFilter database errors', () => {
  it('returns a safe response and logs only sanitized structured diagnostics', () => {
    const send = vi.fn();
    const status = vi.fn(() => ({ send }));
    const logger = { warn: vi.fn(), error: vi.fn() };
    const requestContext = { requestId: 'request-123' };
    const host = {
      switchToHttp: () => ({ getResponse: () => ({ status }) }),
    } as unknown as ArgumentsHost;
    const filter = new GlobalExceptionFilter(logger as never, requestContext as never);

    filter.catch(
      {
        code: '23505',
        constraint: 'secret_schema_private_unique',
        detail: 'Key (national_id)=(0012345678) already exists.',
        query: 'insert into secret_schema.parents ...',
      },
      host,
    );

    expect(status).toHaveBeenCalledWith(409);
    expect(send).toHaveBeenCalledWith({
      success: false,
      error: {
        code: 'DATABASE_CONFLICT',
        message: 'The requested record conflicts with existing data.',
      },
      meta: { requestId: 'request-123' },
    });
    const logged = JSON.stringify(logger.warn.mock.calls);
    expect(logged).toContain('request-123');
    expect(logged).toContain('23505');
    expect(logged).not.toContain('secret_schema');
    expect(logged).not.toContain('0012345678');
    expect(logger.error).not.toHaveBeenCalled();
  });
});
