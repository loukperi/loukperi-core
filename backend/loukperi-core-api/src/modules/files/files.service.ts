import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { randomUUID } from 'crypto';
import { mkdir, stat, unlink, writeFile } from 'fs/promises';
import { basename, extname, isAbsolute, join, relative, resolve } from 'path';
import { CurrentUserPayload } from 'src/common/decorators/current-user.decorator';
import { PrismaService } from 'src/database/prisma.service';
import { ActivityService } from '../activity/activity.service';
import { CreateFileAttachmentDto } from './dto/create-file-attachment.dto';

@Injectable()
export class FilesService {
  private readonly uploadRoot = join(process.cwd(), 'uploads');

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

  async uploadToRecord(
    workspaceId: string | undefined,
    currentUser: CurrentUserPayload | undefined,
    recordId: string,
    file: Express.Multer.File | undefined,
  ) {
    const resolvedWorkspaceId = this.resolveWorkspaceId(workspaceId, currentUser);
    this.validateUuid(recordId, 'recordId');

    if (!file) {
      throw new BadRequestException('File is required');
    }

    if (!file.originalname) {
      throw new BadRequestException('Original file name is required');
    }

    if (!file.buffer || file.buffer.length === 0) {
      throw new BadRequestException('Uploaded file is empty');
    }

    await this.ensureRecordExists(resolvedWorkspaceId, recordId);

    const normalizedOriginalName = this.normalizeUploadedFileName(file.originalname);
    const safeOriginalName = this.sanitizeFileName(normalizedOriginalName);
    const extension = extname(safeOriginalName);
    const storedFileName = `${randomUUID()}${extension}`;

    const storageDir = join(
      this.uploadRoot,
      'workspaces',
      resolvedWorkspaceId,
      'records',
      recordId,
    );

    await mkdir(storageDir, { recursive: true });

    const absolutePath = join(storageDir, storedFileName);

    await writeFile(absolutePath, file.buffer);

    const storageKey = [
      'workspaces',
      resolvedWorkspaceId,
      'records',
      recordId,
      storedFileName,
    ].join('/');

    const created = await this.prisma.fileAttachment.create({
      data: {
        workspaceId: resolvedWorkspaceId,
        entityType: 'record',
        entityId: recordId,
        uploadedByUserId: this.resolveActorUserId(currentUser),
        fileName: safeOriginalName,
        storageKey,
        mimeType: file.mimetype || 'application/octet-stream',
        sizeBytes: BigInt(file.size),
        version: 1,
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
      eventType: 'file.uploaded',
      eventLabel: 'File uploaded',
      newValuesJsonb: {
        fileId: created.id,
        fileName: created.fileName,
        storageKey: created.storageKey,
        mimeType: created.mimeType,
        sizeBytes: Number(created.sizeBytes),
        version: created.version,
      } as Prisma.InputJsonValue,
    });

    return this.toFileResponse(created);
  }

  async getDownloadInfo(
    workspaceId: string | undefined,
    currentUser: CurrentUserPayload | undefined,
    fileId: string,
  ) {
    const resolvedWorkspaceId = this.resolveWorkspaceId(workspaceId, currentUser);
    this.validateUuid(fileId, 'fileId');

    const file = await this.prisma.fileAttachment.findFirst({
      where: {
        id: fileId,
        workspaceId: resolvedWorkspaceId,
      },
    });

    if (!file) {
      throw new NotFoundException('File attachment not found');
    }

    const absolutePath = this.resolvePhysicalPath(file.storageKey);

    try {
      await stat(absolutePath);
    } catch {
      throw new NotFoundException('Physical file not found');
    }

    return {
      absolutePath,
      fileName: file.fileName,
      mimeType: file.mimeType,
    };
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

    const physicalFileDeleted = await this.tryDeletePhysicalFile(
      existing.storageKey,
    );

    await this.logFileActivity({
      workspaceId: resolvedWorkspaceId,
      recordId: existing.entityId,
      actorUserId: this.resolveActorUserId(currentUser),
      eventType: 'file.deleted',
      eventLabel: 'File deleted',
      oldValuesJsonb: {
        fileId: existing.id,
        fileName: existing.fileName,
        storageKey: existing.storageKey,
        mimeType: existing.mimeType,
        sizeBytes: Number(existing.sizeBytes),
        version: existing.version,
        physicalFileDeleted,
      } as Prisma.InputJsonValue,
    });

    return {
      id: fileId,
      deleted: true,
      physical_file_deleted: physicalFileDeleted,
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
    const normalizedValue = String(value ?? '')
      .trim()
      .replace(/[‐-‒–—―]/g, '-');

    const uuidRegex =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

    if (!uuidRegex.test(normalizedValue)) {
      throw new BadRequestException(`${fieldName} must be a valid UUID`);
    }
  }

  private normalizeUploadedFileName(fileName: string) {
    const value = String(fileName ?? '').trim();

    if (!value) {
      return 'file';
    }

    const looksMojibake = /(?:Ã|Â|Î|Ï|Ð|Ñ|â)/.test(value);
    const decodedAsUtf8 = Buffer.from(value, 'latin1').toString('utf8');
    const decodedLooksValid = decodedAsUtf8 && !decodedAsUtf8.includes('�');

    if (looksMojibake && decodedLooksValid) {
      return decodedAsUtf8;
    }

    return value;
  }
  
  private sanitizeFileName(fileName: string) {
    const baseName = basename(fileName);

    return baseName
      .replace(/[<>:"/\\|?*\x00-\x1F]/g, '_')
      .replace(/\s+/g, ' ')
      .trim();
  }

  private resolvePhysicalPath(storageKey: string) {
    const normalizedStorageKey = String(storageKey ?? '')
      .trim()
      .replace(/\\/g, '/');

    if (!normalizedStorageKey) {
      throw new BadRequestException('Storage key is required');
    }

    const absolutePath = resolve(
      this.uploadRoot,
      ...normalizedStorageKey.split('/').filter(Boolean),
    );

    const relativePath = relative(this.uploadRoot, absolutePath);

    if (
      relativePath === '' ||
      relativePath.startsWith('..') ||
      isAbsolute(relativePath)
    ) {
      throw new BadRequestException('Invalid storage key');
    }

    return absolutePath;
  }

  private async tryDeletePhysicalFile(storageKey: string) {
    try {
      const absolutePath = this.resolvePhysicalPath(storageKey);
      await unlink(absolutePath);

      return true;
    } catch (error) {
      const nodeError = error as NodeJS.ErrnoException;

      if (nodeError?.code === 'ENOENT') {
        return false;
      }

      if (error instanceof BadRequestException) {
        return false;
      }

      console.warn('Physical file delete failed', error);

      return false;
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