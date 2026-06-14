import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import {
  CurrentUserPayload,
} from 'src/common/decorators/current-user.decorator';
import { PrismaService } from 'src/database/prisma.service';
import { SnoozeNotificationDto } from './dto/snooze-notification.dto';

type NotificationTone = 'blue' | 'green' | 'amber' | 'red' | 'slate';

type NotificationRow = {
  id: string;
  workspace_id: string;
  user_id: string;
  unique_key: string | null;
  type: string;
  title: string;
  body: string | null;
  entity_type: string | null;
  entity_id: string | null;
  is_read: boolean;
  read_at: Date | null;
  snoozed_until: Date | null;
  dismissed_at: Date | null;
  meta_jsonb: Prisma.JsonValue | null;
  created_at: Date;
  task_title: string | null;
};

type ReminderCandidate = {
  uniqueKey: string;
  type: string;
  title: string;
  body: string;
  tone: NotificationTone;
  taskId: string;
  taskTitle: string;
  meta: Record<string, unknown>;
};

@Injectable()
export class NotificationsService {
  constructor(private readonly prisma: PrismaService) {}

  async listNotifications(
    workspaceId: string | undefined,
    currentUser: CurrentUserPayload | undefined,
  ) {
    const context = await this.resolveContext(workspaceId, currentUser);

    await this.syncTaskRemindersForUser(context.workspaceId, context.userId);

    const rows = await this.prisma.$queryRaw<NotificationRow[]>(Prisma.sql`
      select
        n.id,
        n.workspace_id,
        n.user_id,
        n.unique_key,
        n.type,
        n.title,
        n.body,
        n.entity_type,
        n.entity_id,
        n.is_read,
        n.read_at,
        n.snoozed_until,
        n.dismissed_at,
        n.meta_jsonb,
        n.created_at,
        t.title as task_title
      from notifications n
      left join tasks t
        on t.id = n.entity_id
       and n.entity_type = 'task'
      where n.workspace_id = ${context.workspaceId}::uuid
        and n.user_id = ${context.userId}::uuid
        and n.dismissed_at is null
        and (
          n.snoozed_until is null
          or n.snoozed_until <= now()
        )
      order by
        n.is_read asc,
        case
          when n.type = 'overdue' then 0
          when n.type = 'high_unassigned' then 1
          when n.type = 'due_today' then 2
          when n.type = 'due_tomorrow' then 3
          when n.type = 'due_this_week' then 4
          else 9
        end asc,
        n.created_at desc
      limit 100
    `);

    return {
      items: rows.map((row: NotificationRow) => this.toNotificationResponse(row)),
    };
  }

  async syncTaskReminders(
    workspaceId: string | undefined,
    currentUser: CurrentUserPayload | undefined,
  ) {
    const context = await this.resolveContext(workspaceId, currentUser);
    const result = await this.syncTaskRemindersForUser(
      context.workspaceId,
      context.userId,
    );

    return result;
  }

  async markRead(
    workspaceId: string | undefined,
    currentUser: CurrentUserPayload | undefined,
    notificationId: string,
  ) {
    const context = await this.resolveContext(workspaceId, currentUser);
    const existing = await this.findOwnedNotification(
      context.workspaceId,
      context.userId,
      notificationId,
    );

    if (!existing) {
      throw new NotFoundException('Notification not found');
    }

    const rows = await this.prisma.$queryRaw<NotificationRow[]>(Prisma.sql`
      update notifications
      set
        is_read = true,
        read_at = coalesce(read_at, now())
      where id = ${notificationId}::uuid
        and workspace_id = ${context.workspaceId}::uuid
        and user_id = ${context.userId}::uuid
      returning
        id,
        workspace_id,
        user_id,
        unique_key,
        type,
        title,
        body,
        entity_type,
        entity_id,
        is_read,
        read_at,
        snoozed_until,
        dismissed_at,
        meta_jsonb,
        created_at,
        null::text as task_title
    `);

    return this.toNotificationResponse(rows[0]);
  }

  async markAllRead(
    workspaceId: string | undefined,
    currentUser: CurrentUserPayload | undefined,
  ) {
    const context = await this.resolveContext(workspaceId, currentUser);

    const updated = await this.prisma.$executeRaw(Prisma.sql`
      update notifications
      set
        is_read = true,
        read_at = coalesce(read_at, now())
      where workspace_id = ${context.workspaceId}::uuid
        and user_id = ${context.userId}::uuid
        and dismissed_at is null
    `);

    return { updated };
  }

