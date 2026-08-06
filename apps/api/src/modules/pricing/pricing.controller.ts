import { Controller, Get, Post, Body, Param, UseGuards, Req, ParseUUIDPipe } from '@nestjs/common';
import { PricingService } from './pricing.service';
import { AuthGuard } from '../access-control/auth.guard';
import { RolesGuard } from '../access-control/roles.guard';
import { Roles } from '../../common/decorators';
import { successResponse } from '../../common/response';
import { AcceptPriceDto, CreatePriceDto } from './pricing.dto';
import { AuthenticatedRequest } from '../../common/http-request';

@UseGuards(AuthGuard)
@Controller('enrollments/:enrollmentId/pricing')
export class ParentPricingController {
  constructor(private readonly pricingService: PricingService) {}

  @Get()
  async getPrices(
    @Req() req: AuthenticatedRequest,
    @Param('enrollmentId', new ParseUUIDPipe()) enrollmentId: string,
  ) {
    return successResponse(
      await this.pricingService.getByRegistrationForFamily(enrollmentId, req.user.id),
    );
  }

  @Post(':priceId/accept')
  async accept(
    @Req() req: AuthenticatedRequest,
    @Param('priceId', new ParseUUIDPipe()) priceId: string,
    @Body() dto: AcceptPriceDto,
  ) {
    const paymentPlanId = await this.pricingService.acceptPrice(
      priceId,
      req.user.id,
      dto.planType ?? 'PREPAYMENT_PLUS_FOUR_INSTALLMENTS',
    );
    return successResponse({ accepted: true, paymentPlanId });
  }
}

@UseGuards(AuthGuard, RolesGuard)
@Roles('ADMIN')
@Controller('admin/enrollments/:enrollmentId/pricing')
export class AdminPricingController {
  constructor(private readonly pricingService: PricingService) {}

  @Get()
  async getPrices(@Param('enrollmentId', new ParseUUIDPipe()) enrollmentId: string) {
    const prices = await this.pricingService.getByRegistration(enrollmentId);
    return successResponse(prices);
  }

  @Post()
  async createPrice(
    @Param('enrollmentId', new ParseUUIDPipe()) enrollmentId: string,
    @Req() req: AuthenticatedRequest,
    @Body()
    dto: CreatePriceDto,
  ) {
    const prices = await this.pricingService.create(enrollmentId, req.user.id, dto);
    return successResponse(prices);
  }
}
