import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { CurrentUserPayload } from 'src/common/decorators/current-user.decorator';
import { PrismaService } from 'src/database/prisma.service';
import { CreateDashboardWidgetDto } from './dto/create-dashboard-widget.dto';
import { CreateDashboardDto } from './dto/create-dashboard.dto';
import { ListDashboardsQueryDto } from './dto/list-dashboards.query.dto';
import { UpdateDashboardWidgetDto } from './dto/update-dashboard-widget.dto';
import { UpdateDashboardDto } from './dto/update-dashboard.dto';

@Injectable()
export class DashboardsService {
  constructor(private readonly prisma: PrismaService) {}

  async list(
    workspaceId: string | undefined,
    currentUser: CurrentUserPayload | undefined,
    query: ListDashboardsQueryDto,
  ) {
    const resolvedWorkspaceId = this.resolveWorkspaceId(workspaceId, currentUser);

    const dashboards = await this.prisma.dashboardConfig.findMany({
      where: {
        workspaceId: resolvedWorkspaceId,
        ...(query.scope_type ? { scopeType: query.scope_type } : {}),
        ...(query.scope_id ? { scopeId: query.scope_id } : {}),
      },
      orderBy: [{ isDefault: 'desc' }, { name: 'asc' }],
      include: this.dashboardInclude(),
    });

    return dashboards.map((dashboard) => this.toDashboardResponse(dashboard));
  }

  async getDefault(
    workspaceId: string | undefined,
    currentUser: CurrentUserPayload | undefined,
    query: ListDashboardsQueryDto,
  ) {
    const resolvedWorkspaceId = this.resolveWorkspaceId(workspaceId, currentUser);

    const dashboard = await this.prisma.dashboardConfig.findFirst({
      where: {
        workspaceId: resolvedWorkspaceId,
        scopeType: query.scope_type ?? 'workspace',
        scopeId: query.scope_id ?? null,
        isDefault: true,
      },
      include: this.dashboardInclude(),
      orderBy: {
        createdAt: 'asc',
      },
    });

    if (!dashboard) {
      throw new NotFoundException('Default dashboard not found');
    }

    return this.toDashboardResponse(dashboard);
  }

  async getOne(
    workspaceId: string | undefined,
    currentUser: CurrentUserPayload | undefined,
    dashboardId: string,
  ) {
    const resolvedWorkspaceId = this.resolveWorkspaceId(workspaceId, currentUser);
    this.validateUuid(dashboardId, 'dashboardId');

    const dashboard = await this.prisma.dashboardConfig.findFirst({
      where: {
        id: dashboardId,
        workspaceId: resolvedWorkspaceId,
      },
      include: this.dashboardInclude(),
    });

    if (!dashboard) {
      throw new NotFoundException('Dashboard not found');
    }

    return this.toDashboardResponse(dashboard);
  }

  async create(
    workspaceId: string | undefined,
    currentUser: CurrentUserPayload | undefined,
    dto: CreateDashboardDto,
  ) {
    const resolvedWorkspaceId = this.resolveWorkspaceId(workspaceId, currentUser);
    const isDefault = dto.is_default ?? false;

    if (isDefault) {
      await this.clearDefaultDashboards({
        workspaceId: resolvedWorkspaceId,
        scopeType: dto.scope_type,
        scopeId: dto.scope_id ?? null,
      });
    }

    const created = await this.prisma.dashboardConfig.create({
      data: {
        workspaceId: resolvedWorkspaceId,
        name: dto.name,
        scopeType: dto.scope_type,
        scopeId: dto.scope_id,
        isDefault,
      },
      include: this.dashboardInclude(),
    });

    return this.toDashboardResponse(created);
  }

