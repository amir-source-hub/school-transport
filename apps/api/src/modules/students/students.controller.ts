import { Controller, Get, Post, Patch, Delete, Body, Param, UseGuards, Req } from '@nestjs/common';
import { StudentsService } from './students.service';
import { AuthGuard } from '../access-control/auth.guard';
import { RolesGuard } from '../access-control/roles.guard';
import { Roles } from '../../common/decorators';
import { successResponse } from '../../common/response';

@UseGuards(AuthGuard)
@Controller('students')
export class StudentsController {
  constructor(private readonly studentsService: StudentsService) {}

  @Get()
  async getAll(@Req() req: any) {
    const list = await this.studentsService.getAllByFamily(req.user.id);
    return successResponse(list);
  }

  @Post()
  async create(@Req() req: any, @Body() dto: {
    schoolId: string; firstName: string; lastName: string;
    nationalId: string; birthDate?: string; gender?: string; grade?: string; className?: string;
  }) {
    const student = await this.studentsService.create(req.user.id, dto);
    return successResponse(student);
  }

  @Get(':studentId')
  async getById(@Req() req: any, @Param('studentId') studentId: string) {
    const student = await this.studentsService.getById(studentId, req.user.id);
    return successResponse(student);
  }

  @Patch(':studentId')
  async update(@Req() req: any, @Param('studentId') studentId: string, @Body() dto: any) {
    const student = await this.studentsService.update(studentId, req.user.id, dto);
    return successResponse(student);
  }

  @Delete(':studentId')
  async archive(@Req() req: any, @Param('studentId') studentId: string) {
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
    return successResponse([]);
  }
}