  async snooze(
    workspaceId: string | undefined,
    currentUser: CurrentUserPayload | undefined,
    notificationId: string,
    dto: SnoozeNotificationDto,
  ) {
    const context = await this.resolveContext(workspaceId, currentUser);
    const existing = await this.findOwnedNotification(
      context.workspaceId,
      context.userId,
      notificationId,
    );

    if (!existing) {
      throw new NotFoundException('Notification not found');
    }

    const snoozedUntil =
      dto.snoozed_until ??
      dto.snoozedUntil ??
      this.getTomorrowIso();

    const rows = await this.prisma.$queryRaw<NotificationRow[]>(Prisma.sql`
      update notifications
      set
        is_read = true,
        read_at = coalesce(read_at, now()),
        snoozed_until = ${snoozedUntil}::timestamptz
      where id = ${notificationId}::uuid
        and workspace_id = ${context.workspaceId}::uuid
        and user_id = ${context.userId}::uuid
      returning
        id,
        workspace_id,
        user_id,
        unique_key,
        type,
        title,
        body,
        entity_type,
        entity_id,
        is_read,
        read_at,
        snoozed_until,
        dismissed_at,
        meta_jsonb,
        created_at,
        null::text as task_title
    `);

    return this.toNotificationResponse(rows[0]);
  }

  async dismiss(
    workspaceId: string | undefined,
    currentUser: CurrentUserPayload | undefined,
    notificationId: string,
  ) {
    const context = await this.resolveContext(workspaceId, currentUser);
    const existing = await this.findOwnedNotification(
      context.workspaceId,
      context.userId,
      notificationId,
    );

    if (!existing) {
      throw new NotFoundException('Notification not found');
    }

    const rows = await this.prisma.$queryRaw<NotificationRow[]>(Prisma.sql`
      update notifications
      set
        is_read = true,
        read_at = coalesce(read_at, now()),
        dismissed_at = now()
      where id = ${notificationId}::uuid
        and workspace_id = ${context.workspaceId}::uuid
        and user_id = ${context.userId}::uuid
      returning
        id,
        workspace_id,
        user_id,
        unique_key,
        type,
        title,
        body,
        entity_type,
        entity_id,
        is_read,
        read_at,
        snoozed_until,
        dismissed_at,
        meta_jsonb,
        created_at,
        null::text as task_title
    `);

    return this.toNotificationResponse(rows[0]);
  }

  async resetStates(
    workspaceId: string | undefined,
    currentUser: CurrentUserPayload | undefined,
  ) {
    const context = await this.resolveContext(workspaceId, currentUser);

    const updated = await this.prisma.$executeRaw(Prisma.sql`
      update notifications
      set
        is_read = false,
        read_at = null,
        snoozed_until = null,
        dismissed_at = null
      where workspace_id = ${context.workspaceId}::uuid
        and user_id = ${context.userId}::uuid
        and entity_type = 'task'
    `);

    return { updated };
  }

  private async syncTaskRemindersForUser(workspaceId: string, userId: string) {
    const tasks = await this.prisma.task.findMany({
      where: {
        workspaceId,
        archivedAt: null,
        status: {
          notIn: ['completed', 'cancelled', 'done'],
        },
        OR: [
          { assigneeUserId: userId },
          { createdByUserId: userId },
          { assigneeUserId: null },
        ],
      },
      select: {
        id: true,
        title: true,
        status: true,
        priority: true,
        dueAt: true,
        assigneeUserId: true,
        createdByUserId: true,
      },
      orderBy: { updatedAt: 'desc' },
      take: 500,
    });

    const reminders = tasks.flatMap((task: {
      id: string;
      title: string;
      status: string | null;
      priority: string | null;
      dueAt: Date | null;
      assigneeUserId: string | null;
      createdByUserId: string | null;
    }) => this.buildTaskReminderCandidates(task));

    for (const reminder of reminders) {
      await this.upsertTaskReminder(workspaceId, userId, reminder);
    }

    const activeKeys = reminders.map((reminder: ReminderCandidate) => reminder.uniqueKey);

    await this.dismissStaleTaskReminders(workspaceId, userId, activeKeys);

    return {
      generated: reminders.length,
      activeKeys,
    };
  }

