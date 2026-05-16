import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { CurrentUserPayload } from 'src/common/decorators/current-user.decorator';
import { TaskRepository } from 'src/database/repositories/task.repository';
import { ActivityService } from '../activity/activity.service';
import { CompleteTaskDto } from './dto/complete-task.dto';
import { CreateTaskDto } from './dto/create-task.dto';
import { ListTasksQueryDto } from './dto/list-tasks.query.dto';
import { UpdateTaskDto } from './dto/update-task.dto';

@Injectable()
export class TasksService {
  constructor(
    private readonly taskRepository: TaskRepository,
    private readonly activityService: ActivityService,
  ) {}

  async list(
    workspaceId: string | undefined,
    currentUser: CurrentUserPayload | undefined,
    query: ListTasksQueryDto,
  ) {
    const resolvedWorkspaceId = this.resolveWorkspaceId(workspaceId, currentUser);
    this.validateDateRange(query.due_after, query.due_before);

    const result = await this.taskRepository.listByWorkspace(resolvedWorkspaceId, {
      ...query,
      actorUserId: currentUser?.sub,
    });

    return {
      items: result.items.map((task) => this.toTaskResponse(task)),
      pagination: {
        page: query.page,
        page_size: query.page_size,
        total: result.total,
        total_pages: Math.ceil(result.total / query.page_size),
      },
    };
  }

  async create(
    workspaceId: string | undefined,
    currentUser: CurrentUserPayload | undefined,
    dto: CreateTaskDto,
  ) {
    const resolvedWorkspaceId = this.resolveWorkspaceId(workspaceId, currentUser);
    this.validateDates(dto.reminder_at, dto.due_at);

    const created = await this.taskRepository.create({
      workspaceId: resolvedWorkspaceId,
      title: dto.title,
      description: dto.description,
      priority: dto.priority,
      assigneeUserId: dto.assignee_user_id,
      createdByUserId: currentUser?.sub,
      relatedEntityType: dto.related_entity_type,
      relatedEntityId: dto.related_entity_id,
      dueAt: dto.due_at ? new Date(dto.due_at) : undefined,
      reminderAt: dto.reminder_at ? new Date(dto.reminder_at) : undefined,
    });

    await this.logTaskActivityForRelatedRecord({
      workspaceId: resolvedWorkspaceId,
      task: created,
      actorUserId: this.resolveActorUserId(currentUser),
      eventType: 'task.created',
      eventLabel: 'Task created',
      newValuesJsonb: {
        taskId: created.id,
        title: created.title,
        description: created.description,
        status: created.status,
        priority: created.priority,
        assigneeUserId: created.assigneeUserId,
        dueAt: created.dueAt?.toISOString() ?? null,
        reminderAt: created.reminderAt?.toISOString() ?? null,
      } as Prisma.InputJsonValue,
    });

    return this.toTaskResponse(created);
  }

  async getOne(
    workspaceId: string | undefined,
    currentUser: CurrentUserPayload | undefined,
    taskId: string,
  ) {
    const resolvedWorkspaceId = this.resolveWorkspaceId(workspaceId, currentUser);
    const task = await this.taskRepository.findOne(resolvedWorkspaceId, taskId);

    if (!task) {
      throw new NotFoundException('Task not found');
    }

    return this.toTaskResponse(task);
  }

  async update(
    workspaceId: string | undefined,
    currentUser: CurrentUserPayload | undefined,
    taskId: string,
    dto: UpdateTaskDto,
  ) {
    const resolvedWorkspaceId = this.resolveWorkspaceId(workspaceId, currentUser);
    this.validateDates(dto.reminder_at, dto.due_at);

    const existing = await this.taskRepository.findOne(resolvedWorkspaceId, taskId);
    if (!existing) {
      throw new NotFoundException('Task not found');
    }

    const updated = await this.taskRepository.update(taskId, {
      title: dto.title,
      description: dto.description,
      status: dto.status,
      priority: dto.priority,
      assigneeUserId: dto.assignee_user_id,
      dueAt: dto.due_at ? new Date(dto.due_at) : undefined,
      reminderAt: dto.reminder_at ? new Date(dto.reminder_at) : undefined,
    });

    const statusChanged =
      dto.status !== undefined && dto.status !== existing.status;

    await this.logTaskActivityForRelatedRecord({
      workspaceId: resolvedWorkspaceId,
      task: updated,
      actorUserId: this.resolveActorUserId(currentUser),
      eventType: statusChanged ? 'task.status_changed' : 'task.updated',
      eventLabel: statusChanged ? 'Task status changed' : 'Task updated',
      oldValuesJsonb: {
        taskId: existing.id,
        title: existing.title,
        description: existing.description,
        status: existing.status,
        priority: existing.priority,
        assigneeUserId: existing.assigneeUserId,
        dueAt: existing.dueAt?.toISOString() ?? null,
        reminderAt: existing.reminderAt?.toISOString() ?? null,
      } as Prisma.InputJsonValue,
      newValuesJsonb: {
        taskId: updated.id,
        title: updated.title,
        description: updated.description,
        status: updated.status,
        priority: updated.priority,
        assigneeUserId: updated.assigneeUserId,
        dueAt: updated.dueAt?.toISOString() ?? null,
        reminderAt: updated.reminderAt?.toISOString() ?? null,
      } as Prisma.InputJsonValue,
    });

    return this.toTaskResponse(updated);
  }

