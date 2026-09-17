import { Controller, Get, Param, UseGuards, Req, ParseUUIDPipe } from '@nestjs/common';
import { InstallmentsService } from './installments.service';
import { AuthGuard } from '../access-control/auth.guard';
import { RolesGuard } from '../access-control/roles.guard';
import { Roles } from '../../common/decorators';
import { successResponse } from '../../common/response';
import { AuthenticatedRequest } from '../../common/http-request';

@UseGuards(AuthGuard, RolesGuard)
@Roles('PARENT')
@Controller('installments')
export class InstallmentsController {
  constructor(private readonly installmentsService: InstallmentsService) {}

  @Get('plan/:planId')
  async getPlan(
    @Req() req: AuthenticatedRequest,
    @Param('planId', new ParseUUIDPipe()) planId: string,
  ) {
    const plan = await this.installmentsService.getPlanWithItems(planId, req.user.id);
    return successResponse(plan);
  }
}
