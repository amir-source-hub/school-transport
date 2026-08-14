import {
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { Roles } from '../../common/decorators';
import type { AuthenticatedRequest } from '../../common/http-request';
import { paginatedResponse, successResponse } from '../../common/response';
import { AuthGuard } from '../access-control/auth.guard';
import { RolesGuard } from '../access-control/roles.guard';
import { ManagerStudentListQueryDto } from './school-manager.dto';
import { SchoolManagersService } from './school-managers.service';

@UseGuards(AuthGuard, RolesGuard)
@Roles('SCHOOL_MANAGER')
@Controller('manager')
export class SchoolManagersController {
  constructor(private readonly service: SchoolManagersService) {}

  @Get('dashboard')
  async dashboard(@Req() req: AuthenticatedRequest) {
    return successResponse(await this.service.getDashboard(req.user.id));
  }

  @Get('students')
  async students(@Req() req: AuthenticatedRequest, @Query() query: ManagerStudentListQueryDto) {
    const result = await this.service.getStudents(req.user.id, query);
    return paginatedResponse(result.items, query.page, query.pageSize, result.total);
  }

  @Get('students/:id')
  async studentDetail(
    @Req() req: AuthenticatedRequest,
    @Param('id', new ParseUUIDPipe()) id: string,
  ) {
    return successResponse(await this.service.getStudentDetail(req.user.id, id));
  }

  @Get('settings')
  async settings(@Req() req: AuthenticatedRequest) {
    return successResponse(await this.service.getSettings(req.user.id));
  }
}
