import { Body, Controller, Get, Param, ParseUUIDPipe, Post, Req, UseGuards } from '@nestjs/common';
import { Roles } from '../../common/decorators';
import type { AuthenticatedRequest } from '../../common/http-request';
import { successResponse } from '../../common/response';
import { AuthGuard } from '../access-control/auth.guard';
import { RolesGuard } from '../access-control/roles.guard';
import { SuperAdminGuard } from '../access-control/super-admin.guard';
import { CreateBroadcastDto, TestBroadcastDto } from './broadcast.dto';
import { BroadcastsService } from './broadcasts.service';

@Controller('admin/broadcasts')
@UseGuards(AuthGuard, RolesGuard, SuperAdminGuard)
@Roles('ADMIN')
export class BroadcastsController {
  constructor(private readonly broadcasts: BroadcastsService) {}

  @Get()
  async list() {
    return successResponse(await this.broadcasts.list());
  }

  @Post('preview')
  async preview(@Req() request: AuthenticatedRequest, @Body() body: CreateBroadcastDto) {
    return successResponse(await this.broadcasts.preview(body, request.user.id, request.ip));
  }

  @Post()
  async create(@Req() request: AuthenticatedRequest, @Body() body: CreateBroadcastDto) {
    return successResponse(await this.broadcasts.create(body, request.user.id, request.ip));
  }

  @Post(':id/approve')
  async approve(
    @Req() request: AuthenticatedRequest,
    @Param('id', new ParseUUIDPipe()) id: string,
  ) {
    return successResponse(await this.broadcasts.approve(id, request.user.id, request.ip));
  }

  @Post(':id/test')
  async test(
    @Req() request: AuthenticatedRequest,
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() body: TestBroadcastDto,
  ) {
    return successResponse(
      await this.broadcasts.testSend(id, body.phoneNumber, request.user.id, request.ip),
    );
  }

  @Post(':id/pause')
  async pause(@Req() request: AuthenticatedRequest, @Param('id', new ParseUUIDPipe()) id: string) {
    return successResponse(await this.broadcasts.pause(id, request.user.id, request.ip));
  }

  @Post(':id/resume')
  async resume(@Req() request: AuthenticatedRequest, @Param('id', new ParseUUIDPipe()) id: string) {
    return successResponse(await this.broadcasts.resume(id, request.user.id, request.ip));
  }

  @Post(':id/cancel')
  async cancel(@Req() request: AuthenticatedRequest, @Param('id', new ParseUUIDPipe()) id: string) {
    return successResponse(await this.broadcasts.cancel(id, request.user.id, request.ip));
  }
}
