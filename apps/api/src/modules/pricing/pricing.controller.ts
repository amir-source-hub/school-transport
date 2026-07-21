import { Controller, Get, Post, Body, Param, UseGuards, Req } from '@nestjs/common';
import { PricingService } from './pricing.service';
import { AuthGuard } from '../access-control/auth.guard';
import { RolesGuard } from '../access-control/roles.guard';
import { Roles } from '../../common/decorators';
import { successResponse } from '../../common/response';

@UseGuards(AuthGuard, RolesGuard)
@Roles('ADMIN')
@Controller('admin/enrollments/:enrollmentId/pricing')
export class AdminPricingController {
  constructor(private readonly pricingService: PricingService) {}

  @Get()
  async getPrices(@Param('enrollmentId') enrollmentId: string) {
    const prices = await this.pricingService.getByRegistration(enrollmentId);
    return successResponse(prices);
  }

  @Post()
  async createPrice(
    @Param('enrollmentId') enrollmentId: string,
    @Req() req: any,
    @Body()
    dto: {
      totalAmount: number;
      currency?: string;
      fullPaymentAllowed?: boolean;
      installmentPaymentAllowed?: boolean;
      prepaymentAmount?: number;
      installmentCount?: number;
    },
  ) {
    const prices = await this.pricingService.create(enrollmentId, req.user.id, dto);
    return successResponse(prices);
  }
}
