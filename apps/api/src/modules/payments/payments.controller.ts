import { Controller, Get, Post, Body, Param, UseGuards, Req, ParseUUIDPipe } from '@nestjs/common';
import { PaymentsService } from './payments.service';
import { AuthGuard } from '../access-control/auth.guard';
import { RolesGuard } from '../access-control/roles.guard';
import { Roles } from '../../common/decorators';
import { successResponse } from '../../common/response';
import { ConfigureInstallmentsDto, IdempotencyKey, OfflinePaymentDto, RejectPaymentDto, VerifyOnlinePaymentDto } from './payment-request.dto';
import { AuthenticatedRequest } from '../../common/http-request';

@UseGuards(AuthGuard)
@Controller('payments')
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Get()
  async getAll(@Req() req: AuthenticatedRequest) {
    return successResponse(await this.paymentsService.getOverview(req.user.id));
  }

  @Post(':scheduleItemId/online/start')
  async startOnline(
    @Req() req: AuthenticatedRequest,
    @Param('scheduleItemId', new ParseUUIDPipe()) scheduleItemId: string,
    @IdempotencyKey() idempotencyKey: string,
  ) {
    const tx = await this.paymentsService.startOnlinePayment(
      scheduleItemId,
      req.user.id,
      idempotencyKey,
    );
    return successResponse(tx);
  }

  @Post(':txId/online/verify')
  async verifyOnline(
    @Req() req: AuthenticatedRequest,
    @Param('txId', new ParseUUIDPipe()) txId: string,
    @Body() dto: VerifyOnlinePaymentDto,
  ) {
    const tx = await this.paymentsService.verifyOnlinePayment(
      txId,
      req.user.id,
      dto.gatewayTransactionId,
    );
    return successResponse(tx);
  }

  @Post(':scheduleItemId/offline-submissions')
  async offlineSubmission(
    @Req() req: AuthenticatedRequest,
    @Param('scheduleItemId', new ParseUUIDPipe()) scheduleItemId: string,
    @Body() dto: OfflinePaymentDto,
  ) {
    const txId = await this.paymentsService.createOfflineSubmission(
      scheduleItemId,
      req.user.id,
      dto,
    );
    return successResponse({ transactionId: txId });
  }
}

@UseGuards(AuthGuard, RolesGuard)
@Roles('ADMIN')
@Controller('admin/payments')
export class AdminPaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Get()
  async getAll() {
    return successResponse(await this.paymentsService.getAllForAdmin());
  }

  @Post('plans/:planId/installments')
  async configureInstallments(
    @Param('planId', new ParseUUIDPipe()) planId: string,
    @Body() dto: ConfigureInstallmentsDto,
  ) {
    return successResponse(await this.paymentsService.configureInstallments(planId, dto.items));
  }

  @Post(':txId/approve')
  async approve(@Param('txId', new ParseUUIDPipe()) txId: string, @Req() req: AuthenticatedRequest) {
    const tx = await this.paymentsService.approveOfflinePayment(txId, req.user.id);
    return successResponse(tx);
  }

  @Post(':txId/reject')
  async reject(@Param('txId', new ParseUUIDPipe()) txId: string, @Req() req: AuthenticatedRequest, @Body() dto: RejectPaymentDto) {
    const result = await this.paymentsService.rejectOfflinePayment(txId, req.user.id, dto.reason);
    return successResponse(result);
  }
}
