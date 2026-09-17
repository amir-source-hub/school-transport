import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { OnboardingRole, Roles } from '../../common/decorators';
import type { AuthenticatedRequest } from '../../common/http-request';
import { AuthGuard } from '../access-control/auth.guard';
import { RolesGuard } from '../access-control/roles.guard';
import { successResponse } from '../../common/response';
import type { OnboardingRequest } from '../../common/http-request';
import { OnboardingGuard } from '../access-control/onboarding.guard';
import {
  AddStudentToTransportRouteDto,
  AdminUpdateDriverDto,
  AssignDriverToStudentDto,
  CreateTransportRouteDto,
  DriverDocumentUploadDto,
  DriverEnrollmentDto,
  RejectDriverDocumentDto,
  UpdateTransportRouteDto,
} from './driver-enrollment.dto';
import { DriverEnrollmentService } from './driver-enrollment.service';
import { AssignStudentRoutesDto } from './driver-enrollment.dto';

@UseGuards(OnboardingGuard)
@OnboardingRole('DRIVER')
@Controller('onboarding/driver-enrollment')
export class DriverEnrollmentController {
  constructor(private readonly service: DriverEnrollmentService) {}

  @Post('uploads')
  authorize(@Req() req: OnboardingRequest, @Body() body: DriverDocumentUploadDto) {
    return this.service.authorizeUpload(req.onboarding.userId, body, req.ip).then(successResponse);
  }

  @Post()
  enroll(@Req() req: OnboardingRequest, @Body() body: DriverEnrollmentDto) {
    return this.service
      .enroll(req.onboarding.userId, req.onboarding.phoneNumber, body, req.ip)
      .then(successResponse);
  }
}

@UseGuards(AuthGuard, RolesGuard)
@Roles('DRIVER')
@Controller('driver/documents')
export class DriverDocumentsController {
  constructor(private readonly service: DriverEnrollmentService) {}
  @Post('uploads')
  authorize(@Req() req: AuthenticatedRequest, @Body() body: DriverDocumentUploadDto) {
    return this.service.authorizeUpload(req.user.id, body, req.ip).then(successResponse);
  }
  @Post('uploads/:id/replace')
  replace(@Req() req: AuthenticatedRequest, @Param('id', new ParseUUIDPipe()) id: string) {
    return this.service.replacePhoto(req.user.id, id, req.ip).then(successResponse);
  }
  @Get()
  list(@Req() req: AuthenticatedRequest) {
    return this.service.getDocuments(req.user.id).then(successResponse);
  }
}

@UseGuards(AuthGuard, RolesGuard)
@Roles('DRIVER')
@Controller('driver')
export class DriverPortalController {
  constructor(private readonly service: DriverEnrollmentService) {}
  @Get('dashboard') dashboard(@Req() req: AuthenticatedRequest) {
    return this.service.getDashboard(req.user.id).then(successResponse);
  }
  @Get('me') profile(@Req() req: AuthenticatedRequest) {
    return this.service.getProfile(req.user.id).then(successResponse);
  }
  @Get('service-runs') runs(@Req() req: AuthenticatedRequest) {
    return this.service.getServiceRuns(req.user.id).then(successResponse);
  }
  @Get('students') students(@Req() req: AuthenticatedRequest) {
    return this.service.getStudents(req.user.id).then(successResponse);
  }
  @Get('schools') schools(@Req() req: AuthenticatedRequest) {
    return this.service.getSchools(req.user.id).then(successResponse);
  }
}

@UseGuards(AuthGuard, RolesGuard)
@Roles('ADMIN')
@Controller('admin')
export class AdminDriversController {
  constructor(private readonly service: DriverEnrollmentService) {}

  @Post('transport-assignments')
  assignRoutes(@Req() req: AuthenticatedRequest, @Body() body: AssignStudentRoutesDto) {
    return this.service.assignStudentRoutes(body, req.user.id, req.ip).then(successResponse);
  }

