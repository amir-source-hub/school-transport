import { Module } from '@nestjs/common';
import { SchoolManagerScopeService } from '../access-control/school-manager-scope.service';
import { SchoolManagersController } from './school-managers.controller';
import { SchoolManagersService } from './school-managers.service';

@Module({
  controllers: [SchoolManagersController],
  providers: [SchoolManagersService, SchoolManagerScopeService],
  exports: [SchoolManagerScopeService],
})
export class SchoolManagersModule {}
