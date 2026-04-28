import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards, UseInterceptors } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentUser, CurrentUserPayload } from 'src/common/decorators/current-user.decorator';
import { Permissions } from 'src/common/decorators/permissions.decorator';
import { WorkspaceId } from 'src/common/decorators/workspace-id.decorator';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';
import { PermissionsGuard } from 'src/common/guards/permissions.guard';
import { ResponseEnvelopeInterceptor } from 'src/common/interceptors/response-envelope.interceptor';
import { CreateNotificationDto } from './dto/create-notification.dto';
import { ListNotificationsQueryDto } from './dto/list-notifications.query.dto';
import { UpdateNotificationDto } from './dto/update-notification.dto';
import { NotificationsService } from './notifications.service';

@ApiTags('Notifications')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@UseInterceptors(ResponseEnvelopeInterceptor)
@Controller('notifications')
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Get()
  @Permissions('notifications.read')
  list(@WorkspaceId() workspaceId: string | undefined, @CurrentUser() currentUser: CurrentUserPayload | undefined, @Query() query: ListNotificationsQueryDto) {
    return this.notificationsService.list(workspaceId, currentUser, query);
  }

  @Post()
  @Permissions('notifications.manage')
  create(@WorkspaceId() workspaceId: string | undefined, @CurrentUser() currentUser: CurrentUserPayload | undefined, @Body() dto: CreateNotificationDto) {
    return this.notificationsService.create(workspaceId, currentUser, dto);
  }

  @Get(':notificationId')
  @Permissions('notifications.read')
  getOne(@WorkspaceId() workspaceId: string | undefined, @CurrentUser() currentUser: CurrentUserPayload | undefined, @Param('notificationId') notificationId: string) {
    return this.notificationsService.getOne(workspaceId, currentUser, notificationId);
  }

  @Patch(':notificationId')
  @Permissions('notifications.manage')
  update(@WorkspaceId() workspaceId: string | undefined, @CurrentUser() currentUser: CurrentUserPayload | undefined, @Param('notificationId') notificationId: string, @Body() dto: UpdateNotificationDto) {
    return this.notificationsService.update(workspaceId, currentUser, notificationId, dto);
  }

  @Post('read-all')
  @Permissions('notifications.read')
  readAll(@WorkspaceId() workspaceId: string | undefined, @CurrentUser() currentUser: CurrentUserPayload | undefined) {
    return this.notificationsService.readAll(workspaceId, currentUser);
  }

  @Post(':notificationId/read')
  @Permissions('notifications.read')
  readOne(@WorkspaceId() workspaceId: string | undefined, @CurrentUser() currentUser: CurrentUserPayload | undefined, @Param('notificationId') notificationId: string) {
    return this.notificationsService.readOne(workspaceId, currentUser, notificationId);
  }
}