  async update(
    workspaceId: string | undefined,
    currentUser: CurrentUserPayload | undefined,
    dashboardId: string,
    dto: UpdateDashboardDto,
  ) {
    const resolvedWorkspaceId = this.resolveWorkspaceId(workspaceId, currentUser);
    this.validateUuid(dashboardId, 'dashboardId');

    const existing = await this.prisma.dashboardConfig.findFirst({
      where: {
        id: dashboardId,
        workspaceId: resolvedWorkspaceId,
      },
    });

    if (!existing) {
      throw new NotFoundException('Dashboard not found');
    }

    if (dto.is_default === true) {
      await this.clearDefaultDashboards({
        workspaceId: resolvedWorkspaceId,
        scopeType: existing.scopeType,
        scopeId: existing.scopeId,
        exceptDashboardId: existing.id,
      });
    }

    const updated = await this.prisma.dashboardConfig.update({
      where: {
        id: dashboardId,
      },
      data: {
        name: dto.name,
        isDefault: dto.is_default,
      },
      include: this.dashboardInclude(),
    });

    return this.toDashboardResponse(updated);
  }

  async remove(
    workspaceId: string | undefined,
    currentUser: CurrentUserPayload | undefined,
    dashboardId: string,
  ) {
    const resolvedWorkspaceId = this.resolveWorkspaceId(workspaceId, currentUser);
    this.validateUuid(dashboardId, 'dashboardId');

    const existing = await this.prisma.dashboardConfig.findFirst({
      where: {
        id: dashboardId,
        workspaceId: resolvedWorkspaceId,
      },
    });

    if (!existing) {
      throw new NotFoundException('Dashboard not found');
    }

    await this.prisma.$transaction([
      this.prisma.dashboardWidget.deleteMany({
        where: {
          workspaceId: resolvedWorkspaceId,
          dashboardConfigId: dashboardId,
        },
      }),
      this.prisma.dashboardConfig.delete({
        where: {
          id: dashboardId,
        },
      }),
    ]);

    return {
      id: dashboardId,
      deleted: true,
    };
  }

  async setDefault(
    workspaceId: string | undefined,
    currentUser: CurrentUserPayload | undefined,
    dashboardId: string,
  ) {
    const resolvedWorkspaceId = this.resolveWorkspaceId(workspaceId, currentUser);
    this.validateUuid(dashboardId, 'dashboardId');

    const existing = await this.prisma.dashboardConfig.findFirst({
      where: {
        id: dashboardId,
        workspaceId: resolvedWorkspaceId,
      },
    });

    if (!existing) {
      throw new NotFoundException('Dashboard not found');
    }

    await this.clearDefaultDashboards({
      workspaceId: resolvedWorkspaceId,
      scopeType: existing.scopeType,
      scopeId: existing.scopeId,
      exceptDashboardId: existing.id,
    });

    const updated = await this.prisma.dashboardConfig.update({
      where: {
        id: existing.id,
      },
      data: {
        isDefault: true,
      },
      include: this.dashboardInclude(),
    });

    return this.toDashboardResponse(updated);
  }

  async addWidget(
    workspaceId: string | undefined,
    currentUser: CurrentUserPayload | undefined,
    dashboardId: string,
    dto: CreateDashboardWidgetDto,
  ) {
    const resolvedWorkspaceId = this.resolveWorkspaceId(workspaceId, currentUser);
    this.validateUuid(dashboardId, 'dashboardId');

    await this.ensureDashboardExists(resolvedWorkspaceId, dashboardId);

    const created = await this.prisma.dashboardWidget.create({
      data: {
        workspaceId: resolvedWorkspaceId,
        dashboardConfigId: dashboardId,
        widgetType: dto.widget_type,
        title: dto.title,
        positionX: dto.position_x ?? 0,
        positionY: dto.position_y ?? 0,
        width: dto.width ?? 4,
        height: dto.height ?? 2,
        settingsJsonb: (dto.settings_jsonb ?? {}) as Prisma.InputJsonValue,
      },
    });

    return this.toWidgetResponse(created);
  }

  async updateWidget(
    workspaceId: string | undefined,
    currentUser: CurrentUserPayload | undefined,
    widgetId: string,
    dto: UpdateDashboardWidgetDto,
  ) {
    const resolvedWorkspaceId = this.resolveWorkspaceId(workspaceId, currentUser);
    this.validateUuid(widgetId, 'widgetId');

    const existing = await this.prisma.dashboardWidget.findFirst({
      where: {
        id: widgetId,
        workspaceId: resolvedWorkspaceId,
      },
    });

    if (!existing) {
      throw new NotFoundException('Dashboard widget not found');
    }

    const updated = await this.prisma.dashboardWidget.update({
      where: {
        id: widgetId,
      },
      data: {
        title: dto.title,
        positionX: dto.position_x,
        positionY: dto.position_y,
        width: dto.width,
        height: dto.height,
        settingsJsonb: dto.settings_jsonb as Prisma.InputJsonValue | undefined,
      },
    });

    return this.toWidgetResponse(updated);
  }

