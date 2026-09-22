import {
  CallHandler,
  ExecutionContext,
  HttpException,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import type { FastifyReply, FastifyRequest } from 'fastify';
import { catchError, type Observable, tap, throwError } from 'rxjs';
import { RequestContext } from './request-context';
import { HttpActivityService } from './http-activity.service';
import { AppError } from './errors';
import { translateDatabaseError } from './database-errors';

export const HTTP_ACTIVITY_RECORDED = Symbol('http-activity-recorded');

type ActivityRequest = FastifyRequest & {
  user?: { id: string; role: 'PARENT' | 'ADMIN' | 'SCHOOL_MANAGER' | 'DRIVER' };
  onboarding?: { userId: string };
  [HTTP_ACTIVITY_RECORDED]?: boolean;
};

function activityRoute(request: ActivityRequest): string {
  return request.routeOptions?.url ?? new URL(request.url, 'http://local').pathname;
}

function shouldRecordActivity(request: ActivityRequest): boolean {
  const route = activityRoute(request);
  return route !== '/api/v1/health' && !route.startsWith('/api/v1/health/');
}

function safeErrorCode(error: unknown): string {
  if (!error || typeof error !== 'object') return 'UNHANDLED_ERROR';
  const candidate =
    (error as { code?: unknown; name?: unknown }).code ?? (error as { name?: unknown }).name;
  return String(candidate ?? 'UNHANDLED_ERROR')
    .replace(/[^A-Za-z0-9_.:-]/g, '_')
    .slice(0, 100);
}

function safeErrorFields(error: unknown): string[] | null {
  let names: string[] = [];
  if (error instanceof AppError) {
    names = [error.field, ...Object.keys(error.details ?? {})].filter((name): name is string =>
      Boolean(name),
    );
  } else if (error instanceof HttpException) {
    const response = error.getResponse();
    if (typeof response === 'object' && response !== null) {
      const fieldErrors = (response as { fieldErrors?: unknown }).fieldErrors;
      if (fieldErrors && typeof fieldErrors === 'object' && !Array.isArray(fieldErrors)) {
        names = Object.keys(fieldErrors);
      }
    }
  }
  // Never persist validation messages or request data; only bounded field paths.
  const fields = [...new Set(names)]
    .filter((field) => /^[A-Za-z][A-Za-z0-9_.]{0,79}$/.test(field))
    .slice(0, 25);
  return fields.length ? fields : null;
}

export function safeErrorMetadata(error: unknown) {
  const database = translateDatabaseError(error);
  if (database) {
    return {
      errorCode: database.error.code,
      errorCategory: `DATABASE.${database.diagnostics.category}`,
      databaseCode: database.diagnostics.databaseCode,
      errorFields: null,
    };
  }
  return {
    errorCode: safeErrorCode(error),
    errorCategory:
      error instanceof AppError
        ? 'APPLICATION'
        : error instanceof HttpException
          ? 'HTTP_VALIDATION_OR_GUARD'
          : 'UNHANDLED',
    databaseCode: null,
    errorFields: safeErrorFields(error),
  };
}

export function recordUninterceptedHttpFailure(
  activity: HttpActivityService,
  requestContext: RequestContext,
  request: ActivityRequest,
  error: unknown,
): void {
  if (!shouldRecordActivity(request)) return;
  if (request[HTTP_ACTIVITY_RECORDED]) return;
  request[HTTP_ACTIVITY_RECORDED] = true;
  const route = activityRoute(request);
  const database = translateDatabaseError(error);
  const statusCode = database?.error.status ?? errorStatus(error, 500);
  activity.enqueue({
    requestId: requestContext.requestId ?? String(request.id),
    traceId: requestContext.traceId ?? '00000000000000000000000000000000',
    actorType: request.user?.role ?? (request.onboarding ? 'ONBOARDING' : 'ANONYMOUS'),
    actorId: request.user?.id ?? request.onboarding?.userId ?? null,
    method: request.method.slice(0, 10),
    route: route.slice(0, 255),
    statusCode,
    durationMs: 0,
    outcome: statusCode >= 500 ? 'SERVER_ERROR' : 'CLIENT_ERROR',
    ...safeErrorMetadata(error),
    ipAddress: request.ip?.slice(0, 50) ?? null,
    userAgent: String(request.headers['user-agent'] ?? '').slice(0, 500) || null,
  });
}

function errorStatus(error: unknown, fallback: number): number {
  if (error instanceof HttpException) return error.getStatus();
  if (error && typeof error === 'object') {
    const candidate = Number(
      (error as { statusCode?: unknown; status?: unknown }).statusCode ??
        (error as { status?: unknown }).status,
    );
    if (Number.isInteger(candidate) && candidate >= 400 && candidate <= 599) return candidate;
  }
  return fallback >= 400 ? fallback : 500;
}

@Injectable()
export class HttpActivityInterceptor implements NestInterceptor {
  constructor(
    private readonly activity: HttpActivityService,
    private readonly requestContext: RequestContext,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context.switchToHttp().getRequest<ActivityRequest>();
    if (!shouldRecordActivity(request)) return next.handle();
    const reply = context.switchToHttp().getResponse<FastifyReply>();
    const started = process.hrtime.bigint();
    let recorded = false;
    const record = (error?: unknown) => {
      if (recorded) return;
      recorded = true;
      request[HTTP_ACTIVITY_RECORDED] = true;
      const route = activityRoute(request);
      const statusCode = error
        ? errorStatus(error, Number(reply.statusCode))
        : Number(reply.statusCode || 200);
      const durationMs = Math.max(0, Number((process.hrtime.bigint() - started) / 1_000_000n));
      this.activity.enqueue({
        requestId: this.requestContext.requestId ?? String(request.id),
        traceId: this.requestContext.traceId ?? '00000000000000000000000000000000',
        actorType: request.user?.role ?? (request.onboarding ? 'ONBOARDING' : 'ANONYMOUS'),
        actorId: request.user?.id ?? request.onboarding?.userId ?? null,
        method: request.method.slice(0, 10),
        route: route.slice(0, 255),
        statusCode,
        durationMs: Math.min(durationMs, 2_147_483_647),
        outcome:
          statusCode >= 500 ? 'SERVER_ERROR' : statusCode >= 400 ? 'CLIENT_ERROR' : 'SUCCESS',
        ...(error
          ? safeErrorMetadata(error)
          : { errorCode: null, errorCategory: null, databaseCode: null, errorFields: null }),
        ipAddress: request.ip?.slice(0, 50) ?? null,
        userAgent: String(request.headers['user-agent'] ?? '').slice(0, 500) || null,
      });
    };
    return next.handle().pipe(
      tap({ complete: () => record() }),
      catchError((error: unknown) => {
        record(error);
        return throwError(() => error);
      }),
    );
  }
}
