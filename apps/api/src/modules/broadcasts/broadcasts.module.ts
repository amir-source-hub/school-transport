import { Global, Module } from '@nestjs/common';
import { BroadcastsController } from './broadcasts.controller';
import { BroadcastsService } from './broadcasts.service';

@Global()
@Module({ controllers: [BroadcastsController], providers: [BroadcastsService], exports: [BroadcastsService] })
export class BroadcastsModule {}
