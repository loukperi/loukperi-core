import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { CurrentUserPayload } from 'src/common/decorators/current-user.decorator';
import { NotificationRepository } from 'src/database/repositories/notification.repository';
import { CreateNotificationDto } from './dto/create-notification.dto';
import { ListNotificationsQueryDto } from './dto/list-notifications.query.dto';
import { UpdateNotificationDto } from './dto/update-notification.dto';

@Injectable()
export class NotificationsService {
  constructor(private readonly notificationRepository: NotificationRepository) {}

  async list(workspaceId: string | undefined, currentUser: CurrentUserPayload | undefined, query: ListNotificationsQueryDto) {
    const { resolvedWorkspaceId, currentUserId } = this.resolveContext(workspaceId, currentUser);
    const result = await this.notificationRepository.listByWorkspaceAndUser(resolvedWorkspaceId, currentUserId, query);
    return {
      items: result.items.map((item) => this.toNotificationResponse(item)),
      pagination: { page: query.page, page_size: query.page_size, total: result.total, total_pages: Math.ceil(result.total / query.page_size) },
    };
  }

  async create(workspaceId: string | undefined, currentUser: CurrentUserPayload | undefined, dto: CreateNotificationDto) {
    const { resolvedWorkspaceId } = this.resolveContext(workspaceId, currentUser);
    const created = await this.notificationRepository.create({
      workspaceId: resolvedWorkspaceId,
      userId: dto.user_id,
      type: dto.type,
      title: dto.title,
      body: dto.body,
      entityType: dto.entity_type,
      entityId: dto.entity_id,
      isRead: dto.is_read ?? false,
      readAt: dto.is_read ? new Date() : undefined,
    });
    return this.toNotificationResponse(created);
  }

  async getOne(workspaceId: string | undefined, currentUser: CurrentUserPayload | undefined, notificationId: string) {
    const { resolvedWorkspaceId, currentUserId } = this.resolveContext(workspaceId, currentUser);
    const notification = await this.notificationRepository.findOne(resolvedWorkspaceId, currentUserId, notificationId);
    if (!notification) throw new NotFoundException('Notification not found');
    return this.toNotificationResponse(notification);
  }

  async update(workspaceId: string | undefined, currentUser: CurrentUserPayload | undefined, notificationId: string, dto: UpdateNotificationDto) {
    const { resolvedWorkspaceId, currentUserId } = this.resolveContext(workspaceId, currentUser);
    const existing = await this.notificationRepository.findOne(resolvedWorkspaceId, currentUserId, notificationId);
    if (!existing) throw new NotFoundException('Notification not found');
    const updated = await this.notificationRepository.update(notificationId, {
      title: dto.title,
      body: dto.body,
      type: dto.type,
      entityType: dto.entity_type,
      entityId: dto.entity_id,
      isRead: dto.is_read,
      readAt: dto.is_read ? new Date() : dto.is_read === false ? null : undefined,
    });
    return this.toNotificationResponse(updated);
  }

  async readAll(workspaceId: string | undefined, currentUser: CurrentUserPayload | undefined) {
    const { resolvedWorkspaceId, currentUserId } = this.resolveContext(workspaceId, currentUser);
    const result = await this.notificationRepository.readAll(resolvedWorkspaceId, currentUserId);
    return { updated_count: result.count, read_at: new Date().toISOString() };
  }

  async readOne(workspaceId: string | undefined, currentUser: CurrentUserPayload | undefined, notificationId: string) {
    const { resolvedWorkspaceId, currentUserId } = this.resolveContext(workspaceId, currentUser);
    const existing = await this.notificationRepository.findOne(resolvedWorkspaceId, currentUserId, notificationId);
    if (!existing) throw new NotFoundException('Notification not found');
    const updated = await this.notificationRepository.update(notificationId, { isRead: true, readAt: new Date() });
    return this.toNotificationResponse(updated);
  }

  private resolveContext(workspaceId: string | undefined, currentUser: CurrentUserPayload | undefined) {
    const resolvedWorkspaceId = workspaceId ?? currentUser?.defaultWorkspaceId;
    if (!resolvedWorkspaceId) throw new ForbiddenException('Workspace context is required');
    if (!currentUser || !currentUser.workspaceIds.includes(resolvedWorkspaceId)) throw new ForbiddenException('No access to workspace');
    return { resolvedWorkspaceId, currentUserId: currentUser.sub };
  }

  private toNotificationResponse(notification: any) {
    return {
      id: notification.id,
      user_id: notification.userId,
      type: notification.type,
      title: notification.title,
      body: notification.body,
      entity_type: notification.entityType,
      entity_id: notification.entityId,
      is_read: notification.isRead,
      read_at: notification.readAt?.toISOString() ?? null,
      created_at: notification.createdAt.toISOString(),
    };
  }
}