  async complete(
    workspaceId: string | undefined,
    currentUser: CurrentUserPayload | undefined,
    taskId: string,
    dto: CompleteTaskDto,
  ) {
    const resolvedWorkspaceId = this.resolveWorkspaceId(workspaceId, currentUser);
    const existing = await this.taskRepository.findOne(resolvedWorkspaceId, taskId);

    if (!existing) {
      throw new NotFoundException('Task not found');
    }

    const updated = await this.taskRepository.update(taskId, {
      status: 'completed',
      completedAt: new Date(),
    });

    await this.logTaskActivityForRelatedRecord({
      workspaceId: resolvedWorkspaceId,
      task: updated,
      actorUserId: this.resolveActorUserId(currentUser),
      eventType: 'task.completed',
      eventLabel: 'Task completed',
      oldValuesJsonb: {
        taskId: existing.id,
        status: existing.status,
        completedAt: existing.completedAt?.toISOString() ?? null,
      } as Prisma.InputJsonValue,
      newValuesJsonb: {
        taskId: updated.id,
        status: updated.status,
        completedAt: updated.completedAt?.toISOString() ?? null,
        completionNote: dto.note ?? null,
      } as Prisma.InputJsonValue,
    });

    return {
      ...this.toTaskResponse(updated),
      completion_note: dto.note ?? null,
    };
  }

  async reopen(
    workspaceId: string | undefined,
    currentUser: CurrentUserPayload | undefined,
    taskId: string,
  ) {
    const resolvedWorkspaceId = this.resolveWorkspaceId(workspaceId, currentUser);
    const existing = await this.taskRepository.findOne(resolvedWorkspaceId, taskId);

    if (!existing) {
      throw new NotFoundException('Task not found');
    }

    const reopened = await this.taskRepository.update(taskId, {
      status: 'open',
      completedAt: null,
    });

    await this.logTaskActivityForRelatedRecord({
      workspaceId: resolvedWorkspaceId,
      task: reopened,
      actorUserId: this.resolveActorUserId(currentUser),
      eventType: 'task.reopened',
      eventLabel: 'Task reopened',
      oldValuesJsonb: {
        taskId: existing.id,
        status: existing.status,
        completedAt: existing.completedAt?.toISOString() ?? null,
      } as Prisma.InputJsonValue,
      newValuesJsonb: {
        taskId: reopened.id,
        status: reopened.status,
        completedAt: reopened.completedAt?.toISOString() ?? null,
      } as Prisma.InputJsonValue,
    });

    return this.toTaskResponse(reopened);
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

  private resolveActorUserId(currentUser: CurrentUserPayload | undefined) {
    const user = currentUser as any;

    return user?.id ?? user?.userId ?? user?.sub ?? null;
  }

  private validateDateRange(dueAfter?: string, dueBefore?: string) {
    if (dueAfter && dueBefore && new Date(dueAfter) > new Date(dueBefore)) {
      throw new BadRequestException('due_after cannot be greater than due_before');
    }
  }

  private validateDates(reminderAt?: string, dueAt?: string) {
    if (reminderAt && dueAt && new Date(reminderAt) > new Date(dueAt)) {
      throw new BadRequestException('reminder_at cannot be greater than due_at');
    }
  }

  private isValidUuid(value: string | null | undefined) {
    if (!value) {
      return false;
    }

    const normalizedValue = String(value)
      .trim()
      .replace(/[‐-‒–—―]/g, '-');

    const uuidRegex =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

    return uuidRegex.test(normalizedValue);
  }

  private async logTaskActivityForRelatedRecord(params: {
    workspaceId: string;
    task: {
      id: string;
      relatedEntityType: string | null;
      relatedEntityId: string | null;
    };
    actorUserId?: string | null;
    eventType: string;
    eventLabel: string;
    oldValuesJsonb?: Prisma.InputJsonValue | null;
    newValuesJsonb?: Prisma.InputJsonValue | null;
    metaJsonb?: Prisma.InputJsonValue;
  }) {
    try {
      if (params.task.relatedEntityType !== 'record') {
        return;
      }

      if (!this.isValidUuid(params.task.relatedEntityId)) {
        return;
      }

      await this.activityService.logEvent({
        workspaceId: params.workspaceId,
        entityType: 'record',
        entityId: params.task.relatedEntityId as string,
        actorUserId: params.actorUserId ?? null,
        eventType: params.eventType,
        eventLabel: params.eventLabel,
        oldValuesJsonb: params.oldValuesJsonb ?? null,
        newValuesJsonb: params.newValuesJsonb ?? null,
        metaJsonb: params.metaJsonb ?? {},
      });
    } catch (error) {
      console.warn('Task activity logging failed', error);
    }
  }

  private toTaskResponse(task: {
    id: string;
    title: string;
    description: string | null;
    status: string;
    priority: string;
    assigneeUserId: string | null;
    createdByUserId: string | null;
    relatedEntityType: string | null;
    relatedEntityId: string | null;
    dueAt: Date | null;
    completedAt: Date | null;
    reminderAt: Date | null;
    createdAt: Date;
    updatedAt: Date;
  }) {
    return {
      id: task.id,
      title: task.title,
      description: task.description,
      status: task.status,
      priority: task.priority,
      assignee_user_id: task.assigneeUserId,
      created_by_user_id: task.createdByUserId,
      related_entity_type: task.relatedEntityType,
      related_entity_id: task.relatedEntityId,
      due_at: task.dueAt,
      completed_at: task.completedAt,
      reminder_at: task.reminderAt,
      created_at: task.createdAt,
      updated_at: task.updatedAt,
    };
  }
}