  async removeWidget(
    workspaceId: string | undefined,
    currentUser: CurrentUserPayload | undefined,
    widgetId: string,
  ) {
    const resolvedWorkspaceId = this.resolveWorkspaceId(workspaceId, currentUser);
    this.validateUuid(widgetId, 'widgetId');

    const existing = await this.prisma.dashboardWidget.findFirst({
      where: {
        id: widgetId,
        workspaceId: resolvedWorkspaceId,
      },
    });

    if (!existing) {
      throw new NotFoundException('Dashboard widget not found');
    }

    await this.prisma.dashboardWidget.delete({
      where: {
        id: widgetId,
      },
    });

    return {
      id: widgetId,
      deleted: true,
    };
  }

  async getDashboardData(
    workspaceId: string | undefined,
    currentUser: CurrentUserPayload | undefined,
    dashboardId: string,
  ) {
    const resolvedWorkspaceId = this.resolveWorkspaceId(workspaceId, currentUser);
    this.validateUuid(dashboardId, 'dashboardId');

    const dashboard = await this.prisma.dashboardConfig.findFirst({
      where: {
        id: dashboardId,
        workspaceId: resolvedWorkspaceId,
      },
      include: {
        widgets: {
          orderBy: [{ positionY: 'asc' }, { positionX: 'asc' }],
        },
      },
    });

    if (!dashboard) {
      throw new NotFoundException('Dashboard not found');
    }

    const widgets = await Promise.all(
      dashboard.widgets.map(async (widget) => ({
        widget: this.toWidgetResponse(widget),
        data: await this.buildWidgetData(resolvedWorkspaceId, currentUser, widget),
      })),
    );

    return {
      dashboard: this.toDashboardResponse(dashboard),
      widgets,
    };
  }

  async getWidgetData(
    workspaceId: string | undefined,
    currentUser: CurrentUserPayload | undefined,
    widgetId: string,
  ) {
    const resolvedWorkspaceId = this.resolveWorkspaceId(workspaceId, currentUser);
    this.validateUuid(widgetId, 'widgetId');

    const widget = await this.prisma.dashboardWidget.findFirst({
      where: {
        id: widgetId,
        workspaceId: resolvedWorkspaceId,
      },
    });

    if (!widget) {
      throw new NotFoundException('Dashboard widget not found');
    }

    return {
      widget: this.toWidgetResponse(widget),
      data: await this.buildWidgetData(resolvedWorkspaceId, currentUser, widget),
    };
  }

  private async buildWidgetData(
    workspaceId: string,
    currentUser: CurrentUserPayload | undefined,
    widget: {
      id: string;
      widgetType: string;
      settingsJsonb: Prisma.JsonValue;
    },
  ) {
    switch (widget.widgetType) {
      case 'records_by_status':
        return this.getRecordsByStatusData(workspaceId);

      case 'records_by_priority':
        return this.getRecordsByPriorityData(workspaceId);

      case 'tasks_by_status':
        return this.getTasksByStatusData(workspaceId);

      case 'tasks_overdue':
        return this.getOverdueTasksData(workspaceId);

      case 'recent_activity':
        return this.getRecentActivityData(workspaceId);

      case 'unread_notifications':
        return this.getUnreadNotificationsData(workspaceId, currentUser);

      default:
        return {
          message: `Unsupported widget type: ${widget.widgetType}`,
          items: [],
        };
    }
  }

