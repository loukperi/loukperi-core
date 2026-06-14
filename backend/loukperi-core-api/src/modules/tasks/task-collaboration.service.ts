import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { randomUUID } from 'crypto';
import { createReadStream } from 'fs';
import { mkdir, rm, stat, writeFile } from 'fs/promises';
import { basename, join, normalize, resolve } from 'path';
import { CurrentUserPayload } from 'src/common/decorators/current-user.decorator';
import { PrismaService } from 'src/database/prisma.service';
import { CreateTaskCommentDto } from './dto/create-task-comment.dto';
import { CreateTaskFileDto } from './dto/create-task-file.dto';

type TaskActivityTone = 'blue' | 'green' | 'amber' | 'red' | 'slate';

type UploadFileRule = {
  label: string;
  extensions: string[];
  mimeTypes: string[];
  maxBytes: number;
  previewable?: boolean;
};

const MB = 1024 * 1024;

const TASK_FILE_UPLOAD_RULES: UploadFileRule[] = [
  {
    label: 'PDF',
    extensions: ['pdf'],
    mimeTypes: ['application/pdf'],
    maxBytes: 25 * MB,
    previewable: true,
  },
  {
    label: 'Images',
    extensions: ['jpg', 'jpeg', 'png', 'webp', 'gif'],
    mimeTypes: ['image/jpeg', 'image/png', 'image/webp', 'image/gif'],
    maxBytes: 10 * MB,
    previewable: true,
  },
  {
    label: 'Excel / CSV',
    extensions: ['xls', 'xlsx', 'csv'],
    mimeTypes: [
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'text/csv',
      'application/csv',
    ],
    maxBytes: 25 * MB,
  },
  {
    label: 'Word documents',
    extensions: ['doc', 'docx'],
    mimeTypes: [
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    ],
    maxBytes: 25 * MB,
  },
  {
    label: 'Text',
    extensions: ['txt'],
    mimeTypes: ['text/plain'],
    maxBytes: 5 * MB,
    previewable: true,
  },
];

const TASK_FILE_ALLOWED_EXTENSIONS = TASK_FILE_UPLOAD_RULES.flatMap(
  (rule) => rule.extensions,
);


@Injectable()
export class TaskCollaborationService {
  constructor(private readonly prisma: PrismaService) {}

  async listComments(
    workspaceId: string | undefined,
    currentUser: CurrentUserPayload | undefined,
    taskId: string,
  ) {
    const resolvedWorkspaceId = await this.assertTaskAccess(workspaceId, currentUser, taskId);

    const comments = await this.prisma.taskComment.findMany({
      where: {
        workspaceId: resolvedWorkspaceId,
        taskId,
      },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });

    return comments.map((comment) => this.toCommentResponse(comment));
  }

  async createComment(
    workspaceId: string | undefined,
    currentUser: CurrentUserPayload | undefined,
    taskId: string,
    dto: CreateTaskCommentDto,
  ) {
    const resolvedWorkspaceId = await this.assertTaskAccess(workspaceId, currentUser, taskId);
    const actorUserId = this.resolveActorUserId(currentUser);

    const comment = await this.prisma.taskComment.create({
      data: {
        workspaceId: resolvedWorkspaceId,
        taskId,
        authorUserId: actorUserId,
        body: dto.body.trim(),
      },
    });

    await this.logTaskActivity({
      workspaceId: resolvedWorkspaceId,
      taskId,
      actorUserId,
      action: 'comment_added',
      label: 'Comment added',
      description: 'Προστέθηκε νέο internal note στο task.',
      tone: 'slate',
      newValuesJsonb: {
        commentId: comment.id,
        body: comment.body,
      },
    });

    return this.toCommentResponse(comment);
  }

  async listFiles(
    workspaceId: string | undefined,
    currentUser: CurrentUserPayload | undefined,
    taskId: string,
  ) {
    const resolvedWorkspaceId = await this.assertTaskAccess(workspaceId, currentUser, taskId);

    const files = await this.prisma.taskFile.findMany({
      where: {
        workspaceId: resolvedWorkspaceId,
        taskId,
      },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });

    return files.map((file) => this.toFileResponse(file));
  }

