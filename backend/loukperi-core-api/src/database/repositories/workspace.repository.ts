import { Injectable } from '@nestjs/common';
import { Workspace, WorkspaceSettings } from '@prisma/client';
import { PrismaService } from '../prisma.service';

type WorkspacePatch = Partial<Pick<Workspace, 'name' | 'companyName' | 'logoUrl' | 'primaryColor' | 'secondaryColor' | 'isActive'>>;
type WorkspaceSettingsPatch = Partial<Pick<WorkspaceSettings, 'defaultRecordLabelSingular' | 'defaultRecordLabelPlural' | 'dateFormat' | 'currencyCode' | 'numberFormat' | 'featuresJsonb'>>;

@Injectable()
export class WorkspaceRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findCurrentForUser(workspaceId: string | undefined, userId: string) {
    if (workspaceId) {
      return this.prisma.workspace.findFirst({
        where: { id: workspaceId, users: { some: { userId } } },
      });
    }

    const membership = await this.prisma.workspaceUser.findFirst({
      where: { userId, status: 'active' },
      include: { workspace: true },
      orderBy: { createdAt: 'asc' },
    });

    return membership?.workspace ?? null;
  }

  update(workspaceId: string, data: WorkspacePatch) {
    return this.prisma.workspace.update({ where: { id: workspaceId }, data });
  }

  async getSettings(workspaceId: string) {
    const existing = await this.prisma.workspaceSettings.findUnique({ where: { workspaceId } });
    if (existing) return existing;
    return this.prisma.workspaceSettings.create({ data: { workspaceId, featuresJsonb: {} } });
  }

  upsertSettings(workspaceId: string, data: WorkspaceSettingsPatch) {
    return this.prisma.workspaceSettings.upsert({
      where: { workspaceId },
      update: data as any,
        create: { workspaceId, featuresJsonb: {}, ...data } as any,
    });
  }
}
