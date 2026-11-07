import {
  Body,
  BadRequestException,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import { OnboardingRole, Roles } from '../../common/decorators';
import { AuthenticatedRequest } from '../../common/http-request';
import { successResponse } from '../../common/response';
import { AuthGuard } from '../access-control/auth.guard';
import { OnboardingGuard } from '../access-control/onboarding.guard';
import { RolesGuard } from '../access-control/roles.guard';
import {
  ConfigureInstallmentsDto,
  ConfigureOfflineDestinationDto,
  ConfigureDefaultPrepaymentDto,
  ConfigureStudentPrepaymentDto,
  AuthorizeReceiptUploadDto,
  IdempotencyKey,
  OfflinePaymentDto,
  RejectPaymentDto,
  ReviewPaymentDto,
  AdminOfflinePaymentListQueryDto,
  VerifyOnlinePaymentDto,
} from './payment-request.dto';
import { PaymentsService } from './payments.service';
import type { FastifyReply } from 'fastify';

@UseGuards(AuthGuard, RolesGuard)
@Roles('PARENT')
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
  async startOnline(
    @Req() req: AuthenticatedRequest,
    @Param('scheduleItemId', new ParseUUIDPipe()) scheduleItemId: string,
    @IdempotencyKey() idempotencyKey: string,
  ) {
    return successResponse(
      await this.paymentsService.startOnlinePayment(scheduleItemId, req.user.id, idempotencyKey),
    );
  }

  @Post(':txId/online/verify')
  async verifyOnline(
    @Req() req: AuthenticatedRequest,
    @Param('txId', new ParseUUIDPipe()) txId: string,
    @Body() dto: VerifyOnlinePaymentDto,
  ) {
    return successResponse(
      await this.paymentsService.verifyOnlinePayment(txId, req.user.id, dto.gatewayTransactionId),
    );
  }

  @Post(':scheduleItemId/offline-submissions')
  async offlineSubmission(
    @Req() req: AuthenticatedRequest,
    @Param('scheduleItemId', new ParseUUIDPipe()) scheduleItemId: string,
    @Body() dto: OfflinePaymentDto,
    @IdempotencyKey() idempotencyKey: string,
  ) {
    const submissionId = await this.paymentsService.createOfflineSubmission(
      scheduleItemId,
      req.user.id,
      { ...dto, idempotencyKey },
    );
    return successResponse({ submissionId });
  }

  @Post('offline-submissions/:submissionId/receipt/authorize')
  async authorizeReceipt(
    @Req() req: AuthenticatedRequest,
    @Param('submissionId', new ParseUUIDPipe()) submissionId: string,
    @Body() dto: AuthorizeReceiptUploadDto,
  ) {
    return successResponse(
      await this.paymentsService.authorizeReceiptUpload(submissionId, req.user.id, dto),
    );
  }

  @Post('offline-submissions/:submissionId/receipt/complete')
  async completeReceipt(
    @Req() req: AuthenticatedRequest,
    @Param('submissionId', new ParseUUIDPipe()) submissionId: string,
  ) {
    return successResponse(
      await this.paymentsService.completeReceiptUpload(submissionId, req.user.id),
    );
  }

  @Get('offline-submissions/:submissionId/receipt')
  async receipt(
    @Req() req: AuthenticatedRequest,
    @Param('submissionId', new ParseUUIDPipe()) submissionId: string,
  ) {
    return successResponse(await this.paymentsService.getReceiptView(submissionId, req.user.id));
  }
}

