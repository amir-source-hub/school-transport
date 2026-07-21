import { Controller, Get, Post, Body, Param, UseGuards, Req } from '@nestjs/common';
import { RegistrationsService } from './registrations.service';
import { AuthGuard } from '../access-control/auth.guard';
import { RolesGuard } from '../access-control/roles.guard';
import { Roles } from '../../common/decorators';
import { successResponse } from '../../common/response';

@UseGuards(AuthGuard)
@Controller('enrollments')
export class RegistrationsController {
  constructor(private readonly registrationsService: RegistrationsService) {}

  @Get()
  async getAll(@Req() req: any) {
    const list = await this.registrationsService.getByFamily(req.user.id);
    return successResponse(list);
  }

  @Post()
  async create(@Req() req: any, @Body() dto: {
    studentId: string; academicYear: string; serviceType: string;
    requestedStartDate?: string; parentNotes?: string;
  }) {
    const reg = await this.registrationsService.create(req.user.id, dto);
    return successResponse(reg);
  }

  @Get(':id')
  async getById(@Req() req: any, @Param('id') id: string) {
    const reg = await this.registrationsService.getById(id, req.user.id);
    return successResponse(reg);
  }

  @Post(':id/submit')
  async submit(@Req() req: any, @Param('id') id: string) {
    const reg = await this.registrationsService.submit(id, req.user.id);
    return successResponse(reg);
  }

  @Post(':id/cancel')
  async cancel(@Req() req: any, @Param('id') id: string) {
    const reg = await this.registrationsService.cancel(id, req.user.id);
    return successResponse(reg);
  }
}

@UseGuards(AuthGuard, RolesGuard)
@Roles('ADMIN')
@Controller('admin/enrollments')
export class AdminRegistrationsController {
  constructor(private readonly registrationsService: RegistrationsService) {}

  @Get()
  async getAll() {
    return successResponse([]);
  }

  @Get(':id')
  async getById(@Param('id') id: string) {
    const reg = await this.registrationsService.getById(id);
    return successResponse(reg);
  }

  @Post(':id/start-review')
  async startReview(@Param('id') id: string, @Req() req: any) {
    const reg = await this.registrationsService.startReview(id, req.user.id);
    return successResponse(reg);
  }

  @Post(':id/approve')
  async approve(@Param('id') id: string, @Req() req: any) {
    const reg = await this.registrationsService.approve(id, req.user.id);
    return successResponse(reg);
  }

  @Post(':id/reject')
  async reject(@Param('id') id: string, @Req() req: any, @Body() dto: { reason?: string }) {
    const reg = await this.registrationsService.reject(id, req.user.id, dto.reason);
    return successResponse(reg);
  }

  @Post(':id/request-correction')
  async requestCorrection(@Param('id') id: string, @Req() req: any, @Body() dto: { message: string }) {
    const result = await this.registrationsService.requestCorrection(id, req.user.id, dto.message);
    return successResponse(result);
  }
}
