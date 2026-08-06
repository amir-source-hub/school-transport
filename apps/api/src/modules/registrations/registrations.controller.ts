import { Controller, Get, Post, Body, Param, UseGuards, Req, ParseUUIDPipe } from '@nestjs/common';
import { RegistrationsService } from './registrations.service';
import { AuthGuard } from '../access-control/auth.guard';
import { OnboardingGuard } from '../access-control/onboarding.guard';
import { RolesGuard } from '../access-control/roles.guard';
import { Roles } from '../../common/decorators';
import { successResponse } from '../../common/response';
import { AuthenticatedRequest } from '../../common/http-request';
import { CorrectionDto, CreateRegistrationDto, GuidedEnrollmentDto, RejectRegistrationDto } from './registration.dto';

@UseGuards(AuthGuard)
@Controller('enrollments')
export class RegistrationsController {
  constructor(private readonly registrationsService: RegistrationsService) {}

  @Get()
  async getAll(@Req() req: AuthenticatedRequest) {
    const list = await this.registrationsService.getByFamily(req.user.id);
    return successResponse(list);
  }

  @Post()
  async create(
    @Req() req: AuthenticatedRequest,
    @Body() dto: CreateRegistrationDto,
  ) {
    const reg = await this.registrationsService.create(req.user.id, dto);
    return successResponse(reg);
  }

  @Post('guided')
  async createGuided(@Req() req: AuthenticatedRequest, @Body() dto: GuidedEnrollmentDto) {
    return successResponse(await this.registrationsService.createGuidedEnrollment(req.user.id, dto));
  }

  @Get(':id')
  async getById(@Req() req: AuthenticatedRequest, @Param('id', new ParseUUIDPipe()) id: string) {
    const reg = await this.registrationsService.getById(id, req.user.id);
    return successResponse(reg);
  }

  @Post(':id/submit')
  async submit(@Req() req: AuthenticatedRequest, @Param('id', new ParseUUIDPipe()) id: string) {
    const reg = await this.registrationsService.submit(id, req.user.id);
    return successResponse(reg);
  }

  @Post(':id/cancel')
  async cancel(@Req() req: AuthenticatedRequest, @Param('id', new ParseUUIDPipe()) id: string) {
    const reg = await this.registrationsService.cancel(id, req.user.id);
    return successResponse(reg);
  }
}

@UseGuards(OnboardingGuard)
@Controller('onboarding/enrollments')
export class OnboardingRegistrationsController {
  constructor(private readonly registrationsService: RegistrationsService) {}

  @Get()
  async getAll(@Req() req: AuthenticatedRequest) {
    const list = await this.registrationsService.getByFamily(req.user.id);
    return successResponse(list);
  }

  @Post('guided')
  async createGuided(@Req() req: AuthenticatedRequest, @Body() dto: GuidedEnrollmentDto) {
    return successResponse(
      await this.registrationsService.createGuidedEnrollment(req.user.id, dto),
    );
  }

  @Get(':id')
  async getById(@Req() req: AuthenticatedRequest, @Param('id', new ParseUUIDPipe()) id: string) {
    const reg = await this.registrationsService.getById(id, req.user.id);
    return successResponse(reg);
  }
}

@UseGuards(AuthGuard, RolesGuard)
@Roles('ADMIN')
@Controller('admin/enrollments')
export class AdminRegistrationsController {
  constructor(
    private readonly registrationsService: RegistrationsService,
  ) {}

  @Post('families/:familyId/guided')
  async createForFamily(
    @Param('familyId', new ParseUUIDPipe()) familyId: string,
    @Req() req: AuthenticatedRequest,
    @Body() dto: GuidedEnrollmentDto,
  ) {
    const result = await this.registrationsService.createGuidedEnrollment(familyId, dto, {
      adminId: req.user.id,
      ipAddress: req.ip,
    });
    return successResponse({
      registrationId: result.registrationId,
      studentId: result.studentId,
      status: 'CONTRACT_READY',
      parentActionRequired: true,
    });
  }

  @Get()
  async getAll() {
    return successResponse(await this.registrationsService.getAllForAdmin());
  }

  @Get(':id')
  async getById(@Param('id', new ParseUUIDPipe()) id: string) {
    const reg = await this.registrationsService.getForAdmin(id);
    return successResponse(reg);
  }

  @Post(':id/start-review')
  async startReview(@Param('id', new ParseUUIDPipe()) id: string, @Req() req: AuthenticatedRequest) {
    const reg = await this.registrationsService.startReview(id, req.user.id);
    return successResponse(reg);
  }

  @Post(':id/approve')
  async approve(@Param('id', new ParseUUIDPipe()) id: string, @Req() req: AuthenticatedRequest) {
    const reg = await this.registrationsService.approve(id, req.user.id);
    return successResponse(reg);
  }

  @Post(':id/reject')
  async reject(@Param('id', new ParseUUIDPipe()) id: string, @Req() req: AuthenticatedRequest, @Body() dto: RejectRegistrationDto) {
    const reg = await this.registrationsService.reject(id, req.user.id, dto.reason);
    return successResponse(reg);
  }

  @Post(':id/request-correction')
  async requestCorrection(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Req() req: AuthenticatedRequest,
    @Body() dto: CorrectionDto,
  ) {
    const result = await this.registrationsService.requestCorrection(id, req.user.id, dto.message);
    return successResponse(result);
  }
}
