import { HttpException } from '@nestjs/common';
import { of, throwError } from 'rxjs';
import { describe, expect, it } from 'vitest';
import { HttpMetricsInterceptor } from './http-metrics.interceptor';
import { OperationalMetricsService } from './operational-metrics.service';

const context = (statusCode = 201) =>
  ({
    switchToHttp: () => ({
      getRequest: () => ({ method: 'POST', routeOptions: { url: '/api/v1/students/:id' } }),
      getResponse: () => ({ statusCode }),
    }),
  }) as never;

describe('HttpMetricsInterceptor', () => {
  it('records normalized routes and status classes without concrete IDs', async () => {
    const metrics = new OperationalMetricsService();
    const interceptor = new HttpMetricsInterceptor(metrics);
    await new Promise<void>((resolve, reject) =>
      interceptor
        .intercept(context(), { handle: () => of({ id: 'secret-id' }) } as never)
        .subscribe({ complete: resolve, error: reject }),
    );
    const output = metrics.renderPrometheus();
    expect(output).toContain('route="/api/v1/students/:id",status_class="2xx"');
    expect(output).not.toContain('secret-id');
  });

  it('records exceptions under their error status class', async () => {
    const metrics = new OperationalMetricsService();
    const interceptor = new HttpMetricsInterceptor(metrics);
    await new Promise<void>((resolve) =>
      interceptor
        .intercept(context(), {
          handle: () => throwError(() => new HttpException('no', 403)),
        } as never)
        .subscribe({ error: () => resolve() }),
    );
    expect(metrics.renderPrometheus()).toContain('status_class="4xx"');
  });
});
