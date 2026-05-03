import { BadRequestException, Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';

@Injectable()
export class ActivityService {
  constructor(private readonly prisma: PrismaService) {}

  private validateUuid(value: string | undefined, fieldName: string) {
    if (!value) return;

    const uuidRegex =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

    if (!uuidRegex.test(value)) {
      throw new BadRequestException(`${fieldName} must be a valid UUID`);
    }
  }

  async findAll(params: {
    workspaceId?: string;
    entityType?: string;
    entityId?: string;
    actorUserId?: string;
    page?: number;
    pageSize?: number;
  }) {
    this.validateUuid(params.workspaceId, 'workspace_id');
    this.validateUuid(params.entityId, 'entity_id');
    this.validateUuid(params.actorUserId, 'actor_user_id');

    const page = params.page && params.page > 0 ? params.page : 1;
    const pageSize =
      params.pageSize && params.pageSize > 0 && params.pageSize <= 100
        ? params.pageSize
        : 25;

    const where: Prisma.ActivityEventWhereInput = {};

    if (params.workspaceId) {
      where.workspaceId = params.workspaceId;
    }

    if (params.entityType) {
      where.entityType = params.entityType;
    }

    if (params.entityId) {
      where.entityId = params.entityId;
    }

    if (params.actorUserId) {
      where.actorUserId = params.actorUserId;
    }

    const [items, total] = await Promise.all([
      this.prisma.activityEvent.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: {
          actorUser: {
            select: {
              id: true,
              email: true,
              firstName: true,
              lastName: true,
            },
          },
        },
      }),
      this.prisma.activityEvent.count({ where }),
    ]);

    return {
      items,
      pagination: {
        page,
        page_size: pageSize,
        total,
        total_pages: Math.ceil(total / pageSize),
      },
    };
  }

  async findRecordActivity(recordId: string, workspaceId?: string) {
    this.validateUuid(recordId, 'recordId');
    this.validateUuid(workspaceId, 'workspace_id');

    const where: Prisma.ActivityEventWhereInput = {
      entityType: 'record',
      entityId: recordId,
    };

    if (workspaceId) {
      where.workspaceId = workspaceId;
    }

    return this.prisma.activityEvent.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        actorUser: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });
   }
  async logEvent(params: {
   workspaceId: string;
   entityType: string;
   entityId: string;
   actorUserId?: string | null;
   eventType: string;
   eventLabel: string;
   oldValuesJsonb?: Prisma.InputJsonValue | null;
   newValuesJsonb?: Prisma.InputJsonValue | null;
   metaJsonb?: Prisma.InputJsonValue;
  }) {
   return this.prisma.activityEvent.create({
     data: {
       workspaceId: params.workspaceId,
       entityType: params.entityType,
       entityId: params.entityId,
       actorUserId: params.actorUserId ?? null,
       eventType: params.eventType,
       eventLabel: params.eventLabel,
       oldValuesJsonb: params.oldValuesJsonb ?? Prisma.JsonNull,
       newValuesJsonb: params.newValuesJsonb ?? Prisma.JsonNull,
       metaJsonb: params.metaJsonb ?? {},
     },
   });
 } 
}