@UseGuards(OnboardingGuard)
@OnboardingRole('PARENT')
@Controller('onboarding/payments')
export class OnboardingPaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Get('offline-destination')
  async offlineDestination() {
    return successResponse(await this.paymentsService.getActiveOfflineDestination());
  }

  @Get('offline-submissions')
  async offlineSubmissions(@Req() req: AuthenticatedRequest) {
    return successResponse(await this.paymentsService.listOfflineSubmissions(req.user.id));
  }

  @Post(':scheduleItemId/online/start')
  async startOnline(
    @Req() req: AuthenticatedRequest,
    @Param('scheduleItemId', new ParseUUIDPipe()) scheduleItemId: string,
    @IdempotencyKey() idempotencyKey: string,
  ) {
    return successResponse(
      await this.paymentsService.startOnlinePayment(scheduleItemId, req.user.id, idempotencyKey, 'onboarding'),
    );
  }

  @Post(':txId/online/verify')
  async verifyOnline(
    @Req() req: AuthenticatedRequest,
    @Param('txId', new ParseUUIDPipe()) txId: string,
    @Body() dto: VerifyOnlinePaymentDto,
  ) {
    return successResponse(
      await this.paymentsService.verifyOnlinePayment(txId, req.user.id, dto.gatewayTransactionId),
    );
  }

  @Post(':scheduleItemId/offline-submissions')
  async offlineSubmission(
    @Req() req: AuthenticatedRequest,
    @Param('scheduleItemId', new ParseUUIDPipe()) scheduleItemId: string,
    @Body() dto: OfflinePaymentDto,
    @IdempotencyKey() idempotencyKey: string,
  ) {
    const submissionId = await this.paymentsService.createOfflineSubmission(
      scheduleItemId,
      req.user.id,
      { ...dto, idempotencyKey },
    );
    return successResponse({ submissionId });
  }

  @Post('offline-submissions/:submissionId/receipt/authorize')
  async authorizeReceipt(
    @Req() req: AuthenticatedRequest,
    @Param('submissionId', new ParseUUIDPipe()) submissionId: string,
    @Body() dto: AuthorizeReceiptUploadDto,
  ) {
    return successResponse(
      await this.paymentsService.authorizeReceiptUpload(submissionId, req.user.id, dto),
    );
  }

  @Post('offline-submissions/:submissionId/receipt/complete')
  async completeReceipt(
    @Req() req: AuthenticatedRequest,
    @Param('submissionId', new ParseUUIDPipe()) submissionId: string,
  ) {
    return successResponse(
      await this.paymentsService.completeReceiptUpload(submissionId, req.user.id),
    );
  }
}

