import {
  Body,
  Controller,
  Get,
  Headers,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import {
  CurrentUser,
  CurrentUserPayload,
} from 'src/common/decorators/current-user.decorator';
import { Permissions } from 'src/common/decorators/permissions.decorator';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';
import { PermissionsGuard } from 'src/common/guards/permissions.guard';
import { LOUKPERI_PERMISSIONS } from 'src/common/permissions/permission-codes';
import { SnoozeNotificationDto } from './dto/snooze-notification.dto';
import { NotificationsService } from './notifications.service';

@ApiTags('Notifications')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('notifications')
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Permissions(LOUKPERI_PERMISSIONS.NOTIFICATIONS_VIEW)
  @Get()
  listNotifications(
    @Headers('x-workspace-id') workspaceId: string | undefined,
    @CurrentUser() currentUser: CurrentUserPayload | undefined,
  ) {
    return this.notificationsService.listNotifications(workspaceId, currentUser);
  }

  @Permissions(LOUKPERI_PERMISSIONS.NOTIFICATIONS_MANAGE)
  @Post('sync-task-reminders')
  syncTaskReminders(
    @Headers('x-workspace-id') workspaceId: string | undefined,
    @CurrentUser() currentUser: CurrentUserPayload | undefined,
  ) {
    return this.notificationsService.syncTaskReminders(workspaceId, currentUser);
  }

  @Permissions(LOUKPERI_PERMISSIONS.NOTIFICATIONS_MANAGE)
  @Patch('read-all')
  markAllRead(
    @Headers('x-workspace-id') workspaceId: string | undefined,
    @CurrentUser() currentUser: CurrentUserPayload | undefined,
  ) {
    return this.notificationsService.markAllRead(workspaceId, currentUser);
  }

  @Permissions(LOUKPERI_PERMISSIONS.NOTIFICATIONS_MANAGE)
  @Patch('reset-states')
  resetStates(
    @Headers('x-workspace-id') workspaceId: string | undefined,
    @CurrentUser() currentUser: CurrentUserPayload | undefined,
  ) {
    return this.notificationsService.resetStates(workspaceId, currentUser);
  }

  @Permissions(LOUKPERI_PERMISSIONS.NOTIFICATIONS_MANAGE)
  @Patch(':notificationId/read')
  markRead(
    @Headers('x-workspace-id') workspaceId: string | undefined,
    @CurrentUser() currentUser: CurrentUserPayload | undefined,
    @Param('notificationId') notificationId: string,
  ) {
    return this.notificationsService.markRead(
      workspaceId,
      currentUser,
      notificationId,
    );
  }

  @Permissions(LOUKPERI_PERMISSIONS.NOTIFICATIONS_MANAGE)
  @Patch(':notificationId/snooze')
  snooze(
    @Headers('x-workspace-id') workspaceId: string | undefined,
    @CurrentUser() currentUser: CurrentUserPayload | undefined,
    @Param('notificationId') notificationId: string,
    @Body() dto: SnoozeNotificationDto,
  ) {
    return this.notificationsService.snooze(
      workspaceId,
      currentUser,
      notificationId,
      dto,
    );
  }

  @Permissions(LOUKPERI_PERMISSIONS.NOTIFICATIONS_MANAGE)
  @Patch(':notificationId/dismiss')
  dismiss(
    @Headers('x-workspace-id') workspaceId: string | undefined,
    @CurrentUser() currentUser: CurrentUserPayload | undefined,
    @Param('notificationId') notificationId: string,
  ) {
    return this.notificationsService.dismiss(
      workspaceId,
      currentUser,
      notificationId,
    );
  }
}