  private async getRecordsByStatusData(workspaceId: string) {
    const grouped = await this.prisma.record.groupBy({
      by: ['statusId'],
      where: {
        workspaceId,
      },
      _count: {
        _all: true,
      },
      orderBy: {
        _count: {
          statusId: 'desc',
        },
      },
    });

    const statusIds = grouped
      .map((item) => item.statusId)
      .filter((statusId): statusId is string => Boolean(statusId));

    const statuses = await this.prisma.statusDefinition.findMany({
      where: {
        workspaceId,
        id: {
          in: statusIds,
        },
      },
      select: {
        id: true,
        key: true,
        label: true,
        color: true,
      },
    });

    const statusMap = new Map(statuses.map((status) => [status.id, status]));

    return grouped.map((item) => {
      const status = item.statusId ? statusMap.get(item.statusId) : null;

      return {
        status_id: item.statusId,
        status_key: status?.key ?? null,
        status_label: status?.label ?? 'Unknown',
        color: status?.color ?? null,
        count: item._count._all,
      };
    });
  }

  private async getRecordsByPriorityData(workspaceId: string) {
    const grouped = await this.prisma.record.groupBy({
      by: ['priority'],
      where: {
        workspaceId,
      },
      _count: {
        _all: true,
      },
      orderBy: {
        _count: {
          priority: 'desc',
        },
      },
    });

    return grouped.map((item) => ({
      priority: item.priority,
      count: item._count._all,
    }));
  }

  private async getTasksByStatusData(workspaceId: string) {
    const grouped = await this.prisma.task.groupBy({
      by: ['status'],
      where: {
        workspaceId,
      },
      _count: {
        _all: true,
      },
      orderBy: {
        _count: {
          status: 'desc',
        },
      },
    });

    return grouped.map((item) => ({
      status: item.status,
      count: item._count._all,
    }));
  }

  private async getOverdueTasksData(workspaceId: string) {
    const now = new Date();

    const tasks = await this.prisma.task.findMany({
      where: {
        workspaceId,
        dueAt: {
          lt: now,
        },
        completedAt: null,
        status: {
          notIn: ['completed', 'done', 'cancelled'],
        },
      },
      orderBy: {
        dueAt: 'asc',
      },
      take: 10,
      select: {
        id: true,
        title: true,
        status: true,
        priority: true,
        dueAt: true,
        assigneeUserId: true,
        relatedEntityType: true,
        relatedEntityId: true,
      },
    });

    return {
      count: tasks.length,
      items: tasks.map((task) => ({
        id: task.id,
        title: task.title,
        status: task.status,
        priority: task.priority,
        due_at: task.dueAt,
        assignee_user_id: task.assigneeUserId,
        related_entity_type: task.relatedEntityType,
        related_entity_id: task.relatedEntityId,
      })),
    };
  }