  async createFile(
    workspaceId: string | undefined,
    currentUser: CurrentUserPayload | undefined,
    taskId: string,
    dto: CreateTaskFileDto,
  ) {
    const resolvedWorkspaceId = await this.assertTaskAccess(workspaceId, currentUser, taskId);
    const actorUserId = this.resolveActorUserId(currentUser);

    const file = await this.prisma.taskFile.create({
      data: {
        workspaceId: resolvedWorkspaceId,
        taskId,
        uploadedByUserId: actorUserId,
        fileName: dto.file_name.trim(),
        mimeType: dto.mime_type?.trim() || 'application/octet-stream',
        sizeBytes: BigInt(dto.size_bytes ?? 0),
        storageKey: dto.storage_key?.trim() || null,
      },
    });

    await this.logTaskActivity({
      workspaceId: resolvedWorkspaceId,
      taskId,
      actorUserId,
      action: 'attachment_added',
      label: 'Attachment added',
      description: `Προστέθηκε το αρχείο ${file.fileName}.`,
      tone: 'blue',
      newValuesJsonb: {
        fileId: file.id,
        fileName: file.fileName,
        mimeType: file.mimeType,
        sizeBytes: Number(file.sizeBytes),
      },
    });

    return this.toFileResponse(file);
  }

  async uploadFile(
    workspaceId: string | undefined,
    currentUser: CurrentUserPayload | undefined,
    taskId: string,
    file: {
      originalname?: string;
      mimetype?: string;
      size?: number;
      buffer?: Buffer;
    } | undefined,
  ) {
    if (!file?.buffer || !file.originalname) {
      throw new BadRequestException('File is required');
    }

    const uploadRule = this.validateUploadFile(file);

    const resolvedWorkspaceId = await this.assertTaskAccess(
      workspaceId,
      currentUser,
      taskId,
    );
    const actorUserId = this.resolveActorUserId(currentUser);

    const fileId = randomUUID();
    const safeFileName = this.sanitizeFileName(file.originalname);
    const storageKey = this.buildTaskFileStorageKey(
      resolvedWorkspaceId,
      taskId,
      fileId,
      safeFileName,
    );
    const absolutePath = this.resolveStoragePath(storageKey);

    await mkdir(this.getStorageDirectory(storageKey), { recursive: true });

    try {
      await writeFile(absolutePath, file.buffer);

      const created = await this.prisma.taskFile.create({
        data: {
          id: fileId,
          workspaceId: resolvedWorkspaceId,
          taskId,
          uploadedByUserId: actorUserId,
          fileName: safeFileName,
          mimeType: file.mimetype || this.getMimeTypeFallback(uploadRule),
          sizeBytes: BigInt(file.size ?? file.buffer.length),
          storageKey,
        },
      });

      await this.logTaskActivity({
        workspaceId: resolvedWorkspaceId,
        taskId,
        actorUserId,
        action: 'attachment_uploaded',
        label: 'Attachment uploaded',
        description: `Ανέβηκε το αρχείο ${created.fileName}.`,
        tone: 'blue',
        newValuesJsonb: {
          fileId: created.id,
          fileName: created.fileName,
          mimeType: created.mimeType,
          sizeBytes: Number(created.sizeBytes),
          storageKey: created.storageKey,
          previewable: this.isPreviewableMimeType(created.mimeType),
        },
      });

      return this.toFileResponse(created);
    } catch (error) {
      await rm(absolutePath, { force: true }).catch(() => undefined);
      throw error;
    }
  }

