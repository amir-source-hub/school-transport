import { Module } from '@nestjs/common';
import { SchoolsService } from './schools.service';
import { SchoolsController, AdminSchoolsController } from './schools.controller';

@Module({
  controllers: [SchoolsController, AdminSchoolsController],
  providers: [SchoolsService],
  exports: [SchoolsService],
})
export class SchoolsModule {}
