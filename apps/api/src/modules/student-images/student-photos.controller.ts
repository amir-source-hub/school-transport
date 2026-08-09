import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { Roles } from '../../common/decorators';
import type { AuthenticatedRequest } from '../../common/http-request';
import { paginatedResponse, successResponse } from '../../common/response';
import { AuthGuard } from '../access-control/auth.guard';
import { RolesGuard } from '../access-control/roles.guard';
import { OnboardingGuard } from '../access-control/onboarding.guard';
import {
  AdminPhotoListQueryDto,
  AuthorizePhotoUploadDto,
  LinkPhotoUploadDto,
  RejectPhotoUploadDto,
  ReviewPhotoUploadDto,
} from './student-photo.dto';
import { StudentPhotosService } from './student-photos.service';

@UseGuards(AuthGuard)
@Controller('student-photos')
export class StudentPhotosController {
  constructor(private readonly service: StudentPhotosService) {}

  @Post('uploads')
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  async authorize(@Req() req: AuthenticatedRequest, @Body() body: AuthorizePhotoUploadDto) {
    return successResponse(await this.service.authorizeUpload(req.user.id, body, req.ip));
  }

  @Post('uploads/:id/complete')
  async complete(@Req() req: AuthenticatedRequest, @Param('id', new ParseUUIDPipe()) id: string) {
    return successResponse(await this.service.completeUpload(req.user.id, id, req.ip));
  }

  @Post('uploads/:id/link')
  async link(
    @Req() req: AuthenticatedRequest,
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() body: LinkPhotoUploadDto,
  ) {
    return successResponse(await this.service.linkUpload(req.user.id, id, body.studentId, req.ip));
  }

  @Get('current')
  async current(@Req() req: AuthenticatedRequest, @Query('studentId') studentId?: string) {
    return successResponse(await this.service.getCurrent(req.user.id, studentId || undefined));
  }

  @Get(':id/view-url')
  async viewUrl(@Req() req: AuthenticatedRequest, @Param('id', new ParseUUIDPipe()) id: string) {
    return successResponse(await this.service.getOwnerViewUrl(req.user.id, id));
  }
}

@UseGuards(OnboardingGuard)
@Controller('onboarding/student-photos')
export class OnboardingStudentPhotosController {
  constructor(private readonly service: StudentPhotosService) {}

  @Post('uploads')
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  async authorize(@Req() req: AuthenticatedRequest, @Body() body: AuthorizePhotoUploadDto) {
    return successResponse(await this.service.authorizeUpload(req.user.id, body, req.ip));
  }

  @Post('uploads/:id/complete')
  async complete(@Req() req: AuthenticatedRequest, @Param('id', new ParseUUIDPipe()) id: string) {
    return successResponse(await this.service.completeUpload(req.user.id, id, req.ip));
  }

  @Post('uploads/:id/link')
  async link(
    @Req() req: AuthenticatedRequest,
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() body: LinkPhotoUploadDto,
  ) {
    return successResponse(await this.service.linkUpload(req.user.id, id, body.studentId, req.ip));
  }
}

@UseGuards(AuthGuard, RolesGuard)
@Roles('ADMIN')
@Controller('admin/student-photos')
export class AdminStudentPhotosController {
  constructor(private readonly service: StudentPhotosService) {}

  @Get()
  async list(@Req() req: AuthenticatedRequest, @Query() query: AdminPhotoListQueryDto) {
    const result = await this.service.listForAdmin(query);
    return paginatedResponse(result.items, result.page, result.pageSize, result.total);
  }

  @Get(':id/view-url')
  async viewUrl(@Req() req: AuthenticatedRequest, @Param('id', new ParseUUIDPipe()) id: string) {
    return successResponse(await this.service.getAdminViewUrl(req.user.id, id, req.ip));
  }

  @Post(':id/approve')
  async approve(
    @Req() req: AuthenticatedRequest,
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() body: ReviewPhotoUploadDto,
  ) {
    return successResponse(await this.service.approve(req.user.id, id, body.version, req.ip));
  }

  @Post(':id/reject')
  async reject(
    @Req() req: AuthenticatedRequest,
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() body: RejectPhotoUploadDto,
  ) {
    return successResponse(await this.service.reject(req.user.id, id, body, req.ip));
  }
}
