import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { CurrentUserPayload } from 'src/common/decorators/current-user.decorator';
import { RecordRepository } from 'src/database/repositories/record.repository';
import { ActivityService } from '../activity/activity.service';
import { AssignRecordDto } from './dto/assign-record.dto';
import { AssignTagDto } from './dto/assign-tag.dto';
import { ChangeRecordStatusDto } from './dto/change-record-status.dto';
import { CreateRecordDto } from './dto/create-record.dto';
import { ListRecordsQueryDto } from './dto/list-records.query.dto';
import { UpdateRecordDto } from './dto/update-record.dto';

@Injectable()
export class RecordsService {
  constructor(
    private readonly recordRepository: RecordRepository,
    private readonly activityService: ActivityService,
  ) {}

  async list(
    workspaceId: string | undefined,
    currentUser: CurrentUserPayload | undefined,
    query: ListRecordsQueryDto,
  ) {
    const resolvedWorkspaceId = this.resolveWorkspaceId(workspaceId, currentUser);
    this.validateDateRange(query.due_after, query.due_before);

    const result = await this.recordRepository.listByWorkspace(
      resolvedWorkspaceId,
      query,
    );

    return {
      items: result.items.map((item) => this.toRecordResponse(item)),
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
    dto: CreateRecordDto,
  ) {
    const resolvedWorkspaceId = this.resolveWorkspaceId(workspaceId, currentUser);
    this.validateDates(dto.opened_at, dto.due_at);

    const created = await this.recordRepository.create({
      workspaceId: resolvedWorkspaceId,
      recordTypeId: dto.record_type_id,
      accountId: dto.account_id,
      contactId: dto.contact_id,
      title: dto.title,
      code: dto.code,
      description: dto.description,
      statusId: dto.status_id,
      priority: dto.priority,
      ownerUserId: dto.owner_user_id,
      assigneeUserId: dto.assignee_user_id,
      openedAt: dto.opened_at ? new Date(dto.opened_at) : undefined,
      dueAt: dto.due_at ? new Date(dto.due_at) : undefined,
      sourceSystem: dto.source_system,
      sourceExternalId: dto.source_external_id,
      sourceUrl: dto.source_url,
      dataJson: (dto.data_jsonb ?? {}) as Prisma.InputJsonValue,
    });

    await this.logRecordActivity({
      workspaceId: resolvedWorkspaceId,
      recordId: created.id,
      actorUserId: this.resolveActorUserId(currentUser),
      eventType: 'record.created',
      eventLabel: 'Record created',
      newValuesJsonb: {
        title: created.title,
        priority: created.priority,
        statusId: created.statusId,
        assigneeUserId: created.assigneeUserId,
      } as Prisma.InputJsonValue,
      metaJsonb: {
        source: 'api',
      } as Prisma.InputJsonValue,
    });

    return this.toRecordResponse(created);
  }

  async getOne(
    workspaceId: string | undefined,
    currentUser: CurrentUserPayload | undefined,
    recordId: string,
  ) {
    const resolvedWorkspaceId = this.resolveWorkspaceId(workspaceId, currentUser);
    const record = await this.recordRepository.findOne(
      resolvedWorkspaceId,
      recordId,
    );

    if (!record) {
      throw new NotFoundException('Record not found');
    }

    return this.toRecordResponse(record);
  }

  async update(
    workspaceId: string | undefined,
    currentUser: CurrentUserPayload | undefined,
    recordId: string,
    dto: UpdateRecordDto,
  ) {
    const resolvedWorkspaceId = this.resolveWorkspaceId(workspaceId, currentUser);
    this.validateDates(dto.opened_at, dto.due_at, dto.closed_at);

    const existing = await this.recordRepository.findOne(
      resolvedWorkspaceId,
      recordId,
    );

    if (!existing) {
      throw new NotFoundException('Record not found');
    }

    const updated = await this.recordRepository.update(recordId, {
      recordTypeId: dto.record_type_id,
      accountId: dto.account_id,
      contactId: dto.contact_id,
      title: dto.title,
      code: dto.code,
      description: dto.description,
      statusId: dto.status_id,
      priority: dto.priority,
      ownerUserId: dto.owner_user_id,
      assigneeUserId: dto.assignee_user_id,
      openedAt: dto.opened_at ? new Date(dto.opened_at) : undefined,
      dueAt: dto.due_at ? new Date(dto.due_at) : undefined,
      closedAt: dto.closed_at ? new Date(dto.closed_at) : undefined,
      sourceSystem: dto.source_system,
      sourceExternalId: dto.source_external_id,
      sourceUrl: dto.source_url,
      dataJson: dto.data_jsonb as Prisma.InputJsonValue | undefined,
    });

    await this.logRecordActivity({
      workspaceId: resolvedWorkspaceId,
      recordId: updated.id,
      actorUserId: this.resolveActorUserId(currentUser),
      eventType: 'record.updated',
      eventLabel: 'Record updated',
      oldValuesJsonb: {
        title: existing.title,
        priority: existing.priority,
        statusId: existing.statusId,
        assigneeUserId: existing.assigneeUserId,
      } as Prisma.InputJsonValue,
      newValuesJsonb: {
        title: updated.title,
        priority: updated.priority,
        statusId: updated.statusId,
        assigneeUserId: updated.assigneeUserId,
      } as Prisma.InputJsonValue,
      metaJsonb: {
        source: 'api',
      } as Prisma.InputJsonValue,
    });

    return this.toRecordResponse(updated);
  }

  async changeStatus(
    workspaceId: string | undefined,
    currentUser: CurrentUserPayload | undefined,
    recordId: string,
    dto: ChangeRecordStatusDto,
  ) {
    const resolvedWorkspaceId = this.resolveWorkspaceId(workspaceId, currentUser);

    const existing = await this.recordRepository.findOne(
      resolvedWorkspaceId,
      recordId,
    );

    if (!existing) {
      throw new NotFoundException('Record not found');
    }

    const updated = await this.recordRepository.update(recordId, {
      statusId: dto.status_id,
    });

    await this.logRecordActivity({
      workspaceId: resolvedWorkspaceId,
      recordId: updated.id,
      actorUserId: this.resolveActorUserId(currentUser),
      eventType: 'record.status_changed',
      eventLabel: 'Record status changed',
      oldValuesJsonb: {
        statusId: existing.statusId,
      } as Prisma.InputJsonValue,
      newValuesJsonb: {
        statusId: updated.statusId,
      } as Prisma.InputJsonValue,
      metaJsonb: {
        note: dto.note ?? null,
        source: 'api',
      } as Prisma.InputJsonValue,
    });

    return {
      ...this.toRecordResponse(updated),
      status_note: dto.note ?? null,
    };
  }

  async assign(
    workspaceId: string | undefined,
    currentUser: CurrentUserPayload | undefined,
    recordId: string,
    dto: AssignRecordDto,
  ) {
    const resolvedWorkspaceId = this.resolveWorkspaceId(workspaceId, currentUser);

    const existing = await this.recordRepository.findOne(
      resolvedWorkspaceId,
      recordId,
    );

    if (!existing) {
      throw new NotFoundException('Record not found');
    }

    const updated = await this.recordRepository.update(recordId, {
      assigneeUserId: dto.assignee_user_id,
    });

    await this.logRecordActivity({
      workspaceId: resolvedWorkspaceId,
      recordId: updated.id,
      actorUserId: this.resolveActorUserId(currentUser),
      eventType: 'record.assigned',
      eventLabel: 'Record assigned',
      oldValuesJsonb: {
        assigneeUserId: existing.assigneeUserId,
      } as Prisma.InputJsonValue,
      newValuesJsonb: {
        assigneeUserId: updated.assigneeUserId,
      } as Prisma.InputJsonValue,
      metaJsonb: {
        source: 'api',
      } as Prisma.InputJsonValue,
    });

    return this.toRecordResponse(updated);
  }

  async assignTag(
    workspaceId: string | undefined,
    currentUser: CurrentUserPayload | undefined,
    recordId: string,
    dto: AssignTagDto,
  ) {
    await this.getOne(workspaceId, currentUser, recordId);

    await this.logRecordActivity({
      workspaceId: this.resolveWorkspaceId(workspaceId, currentUser),
      recordId,
      actorUserId: this.resolveActorUserId(currentUser),
      eventType: 'record.tag_assigned',
      eventLabel: 'Record tag assigned',
      newValuesJsonb: {
        tagId: dto.tag_id,
      } as Prisma.InputJsonValue,
      metaJsonb: {
        source: 'api',
      } as Prisma.InputJsonValue,
    });

    return {
      id: recordId,
      assigned_tag_id: dto.tag_id,
    };
  }

  async remove(
    workspaceId: string | undefined,
    currentUser: CurrentUserPayload | undefined,
    recordId: string,
  ) {
    const resolvedWorkspaceId = this.resolveWorkspaceId(workspaceId, currentUser);

    const existing = await this.recordRepository.findOne(
      resolvedWorkspaceId,
      recordId,
    );

    if (!existing) {
      throw new NotFoundException('Record not found');
    }

    const deleted = await this.recordRepository.delete(recordId);

    await this.logRecordActivity({
      workspaceId: resolvedWorkspaceId,
      recordId,
      actorUserId: this.resolveActorUserId(currentUser),
      eventType: 'record.deleted',
      eventLabel: 'Record deleted',
      oldValuesJsonb: {
        title: existing.title,
        code: existing.code,
        priority: existing.priority,
        statusId: existing.statusId,
        assigneeUserId: existing.assigneeUserId,
      } as Prisma.InputJsonValue,
      metaJsonb: {
        source: 'api',
      } as Prisma.InputJsonValue,
    });

    return {
      id: deleted.id,
      deleted: true,
    };
  }

  async removeTag(
    workspaceId: string | undefined,
    currentUser: CurrentUserPayload | undefined,
    recordId: string,
    tagId: string,
  ) {
    await this.getOne(workspaceId, currentUser, recordId);

    await this.logRecordActivity({
      workspaceId: this.resolveWorkspaceId(workspaceId, currentUser),
      recordId,
      actorUserId: this.resolveActorUserId(currentUser),
      eventType: 'record.tag_removed',
      eventLabel: 'Record tag removed',
      oldValuesJsonb: {
        tagId,
      } as Prisma.InputJsonValue,
      metaJsonb: {
        source: 'api',
      } as Prisma.InputJsonValue,
    });

    return {
      id: recordId,
      removed_tag_id: tagId,
    };
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

  private validateDates(openedAt?: string, dueAt?: string, closedAt?: string) {
    if (openedAt && dueAt && new Date(openedAt) > new Date(dueAt)) {
      throw new BadRequestException('opened_at cannot be greater than due_at');
    }

    if (dueAt && closedAt && new Date(dueAt) > new Date(closedAt)) {
      throw new BadRequestException('due_at cannot be greater than closed_at');
    }
  }

  private async logRecordActivity(params: {
    workspaceId: string;
    recordId: string;
    actorUserId?: string | null;
    eventType: string;
    eventLabel: string;
    oldValuesJsonb?: Prisma.InputJsonValue | null;
    newValuesJsonb?: Prisma.InputJsonValue | null;
    metaJsonb?: Prisma.InputJsonValue;
  }) {
    try {
      await this.activityService.logEvent({
        workspaceId: params.workspaceId,
        entityType: 'record',
        entityId: params.recordId,
        actorUserId: params.actorUserId ?? null,
        eventType: params.eventType,
        eventLabel: params.eventLabel,
        oldValuesJsonb: params.oldValuesJsonb ?? null,
        newValuesJsonb: params.newValuesJsonb ?? null,
        metaJsonb: params.metaJsonb ?? {},
      });
    } catch (error) {
      console.warn('Activity logging failed', error);
    }
  }

  private toRecordResponse(record: {
    id: string;
    recordTypeId: string;
    title: string;
    code: string | null;
    description: string | null;
    priority: string;
    openedAt: Date | null;
    dueAt: Date | null;
    closedAt: Date | null;
    sourceSystem: string | null;
    sourceExternalId: string | null;
    sourceUrl: string | null;
    dataJson: unknown;
    createdAt: Date;
    updatedAt: Date;
    recordType?: {
      id: string;
      key: string;
      singularLabel: string;
      pluralLabel: string;
    } | null;
    status?: {
      id: string;
      key: string;
      label: string;
      color: string | null;
    } | null;
    account?: {
      id: string;
      name: string;
    } | null;
    contact?: {
      id: string;
      firstName: string;
      lastName: string;
    } | null;
    ownerUser?: {
      id: string;
      firstName: string;
      lastName: string;
      email: string;
    } | null;
    assigneeUser?: {
      id: string;
      firstName: string;
      lastName: string;
      email: string;
    } | null;
    tagAssignments?: Array<{
      tag: {
        id: string;
        name: string;
        color: string | null;
      };
    }>;
  }) {
    return {
      id: record.id,
      record_type_id: record.recordTypeId,
      record_type: record.recordType
        ? {
            id: record.recordType.id,
            key: record.recordType.key,
            singular_label: record.recordType.singularLabel,
            plural_label: record.recordType.pluralLabel,
          }
        : null,
      title: record.title,
      code: record.code,
      description: record.description,
      status: record.status
        ? {
            id: record.status.id,
            key: record.status.key,
            label: record.status.label,
            color: record.status.color,
          }
        : null,
      priority: record.priority,
      account: record.account
        ? {
            id: record.account.id,
            name: record.account.name,
          }
        : null,
      contact: record.contact
        ? {
            id: record.contact.id,
            full_name: `${record.contact.firstName} ${record.contact.lastName}`,
          }
        : null,
      owner_user: record.ownerUser
        ? {
            id: record.ownerUser.id,
            full_name: `${record.ownerUser.firstName} ${record.ownerUser.lastName}`,
            email: record.ownerUser.email,
          }
        : null,
      assignee_user: record.assigneeUser
        ? {
            id: record.assigneeUser.id,
            full_name: `${record.assigneeUser.firstName} ${record.assigneeUser.lastName}`,
            email: record.assigneeUser.email,
          }
        : null,
      tags: (record.tagAssignments ?? []).map((item) => ({
        id: item.tag.id,
        name: item.tag.name,
        color: item.tag.color,
      })),
      opened_at: record.openedAt?.toISOString() ?? null,
      due_at: record.dueAt?.toISOString() ?? null,
      closed_at: record.closedAt?.toISOString() ?? null,
      source_system: record.sourceSystem,
      source_external_id: record.sourceExternalId,
      source_url: record.sourceUrl,
      data_jsonb: record.dataJson ?? {},
      custom_fields: {},
      created_at: record.createdAt.toISOString(),
      updated_at: record.updatedAt.toISOString(),
    };
  }
}