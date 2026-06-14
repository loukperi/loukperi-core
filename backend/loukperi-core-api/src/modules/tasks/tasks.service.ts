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
import { TaskCollaborationService } from './task-collaboration.service';

@Injectable()
export class TasksService {
  constructor(
    private readonly taskRepository: TaskRepository,
    private readonly activityService: ActivityService,
    private readonly taskCollaborationService: TaskCollaborationService,
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

    const taskNotes = this.resolveTaskNotes(dto);

    const created = await this.taskRepository.create({
      workspaceId: resolvedWorkspaceId,
      title: dto.title,

      // Το repository / Prisma model σου δουλεύει ακόμα με description.
      // Το API όμως δέχεται notes και το κάνουμε mapping εδώ.
      description: taskNotes ?? undefined,

      priority: dto.priority,
      assigneeUserId: dto.assignee_user_id ?? null,
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
        notes: created.description,
        status: created.status,
        priority: created.priority,
        assigneeUserId: created.assigneeUserId,
        dueAt: created.dueAt?.toISOString() ?? null,
        reminderAt: created.reminderAt?.toISOString() ?? null,
      } as Prisma.InputJsonValue,
    });

    await this.logTaskActivityForTask({
      workspaceId: resolvedWorkspaceId,
      taskId: created.id,
      actorUserId: this.resolveActorUserId(currentUser),
      action: 'created',
      label: 'Task created',
      description: `Το task δημιουργήθηκε: ${created.title}.`,
      tone: 'blue',
      newValuesJsonb: {
        taskId: created.id,
        title: created.title,
        description: created.description,
        notes: created.description,
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

    const updateData: {
      title?: string;
      description?: string | null;
      status?: UpdateTaskDto['status'];
      priority?: UpdateTaskDto['priority'];
      assigneeUserId?: string | null;
      dueAt?: Date | null;
      reminderAt?: Date | null;
    } = {};

    if (dto.title !== undefined) {
      updateData.title = dto.title;
    }

    if (this.hasTaskNotesInput(dto)) {
      // notes -> description mapping.
      // null σημαίνει καθάρισε τις σημειώσεις.
      updateData.description = this.resolveTaskNotes(dto);
    }

    if (dto.status !== undefined) {
      updateData.status = dto.status;
    }

    if (dto.priority !== undefined) {
      updateData.priority = dto.priority;
    }

    if (dto.assignee_user_id !== undefined) {
      // undefined = μην αλλάξεις ανάθεση
      // null = καθάρισε ανάθεση
      // uuid = ανάθεσε στον χρήστη
      updateData.assigneeUserId = dto.assignee_user_id;
    }

    if (dto.due_at !== undefined) {
      // undefined = μην αλλάξεις due date
      // null = καθάρισε due date
      // ISO string = νέο due date
      updateData.dueAt = dto.due_at ? new Date(dto.due_at) : null;
    }

    if (dto.reminder_at !== undefined) {
      // undefined = μην αλλάξεις reminder
      // null = καθάρισε reminder
      // ISO string = νέο reminder
      updateData.reminderAt = dto.reminder_at ? new Date(dto.reminder_at) : null;
    }

    const updated = await this.taskRepository.update(taskId, updateData);

    const statusChanged =
      dto.status !== undefined && dto.status !== existing.status;
    const assigneeChanged =
      dto.assignee_user_id !== undefined && dto.assignee_user_id !== existing.assigneeUserId;
    const dueDateChanged =
      dto.due_at !== undefined &&
      (dto.due_at ? new Date(dto.due_at).toISOString() : null) !==
        (existing.dueAt?.toISOString() ?? null);

    const taskActivityAction = assigneeChanged
      ? 'assigned'
      : dueDateChanged
        ? 'due_changed'
        : statusChanged
          ? 'updated'
          : 'updated';
    const taskActivityLabel = assigneeChanged
      ? updated.assigneeUserId
        ? 'Task assigned'
        : 'Task unassigned'
      : dueDateChanged
        ? 'Due date changed'
        : statusChanged
          ? 'Task status changed'
          : 'Task updated';

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
        notes: existing.description,
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
        notes: updated.description,
        status: updated.status,
        priority: updated.priority,
        assigneeUserId: updated.assigneeUserId,
        dueAt: updated.dueAt?.toISOString() ?? null,
        reminderAt: updated.reminderAt?.toISOString() ?? null,
      } as Prisma.InputJsonValue,
    });

    await this.logTaskActivityForTask({
      workspaceId: resolvedWorkspaceId,
      taskId: updated.id,
      actorUserId: this.resolveActorUserId(currentUser),
      action: taskActivityAction,
      label: taskActivityLabel,
      description: this.buildTaskActivityDescription(existing, updated),
      tone: assigneeChanged || dueDateChanged ? 'amber' : 'blue',
      oldValuesJsonb: {
        taskId: existing.id,
        title: existing.title,
        description: existing.description,
        notes: existing.description,
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
        notes: updated.description,
        status: updated.status,
        priority: updated.priority,
        assigneeUserId: updated.assigneeUserId,
        dueAt: updated.dueAt?.toISOString() ?? null,
        reminderAt: updated.reminderAt?.toISOString() ?? null,
      } as Prisma.InputJsonValue,
    });

