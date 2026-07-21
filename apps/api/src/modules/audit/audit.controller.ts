import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { AuditService } from './audit.service';
import { AuthGuard } from '../access-control/auth.guard';
import { RolesGuard } from '../access-control/roles.guard';
import { Roles } from '../../common/decorators';
import { successResponse } from '../../common/response';

@UseGuards(AuthGuard, RolesGuard)
@Roles('ADMIN')
@Controller('admin/audit')
export class AuditController {
  constructor(private readonly auditService: AuditService) {}

  @Get(':entityType/:entityId')
  async getAudit(@Param('entityType') entityType: string, @Param('entityId') entityId: string) {
    const logs = await this.auditService.getByEntity(entityType, entityId);
    return successResponse(logs);
  }
}
