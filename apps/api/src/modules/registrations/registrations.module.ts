import { Module } from '@nestjs/common';
import { RegistrationsService } from './registrations.service';
import {
  OnboardingRegistrationsController,
  RegistrationsController,
  AdminRegistrationsController,
} from './registrations.controller';
import { OnboardingGuard } from '../access-control/onboarding.guard';

@Module({
  controllers: [
    RegistrationsController,
    AdminRegistrationsController,
    OnboardingRegistrationsController,
  ],
  providers: [RegistrationsService, OnboardingGuard],
  exports: [RegistrationsService],
})
export class RegistrationsModule {}
