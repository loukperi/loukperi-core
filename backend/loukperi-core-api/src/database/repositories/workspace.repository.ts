import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma.service';

type WorkspacePatch = {
  name?: string;
  companyName?: string | null;
  timezone?: string;
  locale?: string;
  logoUrl?: string | null;
  primaryColor?: string | null;
  secondaryColor?: string | null;
  isActive?: boolean;
};

type WorkspaceSettingsPatch = {
  defaultRecordLabelSingular?: string;
  defaultRecordLabelPlural?: string;
  dateFormat?: string;
  currencyCode?: string;
  numberFormat?: string;
  featuresJsonb?: Prisma.InputJsonValue;
};

@Injectable()
export class WorkspaceRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findCurrentForUser(workspaceId: string | undefined, userId: string) {
    if (workspaceId) {
      return this.prisma.workspace.findFirst({
        where: {
          id: workspaceId,
          users: {
            some: {
              userId,
              status: 'active',
            },
          },
        },
        include: {
          settings: true,
        },
      });
    }

    const membership = await this.prisma.workspaceUser.findFirst({
      where: {
        userId,
        status: 'active',
      },
      include: {
        workspace: {
          include: {
            settings: true,
          },
        },
      },
      orderBy: {
        createdAt: 'asc',
      },
    });

    return membership?.workspace ?? null;
  }

  findById(workspaceId: string) {
    return this.prisma.workspace.findUnique({
      where: {
        id: workspaceId,
      },
      include: {
        settings: true,
      },
    });
  }

  update(workspaceId: string, data: WorkspacePatch) {
    return this.prisma.workspace.update({
      where: {
        id: workspaceId,
      },
      data,
      include: {
        settings: true,
      },
    });
  }

  async getSettings(workspaceId: string) {
    const existing = await this.prisma.workspaceSettings.findUnique({
      where: {
        workspaceId,
      },
    });

    if (existing) {
      return existing;
    }

    return this.prisma.workspaceSettings.create({
      data: {
        workspaceId,
        featuresJsonb: {},
      },
    });
  }

  upsertSettings(workspaceId: string, data: WorkspaceSettingsPatch) {
    return this.prisma.workspaceSettings.upsert({
      where: {
        workspaceId,
      },
      update: data,
      create: {
        workspaceId,
        featuresJsonb: {},
        ...data,
      },
    });
  }
}