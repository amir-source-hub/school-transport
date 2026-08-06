import { Controller, Get, Post, Patch, Param, UseGuards, Req, ParseUUIDPipe } from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { AuthGuard } from '../access-control/auth.guard';
import { successResponse } from '../../common/response';
import { Roles } from '../../common/decorators';
import { RolesGuard } from '../access-control/roles.guard';
import { AuthenticatedRequest } from '../../common/http-request';

@UseGuards(AuthGuard)
@Controller('notifications')
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Get()
  async getAll(@Req() req: AuthenticatedRequest) {
    const list = await this.notificationsService.getByUser(req.user.id);
    return successResponse(list);
  }

  @Get('unread-count')
  async unreadCount(@Req() req: AuthenticatedRequest) {
    const count = await this.notificationsService.getUnreadCount(req.user.id);
    return successResponse(count);
  }

  @Patch(':id/read')
  async markRead(@Req() req: AuthenticatedRequest, @Param('id', new ParseUUIDPipe()) id: string) {
    await this.notificationsService.markRead(id, req.user.id);
    return successResponse({ read: true });
  }

  @Post('read-all')
  async markAllRead(@Req() req: AuthenticatedRequest) {
    await this.notificationsService.markAllRead(req.user.id);
    return successResponse({ read: true });
  }
}

@UseGuards(AuthGuard, RolesGuard)
@Roles('ADMIN')
@Controller('admin/notifications')
export class AdminNotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Get()
  async getAll() {
    return successResponse(await this.notificationsService.getAll());
  }
}
