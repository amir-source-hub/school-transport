import { Controller, Get, Headers, NotFoundException, Res } from '@nestjs/common';
import type { FastifyReply } from 'fastify';
import { timingSafeEqual } from 'node:crypto';
import { ConfigService } from '../../config/config.service';
import { OperationalMetricsService } from './operational-metrics.service';

@Controller('metrics')
export class MetricsController {
  constructor(
    private readonly config: ConfigService,
    private readonly metrics: OperationalMetricsService,
  ) {}

  @Get()
  metricsText(
    @Headers('authorization') authorization: string | undefined,
    @Res() reply: FastifyReply,
  ) {
    const expected = this.config.metricsBearerToken;
    const supplied = authorization?.startsWith('Bearer ') ? authorization.slice(7) : '';
    if (!expected || !safeEqual(supplied, expected)) throw new NotFoundException();
    return reply
      .type('text/plain; version=0.0.4; charset=utf-8')
      .send(this.metrics.renderPrometheus());
  }
}

function safeEqual(left: string, right: string) {
  const a = Buffer.from(left);
  const b = Buffer.from(right);
  return a.length === b.length && timingSafeEqual(a, b);
}
