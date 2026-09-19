import {
  BadRequestException,
  ForbiddenException,
  type CallHandler,
  type ExecutionContext,
} from '@nestjs/common';
import { lastValueFrom, of, throwError } from 'rxjs';
import { describe, expect, it, vi } from 'vitest';
import {
  HttpActivityInterceptor,
  recordUninterceptedHttpFailure,
} from './http-activity.interceptor';
import { ValidationError } from './errors';

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

  it('records validation field paths without storing personal values', async () => {
    const activity = { enqueue: vi.fn() };
    const interceptor = new HttpActivityInterceptor(
      activity as never,
      { requestId: 'request-3', traceId: '1234567890abcdef1234567890abcdef' } as never,
    );
    await expect(
      lastValueFrom(
        interceptor.intercept(context(), {
          handle: () =>
            throwError(
              () =>
                new ValidationError('private-value-should-never-be-logged', {
                  'guardian.homePhone': ['private-value-should-never-be-logged'],
                  'guardian.lastName': ['invalid'],
                }),
            ),
        } as CallHandler),
      ),
    ).rejects.toBeInstanceOf(ValidationError);
    expect(activity.enqueue).toHaveBeenCalledWith(
      expect.objectContaining({
        errorCode: 'VALIDATION_ERROR',
        errorCategory: 'APPLICATION',
        errorFields: ['guardian.homePhone', 'guardian.lastName'],
      }),
    );
    expect(JSON.stringify(activity.enqueue.mock.calls)).not.toContain(
      'private-value-should-never-be-logged',
    );
  });

  it('records database category and SQLSTATE without leaking constraint details', async () => {
    const activity = { enqueue: vi.fn() };
    const interceptor = new HttpActivityInterceptor(
      activity as never,
      { requestId: 'request-4', traceId: '1234567890abcdef1234567890abcdef' } as never,
    );
    const databaseError = {
      code: '23505',
      constraint: 'private_constraint',
      detail: 'private national ID 0012345678',
    };
    await expect(
      lastValueFrom(
        interceptor.intercept(context(), {
          handle: () => throwError(() => databaseError),
        } as CallHandler),
      ),
    ).rejects.toBe(databaseError);
    expect(activity.enqueue).toHaveBeenCalledWith(
      expect.objectContaining({
        errorCode: 'DATABASE_CONFLICT',
        errorCategory: 'DATABASE.unique',
        databaseCode: '23505',
      }),
    );
    expect(JSON.stringify(activity.enqueue.mock.calls)).not.toContain('private_constraint');
    expect(JSON.stringify(activity.enqueue.mock.calls)).not.toContain('0012345678');
  });

  it('records a guard failure that occurs before the interceptor and avoids duplicates', () => {
    const activity = { enqueue: vi.fn() };
    const request = {
      id: 'fastify-guard',
      method: 'POST',
      url: '/api/v1/admin/secret?token=private',
      routeOptions: { url: '/api/v1/admin/secret' },
      headers: {},
      ip: '127.0.0.1',
    };
    const context = { requestId: 'request-5', traceId: '1234567890abcdef1234567890abcdef' };
    recordUninterceptedHttpFailure(
      activity as never,
      context as never,
      request as never,
      new ForbiddenException(),
    );
    recordUninterceptedHttpFailure(
      activity as never,
      context as never,
      request as never,
      new ForbiddenException(),
    );
    expect(activity.enqueue).toHaveBeenCalledTimes(1);
    expect(activity.enqueue).toHaveBeenCalledWith(
      expect.objectContaining({
        route: '/api/v1/admin/secret',
        statusCode: 403,
        errorCategory: 'HTTP_VALIDATION_OR_GUARD',
      }),
    );
    expect(JSON.stringify(activity.enqueue.mock.calls)).not.toContain('token=private');
  });
});
