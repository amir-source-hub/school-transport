import { Controller, Get, ServiceUnavailableException } from '@nestjs/common';
import { Public } from '../../common/decorators';
import { successResponse } from '../../common/response';
import { DatabaseService } from '../../database/database.service';
import { QueueService } from '../../infrastructure/queue/queue.service';
import { ConfigService } from '../../config/config.service';
import { ReadinessState } from '../../common/readiness-state';

@Controller()
export class HealthController {
  constructor(
    private readonly database: DatabaseService,
    private readonly queue: QueueService,
    private readonly config: ConfigService,
    private readonly readiness: ReadinessState,
  ) {}

  @Public()
  @Get(['health', 'health/live'])
  health() {
    return successResponse({ status: 'alive', timestamp: new Date().toISOString() });
  }

  @Public()
  @Get('health/ready')
  async ready() {
    if (this.readiness.isDraining) throw new ServiceUnavailableException('Service is draining.');
    const checks = await Promise.all([
      withTimeout(this.database.isReady(), this.config.readinessTimeoutMs),
      this.config.queueRequired
        ? withTimeout(this.queue.isReady(), this.config.readinessTimeoutMs)
        : Promise.resolve(true),
    ]);
    if (checks.some((ready) => !ready)) {
      throw new ServiceUnavailableException('Service dependencies are unavailable.');
    }
    return successResponse({ status: 'ready', database: 'up', queue: this.config.queueRequired ? 'up' : 'optional' });
  }
}

async function withTimeout(check: Promise<boolean>, timeoutMs: number): Promise<boolean> {
  let timer: NodeJS.Timeout | undefined;
  try {
    return await Promise.race([
      check,
      new Promise<boolean>((resolve) => { timer = setTimeout(() => resolve(false), timeoutMs); }),
    ]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}
