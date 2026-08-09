import { describe, expect, it, vi } from 'vitest';
import type { ArgumentsHost } from '@nestjs/common';
import { GlobalExceptionFilter } from './filters';
import { AppError } from './errors';

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

describe('GlobalExceptionFilter privacy-safe logging', () => {
  it('does not log application messages that may contain user-provided content', () => {
    const send = vi.fn();
    const status = vi.fn(() => ({ send }));
    const logger = { warn: vi.fn(), error: vi.fn() };
    const host = {
      switchToHttp: () => ({ getResponse: () => ({ status }) }),
    } as unknown as ArgumentsHost;
    const filter = new GlobalExceptionFilter(logger as never, { requestId: 'request-1' } as never);
    filter.catch(new AppError('INVALID_FEEDBACK', 'private feedback body 09121234567', 400), host);
    const logged = JSON.stringify(logger.warn.mock.calls);
    expect(logged).toContain('INVALID_FEEDBACK');
    expect(logged).not.toContain('private feedback body');
    expect(logged).not.toContain('09121234567');
  });

  it('does not log raw unhandled error messages or stacks', () => {
    const send = vi.fn();
    const status = vi.fn(() => ({ send }));
    const logger = { warn: vi.fn(), error: vi.fn() };
    const host = {
      switchToHttp: () => ({ getResponse: () => ({ status }) }),
    } as unknown as ArgumentsHost;
    const filter = new GlobalExceptionFilter(logger as never, { requestId: 'request-1' } as never);
    filter.catch(new Error('https://signed.example/private?token=secret'), host);
    const logged = JSON.stringify(logger.error.mock.calls);
    expect(logged).toContain('unhandled_exception');
    expect(logged).not.toContain('signed.example');
    expect(logged).not.toContain('secret');
  });
});
