import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma.service';

type ListTasksQuery = {
  page: number;
  page_size: number;
  scope?: 'my' | 'team' | 'all';
  status?: string;
  priority?: string;
  assignee_user_id?: string;
  related_entity_type?: string;
  related_entity_id?: string;
  due_before?: string;
  due_after?: string;
  actorUserId?: string;
};

type CreateTaskInput = Prisma.TaskUncheckedCreateInput;

@Injectable()
export class TaskRepository {
  constructor(private readonly prisma: PrismaService) {}

  async listByWorkspace(workspaceId: string, query: ListTasksQuery) {
    const where: Prisma.TaskWhereInput = {
      workspaceId,
      archivedAt: null,
      ...(query.scope === 'my' && query.actorUserId
        ? { assigneeUserId: query.actorUserId }
        : {}),
      ...(query.assignee_user_id ? { assigneeUserId: query.assignee_user_id } : {}),
      ...(query.status ? { status: query.status } : {}),
      ...(query.priority ? { priority: query.priority } : {}),
      ...(query.related_entity_type ? { relatedEntityType: query.related_entity_type } : {}),
      ...(query.related_entity_id ? { relatedEntityId: query.related_entity_id } : {}),
      ...(query.due_before || query.due_after
        ? {
            dueAt: {
              ...(query.due_before ? { lte: new Date(query.due_before) } : {}),
              ...(query.due_after ? { gte: new Date(query.due_after) } : {}),
            },
          }
        : {}),
    };

    const [items, total] = await this.prisma.$transaction([
      this.prisma.task.findMany({
        where,
        orderBy: [{ createdAt: 'desc' }],
        skip: (query.page - 1) * query.page_size,
        take: query.page_size,
      }),
      this.prisma.task.count({ where }),
    ]);

    return { items, total };
  }

  create(data: CreateTaskInput) {
    return this.prisma.task.create({ data });
  }

  findOne(workspaceId: string, taskId: string) {
    return this.prisma.task.findFirst({
      where: { workspaceId, id: taskId, archivedAt: null },
    });
  }

  findOneIncludingArchived(workspaceId: string, taskId: string) {
    return this.prisma.task.findFirst({
      where: { workspaceId, id: taskId },
    });
  }

  update(taskId: string, data: Prisma.TaskUncheckedUpdateInput) {
    return this.prisma.task.update({
      where: { id: taskId },
      data,
    });
  }
  
  archive(taskId: string, archivedByUserId: string | null, archivedAt = new Date()) {
    return this.prisma.task.update({
      where: { id: taskId },
      data: {
        archivedAt,
        archivedByUserId,
      },
    });
  }

  restore(taskId: string) {
    return this.prisma.task.update({
      where: { id: taskId },
      data: {
        archivedAt: null,
        archivedByUserId: null,
      },
    });
  }

  /**
   * Hard delete is intentionally kept only for future admin maintenance flows.
   * Normal user delete must call archive() through TasksService.remove().
   */
  delete(taskId: string) {
    return this.prisma.task.delete({
      where: {
        id: taskId,
      },
    });
  }
}
