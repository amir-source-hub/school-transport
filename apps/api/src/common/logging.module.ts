import { Global, Module } from '@nestjs/common';
import { AppLogger } from './logger';
import { RequestContext } from './request-context';

@Global()
@Module({
  providers: [RequestContext, AppLogger],
  exports: [RequestContext, AppLogger],
})
export class LoggingModule {}
