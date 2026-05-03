import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { CurrentUserPayload } from 'src/common/decorators/current-user.decorator';
import { PrismaService } from 'src/database/prisma.service';
import { ActivityService } from '../activity/activity.service';
import { CreateNoteDto } from './dto/create-note.dto';
import { UpdateNoteDto } from './dto/update-note.dto';

@Injectable()
export class NotesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly activityService: ActivityService,
  ) {}

  async listForRecord(
    workspaceId: string | undefined,
    currentUser: CurrentUserPayload | undefined,
    recordId: string,
  ) {
    const resolvedWorkspaceId = this.resolveWorkspaceId(workspaceId, currentUser);
    this.validateUuid(recordId, 'recordId');

    await this.ensureRecordExists(resolvedWorkspaceId, recordId);

    const notes = await this.prisma.note.findMany({
      where: {
        workspaceId: resolvedWorkspaceId,
        entityType: 'record',
        entityId: recordId,
      },
      orderBy: {
        createdAt: 'desc',
      },
      include: {
        authorUser: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });

    return notes.map((note) => this.toNoteResponse(note));
  }

  async createForRecord(
    workspaceId: string | undefined,
    currentUser: CurrentUserPayload | undefined,
    recordId: string,
    dto: CreateNoteDto,
  ) {
    const resolvedWorkspaceId = this.resolveWorkspaceId(workspaceId, currentUser);
    this.validateUuid(recordId, 'recordId');

    await this.ensureRecordExists(resolvedWorkspaceId, recordId);

    const created = await this.prisma.note.create({
      data: {
        workspaceId: resolvedWorkspaceId,
        recordId,
        entityType: 'record',
        entityId: recordId,
        authorUserId: this.resolveActorUserId(currentUser),
        body: dto.body,
        isInternal: dto.is_internal ?? true,
      },
      include: {
        authorUser: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });

    await this.logNoteActivity({
      workspaceId: resolvedWorkspaceId,
      recordId,
      actorUserId: this.resolveActorUserId(currentUser),
      eventType: 'note.created',
      eventLabel: 'Note created',
      newValuesJsonb: {
        noteId: created.id,
        body: created.body,
        isInternal: created.isInternal,
      } as Prisma.InputJsonValue,
    });

    return this.toNoteResponse(created);
  }

  async update(
    workspaceId: string | undefined,
    currentUser: CurrentUserPayload | undefined,
    noteId: string,
    dto: UpdateNoteDto,
  ) {
    const resolvedWorkspaceId = this.resolveWorkspaceId(workspaceId, currentUser);
    this.validateUuid(noteId, 'noteId');

    if (dto.body === undefined && dto.is_internal === undefined) {
      throw new BadRequestException('At least one field is required');
    }

    const existing = await this.prisma.note.findFirst({
      where: {
        id: noteId,
        workspaceId: resolvedWorkspaceId,
      },
    });

    if (!existing) {
      throw new NotFoundException('Note not found');
    }

    const updated = await this.prisma.note.update({
      where: {
        id: noteId,
      },
      data: {
        body: dto.body,
        isInternal: dto.is_internal,
      },
      include: {
        authorUser: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });

    await this.logNoteActivity({
      workspaceId: resolvedWorkspaceId,
      recordId: existing.entityId,
      actorUserId: this.resolveActorUserId(currentUser),
      eventType: 'note.updated',
      eventLabel: 'Note updated',
      oldValuesJsonb: {
        noteId: existing.id,
        body: existing.body,
        isInternal: existing.isInternal,
      } as Prisma.InputJsonValue,
      newValuesJsonb: {
        noteId: updated.id,
        body: updated.body,
        isInternal: updated.isInternal,
      } as Prisma.InputJsonValue,
    });

    return this.toNoteResponse(updated);
  }

  async remove(
    workspaceId: string | undefined,
    currentUser: CurrentUserPayload | undefined,
    noteId: string,
  ) {
    const resolvedWorkspaceId = this.resolveWorkspaceId(workspaceId, currentUser);
    this.validateUuid(noteId, 'noteId');

    const existing = await this.prisma.note.findFirst({
      where: {
        id: noteId,
        workspaceId: resolvedWorkspaceId,
      },
    });

    if (!existing) {
      throw new NotFoundException('Note not found');
    }

    await this.prisma.note.delete({
      where: {
        id: noteId,
      },
    });

    await this.logNoteActivity({
      workspaceId: resolvedWorkspaceId,
      recordId: existing.entityId,
      actorUserId: this.resolveActorUserId(currentUser),
      eventType: 'note.deleted',
      eventLabel: 'Note deleted',
      oldValuesJsonb: {
        noteId: existing.id,
        body: existing.body,
        isInternal: existing.isInternal,
      } as Prisma.InputJsonValue,
    });

    return {
      id: noteId,
      deleted: true,
    };
  }

  private async ensureRecordExists(workspaceId: string, recordId: string) {
    const record = await this.prisma.record.findFirst({
      where: {
        id: recordId,
        workspaceId,
      },
      select: {
        id: true,
      },
    });

    if (!record) {
      throw new NotFoundException('Record not found');
    }
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

  private validateUuid(value: string, fieldName: string) {
    const uuidRegex =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

    if (!uuidRegex.test(value)) {
      throw new BadRequestException(`${fieldName} must be a valid UUID`);
    }
  }

  private async logNoteActivity(params: {
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
      console.warn('Note activity logging failed', error);
    }
  }

  private toNoteResponse(note: {
    id: string;
    recordId: string | null;
    workspaceId: string;
    entityType: string;
    entityId: string;
    authorUserId: string | null;
    body: string;
    isInternal: boolean;
    createdAt: Date;
    updatedAt: Date;
    authorUser?: {
      id: string;
      email: string;
      firstName: string;
      lastName: string;
    } | null;
  }) {
    return {
      id: note.id,
      record_id: note.recordId,
      workspace_id: note.workspaceId,
      entity_type: note.entityType,
      entity_id: note.entityId,
      author_user_id: note.authorUserId,
      author_user: note.authorUser
        ? {
            id: note.authorUser.id,
            email: note.authorUser.email,
            full_name: `${note.authorUser.firstName} ${note.authorUser.lastName}`,
          }
        : null,
      body: note.body,
      is_internal: note.isInternal,
      created_at: note.createdAt.toISOString(),
      updated_at: note.updatedAt.toISOString(),
    };
  }
}