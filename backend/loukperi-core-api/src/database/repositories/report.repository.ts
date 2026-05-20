import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma.service';

type ListReportsQuery = {
  page: number;
  page_size: number;
  entity_type?: string;
  report_type?: string;
};

type ReportForRun = {
  id: string;
  entityType: string;
  reportType: string;
  definitionJsonb: Prisma.JsonValue;
};

const reportInclude = {
  createdByUser: true,
} satisfies Prisma.SavedReportInclude;

@Injectable()
export class ReportRepository {
  constructor(private readonly prisma: PrismaService) {}

  async listByWorkspace(workspaceId: string, query: ListReportsQuery) {
    const where: Prisma.SavedReportWhereInput = {
      workspaceId,
      ...(query.entity_type ? { entityType: query.entity_type } : {}),
      ...(query.report_type ? { reportType: query.report_type } : {}),
    };

    const [items, total] = await this.prisma.$transaction([
      this.prisma.savedReport.findMany({
        where,
        include: reportInclude,
        orderBy: [{ createdAt: 'desc' }],
        skip: (query.page - 1) * query.page_size,
        take: query.page_size,
      }),
      this.prisma.savedReport.count({ where }),
    ]);

    return { items, total };
  }

  create(data: Prisma.SavedReportUncheckedCreateInput) {
    return this.prisma.savedReport.create({
      data,
      include: reportInclude,
    });
  }

  findOne(workspaceId: string, reportId: string) {
    return this.prisma.savedReport.findFirst({
      where: {
        workspaceId,
        id: reportId,
      },
      include: reportInclude,
    });
  }

  update(reportId: string, data: Prisma.SavedReportUncheckedUpdateInput) {
    return this.prisma.savedReport.update({
      where: {
        id: reportId,
      },
      data,
      include: reportInclude,
    });
  }

  async runReport(
    workspaceId: string,
    report: ReportForRun,
    parameters: Record<string, unknown> = {},
  ) {
    const definition = this.asObject(report.definitionJsonb);
    const groupBy = this.asString(parameters.group_by) ?? this.asString(definition.group_by);
    const mode = this.asString(parameters.mode) ?? this.asString(definition.mode);

    if (groupBy) {
      return this.runGroupedReport(workspaceId, report.entityType, groupBy, definition, parameters);
    }

    if (mode === 'table' || report.reportType === 'table') {
      return this.runTableReport(workspaceId, report.entityType, definition, parameters);
    }

    switch (report.entityType) {
      case 'record':
        return this.runRecordOverview(workspaceId, definition, parameters);

      case 'task':
        return this.runTaskOverview(workspaceId, definition, parameters);

      case 'account':
        return this.runAccountOverview(workspaceId);

      default:
        return {
          columns: [],
          rows: [],
          totals: {},
          meta: {
            message: `Unsupported entity type: ${report.entityType}`,
          },
        };
    }
  }

  private async runGroupedReport(
    workspaceId: string,
    entityType: string,
    groupBy: string,
    definition: Record<string, unknown>,
    parameters: Record<string, unknown>,
  ) {
    if (entityType === 'record') {
      if (groupBy === 'status') {
        return this.recordsGroupedByStatus(workspaceId, definition, parameters);
      }

      if (groupBy === 'priority') {
        return this.recordsGroupedByPriority(workspaceId, definition, parameters);
      }

      if (groupBy === 'assignee_user') {
        return this.recordsGroupedByAssignee(workspaceId, definition, parameters);
      }
    }

    if (entityType === 'task') {
      if (groupBy === 'status') {
        return this.tasksGroupedByStatus(workspaceId, definition, parameters);
      }

      if (groupBy === 'priority') {
        return this.tasksGroupedByPriority(workspaceId, definition, parameters);
      }

      if (groupBy === 'assignee_user') {
        return this.tasksGroupedByAssignee(workspaceId, definition, parameters);
      }
    }

    return {
      columns: ['group', 'count'],
      rows: [],
      totals: {
        total: 0,
      },
      meta: {
        message: `Unsupported group_by '${groupBy}' for entity_type '${entityType}'`,
      },
    };
  }

