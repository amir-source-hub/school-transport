import { Controller, Get, Query, Req, Res, UseGuards } from '@nestjs/common';
import type { FastifyReply, FastifyRequest } from 'fastify';
import { AuthGuard } from '../access-control/auth.guard';
import { RolesGuard } from '../access-control/roles.guard';
import { Roles } from '../../common/decorators';
import { ReportsService } from './reports.service';
import { ReportPreviewQueryDto } from './reports.dto';
import { successResponse } from '../../common/response';
import { AUDIT_PORT, AuditPort } from '../../common/audit.port';
import { Inject } from '@nestjs/common';
import { SuperAdminGuard } from '../access-control/super-admin.guard';

@UseGuards(AuthGuard, RolesGuard, SuperAdminGuard)
@Roles('ADMIN')
@Controller('admin/reports')
export class ReportsController {
  constructor(
    private readonly reportsService: ReportsService,
    @Inject(AUDIT_PORT) private readonly auditService: AuditPort,
  ) {}

  @Get('comprehensive/preview')
  async previewComprehensiveReport(
    @Query() query: ReportPreviewQueryDto,
    @Req() req: FastifyRequest & { user?: { id?: string } },
  ) {
    const preview = await this.reportsService.getComprehensivePreview(query);
    await this.auditService.record({
      actorType: 'ADMIN',
      actorId: req.user?.id ?? 'unknown',
      action: 'REPORT_PREVIEW_VIEWED',
      entityType: 'REPORT',
      entityId: query.section,
      newValues: { section: query.section, page: query.page, pageSize: query.pageSize },
      ipAddress: req.ip,
    });
    return successResponse(preview);
  }

  @Get('comprehensive.xlsx')
  async downloadComprehensiveReport(
    @Res() reply: FastifyReply,
    @Req() req: FastifyRequest & { user?: { id?: string } },
  ) {
    const report = await this.reportsService.createComprehensiveWorkbook();
    await this.auditService.record({
      actorType: 'ADMIN',
      actorId: req.user?.id ?? 'unknown',
      action: 'REPORT_EXPORTED',
      entityType: 'REPORT',
      entityId: 'comprehensive',
      ipAddress: req.ip,
    });
    const date = new Date().toISOString().slice(0, 10);
    reply
      .header('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
      .header('Content-Disposition', `attachment; filename="school-transport-report-${date}.xlsx"`)
      .header('Cache-Control', 'private, no-store')
      .send(report);
  }
}
