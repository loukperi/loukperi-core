import { BadRequestException, Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';

@Injectable()
export class StatusesService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(params: {
    workspaceId?: string;
    entityType?: string;
    recordTypeId?: string;
  }) {
    const entityType = params.entityType ?? 'record';

    const where: Prisma.StatusDefinitionWhereInput = {
      entityType,
    };

    if (params.workspaceId) {
      where.workspaceId = params.workspaceId;
    }

    if (params.recordTypeId) {
      where.recordTypeId = params.recordTypeId;
    }

    return this.prisma.statusDefinition.findMany({
      where,
      orderBy: [{ sortOrder: 'asc' }, { label: 'asc' }],
    });
  }

  async findOne(statusId: string) {
    const status = await this.prisma.statusDefinition.findUnique({
      where: { id: statusId },
    });

    if (!status) {
      throw new BadRequestException('Status not found');
    }

    return status;
  }
}