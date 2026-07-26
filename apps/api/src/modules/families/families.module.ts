import { Module } from '@nestjs/common';
import { FamiliesService } from './application/families.service';
import { AdminFamiliesController, FamiliesController } from './presentation/families.controller';

@Module({
  controllers: [FamiliesController, AdminFamiliesController],
  providers: [FamiliesService],
  exports: [FamiliesService],
})
export class FamiliesModule {}