  private async getRecentActivityData(workspaceId: string) {
    const events = await this.prisma.activityEvent.findMany({
      where: {
        workspaceId,
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: 10,
      include: {
        actorUser: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });

    return events.map((event) => ({
      id: event.id,
      entity_type: event.entityType,
      entity_id: event.entityId,
      event_type: event.eventType,
      event_label: event.eventLabel,
      actor_user_id: event.actorUserId,
      actor_user: event.actorUser
        ? {
            id: event.actorUser.id,
            email: event.actorUser.email,
            full_name: `${event.actorUser.firstName} ${event.actorUser.lastName}`,
          }
        : null,
      old_values_jsonb: event.oldValuesJsonb,
      new_values_jsonb: event.newValuesJsonb,
      meta_jsonb: event.metaJsonb,
      created_at: event.createdAt,
    }));
  }

  private async getUnreadNotificationsData(
    workspaceId: string,
    currentUser: CurrentUserPayload | undefined,
  ) {
    const userId = this.resolveActorUserId(currentUser);

    const [count, items] = await Promise.all([
      this.prisma.notification.count({
        where: {
          workspaceId,
          userId,
          isRead: false,
        },
      }),
      this.prisma.notification.findMany({
        where: {
          workspaceId,
          userId,
          isRead: false,
        },
        orderBy: {
          createdAt: 'desc',
        },
        take: 10,
      }),
    ]);

    return {
      count,
      items: items.map((notification) => ({
        id: notification.id,
        type: notification.type,
        title: notification.title,
        body: notification.body,
        entity_type: notification.entityType,
        entity_id: notification.entityId,
        is_read: notification.isRead,
        created_at: notification.createdAt,
      })),
    };
  }

  private resolveActorUserId(currentUser: CurrentUserPayload | undefined) {
    const user = currentUser as any;
    const userId = user?.id ?? user?.userId ?? user?.sub;

    if (!userId) {
      throw new ForbiddenException('User context is required');
    }

    return userId;
  }

  private async ensureDashboardExists(workspaceId: string, dashboardId: string) {
    const dashboard = await this.prisma.dashboardConfig.findFirst({
      where: {
        id: dashboardId,
        workspaceId,
      },
      select: {
        id: true,
      },
    });

    if (!dashboard) {
      throw new NotFoundException('Dashboard not found');
    }
  }

  private async clearDefaultDashboards(params: {
    workspaceId: string;
    scopeType: string;
    scopeId: string | null;
    exceptDashboardId?: string;
  }) {
    await this.prisma.dashboardConfig.updateMany({
      where: {
        workspaceId: params.workspaceId,
        scopeType: params.scopeType,
        scopeId: params.scopeId,
        isDefault: true,
        ...(params.exceptDashboardId
          ? { id: { not: params.exceptDashboardId } }
          : {}),
      },
      data: {
        isDefault: false,
      },
    });
  }

  private resolveWorkspaceId(
    workspaceId: string | undefined,
    currentUser: CurrentUserPayload | undefined,
  ) {
    const resolvedWorkspaceId = workspaceId ?? currentUser?.defaultWorkspaceId;

    if (!resolvedWorkspaceId) {
      throw new ForbiddenException('Workspace context is required');
    }

    if (!currentUser || !currentUser.workspaceIds.includes(resolvedWorkspaceId)) {
      throw new ForbiddenException('No access to workspace');
    }

    return resolvedWorkspaceId;
  }

  private validateUuid(value: string, fieldName: string) {
    const normalizedValue = String(value ?? '')
      .trim()
      .replace(/[‐-‒–—―]/g, '-');

    const uuidRegex =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

    if (!uuidRegex.test(normalizedValue)) {
      throw new BadRequestException(`${fieldName} must be a valid UUID`);
    }
  }

  private dashboardInclude() {
    return {
      widgets: {
        orderBy: [{ positionY: 'asc' }, { positionX: 'asc' }],
      },
    } satisfies Prisma.DashboardConfigInclude;
  }

  private toDashboardResponse(dashboard: {
    id: string;
    workspaceId: string;
    name: string;
    scopeType: string;
    scopeId: string | null;
    isDefault: boolean;
    createdAt: Date;
    updatedAt: Date;
    widgets?: Array<{
      id: string;
      workspaceId: string;
      dashboardConfigId: string;
      widgetType: string;
      title: string;
      positionX: number;
      positionY: number;
      width: number;
      height: number;
      settingsJsonb: Prisma.JsonValue;
      createdAt: Date;
      updatedAt: Date;
    }>;
  }) {
    return {
      id: dashboard.id,
      workspace_id: dashboard.workspaceId,
      name: dashboard.name,
      scope_type: dashboard.scopeType,
      scope_id: dashboard.scopeId,
      is_default: dashboard.isDefault,
      widgets: (dashboard.widgets ?? []).map((widget) =>
        this.toWidgetResponse(widget),
      ),
      created_at: dashboard.createdAt,
      updated_at: dashboard.updatedAt,
    };
  }

  private toWidgetResponse(widget: {
    id: string;
    workspaceId: string;
    dashboardConfigId: string;
    widgetType: string;
    title: string;
    positionX: number;
    positionY: number;
    width: number;
    height: number;
    settingsJsonb: Prisma.JsonValue;
    createdAt: Date;
    updatedAt: Date;
  }) {
    return {
      id: widget.id,
      workspace_id: widget.workspaceId,
      dashboard_config_id: widget.dashboardConfigId,
      widget_type: widget.widgetType,
      title: widget.title,
      position_x: widget.positionX,
      position_y: widget.positionY,
      width: widget.width,
      height: widget.height,
      settings_jsonb: widget.settingsJsonb ?? {},
      created_at: widget.createdAt,
      updated_at: widget.updatedAt,
    };
  }
}