  async downloadFile(
    workspaceId: string | undefined,
    currentUser: CurrentUserPayload | undefined,
    taskId: string,
    fileId: string,
  ) {
    const resolvedWorkspaceId = await this.assertTaskAccess(
      workspaceId,
      currentUser,
      taskId,
    );

    const file = await this.prisma.taskFile.findFirst({
      where: {
        id: fileId,
        workspaceId: resolvedWorkspaceId,
        taskId,
      },
    });

    if (!file || !file.storageKey) {
      throw new NotFoundException('Task file not found');
    }

    const absolutePath = this.resolveStoragePath(file.storageKey);

    try {
      await stat(absolutePath);
    } catch {
      throw new NotFoundException('Stored file not found');
    }

    return {
      stream: createReadStream(absolutePath),
      fileName: file.fileName,
      safeDownloadName: this.sanitizeDownloadFileName(file.fileName),
      mimeType: file.mimeType || 'application/octet-stream',
    };
  }

  async deleteFile(
    workspaceId: string | undefined,
    currentUser: CurrentUserPayload | undefined,
    taskId: string,
    fileId: string,
  ) {
    const resolvedWorkspaceId = await this.assertTaskAccess(workspaceId, currentUser, taskId);
    const actorUserId = this.resolveActorUserId(currentUser);

    const existing = await this.prisma.taskFile.findFirst({
      where: {
        id: fileId,
        workspaceId: resolvedWorkspaceId,
        taskId,
      },
    });

    if (!existing) {
      throw new NotFoundException('Task file not found');
    }

    await this.prisma.taskFile.delete({ where: { id: fileId } });

    if (existing.storageKey) {
      const absolutePath = this.resolveStoragePath(existing.storageKey);
      await rm(absolutePath, { force: true }).catch(() => undefined);
    }

    await this.logTaskActivity({
      workspaceId: resolvedWorkspaceId,
      taskId,
      actorUserId,
      action: 'attachment_removed',
      label: 'Attachment removed',
      description: `Αφαιρέθηκε το αρχείο ${existing.fileName}.`,
      tone: 'red',
      oldValuesJsonb: {
        fileId: existing.id,
        fileName: existing.fileName,
        mimeType: existing.mimeType,
        sizeBytes: Number(existing.sizeBytes),
      },
    });

    return {
      id: fileId,
      deleted: true,
    };
  }

  async listActivity(
    workspaceId: string | undefined,
    currentUser: CurrentUserPayload | undefined,
    taskId: string,
  ) {
    const resolvedWorkspaceId = await this.assertTaskAccess(workspaceId, currentUser, taskId);

    const activity = await this.prisma.taskActivityLog.findMany({
      where: {
        workspaceId: resolvedWorkspaceId,
        taskId,
      },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });

    return activity.map((event) => this.toActivityResponse(event));
  }

  async logTaskActivity(params: {
    workspaceId: string;
    taskId: string;
    actorUserId?: string | null;
    action: string;
    label: string;
    description: string;
    tone?: TaskActivityTone;
    oldValuesJsonb?: Prisma.InputJsonValue | null;
    newValuesJsonb?: Prisma.InputJsonValue | null;
    metaJsonb?: Prisma.InputJsonValue | null;
  }) {
    return this.prisma.taskActivityLog.create({
      data: {
        workspaceId: params.workspaceId,
        taskId: params.taskId,
        actorUserId: params.actorUserId ?? null,
        action: params.action,
        label: params.label,
        description: params.description,
        tone: params.tone ?? 'slate',
        oldValuesJsonb:
          params.oldValuesJsonb === undefined
            ? undefined
            : params.oldValuesJsonb === null
              ? Prisma.DbNull
              : params.oldValuesJsonb,
        newValuesJsonb:
          params.newValuesJsonb === undefined
            ? undefined
            : params.newValuesJsonb === null
              ? Prisma.DbNull
              : params.newValuesJsonb,
        metaJsonb:
          params.metaJsonb === undefined || params.metaJsonb === null
            ? {}
            : params.metaJsonb,
      },
    });
  }

  private async assertTaskAccess(
    workspaceId: string | undefined,
    currentUser: CurrentUserPayload | undefined,
    taskId: string,
  ) {
    const requestedWorkspaceId = workspaceId ?? currentUser?.defaultWorkspaceId;

    const task = await this.prisma.task.findFirst({
      where: requestedWorkspaceId
        ? {
            id: taskId,
            workspaceId: requestedWorkspaceId,
            archivedAt: null,
          }
        : {
            id: taskId,
            archivedAt: null,
          },
      select: {
        id: true,
        workspaceId: true,
      },
    });

    if (!task) {
      throw new NotFoundException('Task not found');
    }

    await this.assertWorkspaceAccess(task.workspaceId, currentUser);

    return task.workspaceId;
  }