  @Get('drivers') list() {
    return this.service.getAdminDrivers().then(successResponse);
  }
  @Get('drivers/:id') detail(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.service.getAdminDriver(id).then(successResponse);
  }
  @Patch('drivers/:id') updateDriver(
    @Req() req: AuthenticatedRequest,
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() body: AdminUpdateDriverDto,
  ) {
    return this.service.updateAdminDriver(id, body, req.user.id, req.ip).then(successResponse);
  }
  @Delete('drivers/:id') removeDriver(
    @Req() req: AuthenticatedRequest,
    @Param('id', new ParseUUIDPipe()) id: string,
  ) {
    return this.service.deactivateAdminDriver(id, req.user.id, req.ip).then(successResponse);
  }
  @Post('drivers/:id/restore') restoreDriver(
    @Req() req: AuthenticatedRequest,
    @Param('id', new ParseUUIDPipe()) id: string,
  ) {
    return this.service.restoreAdminDriver(id, req.user.id, req.ip).then(successResponse);
  }
  @Delete('drivers/:id/permanent') permanentlyDeleteDriver(
    @Req() req: AuthenticatedRequest,
    @Param('id', new ParseUUIDPipe()) id: string,
  ) {
    return this.service.permanentlyDeleteAdminDriver(id, req.user.id, req.ip).then(successResponse);
  }
  @Post('drivers/:id/documents/:documentId/reject') rejectDocument(
    @Req() req: AuthenticatedRequest,
    @Param('id', new ParseUUIDPipe()) id: string,
    @Param('documentId', new ParseUUIDPipe()) documentId: string,
    @Body() body: RejectDriverDocumentDto,
  ) {
    return this.service
      .rejectDriverDocument(id, documentId, body.reason, req.user.id, req.ip)
      .then(successResponse);
  }
  @Post('students/:studentId/driver-assignment')
  assign(
    @Req() req: AuthenticatedRequest,
    @Param('studentId', new ParseUUIDPipe()) studentId: string,
    @Body() body: AssignDriverToStudentDto,
  ) {
    return this.service
      .assignDriverToStudent(studentId, body, req.user.id, req.ip)
      .then(successResponse);
  }
  @Get('students/:studentId/driver-assignment')
  assignments(@Param('studentId', new ParseUUIDPipe()) studentId: string) {
    return this.service.getStudentAssignments(studentId).then(successResponse);
  }
  @Get('transport-routes') routes() {
    return this.service.getAdminRoutes().then(successResponse);
  }
  @Post('transport-routes') createRoute(
    @Req() req: AuthenticatedRequest,
    @Body() body: CreateTransportRouteDto,
  ) {
    return this.service.createAdminRoute(body, req.user.id, req.ip).then(successResponse);
  }
  @Patch('transport-routes/:routeId') updateRoute(
    @Req() req: AuthenticatedRequest,
    @Param('routeId', new ParseUUIDPipe()) routeId: string,
    @Body() body: UpdateTransportRouteDto,
  ) {
    return this.service.updateAdminRoute(routeId, body, req.user.id, req.ip).then(successResponse);
  }
  @Post('transport-routes/:routeId/students') addStudent(
    @Req() req: AuthenticatedRequest,
    @Param('routeId', new ParseUUIDPipe()) routeId: string,
    @Body() body: AddStudentToTransportRouteDto,
  ) {
    return this.service.addStudentToRoute(routeId, body, req.user.id, req.ip).then(successResponse);
  }
  @Delete('transport-routes/:routeId/students/:studentId') removeStudent(
    @Req() req: AuthenticatedRequest,
    @Param('routeId', new ParseUUIDPipe()) routeId: string,
    @Param('studentId', new ParseUUIDPipe()) studentId: string,
  ) {
    return this.service
      .removeStudentFromRoute(routeId, studentId, req.user.id, req.ip)
      .then(successResponse);
  }
  @Post('transport-routes/:routeId/archive') archiveRoute(
    @Req() req: AuthenticatedRequest,
    @Param('routeId', new ParseUUIDPipe()) routeId: string,
  ) {
    return this.service.archiveRoute(routeId, req.user.id, req.ip).then(successResponse);
  }
}

@UseGuards(AuthGuard)
@Controller('students')
export class DriverAssignmentViewerController {
  constructor(private readonly service: DriverEnrollmentService) {}

  @Get(':studentId/driver-assignments')
  list(
    @Req() req: AuthenticatedRequest,
    @Param('studentId', new ParseUUIDPipe()) studentId: string,
  ) {
    return this.service.getStudentAssignments(studentId, req.user.id).then(successResponse);
  }
}
