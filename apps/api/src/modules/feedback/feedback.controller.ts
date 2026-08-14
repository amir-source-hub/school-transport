import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
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
import { SchoolManagerScopeService } from '../access-control/school-manager-scope.service';
import {
  AssignFeedbackDto,
  CreateFeedbackDto,
  FeedbackQueryDto,
  RespondFeedbackDto,
  VersionDto,
} from './feedback.dto';
import { FeedbackService } from './feedback.service';

@UseGuards(AuthGuard)
@Controller('feedback')
export class FeedbackController {
  constructor(private readonly service: FeedbackService) {}
  @Post() @Throttle({ default: { limit: 3, ttl: 60_000 } }) async create(
    @Req() req: AuthenticatedRequest,
    @Body() body: CreateFeedbackDto,
  ) {
    return successResponse(await this.service.create(req.user.id, body));
  }
  @Get() async mine(@Req() req: AuthenticatedRequest, @Query() q: FeedbackQueryDto) {
    const r = await this.service.listMine(req.user.id, q);
    return paginatedResponse(r.items, q.page, q.pageSize, r.total, {
      snapshotAt: r.snapshotAt,
    });
  }
}
@UseGuards(AuthGuard, RolesGuard)
@Roles('ADMIN')
@Controller('admin/feedback')
export class AdminFeedbackController {
  constructor(private readonly service: FeedbackService) {}
  @Get() async list(@Req() req: AuthenticatedRequest, @Query() q: FeedbackQueryDto) {
    const r = await this.service.listAdmin(q, req.user.id, req.ip);
    return paginatedResponse(r.items, q.page, q.pageSize, r.total, {
      snapshotAt: r.snapshotAt,
    });
  }
  @Patch(':id/read') async read(
    @Req() r: AuthenticatedRequest,
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() b: VersionDto,
  ) {
    return successResponse(await this.service.markRead(id, r.user.id, b.version, r.ip));
  }
  @Patch(':id/assign') async assign(
    @Req() r: AuthenticatedRequest,
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() b: AssignFeedbackDto,
  ) {
    return successResponse(await this.service.assign(id, r.user.id, b.assigneeId, b.version, r.ip));
  }
  @Patch(':id/respond') async respond(
    @Req() r: AuthenticatedRequest,
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() b: RespondFeedbackDto,
  ) {
    return successResponse(await this.service.respond(id, r.user.id, b.response, b.version, r.ip));
  }
  @Patch(':id/close') async close(
    @Req() r: AuthenticatedRequest,
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() b: VersionDto,
  ) {
    return successResponse(await this.service.close(id, r.user.id, b.version, r.ip));
  }
}

@UseGuards(AuthGuard, RolesGuard)
@Roles('SCHOOL_MANAGER')
@Controller('manager/feedback')
export class ManagerFeedbackController {
  constructor(
    private readonly service: FeedbackService,
    private readonly scope: SchoolManagerScopeService,
  ) {}
  @Post()
  @Throttle({ default: { limit: 3, ttl: 60_000 } })
  async create(@Req() req: AuthenticatedRequest, @Body() body: CreateFeedbackDto) {
    const schoolId = await this.scope.resolvePrimarySchoolId(req.user.id);
    return successResponse(await this.service.createForManager(req.user.id, schoolId, body));
  }
  @Get() async mine(@Req() req: AuthenticatedRequest, @Query() q: FeedbackQueryDto) {
    const r = await this.service.listMineForManager(req.user.id, q);
    return paginatedResponse(r.items, q.page, q.pageSize, r.total, {
      snapshotAt: r.snapshotAt,
    });
  }
}
