import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { CurrentUserPayload } from 'src/common/decorators/current-user.decorator';
import { WorkspaceRepository } from 'src/database/repositories/workspace.repository';
import { UpdateWorkspaceSettingsDto } from './dto/update-workspace-settings.dto';
import { UpdateWorkspaceDto } from './dto/update-workspace.dto';

@Injectable()
export class WorkspacesService {
  constructor(private readonly workspaceRepository: WorkspaceRepository) {}

  async getCurrent(
    workspaceId: string | undefined,
    currentUser: CurrentUserPayload | undefined,
  ) {
    const resolvedWorkspaceId = this.resolveWorkspaceId(workspaceId, currentUser);
    const userId = this.resolveActorUserId(currentUser);

    const workspace = await this.workspaceRepository.findCurrentForUser(
      resolvedWorkspaceId,
      userId,
    );

    if (!workspace) {
      throw new NotFoundException('Workspace not found');
    }

    return this.toWorkspaceResponse(workspace);
  }

  async updateCurrent(
    workspaceId: string | undefined,
    currentUser: CurrentUserPayload | undefined,
    dto: UpdateWorkspaceDto,
  ) {
    const resolvedWorkspaceId = this.resolveWorkspaceId(workspaceId, currentUser);
    this.assertWorkspaceAccess(resolvedWorkspaceId, currentUser);

    const updated = await this.workspaceRepository.update(resolvedWorkspaceId, {
      name: dto.name,
      companyName: dto.company_name,
      timezone: dto.timezone,
      locale: dto.locale,
      logoUrl: dto.logo_url,
      primaryColor: dto.primary_color,
      secondaryColor: dto.secondary_color,
      isActive: dto.is_active,
    });

    return this.toWorkspaceResponse(updated);
  }

  async getSettings(
    workspaceId: string | undefined,
    currentUser: CurrentUserPayload | undefined,
  ) {
    const resolvedWorkspaceId = this.resolveWorkspaceId(workspaceId, currentUser);
    this.assertWorkspaceAccess(resolvedWorkspaceId, currentUser);

    const settings =
      await this.workspaceRepository.getSettings(resolvedWorkspaceId);

    return this.toWorkspaceSettingsResponse(settings);
  }

  async updateSettings(
    workspaceId: string | undefined,
    currentUser: CurrentUserPayload | undefined,
    dto: UpdateWorkspaceSettingsDto,
  ) {
    const resolvedWorkspaceId = this.resolveWorkspaceId(workspaceId, currentUser);
    this.assertWorkspaceAccess(resolvedWorkspaceId, currentUser);

    const settings = await this.workspaceRepository.upsertSettings(
      resolvedWorkspaceId,
      {
        defaultRecordLabelSingular: dto.default_record_label_singular,
        defaultRecordLabelPlural: dto.default_record_label_plural,
        dateFormat: dto.date_format,
        currencyCode: dto.currency_code,
        numberFormat: dto.number_format,
        featuresJsonb: dto.features_jsonb as Prisma.InputJsonValue | undefined,
      },
    );

    return this.toWorkspaceSettingsResponse(settings);
  }

  private resolveWorkspaceId(
    workspaceId: string | undefined,
    currentUser: CurrentUserPayload | undefined,
  ) {
    const resolvedWorkspaceId = workspaceId ?? currentUser?.defaultWorkspaceId;

    if (!resolvedWorkspaceId) {
      throw new ForbiddenException('Workspace context is required');
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

  private assertWorkspaceAccess(
    workspaceId: string,
    currentUser: CurrentUserPayload | undefined,
  ) {
    if (!currentUser || !currentUser.workspaceIds.includes(workspaceId)) {
      throw new ForbiddenException('No access to workspace');
    }
  }

  private toWorkspaceResponse(workspace: {
    id: string;
    name: string;
    slug: string;
    companyName: string | null;
    timezone: string;
    locale: string;
    logoUrl: string | null;
    primaryColor: string | null;
    secondaryColor: string | null;
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
    settings?: {
      id: string;
      defaultRecordLabelSingular: string;
      defaultRecordLabelPlural: string;
      dateFormat: string;
      currencyCode: string;
      numberFormat: string;
      featuresJsonb: Prisma.JsonValue;
    } | null;
  }) {
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
      settings: workspace.settings
        ? {
            id: workspace.settings.id,
            default_record_label_singular:
              workspace.settings.defaultRecordLabelSingular,
            default_record_label_plural:
              workspace.settings.defaultRecordLabelPlural,
            date_format: workspace.settings.dateFormat,
            currency_code: workspace.settings.currencyCode,
            number_format: workspace.settings.numberFormat,
            features_jsonb: workspace.settings.featuresJsonb ?? {},
          }
        : null,
      created_at: workspace.createdAt,
      updated_at: workspace.updatedAt,
    };
  }

  private toWorkspaceSettingsResponse(settings: {
    id: string;
    workspaceId: string;
    defaultRecordLabelSingular: string;
    defaultRecordLabelPlural: string;
    dateFormat: string;
    currencyCode: string;
    numberFormat: string;
    featuresJsonb: Prisma.JsonValue;
    createdAt: Date;
    updatedAt: Date;
  }) {
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
}