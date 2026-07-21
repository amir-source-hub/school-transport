import { Controller, Get, Param, UseGuards, Req } from '@nestjs/common';
import { InstallmentsService } from './installments.service';
import { AuthGuard } from '../access-control/auth.guard';
import { successResponse } from '../../common/response';

@UseGuards(AuthGuard)
@Controller('installments')
export class InstallmentsController {
  constructor(private readonly installmentsService: InstallmentsService) {}

  @Get('plan/:planId')
  async getPlan(@Param('planId') planId: string) {
    const plan = await this.installmentsService.getPlanWithItems(planId);
    return successResponse(plan);
  }
}