  private async assertWorkspaceAccess(
    workspaceId: string,
    currentUser: CurrentUserPayload | undefined,
  ) {
    if (!currentUser) {
      throw new ForbiddenException('No access to workspace');
    }

    const user = currentUser as any;

    const workspaceIds = [
      ...(Array.isArray(user.workspaceIds) ? user.workspaceIds : []),
      user.workspaceId,
      user.workspace_id,
      user.defaultWorkspaceId,
      user.default_workspace_id,
      user.activeWorkspaceId,
      user.active_workspace_id,
    ].filter(Boolean);

    // Fast path: accept if the authenticated payload already points
    // to the task workspace.
    if (workspaceIds.includes(workspaceId)) {
      return;
    }

    const actorUserId = await this.resolveActorUserDbId(currentUser);

    if (!actorUserId) {
      throw new ForbiddenException('No access to workspace');
    }

    // Production path: verify membership from DB.
    const hasMembership = await this.hasWorkspaceMembership(
      workspaceId,
      actorUserId,
    );

    if (!hasMembership) {
      throw new ForbiddenException('No access to workspace');
    }
  }

  private async hasWorkspaceMembership(workspaceId: string, userId: string) {
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

    return Boolean(membership);
  }

  private resolveWorkspaceId(
    workspaceId: string | undefined,
    currentUser: CurrentUserPayload | undefined,
  ) {
    const resolvedWorkspaceId = workspaceId ?? currentUser?.defaultWorkspaceId;

    if (!resolvedWorkspaceId) {
      throw new ForbiddenException('Workspace context is required');
    }

    if (!currentUser) {
      throw new ForbiddenException('No access to workspace');
    }

    const user = currentUser as any;
    const workspaceIds = [
      ...(Array.isArray(user.workspaceIds) ? user.workspaceIds : []),
      user.workspaceId,
      user.workspace_id,
      user.defaultWorkspaceId,
      user.default_workspace_id,
      user.activeWorkspaceId,
      user.active_workspace_id,
    ].filter(Boolean);

    if (!workspaceIds.includes(resolvedWorkspaceId)) {
      throw new ForbiddenException('No access to workspace');
    }

    return resolvedWorkspaceId;
  }

