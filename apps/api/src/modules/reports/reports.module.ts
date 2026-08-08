import { Module } from '@nestjs/common';
import { ReportsController } from './reports.controller';
import { ReportsService } from './reports.service';
import { SuperAdminGuard } from '../access-control/super-admin.guard';

@Module({
  controllers: [ReportsController],
  providers: [ReportsService, SuperAdminGuard],
})
export class ReportsModule {}
