import { NotFoundException } from '@nestjs/common';
import { describe, expect, it, vi } from 'vitest';
import { MetricsController } from './metrics.controller';
import { OperationalMetricsService } from './operational-metrics.service';

function reply() {
  const send = vi.fn();
  return { type: vi.fn(() => ({ send })), send };
}

describe('MetricsController', () => {
  it('fails closed when the scrape token is missing or incorrect', () => {
    const controller = new MetricsController(
      { metricsBearerToken: 'a'.repeat(32) } as never,
      new OperationalMetricsService(),
    );
    expect(() => controller.metricsText(undefined, reply() as never)).toThrow(NotFoundException);
    expect(() => controller.metricsText('Bearer wrong', reply() as never)).toThrow(
      NotFoundException,
    );
  });

  it('returns Prometheus text for a constant-time matching bearer token', () => {
    const token = 'a'.repeat(32);
    const controller = new MetricsController(
      { metricsBearerToken: token } as never,
      new OperationalMetricsService(),
    );
    const response = reply();
    controller.metricsText(`Bearer ${token}`, response as never);
    expect(response.type).toHaveBeenCalledWith('text/plain; version=0.0.4; charset=utf-8');
    expect(response.send).toHaveBeenCalledWith(expect.stringContaining('# TYPE'));
  });
});
