import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Req,
  ParseUUIDPipe,
} from '@nestjs/common';
import { StudentsService } from './students.service';
import { AuthGuard } from '../access-control/auth.guard';
import { RolesGuard } from '../access-control/roles.guard';
import { Roles } from '../../common/decorators';
import { paginatedResponse, successResponse } from '../../common/response';
import {
  AdminCreateStudentDto,
  AdminUpdateStudentDto,
  ArchiveStudentDto,
  CreateStudentDto,
  UpdateStudentDto,
  UpsertStudentCompanionDto,
} from './student.dto';
import { CreateLimitRequestDto, RejectLimitRequestDto } from './student-limit-request.dto';
import { AdminStudentListQueryDto } from './student-list.dto';
import { AuthenticatedRequest } from '../../common/http-request';
import { ConflictError } from '../../common/errors';

@UseGuards(AuthGuard, RolesGuard)
@Roles('PARENT')
@Controller('students')
export class StudentsController {
  constructor(private readonly studentsService: StudentsService) {}

  @Get()
  async getAll(@Req() req: AuthenticatedRequest) {
    const list = await this.studentsService.getAllByFamily(req.user.id);
    return successResponse(list);
  }

  @Get('capacity')
  async getCapacity(@Req() req: AuthenticatedRequest) {
    const capacity = await this.studentsService.getCapacity(req.user.id);
    return successResponse(capacity);
  }

  @Get('limit-requests')
  async getLimitRequests(@Req() req: AuthenticatedRequest) {
    const requests = await this.studentsService.getLimitRequests(req.user.id);
    return successResponse(requests);
  }

  @Post('limit-requests')
  async createLimitRequest(@Req() req: AuthenticatedRequest, @Body() dto: CreateLimitRequestDto) {
    const request = await this.studentsService.createLimitRequest(req.user.id, dto.reason);
    return successResponse(request);
  }

  @Post()
  async create(
    @Req() _req: AuthenticatedRequest,
    @Body()
    _dto: CreateStudentDto,
  ) {
    throw new ConflictError(
      'STUDENT_ENROLLMENT_ONLY',
      'دانش‌آموز فقط از مسیر ثبت‌نام قابل افزودن است.',
    );
  }

  @Get(':studentId')
  async getById(
    @Req() req: AuthenticatedRequest,
    @Param('studentId', new ParseUUIDPipe()) studentId: string,
  ) {
    const student = await this.studentsService.getDetailById(studentId, req.user.id);
    return successResponse(student);
  }

  @Patch(':studentId')
  async update(
    @Req() _req: AuthenticatedRequest,
    @Param('studentId', new ParseUUIDPipe()) _studentId: string,
    @Body() _dto: UpdateStudentDto,
  ) {
    throw new ConflictError(
      'STUDENT_ADMIN_EDIT_ONLY',
      'اطلاعات دانش‌آموز پس از ثبت‌نام فقط توسط مدیریت قابل تغییر است.',
    );
  }

  @Post(':studentId/companion')
  async addCompanion(
    @Req() req: AuthenticatedRequest,
    @Param('studentId', new ParseUUIDPipe()) studentId: string,
    @Body() dto: UpsertStudentCompanionDto,
  ) {
    return successResponse(await this.studentsService.upsertCompanion(studentId, req.user.id, dto));
  }
}

@UseGuards(AuthGuard, RolesGuard)
@Roles('ADMIN')
@Controller('admin/students')
export class AdminStudentsController {
  constructor(private readonly studentsService: StudentsService) {}

  @Get()
  async getAll(@Query() query: AdminStudentListQueryDto) {
    const { items, total } = await this.studentsService.getStudentsForAdminPage(query);
    return paginatedResponse(items, query.page, query.pageSize, total);
  }

  @Get('limit-requests')
  async getAllLimitRequests() {
    return successResponse(await this.studentsService.getAllLimitRequestsForAdmin());
  }

  @Get(':studentId')
  async getById(@Param('studentId', new ParseUUIDPipe()) studentId: string) {
    return successResponse(await this.studentsService.getForAdmin(studentId));
  }

  @Post(':studentId/companion')
  async saveCompanion(
    @Param('studentId', new ParseUUIDPipe()) studentId: string,
    @Body() dto: UpsertStudentCompanionDto,
  ) {
    return successResponse(await this.studentsService.saveCompanionByAdmin(studentId, dto));
  }

  @Delete(':studentId/companion')
  async removeCompanion(@Param('studentId', new ParseUUIDPipe()) studentId: string) {
    return successResponse(await this.studentsService.removeCompanionByAdmin(studentId));
  }

  @Post('limit-requests/:requestId/approve')
  async approveLimitRequest(
    @Req() req: AuthenticatedRequest,
    @Param('requestId', new ParseUUIDPipe()) requestId: string,
  ) {
    const request = await this.studentsService.approveLimitRequest(requestId, req.user.id, req.ip);
    return successResponse(request);
  }

  @Post('limit-requests/:requestId/reject')
  async rejectLimitRequest(
    @Req() req: AuthenticatedRequest,
    @Param('requestId', new ParseUUIDPipe()) requestId: string,
    @Body() dto: RejectLimitRequestDto,
  ) {
    const request = await this.studentsService.rejectLimitRequest(
      requestId,
      req.user.id,
      dto.reason,
      req.ip,
    );
    return successResponse(request);
  }

  @Post()
  async create(@Body() dto: AdminCreateStudentDto) {
    const student = await this.studentsService.createByAdmin(dto.userId, dto);
    return successResponse(student);
  }

  @Patch(':studentId')
  async update(
    @Req() req: AuthenticatedRequest,
    @Param('studentId', new ParseUUIDPipe()) studentId: string,
    @Body() dto: AdminUpdateStudentDto,
  ) {
    return successResponse(
      await this.studentsService.updateByAdmin(studentId, dto, {
        adminId: req.user.id,
        ipAddress: req.ip,
      }),
    );
  }

  @Delete(':studentId')
  async permanentlyDelete(
    @Req() req: AuthenticatedRequest,
    @Param('studentId', new ParseUUIDPipe()) studentId: string,
  ) {
    return successResponse(
      await this.studentsService.permanentlyDeleteByAdmin(studentId, {
        adminId: req.user.id,
        ipAddress: req.ip,
      }),
    );
  }

  @Post(':studentId/archive')
  async archive(
    @Req() req: AuthenticatedRequest,
    @Param('studentId', new ParseUUIDPipe()) studentId: string,
    @Body() dto: ArchiveStudentDto,
  ) {
    return successResponse(
      await this.studentsService.setActiveByAdmin(studentId, false, {
        adminId: req.user.id,
        ipAddress: req.ip,
        reason: dto.reason,
      }),
    );
  }

  @Post(':studentId/unarchive')
  async unarchive(
    @Req() req: AuthenticatedRequest,
    @Param('studentId', new ParseUUIDPipe()) studentId: string,
    @Body() dto: ArchiveStudentDto,
  ) {
    return successResponse(
      await this.studentsService.setActiveByAdmin(studentId, true, {
        adminId: req.user.id,
        ipAddress: req.ip,
        reason: dto.reason,
      }),
    );
  }
}