  private async runTableReport(
    workspaceId: string,
    entityType: string,
    definition: Record<string, unknown>,
    parameters: Record<string, unknown>,
  ) {
    const limit = this.getLimit(definition, parameters);

    if (entityType === 'record') {
      const records = await this.prisma.record.findMany({
        where: this.buildRecordWhere(workspaceId, definition, parameters),
        orderBy: {
          updatedAt: 'desc',
        },
        take: limit,
        include: {
          status: true,
          account: true,
          assigneeUser: true,
        },
      });

      return {
        columns: [
          'id',
          'code',
          'title',
          'status',
          'priority',
          'account',
          'assignee_user',
          'due_at',
          'updated_at',
        ],
        rows: records.map((record) => ({
          id: record.id,
          code: record.code,
          title: record.title,
          status: record.status?.label ?? null,
          priority: record.priority,
          account: record.account?.name ?? null,
          assignee_user: record.assigneeUser
            ? `${record.assigneeUser.firstName} ${record.assigneeUser.lastName}`
            : null,
          due_at: record.dueAt,
          updated_at: record.updatedAt,
        })),
        totals: {
          count: records.length,
        },
      };
    }

    if (entityType === 'task') {
      const tasks = await this.prisma.task.findMany({
        where: this.buildTaskWhere(workspaceId, definition, parameters),
        orderBy: {
          updatedAt: 'desc',
        },
        take: limit,
        include: {
          assigneeUser: true,
        },
      });

      return {
        columns: [
          'id',
          'title',
          'status',
          'priority',
          'assignee_user',
          'due_at',
          'updated_at',
        ],
        rows: tasks.map((task) => ({
          id: task.id,
          title: task.title,
          status: task.status,
          priority: task.priority,
          assignee_user: task.assigneeUser
            ? `${task.assigneeUser.firstName} ${task.assigneeUser.lastName}`
            : null,
          due_at: task.dueAt,
          updated_at: task.updatedAt,
        })),
        totals: {
          count: tasks.length,
        },
      };
    }

    return {
      columns: [],
      rows: [],
      totals: {},
      meta: {
        message: `Table mode not supported for entity_type '${entityType}'`,
      },
    };
  }

    private async runRecordOverview(
    workspaceId: string,
    definition: Record<string, unknown>,
    parameters: Record<string, unknown>,
  ) {
    const where = this.buildRecordWhere(workspaceId, definition, parameters);

    const [total, open] = await this.prisma.$transaction([
      this.prisma.record.count({ where }),
      this.prisma.record.count({
        where: {
          ...where,
          OR: [{ closedAt: null }, { status: { isTerminal: false } }],
        },
      }),
    ]);

    const byStatus = await this.prisma.record.groupBy({
      by: ['statusId'],
      where,
      _count: {
        _all: true,
      },
      orderBy: {
        statusId: 'asc',
      },
    });

    const byPriority = await this.prisma.record.groupBy({
      by: ['priority'],
      where,
      _count: {
        _all: true,
      },
      orderBy: {
        priority: 'asc',
      },
    });

    const statusRows = await this.mapRecordStatusGroups(workspaceId, byStatus);

    return {
      columns: ['metric', 'value'],
      rows: [
        { metric: 'total_records', value: total },
        { metric: 'open_records', value: open },
      ],
      totals: {
        total_records: total,
        open_records: open,
        by_status: statusRows,
        by_priority: byPriority.map((item) => ({
          priority: item.priority,
          count: this.getGroupCount(item),
        })),
      },
    };
  }

    private async runTaskOverview(
    workspaceId: string,
    definition: Record<string, unknown>,
    parameters: Record<string, unknown>,
  ) {
    const where = this.buildTaskWhere(workspaceId, definition, parameters);

    const total = await this.prisma.task.count({ where });

    const byStatus = await this.prisma.task.groupBy({
      by: ['status'],
      where,
      _count: {
        _all: true,
      },
      orderBy: {
        status: 'asc',
      },
    });

    const byPriority = await this.prisma.task.groupBy({
      by: ['priority'],
      where,
      _count: {
        _all: true,
      },
      orderBy: {
        priority: 'asc',
      },
    });

    const overdue = await this.prisma.task.count({
      where: {
        ...where,
        completedAt: null,
        dueAt: {
          lt: new Date(),
        },
        status: {
          notIn: ['completed', 'done', 'cancelled'],
        },
      },
    });

    return {
      columns: ['metric', 'value'],
      rows: [
        { metric: 'total_tasks', value: total },
        { metric: 'overdue_tasks', value: overdue },
      ],
      totals: {
        total_tasks: total,
        overdue_tasks: overdue,
        by_status: byStatus.map((item) => ({
          status: item.status,
          count: this.getGroupCount(item),
        })),
        by_priority: byPriority.map((item) => ({
          priority: item.priority,
          count: this.getGroupCount(item),
        })),
      },
    };
  }

