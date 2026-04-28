import { Prisma } from '@prisma/client';
import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { CurrentUserPayload } from 'src/common/decorators/current-user.decorator';
import { WorkspaceRepository } from 'src/database/repositories/workspace.repository';
import { UpdateWorkspaceSettingsDto } from './dto/update-workspace-settings.dto';
import { UpdateWorkspaceDto } from './dto/update-workspace.dto';

@Injectable()
export class WorkspacesService {
  constructor(private readonly workspaceRepository: WorkspaceRepository) {}

  async getCurrent(workspaceId: string | undefined, currentUser: CurrentUserPayload | undefined) {
    const resolvedWorkspaceId = this.resolveWorkspaceId(workspaceId, currentUser);
    const workspace = await this.workspaceRepository.findCurrentForUser(resolvedWorkspaceId, currentUser!.sub);
    if (!workspace) throw new NotFoundException('Workspace not found');
    return this.toWorkspaceResponse(workspace);
  }

  async updateCurrent(workspaceId: string | undefined, currentUser: CurrentUserPayload | undefined, dto: UpdateWorkspaceDto) {
    const resolvedWorkspaceId = this.resolveWorkspaceId(workspaceId, currentUser);
    this.assertWorkspaceAccess(resolvedWorkspaceId, currentUser);

    const updated = await this.workspaceRepository.update(resolvedWorkspaceId, {
      name: dto.name,
      companyName: dto.company_name,
      logoUrl: dto.logo_url,
      primaryColor: dto.primary_color,
      secondaryColor: dto.secondary_color,
      isActive: dto.is_active,
    });

    return this.toWorkspaceResponse(updated);
  }

  async getSettings(workspaceId: string | undefined, currentUser: CurrentUserPayload | undefined) {
    const resolvedWorkspaceId = this.resolveWorkspaceId(workspaceId, currentUser);
    this.assertWorkspaceAccess(resolvedWorkspaceId, currentUser);
    const settings = await this.workspaceRepository.getSettings(resolvedWorkspaceId);
    return {
      id: settings.id,
      workspace_id: settings.workspaceId,
      default_record_label_singular: settings.defaultRecordLabelSingular,
      default_record_label_plural: settings.defaultRecordLabelPlural,
      date_format: settings.dateFormat,
      currency_code: settings.currencyCode,
      number_format: settings.numberFormat,
      features_jsonb: settings.featuresJsonb ?? {},
      created_at: settings.createdAt,
      updated_at: settings.updatedAt,
    };
  }

  async updateSettings(workspaceId: string | undefined, currentUser: CurrentUserPayload | undefined, dto: UpdateWorkspaceSettingsDto) {
    const resolvedWorkspaceId = this.resolveWorkspaceId(workspaceId, currentUser);
    this.assertWorkspaceAccess(resolvedWorkspaceId, currentUser);

    const settings = await this.workspaceRepository.upsertSettings(resolvedWorkspaceId, {
      defaultRecordLabelSingular: dto.default_record_label_singular,
      defaultRecordLabelPlural: dto.default_record_label_plural,
      dateFormat: dto.date_format,
      currencyCode: dto.currency_code,
      numberFormat: dto.number_format,
      featuresJsonb: dto.features_jsonb as Prisma.JsonValue | undefined,
    });

    return {
      id: settings.id,
      workspace_id: settings.workspaceId,
      default_record_label_singular: settings.defaultRecordLabelSingular,
      default_record_label_plural: settings.defaultRecordLabelPlural,
      date_format: settings.dateFormat,
      currency_code: settings.currencyCode,
      number_format: settings.numberFormat,
      features_jsonb: settings.featuresJsonb ?? {},
      created_at: settings.createdAt,
      updated_at: settings.updatedAt,
    };
  }

  private resolveWorkspaceId(workspaceId: string | undefined, currentUser: CurrentUserPayload | undefined) {
    const resolvedWorkspaceId = workspaceId ?? currentUser?.defaultWorkspaceId;
    if (!resolvedWorkspaceId) throw new ForbiddenException('Workspace context is required');
    return resolvedWorkspaceId;
  }

  private assertWorkspaceAccess(workspaceId: string, currentUser: CurrentUserPayload | undefined) {
    if (!currentUser || !currentUser.workspaceIds.includes(workspaceId)) {
      throw new ForbiddenException('No access to workspace');
    }
  }

  private toWorkspaceResponse(workspace: any) {
    return {
      id: workspace.id,
      name: workspace.name,
      slug: workspace.slug,
      company_name: workspace.companyName,
      timezone: workspace.timezone,
      locale: workspace.locale,
      logo_url: workspace.logoUrl,
      primary_color: workspace.primaryColor,
      secondary_color: workspace.secondaryColor,
      is_active: workspace.isActive,
      created_at: workspace.createdAt,
      updated_at: workspace.updatedAt,
    };
  }
}
