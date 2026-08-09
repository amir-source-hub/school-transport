import { Global, Module } from '@nestjs/common';
import { MetricsController } from './metrics.controller';
import { OperationalMetricsService } from './operational-metrics.service';

@Global()
@Module({
  controllers: [MetricsController],
  providers: [OperationalMetricsService],
  exports: [OperationalMetricsService],
})
export class MetricsModule {}
