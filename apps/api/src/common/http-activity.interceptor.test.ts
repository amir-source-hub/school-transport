import { BadRequestException, type CallHandler, type ExecutionContext } from '@nestjs/common';
import { lastValueFrom, of, throwError } from 'rxjs';
import { describe, expect, it, vi } from 'vitest';
import { HttpActivityInterceptor } from './http-activity.interceptor';

function context(statusCode = 200): ExecutionContext {
  const request = {
    id: 'fastify-1',
    method: 'GET',
    url: '/api/v1/students?secret=never-store-this',
    routeOptions: { url: '/api/v1/students' },
    headers: { 'user-agent': 'test-agent' },
    ip: '127.0.0.1',
    user: { id: '00000000-0000-4000-8000-000000000001', role: 'PARENT' },
  };
  return {
    switchToHttp: () => ({
      getRequest: () => request,
      getResponse: () => ({ statusCode }),
    }),
  } as unknown as ExecutionContext;
}

describe('HttpActivityInterceptor', () => {
  it('records metadata for a successful request without query strings or bodies', async () => {
    const activity = { enqueue: vi.fn() };
    const interceptor = new HttpActivityInterceptor(
      activity as never,
      {
        requestId: 'request-1',
        traceId: '1234567890abcdef1234567890abcdef',
      } as never,
    );
    await lastValueFrom(
      interceptor.intercept(context(), {
        handle: () => of({ secret: 'not logged' }),
      } as CallHandler),
    );
    expect(activity.enqueue).toHaveBeenCalledWith(
      expect.objectContaining({
        requestId: 'request-1',
        route: '/api/v1/students',
        statusCode: 200,
        outcome: 'SUCCESS',
      }),
    );
    expect(JSON.stringify(activity.enqueue.mock.calls)).not.toContain('never-store-this');
    expect(JSON.stringify(activity.enqueue.mock.calls)).not.toContain('not logged');
  });

  it('classifies handled HTTP failures using their eventual response status', async () => {
    const activity = { enqueue: vi.fn() };
    const interceptor = new HttpActivityInterceptor(
      activity as never,
      {
        requestId: 'request-2',
        traceId: '1234567890abcdef1234567890abcdef',
      } as never,
    );
    await expect(
      lastValueFrom(
        interceptor.intercept(context(), {
          handle: () => throwError(() => new BadRequestException('invalid secret value')),
        } as CallHandler),
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(activity.enqueue).toHaveBeenCalledWith(
      expect.objectContaining({
        statusCode: 400,
        outcome: 'CLIENT_ERROR',
        errorCode: 'BadRequestException',
      }),
    );
    expect(JSON.stringify(activity.enqueue.mock.calls)).not.toContain('invalid secret value');
  });
});