  private buildTaskReminderCandidates(task: {
    id: string;
    title: string;
    priority: string | null;
    dueAt: Date | null;
    assigneeUserId: string | null;
  }) {
    const reminders: ReminderCandidate[] = [];
    const priority = (task.priority ?? '').toLowerCase();
    const isHighPriority = priority.includes('high') || priority === 'urgent';

    if (task.dueAt) {
      const bucket = this.getDueBucket(task.dueAt);

      if (bucket === 'overdue') {
        reminders.push({
          uniqueKey: `task:${task.id}:overdue`,
          type: 'overdue',
          title: 'Overdue task',
          body: `Το task “${task.title}” έχει περασμένο due date.`,
          tone: 'red',
          taskId: task.id,
          taskTitle: task.title,
          meta: {
            taskId: task.id,
            kind: 'overdue',
            tone: 'red',
            dueAt: task.dueAt.toISOString(),
          },
        });
      }

      if (bucket === 'today') {
        reminders.push({
          uniqueKey: `task:${task.id}:due_today`,
          type: 'due_today',
          title: 'Due today',
          body: `Το task “${task.title}” λήγει σήμερα.`,
          tone: 'amber',
          taskId: task.id,
          taskTitle: task.title,
          meta: {
            taskId: task.id,
            kind: 'due_today',
            tone: 'amber',
            dueAt: task.dueAt.toISOString(),
          },
        });
      }

      if (bucket === 'tomorrow') {
        reminders.push({
          uniqueKey: `task:${task.id}:due_tomorrow`,
          type: 'due_tomorrow',
          title: 'Due tomorrow',
          body: `Το task “${task.title}” λήγει αύριο.`,
          tone: 'blue',
          taskId: task.id,
          taskTitle: task.title,
          meta: {
            taskId: task.id,
            kind: 'due_tomorrow',
            tone: 'blue',
            dueAt: task.dueAt.toISOString(),
          },
        });
      }

      if (bucket === 'this_week' && isHighPriority) {
        reminders.push({
          uniqueKey: `task:${task.id}:due_this_week`,
          type: 'due_this_week',
          title: 'High priority this week',
          body: `Το high priority task “${task.title}” λήγει αυτή την εβδομάδα.`,
          tone: 'blue',
          taskId: task.id,
          taskTitle: task.title,
          meta: {
            taskId: task.id,
            kind: 'due_this_week',
            tone: 'blue',
            dueAt: task.dueAt.toISOString(),
          },
        });
      }
    }

    if (isHighPriority && !task.assigneeUserId) {
      reminders.push({
        uniqueKey: `task:${task.id}:high_unassigned`,
        type: 'high_unassigned',
        title: 'High priority χωρίς ανάθεση',
        body: `Το task “${task.title}” είναι high priority αλλά δεν έχει assignee.`,
        tone: 'red',
        taskId: task.id,
        taskTitle: task.title,
        meta: {
          taskId: task.id,
          kind: 'high_unassigned',
          tone: 'red',
        },
      });
    }

    return reminders;
  }

  private async upsertTaskReminder(
    workspaceId: string,
    userId: string,
    reminder: ReminderCandidate,
  ) {
    await this.prisma.$executeRaw(Prisma.sql`
      insert into notifications (
        id,
        workspace_id,
        user_id,
        unique_key,
        type,
        title,
        body,
        entity_type,
        entity_id,
        is_read,
        read_at,
        snoozed_until,
        dismissed_at,
        meta_jsonb,
        created_at
      )
      values (
        gen_random_uuid(),
        ${workspaceId}::uuid,
        ${userId}::uuid,
        ${reminder.uniqueKey},
        ${reminder.type},
        ${reminder.title},
        ${reminder.body},
        'task',
        ${reminder.taskId}::uuid,
        false,
        null,
        null,
        null,
        ${JSON.stringify(reminder.meta)}::jsonb,
        now()
      )
      on conflict (workspace_id, user_id, unique_key)
      where unique_key is not null
      do update set
        title = excluded.title,
        body = excluded.body,
        meta_jsonb = excluded.meta_jsonb
    `);
  }

  private async dismissStaleTaskReminders(
    workspaceId: string,
    userId: string,
    activeKeys: string[],
  ) {
    const generatedTypes = [
      'overdue',
      'due_today',
      'due_tomorrow',
      'due_this_week',
      'high_unassigned',
    ];

    await this.prisma.$executeRawUnsafe(
      `
      update notifications
      set
        dismissed_at = now()
      where workspace_id = $1::uuid
        and user_id = $2::uuid
        and entity_type = 'task'
        and type = any($3::text[])
        and unique_key is not null
        and not (unique_key = any($4::text[]))
        and dismissed_at is null
      `,
      workspaceId,
      userId,
      generatedTypes,
      activeKeys,
    );
  }

  private async findOwnedNotification(
    workspaceId: string,
    userId: string,
    notificationId: string,
  ) {
    const rows = await this.prisma.$queryRaw<Array<{ id: string }>>(Prisma.sql`
      select id
      from notifications
      where id = ${notificationId}::uuid
        and workspace_id = ${workspaceId}::uuid
        and user_id = ${userId}::uuid
      limit 1
    `);

    return rows[0] ?? null;
  }

