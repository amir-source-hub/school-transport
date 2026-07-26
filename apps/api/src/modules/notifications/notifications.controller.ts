import { Controller, Get, Post, Patch, Param, UseGuards, Req } from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { AuthGuard } from '../access-control/auth.guard';
import { successResponse } from '../../common/response';
import { Roles } from '../../common/decorators';
import { RolesGuard } from '../access-control/roles.guard';

@UseGuards(AuthGuard)
@Controller('notifications')
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Get()
  async getAll(@Req() req: any) {
    const list = await this.notificationsService.getByUser(req.user.id);
    return successResponse(list);
  }

  @Get('unread-count')
  async unreadCount(@Req() req: any) {
    const count = await this.notificationsService.getUnreadCount(req.user.id);
    return successResponse(count);
  }

  @Patch(':id/read')
  async markRead(@Req() req: any, @Param('id') id: string) {
    await this.notificationsService.markRead(id, req.user.id);
    return successResponse({ read: true });
  }

  @Post('read-all')
  async markAllRead(@Req() req: any) {
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
