import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import type { FastifyReply, FastifyRequest } from 'fastify';
import { tap, type Observable } from 'rxjs';
import { OperationalMetricsService } from './operational-metrics.service';

@Injectable()
export class HttpMetricsInterceptor implements NestInterceptor {
  constructor(private readonly metrics: OperationalMetricsService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const http = context.switchToHttp();
    const request = http.getRequest<FastifyRequest>();
    const reply = http.getResponse<FastifyReply>();
    const started = performance.now();
    const route = (request.routeOptions?.url ?? 'unmatched')
      .replace(/[^a-zA-Z0-9_/:.-]/g, '')
      .slice(0, 120);
    const record = (status: number) =>
      this.metrics.recordHttp(request.method, route, status, (performance.now() - started) / 1_000);
    return next.handle().pipe(
      tap({
        next: () => record(reply.statusCode),
        error: (error: unknown) =>
          record(
            typeof error === 'object' && error && 'status' in error
              ? Number(error.status)
              : typeof error === 'object' && error && 'statusCode' in error
                ? Number(error.statusCode)
                : 500,
          ),
      }),
    );
  }
}
