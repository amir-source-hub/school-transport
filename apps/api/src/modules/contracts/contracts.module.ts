import { Module } from '@nestjs/common';
import { ContractsService } from './contracts.service';
import { ContractsController, AdminContractsController } from './contracts.controller';

@Module({
  controllers: [ContractsController, AdminContractsController],
  providers: [ContractsService],
  exports: [ContractsService],
})
export class ContractsModule {}