    return this.toTaskResponse(updated);
  }

  async remove(
    workspaceId: string | undefined,
    currentUser: CurrentUserPayload | undefined,
    taskId: string,
  ) {
    const resolvedWorkspaceId = this.resolveWorkspaceId(workspaceId, currentUser);

    const existing = await this.taskRepository.findOne(resolvedWorkspaceId, taskId);

    if (!existing) {
      throw new NotFoundException('Task not found');
    }

    const actorUserIdCandidate = this.resolveActorUserId(currentUser);
    const actorUserId = this.isValidUuid(actorUserIdCandidate)
      ? actorUserIdCandidate
      : null;

    const archived = await this.taskRepository.archive(taskId, actorUserId);

    await this.logTaskActivityForRelatedRecord({
      workspaceId: resolvedWorkspaceId,
      task: archived,
      actorUserId,
      eventType: 'task.archived',
      eventLabel: 'Task archived',
      oldValuesJsonb: {
        taskId: existing.id,
        title: existing.title,
        description: existing.description,
        notes: existing.description,
        status: existing.status,
        priority: existing.priority,
        assigneeUserId: existing.assigneeUserId,
        dueAt: existing.dueAt?.toISOString() ?? null,
        reminderAt: existing.reminderAt?.toISOString() ?? null,
        archivedAt: null,
        archivedByUserId: null,
      } as Prisma.InputJsonValue,
      newValuesJsonb: {
        taskId: archived.id,
        title: archived.title,
        description: archived.description,
        notes: archived.description,
        status: archived.status,
        priority: archived.priority,
        assigneeUserId: archived.assigneeUserId,
        dueAt: archived.dueAt?.toISOString() ?? null,
        reminderAt: archived.reminderAt?.toISOString() ?? null,
        archivedAt: archived.archivedAt?.toISOString() ?? null,
        archivedByUserId: archived.archivedByUserId,
      } as Prisma.InputJsonValue,
      metaJsonb: {
        source: 'api',
        softDelete: true,
      } as Prisma.InputJsonValue,
    });

    await this.logTaskActivityForTask({
      workspaceId: resolvedWorkspaceId,
      taskId: archived.id,
      actorUserId,
      action: 'archived',
      label: 'Task archived',
      description: `Το task αρχειοθετήθηκε: ${archived.title}.`,
      tone: 'red',
      oldValuesJsonb: {
        taskId: existing.id,
        title: existing.title,
        description: existing.description,
        notes: existing.description,
        status: existing.status,
        priority: existing.priority,
        assigneeUserId: existing.assigneeUserId,
        dueAt: existing.dueAt?.toISOString() ?? null,
        reminderAt: existing.reminderAt?.toISOString() ?? null,
        archivedAt: null,
        archivedByUserId: null,
      } as Prisma.InputJsonValue,
      newValuesJsonb: {
        taskId: archived.id,
        title: archived.title,
        description: archived.description,
        notes: archived.description,
        status: archived.status,
        priority: archived.priority,
        assigneeUserId: archived.assigneeUserId,
        dueAt: archived.dueAt?.toISOString() ?? null,
        reminderAt: archived.reminderAt?.toISOString() ?? null,
        archivedAt: archived.archivedAt?.toISOString() ?? null,
        archivedByUserId: archived.archivedByUserId,
      } as Prisma.InputJsonValue,
      metaJsonb: {
        source: 'api',
        softDelete: true,
      } as Prisma.InputJsonValue,
    });

    return {
      ...this.toTaskResponse(archived),
      deleted: false,
      archived: true,
    };
  }

  async restore(
    workspaceId: string | undefined,
    currentUser: CurrentUserPayload | undefined,
    taskId: string,
  ) {
    const resolvedWorkspaceId = this.resolveWorkspaceId(workspaceId, currentUser);

    const existing = await this.taskRepository.findOneIncludingArchived(
      resolvedWorkspaceId,
      taskId,
    );

    if (!existing) {
      throw new NotFoundException('Task not found');
    }

    if (!existing.archivedAt) {
      return {
        ...this.toTaskResponse(existing),
        restored: false,
      };
    }

    const actorUserIdCandidate = this.resolveActorUserId(currentUser);
    const actorUserId = this.isValidUuid(actorUserIdCandidate)
      ? actorUserIdCandidate
      : null;

    const restored = await this.taskRepository.restore(taskId);

    await this.logTaskActivityForRelatedRecord({
      workspaceId: resolvedWorkspaceId,
      task: restored,
      actorUserId,
      eventType: 'task.restored',
      eventLabel: 'Task restored',
      oldValuesJsonb: {
        taskId: existing.id,
        archivedAt: existing.archivedAt?.toISOString() ?? null,
        archivedByUserId: existing.archivedByUserId,
      } as Prisma.InputJsonValue,
      newValuesJsonb: {
        taskId: restored.id,
        archivedAt: null,
        archivedByUserId: null,
      } as Prisma.InputJsonValue,
      metaJsonb: {
        source: 'api',
        restore: true,
      } as Prisma.InputJsonValue,
    });

    await this.logTaskActivityForTask({
      workspaceId: resolvedWorkspaceId,
      taskId: restored.id,
      actorUserId,
      action: 'restored',
      label: 'Task restored',
      description: `Το task επανήλθε από το archive: ${restored.title}.`,
      tone: 'green',
      oldValuesJsonb: {
        taskId: existing.id,
        archivedAt: existing.archivedAt?.toISOString() ?? null,
        archivedByUserId: existing.archivedByUserId,
      } as Prisma.InputJsonValue,
      newValuesJsonb: {
        taskId: restored.id,
        archivedAt: null,
        archivedByUserId: null,
      } as Prisma.InputJsonValue,
      metaJsonb: {
        source: 'api',
        restore: true,
      } as Prisma.InputJsonValue,
    });

    return {
      ...this.toTaskResponse(restored),
      restored: true,
    };
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

    await this.logTaskActivityForTask({
      workspaceId: resolvedWorkspaceId,
      taskId: updated.id,
      actorUserId: this.resolveActorUserId(currentUser),
      action: 'completed',
      label: 'Task completed',
      description: `Το task ολοκληρώθηκε: ${updated.title}.`,
      tone: 'green',
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

    await this.logTaskActivityForTask({
      workspaceId: resolvedWorkspaceId,
      taskId: reopened.id,
      actorUserId: this.resolveActorUserId(currentUser),
      action: 'reopened',
      label: 'Task reopened',
      description: `Το task άνοιξε ξανά: ${reopened.title}.`,
      tone: 'amber',
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

  private validateDates(reminderAt?: string | null, dueAt?: string | null) {
    if (reminderAt && dueAt && new Date(reminderAt) > new Date(dueAt)) {
      throw new BadRequestException('reminder_at cannot be greater than due_at');
    }
  }

  private hasTaskNotesInput(dto: CreateTaskDto | UpdateTaskDto) {
    return dto.notes !== undefined || dto.description !== undefined;
  }

  private resolveTaskNotes(dto: CreateTaskDto | UpdateTaskDto) {
    return dto.notes ?? dto.description ?? null;
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

  private buildTaskActivityDescription(
    before: {
      title: string;
      description: string | null;
      status: string;
      priority: string;
      assigneeUserId: string | null;
      dueAt: Date | null;
    },
    after: {
      title: string;
      description: string | null;
      status: string;
      priority: string;
      assigneeUserId: string | null;
      dueAt: Date | null;
    },
  ) {
    const changes: string[] = [];

    if (before.title !== after.title) changes.push('title');
    if (before.description !== after.description) changes.push('notes');
    if (before.status !== after.status) changes.push(`status: ${before.status} → ${after.status}`);
    if (before.priority !== after.priority) changes.push(`priority: ${before.priority} → ${after.priority}`);
    if (before.assigneeUserId !== after.assigneeUserId) changes.push('assignee');
    if ((before.dueAt?.toISOString() ?? null) !== (after.dueAt?.toISOString() ?? null)) {
      changes.push('due date');
    }

    if (!changes.length) {
      return 'Το task αποθηκεύτηκε χωρίς εμφανείς αλλαγές.';
    }

    return `Αλλαγές: ${changes.join(', ')}.`;
  }

  private async logTaskActivityForTask(params: {
    workspaceId: string;
    taskId: string;
    actorUserId?: string | null;
    action: string;
    label: string;
    description: string;
    tone?: 'blue' | 'green' | 'amber' | 'red' | 'slate';
    oldValuesJsonb?: Prisma.InputJsonValue | null;
    newValuesJsonb?: Prisma.InputJsonValue | null;
    metaJsonb?: Prisma.InputJsonValue | null;
  }) {
    try {
      await this.taskCollaborationService.logTaskActivity(params);
    } catch (error) {
      console.warn('Task audit logging failed', error);
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
    archivedAt?: Date | null;
    archivedByUserId?: string | null;
    createdAt: Date;
    updatedAt: Date;
  }) {
    return {
      id: task.id,
      title: task.title,

      // Κρατάμε description για backwards compatibility.
      description: task.description,

      // Νέο frontend-friendly alias.
      notes: task.description,

      status: task.status,
      priority: task.priority,
      assignee_user_id: task.assigneeUserId,
      created_by_user_id: task.createdByUserId,
      related_entity_type: task.relatedEntityType,
      related_entity_id: task.relatedEntityId,
      due_at: task.dueAt,
      completed_at: task.completedAt,
      reminder_at: task.reminderAt,
      archived_at: task.archivedAt ?? null,
      archived_by_user_id: task.archivedByUserId ?? null,
      is_archived: Boolean(task.archivedAt),
      created_at: task.createdAt,
      updated_at: task.updatedAt,
    };
  }
}
