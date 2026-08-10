import { Module } from '@nestjs/common';
import { ContractsService } from './contracts.service';
import {
  OnboardingContractsController,
  ContractsController,
  AdminContractsController,
} from './contracts.controller';
import { OnboardingGuard } from '../access-control/onboarding.guard';

@Module({
  controllers: [ContractsController, AdminContractsController, OnboardingContractsController],
  providers: [ContractsService, OnboardingGuard],
  exports: [ContractsService],
})
export class ContractsModule {}
