import { Module } from '@nestjs/common';
import { FamiliesService } from './application/families.service';
import { FamiliesController } from './presentation/families.controller';

@Module({
  controllers: [FamiliesController],
  providers: [FamiliesService],
  exports: [FamiliesService],
})
export class FamiliesModule {}