  private async resolveContext(
    workspaceId: string | undefined,
    currentUser: CurrentUserPayload | undefined,
  ) {
    if (!currentUser) {
      throw new ForbiddenException('Authentication required');
    }

    const userId = await this.resolveActorUserDbId(currentUser);

    if (!userId) {
      throw new ForbiddenException('User context is required');
    }

    const resolvedWorkspaceId =
      workspaceId ??
      currentUser.defaultWorkspaceId ??
      (currentUser as any).workspaceId ??
      (currentUser as any).workspace_id ??
      (currentUser.workspaceIds?.length === 1 ? currentUser.workspaceIds[0] : undefined) ??
      (await this.findFirstWorkspaceForUser(userId));

    if (!resolvedWorkspaceId) {
      throw new ForbiddenException('Workspace context is required');
    }

    await this.assertWorkspaceAccess(resolvedWorkspaceId, userId);

    return {
      workspaceId: resolvedWorkspaceId,
      userId,
    };
  }

  private async findFirstWorkspaceForUser(userId: string) {
    const membership = await this.prisma.workspaceUser.findFirst({
      where: {
        userId,
        status: 'active',
        workspace: {
          isActive: true,
        },
      },
      select: {
        workspaceId: true,
      },
      orderBy: {
        createdAt: 'asc',
      },
    });

    return membership?.workspaceId;
  }

  private async assertWorkspaceAccess(workspaceId: string, userId: string) {
    const membership = await this.prisma.workspaceUser.findFirst({
      where: {
        workspaceId,
        userId,
        status: 'active',
        workspace: {
          isActive: true,
        },
      },
      select: {
        id: true,
      },
    });

    if (!membership) {
      throw new ForbiddenException('No access to workspace');
    }
  }

  private async resolveActorUserDbId(
    currentUser: CurrentUserPayload | undefined,
  ) {
    const user = currentUser as any;

    const candidateIds = [
      user?.id,
      user?.userId,
      user?.user_id,
      user?.sub,
    ].filter(Boolean);

    for (const candidateId of candidateIds) {
      const found = await this.prisma.user.findUnique({
        where: { id: candidateId },
        select: { id: true },
      });

      if (found) {
        return found.id;
      }
    }

    const candidateEmails = [
      user?.email,
      user?.username,
      user?.login,
    ].filter(Boolean);

    for (const candidateEmail of candidateEmails) {
      const found = await this.prisma.user.findFirst({
        where: { email: candidateEmail },
        select: { id: true },
      });

      if (found) {
        return found.id;
      }
    }

    return null;
  }

  private getDueBucket(dueAt: Date) {
    const today = this.startOfDay(new Date());
    const dueDay = this.startOfDay(dueAt);
    const diffDays = Math.round(
      (dueDay.getTime() - today.getTime()) / (24 * 60 * 60 * 1000),
    );

    if (diffDays < 0) return 'overdue';
    if (diffDays === 0) return 'today';
    if (diffDays === 1) return 'tomorrow';
    if (diffDays <= 7) return 'this_week';

    return 'later';
  }

  private startOfDay(date: Date) {
    const next = new Date(date);
    next.setHours(0, 0, 0, 0);

    return next;
  }

  private getTomorrowIso() {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);

    return tomorrow.toISOString();
  }

  private toNotificationResponse(row: NotificationRow) {
    const meta =
      row.meta_jsonb && typeof row.meta_jsonb === 'object'
        ? (row.meta_jsonb as Record<string, unknown>)
        : {};

    const tone = typeof meta.tone === 'string' ? meta.tone : this.getToneForType(row.type);
    const taskTitle =
      row.task_title ??
      (typeof meta.taskTitle === 'string' ? meta.taskTitle : undefined) ??
      row.title;

    return {
      id: row.id,
      backendId: row.id,
      uniqueKey: row.unique_key,
      type: row.type,
      kind: row.type,
      title: row.title,
      body: row.body,
      description: row.body ?? '',
      tone,
      entityType: row.entity_type,
      entityId: row.entity_id,
      taskKey: row.entity_id,
      taskTitle,
      isRead: row.is_read,
      readAt: row.read_at?.toISOString() ?? null,
      snoozedUntil: row.snoozed_until?.toISOString() ?? null,
      dismissedAt: row.dismissed_at?.toISOString() ?? null,
      createdAt: row.created_at.toISOString(),
      meta,
    };
  }

  private getToneForType(type: string): NotificationTone {
    if (type === 'overdue' || type === 'high_unassigned') return 'red';
    if (type === 'due_today') return 'amber';
    if (type === 'due_tomorrow' || type === 'due_this_week') return 'blue';

    return 'slate';
  }
}
