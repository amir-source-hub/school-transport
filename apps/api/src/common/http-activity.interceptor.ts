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

type ActivityRequest = FastifyRequest & {
  user?: { id: string; role: 'PARENT' | 'ADMIN' | 'SCHOOL_MANAGER' };
  onboarding?: { userId: string };
};

function safeErrorCode(error: unknown): string {
  if (!error || typeof error !== 'object') return 'UNHANDLED_ERROR';
  const candidate =
    (error as { code?: unknown; name?: unknown }).code ?? (error as { name?: unknown }).name;
  return String(candidate ?? 'UNHANDLED_ERROR')
    .replace(/[^A-Za-z0-9_.:-]/g, '_')
    .slice(0, 100);
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
    const reply = context.switchToHttp().getResponse<FastifyReply>();
    const started = process.hrtime.bigint();
    let recorded = false;
    const record = (error?: unknown) => {
      if (recorded) return;
      recorded = true;
      const route = request.routeOptions?.url ?? new URL(request.url, 'http://local').pathname;
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
        errorCode: error ? safeErrorCode(error) : null,
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