  private async runAccountOverview(workspaceId: string) {
    const grouped = await this.prisma.account.groupBy({
      by: ['accountType'],
      where: {
        workspaceId,
      },
      _count: {
        _all: true,
      },
    });

    const total = grouped.reduce((sum, item) => sum + this.getGroupCount(item), 0);

    return {
      columns: ['metric', 'value'],
      rows: [{ metric: 'total_accounts', value: total }],
      totals: {
        total_accounts: total,
        by_type: grouped.map((item) => ({
          account_type: item.accountType ?? 'unknown',
          count: this.getGroupCount(item),
        })),
      },
    };
  }

  private async recordsGroupedByStatus(
    workspaceId: string,
    definition: Record<string, unknown>,
    parameters: Record<string, unknown>,
  ) {
    const grouped = await this.prisma.record.groupBy({
      by: ['statusId'],
      where: this.buildRecordWhere(workspaceId, definition, parameters),
      _count: {
        _all: true,
      },
    });

    const rows = await this.mapRecordStatusGroups(workspaceId, grouped);

    return {
      columns: ['status_id', 'status_key', 'status_label', 'count'],
      rows,
      totals: {
        total: rows.reduce((sum, item) => sum + item.count, 0),
      },
    };
  }

  private async recordsGroupedByPriority(
    workspaceId: string,
    definition: Record<string, unknown>,
    parameters: Record<string, unknown>,
  ) {
    const grouped = await this.prisma.record.groupBy({
      by: ['priority'],
      where: this.buildRecordWhere(workspaceId, definition, parameters),
      _count: {
        _all: true,
      },
    });

    const rows = grouped
      .map((item) => ({
        priority: item.priority,
        count: this.getGroupCount(item),
      }))
      .sort((a, b) => b.count - a.count);

    return {
      columns: ['priority', 'count'],
      rows,
      totals: {
        total: rows.reduce((sum, item) => sum + item.count, 0),
      },
    };
  }

  private async recordsGroupedByAssignee(
    workspaceId: string,
    definition: Record<string, unknown>,
    parameters: Record<string, unknown>,
  ) {
    const grouped = await this.prisma.record.groupBy({
      by: ['assigneeUserId'],
      where: this.buildRecordWhere(workspaceId, definition, parameters),
      _count: {
        _all: true,
      },
    });

    const userIds = grouped
      .map((item) => item.assigneeUserId)
      .filter((id): id is string => Boolean(id));

    const users = await this.prisma.user.findMany({
      where: {
        id: {
          in: userIds,
        },
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
      },
    });

    const userMap = new Map(users.map((user) => [user.id, user]));

    const rows = grouped
      .map((item) => {
        const user = item.assigneeUserId
          ? userMap.get(item.assigneeUserId)
          : null;

        return {
          assignee_user_id: item.assigneeUserId,
          assignee_user: user
            ? `${user.firstName} ${user.lastName}`
            : 'Unassigned',
          email: user?.email ?? null,
          count: this.getGroupCount(item),
        };
      })
      .sort((a, b) => b.count - a.count);

    return {
      columns: ['assignee_user_id', 'assignee_user', 'email', 'count'],
      rows,
      totals: {
        total: rows.reduce((sum, item) => sum + item.count, 0),
      },
    };
  }

  private async tasksGroupedByStatus(
    workspaceId: string,
    definition: Record<string, unknown>,
    parameters: Record<string, unknown>,
  ) {
    const grouped = await this.prisma.task.groupBy({
      by: ['status'],
      where: this.buildTaskWhere(workspaceId, definition, parameters),
      _count: {
        _all: true,
      },
    });

    const rows = grouped
      .map((item) => ({
        status: item.status,
        count: this.getGroupCount(item),
      }))
      .sort((a, b) => b.count - a.count);

    return {
      columns: ['status', 'count'],
      rows,
      totals: {
        total: rows.reduce((sum, item) => sum + item.count, 0),
      },
    };
  }

  private async tasksGroupedByPriority(
    workspaceId: string,
    definition: Record<string, unknown>,
    parameters: Record<string, unknown>,
  ) {
    const grouped = await this.prisma.task.groupBy({
      by: ['priority'],
      where: this.buildTaskWhere(workspaceId, definition, parameters),
      _count: {
        _all: true,
      },
    });

    const rows = grouped
      .map((item) => ({
        priority: item.priority,
        count: this.getGroupCount(item),
      }))
      .sort((a, b) => b.count - a.count);

    return {
      columns: ['priority', 'count'],
      rows,
      totals: {
        total: rows.reduce((sum, item) => sum + item.count, 0),
      },
    };
  }

