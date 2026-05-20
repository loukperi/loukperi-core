import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { CurrentUserPayload } from 'src/common/decorators/current-user.decorator';
import { PrismaService } from 'src/database/prisma.service';
import { CreateSavedViewDto } from './dto/create-saved-view.dto';
import { ListSavedViewsQueryDto } from './dto/list-saved-views.query.dto';
import { UpdateSavedViewDto } from './dto/update-saved-view.dto';

@Injectable()
export class SavedViewsService {
  constructor(private readonly prisma: PrismaService) {}

  async list(
    workspaceId: string | undefined,
    currentUser: CurrentUserPayload | undefined,
    query: ListSavedViewsQueryDto,
  ) {
    const resolvedWorkspaceId = this.resolveWorkspaceId(workspaceId, currentUser);
    const actorUserId = this.resolveActorUserId(currentUser);

    const where: Prisma.SavedViewWhereInput = {
      workspaceId: resolvedWorkspaceId,
      ...(query.entity_type ? { entityType: query.entity_type } : {}),
      ...(query.visibility ? { visibility: query.visibility } : {}),
      OR: [
        {
          createdByUserId: actorUserId,
        },
        {
          visibility: {
            in: ['workspace', 'public'],
          },
        },
      ],
    };

    const views = await this.prisma.savedView.findMany({
      where,
      orderBy: [{ isDefault: 'desc' }, { name: 'asc' }],
      include: {
        createdByUser: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });

    return views.map((view) => this.toSavedViewResponse(view));
  }

  async getOne(
    workspaceId: string | undefined,
    currentUser: CurrentUserPayload | undefined,
    viewId: string,
  ) {
    const resolvedWorkspaceId = this.resolveWorkspaceId(workspaceId, currentUser);
    const actorUserId = this.resolveActorUserId(currentUser);
    this.validateUuid(viewId, 'viewId');

    const view = await this.prisma.savedView.findFirst({
      where: {
        id: viewId,
        workspaceId: resolvedWorkspaceId,
      },
      include: {
        createdByUser: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });

    if (!view) {
      throw new NotFoundException('Saved view not found');
    }

    this.assertCanReadView(view, actorUserId);

    return this.toSavedViewResponse(view);
  }

  async create(
    workspaceId: string | undefined,
    currentUser: CurrentUserPayload | undefined,
    dto: CreateSavedViewDto,
  ) {
    const resolvedWorkspaceId = this.resolveWorkspaceId(workspaceId, currentUser);
    const actorUserId = this.resolveActorUserId(currentUser);
    const visibility = dto.visibility ?? 'private';
    const isDefault = dto.is_default ?? false;

    if (isDefault) {
      await this.clearDefaultViews({
        workspaceId: resolvedWorkspaceId,
        entityType: dto.entity_type,
        visibility,
        createdByUserId: visibility === 'private' ? actorUserId : null,
      });
    }

    const created = await this.prisma.savedView.create({
      data: {
        workspaceId: resolvedWorkspaceId,
        entityType: dto.entity_type,
        name: dto.name,
        visibility,
        isDefault,
        createdByUserId: actorUserId,
        filtersJsonb: (dto.filters_jsonb ?? {}) as Prisma.InputJsonValue,
        columnsJsonb: (dto.columns_jsonb ?? []) as Prisma.InputJsonValue,
        sortingJsonb: (dto.sorting_jsonb ?? {}) as Prisma.InputJsonValue,
      },
      include: {
        createdByUser: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });

    return this.toSavedViewResponse(created);
  }

  async update(
    workspaceId: string | undefined,
    currentUser: CurrentUserPayload | undefined,
    viewId: string,
    dto: UpdateSavedViewDto,
  ) {
    const resolvedWorkspaceId = this.resolveWorkspaceId(workspaceId, currentUser);
    const actorUserId = this.resolveActorUserId(currentUser);
    this.validateUuid(viewId, 'viewId');

    const existing = await this.prisma.savedView.findFirst({
      where: {
        id: viewId,
        workspaceId: resolvedWorkspaceId,
      },
    });

    if (!existing) {
      throw new NotFoundException('Saved view not found');
    }

    this.assertCanModifyView(existing, actorUserId);

    const nextVisibility = dto.visibility ?? existing.visibility;
    const nextIsDefault = dto.is_default ?? existing.isDefault;

    if (nextIsDefault) {
      await this.clearDefaultViews({
        workspaceId: resolvedWorkspaceId,
        entityType: existing.entityType,
        visibility: nextVisibility,
        createdByUserId: nextVisibility === 'private' ? actorUserId : null,
        exceptViewId: viewId,
      });
    }

    const updated = await this.prisma.savedView.update({
      where: {
        id: viewId,
      },
      data: {
        name: dto.name,
        visibility: dto.visibility,
        isDefault: dto.is_default,
        filtersJsonb: dto.filters_jsonb as Prisma.InputJsonValue | undefined,
        columnsJsonb: dto.columns_jsonb as Prisma.InputJsonValue | undefined,
        sortingJsonb: dto.sorting_jsonb as Prisma.InputJsonValue | undefined,
      },
      include: {
        createdByUser: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });

    return this.toSavedViewResponse(updated);
  }

  async remove(
    workspaceId: string | undefined,
    currentUser: CurrentUserPayload | undefined,
    viewId: string,
  ) {
    const resolvedWorkspaceId = this.resolveWorkspaceId(workspaceId, currentUser);
    const actorUserId = this.resolveActorUserId(currentUser);
    this.validateUuid(viewId, 'viewId');

    const existing = await this.prisma.savedView.findFirst({
      where: {
        id: viewId,
        workspaceId: resolvedWorkspaceId,
      },
    });

    if (!existing) {
      throw new NotFoundException('Saved view not found');
    }

    this.assertCanModifyView(existing, actorUserId);

    await this.prisma.savedView.delete({
      where: {
        id: viewId,
      },
    });

    return {
      id: viewId,
      deleted: true,
    };
  }

  async setDefault(
    workspaceId: string | undefined,
    currentUser: CurrentUserPayload | undefined,
    viewId: string,
  ) {
    const resolvedWorkspaceId = this.resolveWorkspaceId(workspaceId, currentUser);
    const actorUserId = this.resolveActorUserId(currentUser);
    this.validateUuid(viewId, 'viewId');

    const existing = await this.prisma.savedView.findFirst({
      where: {
        id: viewId,
        workspaceId: resolvedWorkspaceId,
      },
    });

    if (!existing) {
      throw new NotFoundException('Saved view not found');
    }

    this.assertCanModifyView(existing, actorUserId);

    await this.clearDefaultViews({
      workspaceId: resolvedWorkspaceId,
      entityType: existing.entityType,
      visibility: existing.visibility,
      createdByUserId:
        existing.visibility === 'private' ? existing.createdByUserId : null,
      exceptViewId: existing.id,
    });

    const updated = await this.prisma.savedView.update({
      where: {
        id: existing.id,
      },
      data: {
        isDefault: true,
      },
      include: {
        createdByUser: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });

    return this.toSavedViewResponse(updated);
  }

  private async clearDefaultViews(params: {
    workspaceId: string;
    entityType: string;
    visibility: string;
    createdByUserId: string | null;
    exceptViewId?: string;
  }) {
    const where: Prisma.SavedViewWhereInput = {
      workspaceId: params.workspaceId,
      entityType: params.entityType,
      visibility: params.visibility,
      isDefault: true,
      ...(params.exceptViewId ? { id: { not: params.exceptViewId } } : {}),
    };

    if (params.visibility === 'private') {
      where.createdByUserId = params.createdByUserId;
    }

    await this.prisma.savedView.updateMany({
      where,
      data: {
        isDefault: false,
      },
    });
  }

  private assertCanReadView(
    view: {
      visibility: string;
      createdByUserId: string | null;
    },
    actorUserId: string,
  ) {
    if (view.visibility === 'private' && view.createdByUserId !== actorUserId) {
      throw new ForbiddenException('No access to saved view');
    }
  }

  private assertCanModifyView(
    view: {
      createdByUserId: string | null;
    },
    actorUserId: string,
  ) {
    if (view.createdByUserId !== actorUserId) {
      throw new ForbiddenException('Only the creator can modify this saved view');
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
    const userId = user?.id ?? user?.userId ?? user?.sub;

    if (!userId) {
      throw new ForbiddenException('User context is required');
    }

    return userId;
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

  private toSavedViewResponse(view: {
    id: string;
    workspaceId: string;
    entityType: string;
    name: string;
    isDefault: boolean;
    visibility: string;
    createdByUserId: string | null;
    filtersJsonb: Prisma.JsonValue;
    columnsJsonb: Prisma.JsonValue;
    sortingJsonb: Prisma.JsonValue;
    createdAt: Date;
    updatedAt: Date;
    createdByUser?: {
      id: string;
      email: string;
      firstName: string;
      lastName: string;
    } | null;
  }) {
    return {
      id: view.id,
      workspace_id: view.workspaceId,
      entity_type: view.entityType,
      name: view.name,
      is_default: view.isDefault,
      visibility: view.visibility,
      created_by_user_id: view.createdByUserId,
      created_by_user: view.createdByUser
        ? {
            id: view.createdByUser.id,
            email: view.createdByUser.email,
            full_name: `${view.createdByUser.firstName} ${view.createdByUser.lastName}`,
          }
        : null,
      filters_jsonb: view.filtersJsonb ?? {},
      columns_jsonb: view.columnsJsonb ?? [],
      sorting_jsonb: view.sortingJsonb ?? {},
      created_at: view.createdAt,
      updated_at: view.updatedAt,
    };
  }
}