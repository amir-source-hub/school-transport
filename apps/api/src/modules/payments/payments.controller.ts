import { Controller, Get, Post, Body, Param, UseGuards, Req, Headers } from '@nestjs/common';
import { PaymentsService } from './payments.service';
import { AuthGuard } from '../access-control/auth.guard';
import { RolesGuard } from '../access-control/roles.guard';
import { Roles } from '../../common/decorators';
import { successResponse } from '../../common/response';

@UseGuards(AuthGuard)
@Controller('payments')
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Post(':scheduleItemId/online/start')
  async startOnline(
    @Req() req: any,
    @Param('scheduleItemId') scheduleItemId: string,
    @Headers('Idempotency-Key') idempotencyKey: string,
  ) {
    const tx = await this.paymentsService.startOnlinePayment(
      scheduleItemId,
      req.user.id,
      idempotencyKey || '',
    );
    return successResponse(tx);
  }

  @Post(':txId/online/verify')
  async verifyOnline(@Param('txId') txId: string, @Body() dto: { gatewayTransactionId: string }) {
    const tx = await this.paymentsService.verifyOnlinePayment(txId, dto.gatewayTransactionId);
    return successResponse(tx);
  }

  @Post(':scheduleItemId/offline-submissions')
  async offlineSubmission(
    @Req() req: any,
    @Param('scheduleItemId') scheduleItemId: string,
    @Body() dto: { paidAt: string; referenceNumber: string; description?: string },
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

  @Post(':txId/approve')
  async approve(@Param('txId') txId: string, @Req() req: any) {
    const tx = await this.paymentsService.approveOfflinePayment(txId, req.user.id);
    return successResponse(tx);
  }

  @Post(':txId/reject')
  async reject(@Param('txId') txId: string, @Req() req: any, @Body() dto: { reason?: string }) {
    const result = await this.paymentsService.rejectOfflinePayment(txId, req.user.id, dto.reason);
    return successResponse(result);
  }
}
