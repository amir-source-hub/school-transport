import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  UseGuards,
  Req,
  ParseUUIDPipe,
  Query,
} from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { AuthGuard } from '../access-control/auth.guard';
import { paginatedResponse, successResponse } from '../../common/response';
import { Roles } from '../../common/decorators';
import { RolesGuard } from '../access-control/roles.guard';
import { AuthenticatedRequest } from '../../common/http-request';
import { Body } from '@nestjs/common';
import { UpdateNotificationConsentDto } from './notification-consent.dto';
import { Type } from 'class-transformer';
import {
  IsDateString,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { notificationCatalog } from '../../infrastructure/notifications/notification.catalog';

const ADMIN_OPERATIONAL_TYPES = Object.entries(notificationCatalog)
  .filter(([, entry]) => entry.adminOperational)
  .map(([type]) => type);
const NOTIFICATION_STATUSES = ['PENDING', 'SENT', 'FAILED'] as const;

export class NotificationListQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(50)
  pageSize?: number;
}

export class AdminNotificationListQueryDto extends NotificationListQueryDto {
  @IsOptional()
  @IsString()
  @MaxLength(500)
  cursor?: string;

  @IsOptional()
  @IsDateString({ strict: true })
  snapshotAt?: string;

  @IsOptional()
  @IsIn(ADMIN_OPERATIONAL_TYPES)
  type?: string;

  @IsOptional()
  @IsIn(NOTIFICATION_STATUSES)
  status?: string;

  @IsOptional()
  @IsDateString({ strict: true })
  dateFrom?: string;

  @IsOptional()
  @IsDateString({ strict: true })
  dateTo?: string;
}

@UseGuards(AuthGuard)
@Controller('notifications')
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Get()
  async getAll(@Req() req: AuthenticatedRequest, @Query() query: NotificationListQueryDto) {
    const result = await this.notificationsService.getByUser(req.user.id, query);
    return paginatedResponse(result.items, result.page, result.pageSize, result.total);
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

  @Get('settings')
  async getSettings(@Req() req: AuthenticatedRequest) {
    return successResponse(await this.notificationsService.getConsentSettings(req.user.id));
  }

  @Patch('settings')
  async updateSettings(
    @Req() req: AuthenticatedRequest,
    @Body() body: UpdateNotificationConsentDto,
  ) {
    return successResponse(
      await this.notificationsService.updateConsent(req.user.id, body, req.ip),
    );
  }
}

@UseGuards(AuthGuard, RolesGuard)
@Roles('ADMIN')
@Controller('admin/notifications')
export class AdminNotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Get()
  async getAll(@Req() req: AuthenticatedRequest, @Query() query: AdminNotificationListQueryDto) {
    const result = await this.notificationsService.getSharedAdminEvents(query);
    return successResponse(result);
  }
}
