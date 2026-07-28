import { Controller, Get, Res, UseGuards } from '@nestjs/common';
import type { FastifyReply } from 'fastify';
import { AuthGuard } from '../access-control/auth.guard';
import { RolesGuard } from '../access-control/roles.guard';
import { Roles } from '../../common/decorators';
import { ReportsService } from './reports.service';

@UseGuards(AuthGuard, RolesGuard)
@Roles('ADMIN')
@Controller('admin/reports')
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Get('comprehensive.xlsx')
  async downloadComprehensiveReport(@Res() reply: FastifyReply) {
    const report = await this.reportsService.createComprehensiveWorkbook();
    const date = new Date().toISOString().slice(0, 10);
    reply
      .header('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
      .header('Content-Disposition', `attachment; filename="school-transport-report-${date}.xlsx"`)
      .header('Cache-Control', 'private, no-store')
      .send(report);
  }
}
