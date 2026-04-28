import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CurrentUserPayload } from 'src/common/decorators/current-user.decorator';
import { TaskRepository } from 'src/database/repositories/task.repository';
import { CompleteTaskDto } from './dto/complete-task.dto';
import { CreateTaskDto } from './dto/create-task.dto';
import { ListTasksQueryDto } from './dto/list-tasks.query.dto';
import { UpdateTaskDto } from './dto/update-task.dto';

@Injectable()
export class TasksService {
  constructor(private readonly taskRepository: TaskRepository) {}

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
