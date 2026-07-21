import { Controller, Get, Param, UseGuards, Req } from '@nestjs/common';
import { InstallmentsService } from './installments.service';
import { AuthGuard } from '../access-control/auth.guard';
import { successResponse } from '../../common/response';

@UseGuards(AuthGuard)
@Controller('installments')
export class InstallmentsController {
  constructor(private readonly installmentsService: InstallmentsService) {}

  @Get('plan/:planId')
  async getPlan(@Req() req: any, @Param('planId') planId: string) {
    const plan = await this.installmentsService.getPlanWithItems(planId, req.user.id);
    return successResponse(plan);
  }
}