  private resolveActorUserId(currentUser: CurrentUserPayload | undefined) {
    const user = currentUser as any;

    return user?.id ?? user?.userId ?? user?.sub ?? null;
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

  private validateUploadFile(file: {
    originalname?: string;
    mimetype?: string;
    size?: number;
    buffer?: Buffer;
  }) {
    const fileName = file.originalname ?? '';
    const extension = this.getFileExtension(fileName);
    const mimeType = (file.mimetype ?? '').toLowerCase();
    const sizeBytes = file.size ?? file.buffer?.length ?? 0;

    const rule = TASK_FILE_UPLOAD_RULES.find((candidate) => {
      const extensionMatches = extension
        ? candidate.extensions.includes(extension)
        : false;
      const mimeMatches = mimeType
        ? candidate.mimeTypes.includes(mimeType)
        : false;

      return extensionMatches || mimeMatches;
    });

    if (!rule) {
      throw new BadRequestException(
        `Unsupported file type. Allowed: ${TASK_FILE_ALLOWED_EXTENSIONS.join(', ')}.`,
      );
    }

    if (sizeBytes <= 0) {
      throw new BadRequestException('Empty files are not allowed.');
    }

    if (sizeBytes > rule.maxBytes) {
      throw new BadRequestException(
        `${rule.label} files can be up to ${this.formatBytes(rule.maxBytes)}.`,
      );
    }

    return rule;
  }

  private getFileExtension(fileName: string) {
    const cleanName = basename(fileName).toLowerCase();
    const dotIndex = cleanName.lastIndexOf('.');

    if (dotIndex < 0 || dotIndex === cleanName.length - 1) {
      return '';
    }

    return cleanName.slice(dotIndex + 1);
  }

  private getMimeTypeFallback(rule: UploadFileRule) {
    return rule.mimeTypes[0] ?? 'application/octet-stream';
  }

  private isPreviewableMimeType(mimeType: string | null | undefined) {
    const normalizedMimeType = (mimeType ?? '').toLowerCase();

    return TASK_FILE_UPLOAD_RULES.some(
      (rule) =>
        Boolean(rule.previewable) &&
        rule.mimeTypes.includes(normalizedMimeType),
    );
  }

  private formatBytes(bytes: number) {
    if (bytes >= MB) {
      return `${Math.round((bytes / MB) * 10) / 10} MB`;
    }

    return `${bytes} bytes`;
  }

  private getUploadRoot() {
    return resolve(process.env.LOUKPERI_UPLOAD_ROOT ?? join(process.cwd(), 'uploads'));
  }

  private buildTaskFileStorageKey(
    workspaceId: string,
    taskId: string,
    fileId: string,
    fileName: string,
  ) {
    return [
      'tasks',
      workspaceId,
      taskId,
      `${fileId}-${fileName}`,
    ].join('/');
  }

  private getStorageDirectory(storageKey: string) {
    return join(this.getUploadRoot(), ...storageKey.split('/').slice(0, -1));
  }

  private resolveStoragePath(storageKey: string) {
    const uploadRoot = this.getUploadRoot();
    const absolutePath = resolve(uploadRoot, ...storageKey.split('/'));

    if (!absolutePath.startsWith(uploadRoot)) {
      throw new ForbiddenException('Invalid file path');
    }

    return absolutePath;
  }

  private sanitizeFileName(fileName: string) {
    const safeName = basename(fileName)
      .normalize('NFKD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-zA-Z0-9._ -]/g, '_')
      .replace(/\s+/g, '_')
      .replace(/_+/g, '_')
      .slice(0, 180)
      .trim();

    return safeName || `file-${Date.now()}`;
  }

  private sanitizeDownloadFileName(fileName: string) {
    return this.sanitizeFileName(fileName).replace(/"/g, '');
  }

  private toCommentResponse(comment: {
    id: string;
    body: string;
    authorUserId: string | null;
    createdAt: Date;
  }) {
    return {
      id: comment.id,
      body: comment.body,
      author_user_id: comment.authorUserId,
      author: comment.authorUserId ?? 'System',
      created_at: comment.createdAt,
    };
  }

  private toFileResponse(file: {
    id: string;
    fileName: string;
    mimeType: string;
    sizeBytes: bigint;
    storageKey: string | null;
    uploadedByUserId: string | null;
    createdAt: Date;
  }) {
    return {
      id: file.id,
      file_name: file.fileName,
      mime_type: file.mimeType,
      size_bytes: Number(file.sizeBytes),
      storage_key: file.storageKey,
      previewable: this.isPreviewableMimeType(file.mimeType),
      uploaded_by_user_id: file.uploadedByUserId,
      uploaded_by: file.uploadedByUserId ?? 'System',
      uploaded_at: file.createdAt,
      created_at: file.createdAt,
    };
  }

  private toActivityResponse(event: {
    id: string;
    action: string;
    label: string;
    description: string;
    actorUserId: string | null;
    tone: string;
    createdAt: Date;
    oldValuesJsonb: Prisma.JsonValue | null;
    newValuesJsonb: Prisma.JsonValue | null;
    metaJsonb: Prisma.JsonValue;
  }) {
    return {
      id: event.id,
      action: event.action,
      label: event.label,
      description: event.description,
      actor_user_id: event.actorUserId,
      actor: event.actorUserId ?? 'System',
      tone: event.tone,
      old_values_jsonb: event.oldValuesJsonb,
      new_values_jsonb: event.newValuesJsonb,
      meta_jsonb: event.metaJsonb,
      created_at: event.createdAt,
    };
  }
}
