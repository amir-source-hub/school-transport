import { Body, Controller, Get, Param, ParseUUIDPipe, Post, Req, UseGuards } from '@nestjs/common';
import { Roles } from '../../common/decorators';
import { AuthenticatedRequest } from '../../common/http-request';
import { successResponse } from '../../common/response';
import { AuthGuard } from '../access-control/auth.guard';
import { OnboardingGuard } from '../access-control/onboarding.guard';
import { RolesGuard } from '../access-control/roles.guard';
import {
  ConfigureInstallmentsDto,
  ConfigureOfflineDestinationDto,
  IdempotencyKey,
  OfflinePaymentDto,
  RejectPaymentDto,
  ReviewPaymentDto,
  VerifyOnlinePaymentDto,
} from './payment-request.dto';
import { PaymentsService } from './payments.service';

@UseGuards(AuthGuard)
@Controller('payments')
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Get()
  async getAll(@Req() req: AuthenticatedRequest) {
    return successResponse(await this.paymentsService.getOverview(req.user.id));
  }

  @Get('offline-destination')
  async offlineDestination() {
    return successResponse(await this.paymentsService.getActiveOfflineDestination());
  }

  @Get('offline-submissions')
  async offlineSubmissions(@Req() req: AuthenticatedRequest) {
    return successResponse(await this.paymentsService.listOfflineSubmissions(req.user.id));
  }

  @Post(':scheduleItemId/online/start')
  async startOnline(@Req() req: AuthenticatedRequest, @Param('scheduleItemId', new ParseUUIDPipe()) scheduleItemId: string, @IdempotencyKey() idempotencyKey: string) {
    return successResponse(await this.paymentsService.startOnlinePayment(scheduleItemId, req.user.id, idempotencyKey));
  }

  @Post(':txId/online/verify')
  async verifyOnline(@Req() req: AuthenticatedRequest, @Param('txId', new ParseUUIDPipe()) txId: string, @Body() dto: VerifyOnlinePaymentDto) {
    return successResponse(await this.paymentsService.verifyOnlinePayment(txId, req.user.id, dto.gatewayTransactionId));
  }

  @Post(':scheduleItemId/offline-submissions')
  async offlineSubmission(@Req() req: AuthenticatedRequest, @Param('scheduleItemId', new ParseUUIDPipe()) scheduleItemId: string, @Body() dto: OfflinePaymentDto, @IdempotencyKey() idempotencyKey: string) {
    const submissionId = await this.paymentsService.createOfflineSubmission(scheduleItemId, req.user.id, { ...dto, idempotencyKey });
    return successResponse({ submissionId });
  }
}

@UseGuards(OnboardingGuard)
@Controller('onboarding/payments')
export class OnboardingPaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Get('offline-destination')
  async offlineDestination() {
    return successResponse(await this.paymentsService.getActiveOfflineDestination());
  }

  @Post(':scheduleItemId/online/start')
  async startOnline(@Req() req: AuthenticatedRequest, @Param('scheduleItemId', new ParseUUIDPipe()) scheduleItemId: string, @IdempotencyKey() idempotencyKey: string) {
    return successResponse(await this.paymentsService.startOnlinePayment(scheduleItemId, req.user.id, idempotencyKey));
  }

  @Post(':txId/online/verify')
  async verifyOnline(@Req() req: AuthenticatedRequest, @Param('txId', new ParseUUIDPipe()) txId: string, @Body() dto: VerifyOnlinePaymentDto) {
    return successResponse(await this.paymentsService.verifyOnlinePayment(txId, req.user.id, dto.gatewayTransactionId));
  }

  @Post(':scheduleItemId/offline-submissions')
  async offlineSubmission(@Req() req: AuthenticatedRequest, @Param('scheduleItemId', new ParseUUIDPipe()) scheduleItemId: string, @Body() dto: OfflinePaymentDto, @IdempotencyKey() idempotencyKey: string) {
    const submissionId = await this.paymentsService.createOfflineSubmission(scheduleItemId, req.user.id, { ...dto, idempotencyKey });
    return successResponse({ submissionId });
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

  @Get('offline-destination')
  async offlineDestination() {
    return successResponse(await this.paymentsService.getActiveOfflineDestination(true));
  }

  @Post('offline-destination')
  async configureOfflineDestination(@Req() req: AuthenticatedRequest, @Body() dto: ConfigureOfflineDestinationDto) {
    return successResponse(await this.paymentsService.configureOfflineDestination(req.user.id, dto));
  }

  @Get('offline-submissions')
  async offlineSubmissions() {
    return successResponse(await this.paymentsService.listOfflineSubmissionsForAdmin());
  }

  @Post('plans/:planId/installments')
  async configureInstallments(@Param('planId', new ParseUUIDPipe()) planId: string, @Body() dto: ConfigureInstallmentsDto) {
    return successResponse(await this.paymentsService.configureInstallments(planId, dto.items));
  }

  @Post('offline-submissions/:submissionId/approve')
  async approve(@Param('submissionId', new ParseUUIDPipe()) submissionId: string, @Req() req: AuthenticatedRequest, @Body() dto: ReviewPaymentDto) {
    return successResponse(await this.paymentsService.approveOfflinePayment(submissionId, req.user.id, dto.version));
  }

  @Post('offline-submissions/:submissionId/reject')
  async reject(@Param('submissionId', new ParseUUIDPipe()) submissionId: string, @Req() req: AuthenticatedRequest, @Body() dto: RejectPaymentDto) {
    return successResponse(await this.paymentsService.rejectOfflinePayment(submissionId, req.user.id, dto.reason, dto.version));
  }
}
