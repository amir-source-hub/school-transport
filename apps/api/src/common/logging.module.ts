import { Global, Module } from '@nestjs/common';
import { AppLogger } from './logger';
import { RequestContext } from './request-context';
import { ReadinessState } from './readiness-state';

@Global()
@Module({
  providers: [RequestContext, AppLogger, ReadinessState],
  exports: [RequestContext, AppLogger, ReadinessState],
})
export class LoggingModule {}
