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
import { CreateFileAttachmentDto } from './dto/create-file-attachment.dto';

@Injectable()
export class FilesService {
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

    const files = await this.prisma.fileAttachment.findMany({
      where: {
        workspaceId: resolvedWorkspaceId,
        entityType: 'record',
        entityId: recordId,
      },
      orderBy: {
        createdAt: 'desc',
      },
      include: {
        uploadedByUser: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });

    return files.map((file) => this.toFileResponse(file));
  }

  async attachToRecord(
    workspaceId: string | undefined,
    currentUser: CurrentUserPayload | undefined,
    recordId: string,
    dto: CreateFileAttachmentDto,
  ) {
    const resolvedWorkspaceId = this.resolveWorkspaceId(workspaceId, currentUser);
    this.validateUuid(recordId, 'recordId');

    await this.ensureRecordExists(resolvedWorkspaceId, recordId);

    const created = await this.prisma.fileAttachment.create({
      data: {
        workspaceId: resolvedWorkspaceId,
        entityType: 'record',
        entityId: recordId,
        uploadedByUserId: this.resolveActorUserId(currentUser),
        fileName: dto.file_name,
        storageKey: dto.storage_key,
        mimeType: dto.mime_type,
        sizeBytes: BigInt(dto.size_bytes),
        version: dto.version ?? 1,
      },
      include: {
        uploadedByUser: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });

    await this.logFileActivity({
      workspaceId: resolvedWorkspaceId,
      recordId,
      actorUserId: this.resolveActorUserId(currentUser),
      eventType: 'file.attached',
      eventLabel: 'File attached',
      newValuesJsonb: {
        fileId: created.id,
        fileName: created.fileName,
        mimeType: created.mimeType,
        sizeBytes: dto.size_bytes,
        version: created.version,
      } as Prisma.InputJsonValue,
    });

    return this.toFileResponse(created);
  }

  async remove(
    workspaceId: string | undefined,
    currentUser: CurrentUserPayload | undefined,
    fileId: string,
  ) {
    const resolvedWorkspaceId = this.resolveWorkspaceId(workspaceId, currentUser);
    this.validateUuid(fileId, 'fileId');

    const existing = await this.prisma.fileAttachment.findFirst({
      where: {
        id: fileId,
        workspaceId: resolvedWorkspaceId,
      },
    });

    if (!existing) {
      throw new NotFoundException('File attachment not found');
    }

    await this.prisma.fileAttachment.delete({
      where: {
        id: fileId,
      },
    });

    await this.logFileActivity({
      workspaceId: resolvedWorkspaceId,
      recordId: existing.entityId,
      actorUserId: this.resolveActorUserId(currentUser),
      eventType: 'file.deleted',
      eventLabel: 'File deleted',
      oldValuesJsonb: {
        fileId: existing.id,
        fileName: existing.fileName,
        mimeType: existing.mimeType,
        sizeBytes: Number(existing.sizeBytes),
        version: existing.version,
      } as Prisma.InputJsonValue,
    });

    return {
      id: fileId,
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

  private async logFileActivity(params: {
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
      console.warn('File activity logging failed', error);
    }
  }

  private toFileResponse(file: {
    id: string;
    workspaceId: string;
    entityType: string;
    entityId: string;
    uploadedByUserId: string | null;
    fileName: string;
    storageKey: string;
    mimeType: string;
    sizeBytes: bigint;
    version: number;
    createdAt: Date;
    updatedAt: Date;
    uploadedByUser?: {
      id: string;
      email: string;
      firstName: string;
      lastName: string;
    } | null;
  }) {
    return {
      id: file.id,
      workspace_id: file.workspaceId,
      entity_type: file.entityType,
      entity_id: file.entityId,
      uploaded_by_user_id: file.uploadedByUserId,
      uploaded_by_user: file.uploadedByUser
        ? {
            id: file.uploadedByUser.id,
            email: file.uploadedByUser.email,
            full_name: `${file.uploadedByUser.firstName} ${file.uploadedByUser.lastName}`,
          }
        : null,
      file_name: file.fileName,
      storage_key: file.storageKey,
      mime_type: file.mimeType,
      size_bytes: Number(file.sizeBytes),
      version: file.version,
      created_at: file.createdAt.toISOString(),
      updated_at: file.updatedAt.toISOString(),
    };
  }
}