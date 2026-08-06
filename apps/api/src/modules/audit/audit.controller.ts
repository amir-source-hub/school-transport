import { Controller, Get, Param, ParseEnumPipe, UseGuards } from '@nestjs/common';
import { AuditService } from './audit.service';
import { AuthGuard } from '../access-control/auth.guard';
import { RolesGuard } from '../access-control/roles.guard';
import { Roles } from '../../common/decorators';
import { successResponse } from '../../common/response';
import { BoundedIdentifierPipe } from '../../common/transport-pipes';

enum AuditEntityType {
  REGISTRATION = 'REGISTRATION',
  REPORT = 'REPORT',
  PAYMENT = 'PAYMENT',
  PAYMENT_PLAN = 'PAYMENT_PLAN',
  CONTRACT = 'CONTRACT',
  PRICE = 'PRICE',
  STUDENT = 'STUDENT',
  FAMILY = 'FAMILY',
  SCHOOL = 'SCHOOL',
  ADMIN = 'ADMIN',
}

@UseGuards(AuthGuard, RolesGuard)
@Roles('ADMIN')
@Controller('admin/audit')
export class AuditController {
  constructor(private readonly auditService: AuditService) {}

  @Get(':entityType/:entityId')
  async getAudit(
    @Param('entityType', new ParseEnumPipe(AuditEntityType)) entityType: AuditEntityType,
    @Param('entityId', new BoundedIdentifierPipe()) entityId: string,
  ) {
    const logs = await this.auditService.getByEntity(entityType, entityId);
    return successResponse(logs);
  }
}
