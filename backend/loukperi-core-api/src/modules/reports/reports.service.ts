import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { CurrentUserPayload } from 'src/common/decorators/current-user.decorator';
import { ReportRepository } from 'src/database/repositories/report.repository';
import { CreateReportDto } from './dto/create-report.dto';
import { ExportDataDto } from './dto/export-data.dto';
import { ListReportsQueryDto } from './dto/list-reports.query.dto';
import { RunReportDto } from './dto/run-report.dto';
import { UpdateReportDto } from './dto/update-report.dto';

@Injectable()
export class ReportsService {
  constructor(private readonly reportRepository: ReportRepository) {}

  async list(workspaceId: string | undefined, currentUser: CurrentUserPayload | undefined, query: ListReportsQueryDto) {
    const resolvedWorkspaceId = this.resolveWorkspaceId(workspaceId, currentUser);
    const result = await this.reportRepository.listByWorkspace(resolvedWorkspaceId, query);
    return {
      items: result.items.map((item) => this.toReportResponse(item)),
      pagination: { page: query.page, page_size: query.page_size, total: result.total, total_pages: Math.ceil(result.total / query.page_size) },
    };
  }

  async create(workspaceId: string | undefined, currentUser: CurrentUserPayload | undefined, dto: CreateReportDto) {
    const resolvedWorkspaceId = this.resolveWorkspaceId(workspaceId, currentUser);
    const created = await this.reportRepository.create({
      workspaceId: resolvedWorkspaceId,
      name: dto.name,
      entityType: dto.entity_type,
      reportType: dto.report_type,
      definitionJsonb: (dto.definition_jsonb ?? {}) as Prisma.InputJsonValue,
      isSystem: dto.is_system ?? false,
      createdByUserId: currentUser?.sub,
    });
    return this.toReportResponse(created);
  }

  async getOne(workspaceId: string | undefined, currentUser: CurrentUserPayload | undefined, reportId: string) {
    const resolvedWorkspaceId = this.resolveWorkspaceId(workspaceId, currentUser);
    const report = await this.reportRepository.findOne(resolvedWorkspaceId, reportId);
    if (!report) throw new NotFoundException('Report not found');
    return this.toReportResponse(report);
  }

  async update(workspaceId: string | undefined, currentUser: CurrentUserPayload | undefined, reportId: string, dto: UpdateReportDto) {
    const resolvedWorkspaceId = this.resolveWorkspaceId(workspaceId, currentUser);
    const existing = await this.reportRepository.findOne(resolvedWorkspaceId, reportId);
    if (!existing) throw new NotFoundException('Report not found');

    const updated = await this.reportRepository.update(reportId, {
      name: dto.name,
      entityType: dto.entity_type,
      reportType: dto.report_type,
      definitionJsonb: dto.definition_jsonb as Prisma.InputJsonValue | undefined,
      isSystem: dto.is_system,
    });
    return this.toReportResponse(updated);
  }

  async run(workspaceId: string | undefined, currentUser: CurrentUserPayload | undefined, reportId: string, dto: RunReportDto) {
    const resolvedWorkspaceId = this.resolveWorkspaceId(workspaceId, currentUser);
    const report = await this.reportRepository.findOne(resolvedWorkspaceId, reportId);
    if (!report) throw new NotFoundException('Report not found');
    const result = await this.reportRepository.runReport(resolvedWorkspaceId, report);
    return {
      report: this.toReportResponse(report),
      parameters: dto.parameters ?? {},
      export_format: dto.export_format ?? 'json',
      ...result,
    };
  }

  async export(workspaceId: string | undefined, currentUser: CurrentUserPayload | undefined, dto: ExportDataDto) {
    this.resolveWorkspaceId(workspaceId, currentUser);
    return {
      entity_type: dto.entity_type,
      filters: dto.filters ?? {},
      columns: dto.columns ?? [],
      format: dto.format,
      status: 'completed',
      download_url: null,
      generated_at: new Date().toISOString(),
    };
  }

  private resolveWorkspaceId(workspaceId: string | undefined, currentUser: CurrentUserPayload | undefined) {
    const resolvedWorkspaceId = workspaceId ?? currentUser?.defaultWorkspaceId;
    if (!resolvedWorkspaceId) throw new ForbiddenException('Workspace context is required');
    if (!currentUser || !currentUser.workspaceIds.includes(resolvedWorkspaceId)) throw new ForbiddenException('No access to workspace');
    return resolvedWorkspaceId;
  }

  private toReportResponse(report: any) {
    return {
      id: report.id,
      name: report.name,
      entity_type: report.entityType,
      report_type: report.reportType,
      definition_jsonb: report.definitionJsonb ?? {},
      is_system: report.isSystem,
      created_by_user: report.createdByUser ? { id: report.createdByUser.id, full_name: `${report.createdByUser.firstName} ${report.createdByUser.lastName}`, email: report.createdByUser.email } : null,
      created_at: report.createdAt.toISOString(),
      updated_at: report.updatedAt.toISOString(),
    };
  }
}
