import { Controller, Get, Post, Patch, Body, Param, UseGuards } from '@nestjs/common';
import { SchoolsService } from './schools.service';
import { AuthGuard } from '../access-control/auth.guard';
import { RolesGuard } from '../access-control/roles.guard';
import { Roles, Public } from '../../common/decorators';
import { successResponse } from '../../common/response';

@Controller('schools')
export class SchoolsController {
  constructor(private readonly schoolsService: SchoolsService) {}

  @Public()
  @Get()
  async getAll() {
    const list = await this.schoolsService.getAll();
    return successResponse(list);
  }

  @Public()
  @Get(':id')
  async getById(@Param('id') id: string) {
    const school = await this.schoolsService.getById(id);
    return successResponse(school);
  }
}

@UseGuards(AuthGuard, RolesGuard)
@Roles('ADMIN')
@Controller('admin/schools')
export class AdminSchoolsController {
  constructor(private readonly schoolsService: SchoolsService) {}

  @Get()
  async getAll() {
    const list = await this.schoolsService.getAll(true);
    return successResponse(list);
  }

  @Post()
  async create(@Body() dto: any) {
    const school = await this.schoolsService.create(dto);
    return successResponse(school);
  }

  @Patch(':id')
  async update(@Param('id') id: string, @Body() dto: any) {
    const school = await this.schoolsService.update(id, dto);
    return successResponse(school);
  }

  @Post(':id/archive')
  async archive(@Param('id') id: string) {
    const school = await this.schoolsService.archive(id);
    return successResponse(school);
  }

  @Post(':id/unarchive')
  async unarchive(@Param('id') id: string) {
    const school = await this.schoolsService.unarchive(id);
    return successResponse(school);
  }
}