@UseGuards(AuthGuard, RolesGuard)
@Roles('ADMIN')
@Controller('admin/payments')
export class AdminPaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Get('images/:kind.zip')
  async exportImages(@Param('kind') kind: string, @Res() reply: FastifyReply) {
    if (kind !== 'photos' && kind !== 'receipts' && kind !== 'driver-documents') throw new BadRequestException('Unknown image export type.');
    const archive = await this.paymentsService.exportStudentImages(kind);
    reply.header('Content-Type', 'application/zip')
      .header('Content-Disposition', `attachment; filename="school-transport-${kind}.zip"`)
      .header('Cache-Control', 'private, no-store')
      .send(archive);
  }

  @Get('prepayment-settings')
  async prepaymentSettings() {
    return successResponse(await this.paymentsService.getPrepaymentSettings());
  }

  @Post('prepayment-settings')
  async configurePrepaymentSettings(
    @Req() req: AuthenticatedRequest,
    @Body() dto: ConfigureDefaultPrepaymentDto,
  ) {
    return successResponse(await this.paymentsService.configureDefaultPrepayment(req.user.id, dto.amount, dto.expectedVersion));
  }

  @Post('plans/:planId/prepayment')
  async configureStudentPrepayment(
    @Req() req: AuthenticatedRequest,
    @Param('planId', new ParseUUIDPipe()) planId: string,
    @Body() dto: ConfigureStudentPrepaymentDto,
  ) {
    return successResponse(await this.paymentsService.configureStudentPrepayment(req.user.id, planId, dto.amount));
  }

  @Get()
  async getAll() {
    return successResponse(await this.paymentsService.getAllForAdmin());
  }

  @Get('offline-destination')
  async offlineDestination() {
    return successResponse(await this.paymentsService.getActiveOfflineDestination(true));
  }

  @Post('offline-destination')
  async configureOfflineDestination(
    @Req() req: AuthenticatedRequest,
    @Body() dto: ConfigureOfflineDestinationDto,
  ) {
    return successResponse(
      await this.paymentsService.configureOfflineDestination(req.user.id, dto),
    );
  }

  @Get('offline-submissions')
  async offlineSubmissions(@Query() query: AdminOfflinePaymentListQueryDto) {
    return successResponse(await this.paymentsService.listOfflineSubmissionsForAdmin(query));
  }

  @Post(':scheduleItemId/offline-submissions')
  async createOfflineSubmission(
    @Param('scheduleItemId', new ParseUUIDPipe()) scheduleItemId: string,
    @Req() req: AuthenticatedRequest,
    @Body() dto: OfflinePaymentDto,
    @IdempotencyKey() idempotencyKey: string,
  ) {
    return successResponse(
      await this.paymentsService.createOfflineSubmissionForAdmin(scheduleItemId, req.user.id, {
        ...dto,
        idempotencyKey,
      }),
    );
  }

  @Post('offline-submissions/:submissionId/receipt/authorize')
  async authorizeReceipt(
    @Param('submissionId', new ParseUUIDPipe()) submissionId: string,
    @Body() dto: AuthorizeReceiptUploadDto,
  ) {
    return successResponse(
      await this.paymentsService.authorizeReceiptUploadForAdmin(submissionId, dto),
    );
  }

  @Post('offline-submissions/:submissionId/receipt/complete-and-approve')
  async completeAndApproveReceipt(
    @Req() req: AuthenticatedRequest,
    @Param('submissionId', new ParseUUIDPipe()) submissionId: string,
  ) {
    return successResponse(
      await this.paymentsService.completeAndApproveReceiptForAdmin(submissionId, req.user.id),
    );
  }

  @Get('offline-submissions/:submissionId/receipt')
  async receipt(
    @Req() req: AuthenticatedRequest,
    @Param('submissionId', new ParseUUIDPipe()) submissionId: string,
  ) {
    return successResponse(
      await this.paymentsService.getReceiptView(submissionId, req.user.id, true),
    );
  }

  @Post('plans/:planId/installments')
  async configureInstallments(
    @Param('planId', new ParseUUIDPipe()) planId: string,
    @Body() dto: ConfigureInstallmentsDto,
  ) {
    return successResponse(await this.paymentsService.configureInstallments(planId, dto.items));
  }

  @Post('offline-submissions/:submissionId/approve')
  async approve(
    @Param('submissionId', new ParseUUIDPipe()) submissionId: string,
    @Req() req: AuthenticatedRequest,
    @Body() dto: ReviewPaymentDto,
  ) {
    return successResponse(
      await this.paymentsService.approveOfflinePayment(submissionId, req.user.id, dto.version),
    );
  }

  @Post('offline-submissions/:submissionId/reject')
  async reject(
    @Param('submissionId', new ParseUUIDPipe()) submissionId: string,
    @Req() req: AuthenticatedRequest,
    @Body() dto: RejectPaymentDto,
  ) {
    return successResponse(
      await this.paymentsService.rejectOfflinePayment(
        submissionId,
        req.user.id,
        dto.reason,
        dto.version,
      ),
    );
  }

  @Post('offline-submissions/:submissionId/reset')
  async resetForResubmission(
    @Param('submissionId', new ParseUUIDPipe()) submissionId: string,
    @Req() req: AuthenticatedRequest,
    @Body() dto: ReviewPaymentDto,
  ) {
    return successResponse(
      await this.paymentsService.resetOfflinePaymentForResubmission(
        submissionId,
        req.user.id,
        dto.version,
      ),
    );
  }
}
