import { Controller, Get, Post, Patch, Delete, Body, Param, UseGuards, Req, ParseUUIDPipe } from '@nestjs/common';
import { StudentsService } from './students.service';
import { AuthGuard } from '../access-control/auth.guard';
import { RolesGuard } from '../access-control/roles.guard';
import { Roles } from '../../common/decorators';
import { successResponse } from '../../common/response';
import { AdminCreateStudentDto, CreateStudentDto, UpdateStudentDto } from './student.dto';
import { AuthenticatedRequest } from '../../common/http-request';

@UseGuards(AuthGuard)
@Controller('students')
export class StudentsController {
  constructor(private readonly studentsService: StudentsService) {}

  @Get()
  async getAll(@Req() req: AuthenticatedRequest) {
    const list = await this.studentsService.getAllByFamily(req.user.id);
    return successResponse(list);
  }

  @Post()
  async create(
    @Req() req: AuthenticatedRequest,
    @Body()
    dto: CreateStudentDto,
  ) {
    const student = await this.studentsService.create(req.user.id, dto);
    return successResponse(student);
  }

  @Get(':studentId')
  async getById(@Req() req: AuthenticatedRequest, @Param('studentId', new ParseUUIDPipe()) studentId: string) {
    const student = await this.studentsService.getById(studentId, req.user.id);
    return successResponse(student);
  }

  @Patch(':studentId')
  async update(
    @Req() req: AuthenticatedRequest,
    @Param('studentId', new ParseUUIDPipe()) studentId: string,
    @Body() dto: UpdateStudentDto,
  ) {
    const student = await this.studentsService.update(studentId, req.user.id, dto);
    return successResponse(student);
  }

  @Delete(':studentId')
  async archive(@Req() req: AuthenticatedRequest, @Param('studentId', new ParseUUIDPipe()) studentId: string) {
    await this.studentsService.archive(studentId, req.user.id);
    return successResponse({ archived: true });
  }
}

@UseGuards(AuthGuard, RolesGuard)
@Roles('ADMIN')
@Controller('admin/students')
export class AdminStudentsController {
  constructor(private readonly studentsService: StudentsService) {}

  @Get()
  async getAll() {
    return successResponse(await this.studentsService.getAllForAdmin());
  }

  @Post()
  async create(@Body() dto: AdminCreateStudentDto) {
    const student = await this.studentsService.createByAdmin(dto.userId, dto);
    return successResponse(student);
  }

  @Patch(':studentId')
  async update(@Param('studentId', new ParseUUIDPipe()) studentId: string, @Body() dto: UpdateStudentDto) {
    return successResponse(await this.studentsService.updateByAdmin(studentId, dto));
  }

  @Post(':studentId/archive')
  async archive(@Param('studentId', new ParseUUIDPipe()) studentId: string) {
    return successResponse(await this.studentsService.setActiveByAdmin(studentId, false));
  }

  @Post(':studentId/unarchive')
  async unarchive(@Param('studentId', new ParseUUIDPipe()) studentId: string) {
    return successResponse(await this.studentsService.setActiveByAdmin(studentId, true));
  }
}