  private async tasksGroupedByAssignee(
    workspaceId: string,
    definition: Record<string, unknown>,
    parameters: Record<string, unknown>,
  ) {
    const grouped = await this.prisma.task.groupBy({
      by: ['assigneeUserId'],
      where: this.buildTaskWhere(workspaceId, definition, parameters),
      _count: {
        _all: true,
      },
    });

    const userIds = grouped
      .map((item) => item.assigneeUserId)
      .filter((id): id is string => Boolean(id));

    const users = await this.prisma.user.findMany({
      where: {
        id: {
          in: userIds,
        },
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
      },
    });

    const userMap = new Map(users.map((user) => [user.id, user]));

    const rows = grouped
      .map((item) => {
        const user = item.assigneeUserId
          ? userMap.get(item.assigneeUserId)
          : null;

        return {
          assignee_user_id: item.assigneeUserId,
          assignee_user: user
            ? `${user.firstName} ${user.lastName}`
            : 'Unassigned',
          email: user?.email ?? null,
          count: this.getGroupCount(item),
        };
      })
      .sort((a, b) => b.count - a.count);

    return {
      columns: ['assignee_user_id', 'assignee_user', 'email', 'count'],
      rows,
      totals: {
        total: rows.reduce((sum, item) => sum + item.count, 0),
      },
    };
  }

  private async mapRecordStatusGroups(
    workspaceId: string,
    grouped: Array<{
      statusId: string | null;
      _count?: true | { _all?: number; id?: number; statusId?: number };
    }>,
  ) {
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

    return grouped
      .map((item) => {
        const status = item.statusId ? statusMap.get(item.statusId) : null;

        return {
          status_id: item.statusId,
          status_key: status?.key ?? null,
          status_label: status?.label ?? 'Unknown',
          color: status?.color ?? null,
          count: this.getGroupCount(item),
        };
      })
      .sort((a, b) => b.count - a.count);
  }

  private buildRecordWhere(
    workspaceId: string,
    definition: Record<string, unknown>,
    parameters: Record<string, unknown>,
  ): Prisma.RecordWhereInput {
    const filters = this.getFilters(definition, parameters);

    const where: Prisma.RecordWhereInput = {
      workspaceId,
    };

    const statusId = this.asString(filters.status_id ?? filters.statusId);
    const priority = this.asStringArray(filters.priority);
    const assigneeUserId = this.asString(
      filters.assignee_user_id ?? filters.assigneeUserId,
    );

    if (statusId) {
      where.statusId = statusId;
    }

    if (priority.length) {
      where.priority = {
        in: priority,
      };
    }

    if (assigneeUserId) {
      where.assigneeUserId = assigneeUserId;
    }

    return where;
  }

  private buildTaskWhere(
    workspaceId: string,
    definition: Record<string, unknown>,
    parameters: Record<string, unknown>,
  ): Prisma.TaskWhereInput {
    const filters = this.getFilters(definition, parameters);

    const where: Prisma.TaskWhereInput = {
      workspaceId,
    };

    const status = this.asStringArray(filters.status);
    const priority = this.asStringArray(filters.priority);
    const assigneeUserId = this.asString(
      filters.assignee_user_id ?? filters.assigneeUserId,
    );

    if (status.length) {
      where.status = {
        in: status,
      };
    }

    if (priority.length) {
      where.priority = {
        in: priority,
      };
    }

    if (assigneeUserId) {
      where.assigneeUserId = assigneeUserId;
    }

    return where;
  }

  private getFilters(
    definition: Record<string, unknown>,
    parameters: Record<string, unknown>,
  ) {
    return {
      ...this.asObject(definition.filters),
      ...this.asObject(parameters.filters),
    };
  }

  private getLimit(
    definition: Record<string, unknown>,
    parameters: Record<string, unknown>,
  ) {
    const rawLimit = Number(parameters.limit ?? definition.limit ?? 50);

    if (!Number.isFinite(rawLimit)) {
      return 50;
    }

    return Math.max(1, Math.min(rawLimit, 500));
  }

  private getGroupCount(item: {
    _count?: true | Record<string, number | undefined>;
  }): number {
    if (!item._count || item._count === true) {
      return 0;
    }

    const values = Object.values(item._count);
    const firstNumber = values.find(
      (value): value is number => typeof value === 'number',
    );

    return item._count._all ?? item._count.id ?? firstNumber ?? 0;
  }

  private asObject(value: unknown): Record<string, unknown> {
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      return value as Record<string, unknown>;
    }

    return {};
  }

  private asString(value: unknown) {
    if (typeof value === 'string' && value.trim()) {
      return value.trim();
    }

    return undefined;
  }

  private asStringArray(value: unknown) {
    if (Array.isArray(value)) {
      return value.filter((item): item is string => typeof item === 'string');
    }

    if (typeof value === 'string' && value.trim()) {
      return [value.trim()];
    }

    return [];
  }
}