import { Module } from '@nestjs/common';
import { RegistrationsService } from './registrations.service';
import { RegistrationsController, AdminRegistrationsController } from './registrations.controller';

@Module({
  controllers: [RegistrationsController, AdminRegistrationsController],
  providers: [RegistrationsService],
  exports: [RegistrationsService],
})
export class RegistrationsModule {}
