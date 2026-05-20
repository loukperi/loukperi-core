import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { CurrentUserPayload } from 'src/common/decorators/current-user.decorator';
import { ReportRepository } from 'src/database/repositories/report.repository';
import { CreateReportDto } from './dto/create-report.dto';
import { ExportDataDto } from './dto/export-data.dto';
import { ListReportsQueryDto } from './dto/list-reports.query.dto';
import { RunReportDto } from './dto/run-report.dto';
import { UpdateReportDto } from './dto/update-report.dto';
import { randomUUID } from 'crypto';
import { mkdir, readdir, stat, writeFile } from 'fs/promises';
import { isAbsolute, join, relative, resolve } from 'path';
import { ExportReportDto } from './dto/export-report.dto';

@Injectable()
export class ReportsService {
  private readonly exportRoot = join(process.cwd(), 'exports', 'reports');
  constructor(private readonly reportRepository: ReportRepository) {}

  async list(
    workspaceId: string | undefined,
    currentUser: CurrentUserPayload | undefined,
    query: ListReportsQueryDto,
  ) {
    const resolvedWorkspaceId = this.resolveWorkspaceId(workspaceId, currentUser);

    const result = await this.reportRepository.listByWorkspace(
      resolvedWorkspaceId,
      query,
    );

    return {
      items: result.items.map((item) => this.toReportResponse(item)),
      pagination: {
        page: query.page,
        page_size: query.page_size,
        total: result.total,
        total_pages: Math.ceil(result.total / query.page_size),
      },
    };
  }

  async create(
    workspaceId: string | undefined,
    currentUser: CurrentUserPayload | undefined,
    dto: CreateReportDto,
  ) {
    const resolvedWorkspaceId = this.resolveWorkspaceId(workspaceId, currentUser);

    const created = await this.reportRepository.create({
      workspaceId: resolvedWorkspaceId,
      name: dto.name,
      entityType: dto.entity_type,
      reportType: dto.report_type,
      definitionJsonb: (dto.definition_jsonb ?? {}) as Prisma.InputJsonValue,
      isSystem: dto.is_system ?? false,
      createdByUserId: this.resolveActorUserId(currentUser),
    });

    return this.toReportResponse(created);
  }

  async getOne(
    workspaceId: string | undefined,
    currentUser: CurrentUserPayload | undefined,
    reportId: string,
  ) {
    const resolvedWorkspaceId = this.resolveWorkspaceId(workspaceId, currentUser);

    const report = await this.reportRepository.findOne(
      resolvedWorkspaceId,
      reportId,
    );

    if (!report) {
      throw new NotFoundException('Report not found');
    }

    return this.toReportResponse(report);
  }

  async update(
    workspaceId: string | undefined,
    currentUser: CurrentUserPayload | undefined,
    reportId: string,
    dto: UpdateReportDto,
  ) {
    const resolvedWorkspaceId = this.resolveWorkspaceId(workspaceId, currentUser);

    const existing = await this.reportRepository.findOne(
      resolvedWorkspaceId,
      reportId,
    );

    if (!existing) {
      throw new NotFoundException('Report not found');
    }

    const updated = await this.reportRepository.update(reportId, {
      name: dto.name,
      entityType: dto.entity_type,
      reportType: dto.report_type,
      definitionJsonb: dto.definition_jsonb as Prisma.InputJsonValue | undefined,
      isSystem: dto.is_system,
    });

    return this.toReportResponse(updated);
  }

  async getData(
    workspaceId: string | undefined,
    currentUser: CurrentUserPayload | undefined,
    reportId: string,
  ) {
    const resolvedWorkspaceId = this.resolveWorkspaceId(workspaceId, currentUser);

    const report = await this.reportRepository.findOne(
      resolvedWorkspaceId,
      reportId,
    );

    if (!report) {
      throw new NotFoundException('Report not found');
    }

    const result = await this.reportRepository.runReport(
      resolvedWorkspaceId,
      report,
      {},
    );

    return {
      report: this.toReportResponse(report),
      parameters: {},
      export_format: 'json',
      generated_at: new Date().toISOString(),
      ...result,
    };
  }

  async run(
    workspaceId: string | undefined,
    currentUser: CurrentUserPayload | undefined,
    reportId: string,
    dto: RunReportDto,
  ) {
    const resolvedWorkspaceId = this.resolveWorkspaceId(workspaceId, currentUser);

    const report = await this.reportRepository.findOne(
      resolvedWorkspaceId,
      reportId,
    );

    if (!report) {
      throw new NotFoundException('Report not found');
    }

    const result = await this.reportRepository.runReport(
      resolvedWorkspaceId,
      report,
      dto.parameters ?? {},
    );

    return {
      report: this.toReportResponse(report),
      parameters: dto.parameters ?? {},
      export_format: dto.export_format ?? 'json',
      generated_at: new Date().toISOString(),
      ...result,
    };
  }

  async export(
    workspaceId: string | undefined,
    currentUser: CurrentUserPayload | undefined,
    dto: ExportDataDto,
  ) {
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

  async exportReport(
    workspaceId: string | undefined,
    currentUser: CurrentUserPayload | undefined,
    reportId: string,
    dto: ExportReportDto,
  ) {
    const resolvedWorkspaceId = this.resolveWorkspaceId(workspaceId, currentUser);

    const report = await this.reportRepository.findOne(
      resolvedWorkspaceId,
      reportId,
    );

    if (!report) {
      throw new NotFoundException('Report not found');
    }

    const format = dto.format ?? 'csv';
    const parameters = dto.parameters ?? {};

    const result = await this.reportRepository.runReport(
      resolvedWorkspaceId,
      report,
      parameters,
    );

    await mkdir(this.exportRoot, { recursive: true });

    const exportId = randomUUID();
    const fileName = this.buildExportFileName(report.name, exportId, format);
    const absolutePath = join(this.exportRoot, fileName);

    const content =
      format === 'json'
        ? this.toJsonExportContent(report, parameters, result)
        : this.toCsvExportContent(result);

    await writeFile(absolutePath, content, 'utf8');

    return {
      export_id: exportId,
      report_id: report.id,
      report_name: report.name,
      format,
      file_name: fileName,
      status: 'completed',
      download_url: `/api/v1/exports/${exportId}/download`,
      generated_at: new Date().toISOString(),
      totals: (result as any).totals ?? {},
      row_count: Array.isArray((result as any).rows)
        ? (result as any).rows.length
        : 0,
    };
  }

  async getExportDownloadInfo(exportId: string) {
    this.validateExportId(exportId);

    const files = await this.findExportFiles(exportId);

    if (!files.length) {
      throw new NotFoundException('Export file not found');
    }

    const fileName = files[0];
    const absolutePath = this.resolveExportPath(fileName);

    try {
      await stat(absolutePath);
    } catch {
      throw new NotFoundException('Export file not found');
    }

    return {
      absolutePath,
      fileName,
      mimeType: fileName.endsWith('.json')
        ? 'application/json; charset=utf-8'
        : 'text/csv; charset=utf-8',
    };
  }

  private async findExportFiles(exportId: string) {
    const files = await readdir(this.exportRoot).catch(() => []);

    return files.filter((file) => file.includes(exportId));
  }

  private toJsonExportContent(
    report: {
      id: string;
      name: string;
      entityType: string;
      reportType: string;
    },
    parameters: Record<string, unknown>,
    result: unknown,
  ) {
    return JSON.stringify(
      {
        report: {
          id: report.id,
          name: report.name,
          entity_type: report.entityType,
          report_type: report.reportType,
        },
        parameters,
        generated_at: new Date().toISOString(),
        result,
      },
      null,
      2,
    );
  }

  private toCsvExportContent(result: any) {
    const rows: Array<Record<string, unknown>> = Array.isArray(result?.rows)
      ? result.rows
      : [];

    if (!rows.length) {
      return '\uFEFFmessage\n"No rows returned"\n';
    }

    const columns: string[] =
      Array.isArray(result?.columns) && result.columns.length
        ? result.columns.map((column: unknown) => String(column))
        : Array.from(
            rows.reduce((set: Set<string>, row: Record<string, unknown>) => {
              Object.keys(row ?? {}).forEach((key) => set.add(key));
              return set;
            }, new Set<string>()),
          );

    const header = columns
      .map((column: string) => this.escapeCsvValue(column))
      .join(',');

    const body = rows
      .map((row: Record<string, unknown>) =>
        columns
          .map((column: string) => this.escapeCsvValue(row?.[column]))
          .join(','),
      )
      .join('\n');

    return `\uFEFF${header}\n${body}\n`;
  }

  private escapeCsvValue(value: unknown) {
    if (value === null || value === undefined) {
      return '';
    }

    const normalized =
      value instanceof Date
        ? value.toISOString()
        : typeof value === 'object'
          ? JSON.stringify(value)
          : String(value);

    const escaped = normalized.replace(/"/g, '""');

    return `"${escaped}"`;
  }

  private buildExportFileName(
    reportName: string,
    exportId: string,
    format: 'json' | 'csv',
  ) {
    const safeReportName =
      String(reportName ?? 'report')
        .trim()
        .replace(/[<>:"/\\|?*\x00-\x1F]/g, '_')
        .replace(/\s+/g, '_')
        .slice(0, 80) || 'report';

    return `${safeReportName}_${exportId}.${format}`;
  }

  private validateExportId(exportId: string) {
    const uuidRegex =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

    if (!uuidRegex.test(String(exportId ?? '').trim())) {
      throw new BadRequestException('exportId must be a valid UUID');
    }
  }

  private resolveExportPath(fileName: string) {
    const absolutePath = resolve(this.exportRoot, fileName);
    const relativePath = relative(this.exportRoot, absolutePath);

    if (
      relativePath === '' ||
      relativePath.startsWith('..') ||
      isAbsolute(relativePath)
    ) {
      throw new BadRequestException('Invalid export file path');
    }

    return absolutePath;
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

  private toReportResponse(report: any) {
    return {
      id: report.id,
      workspace_id: report.workspaceId,
      name: report.name,
      entity_type: report.entityType,
      report_type: report.reportType,
      definition_jsonb: report.definitionJsonb ?? {},
      is_system: report.isSystem,
      created_by_user: report.createdByUser
        ? {
            id: report.createdByUser.id,
            full_name: `${report.createdByUser.firstName} ${report.createdByUser.lastName}`,
            email: report.createdByUser.email,
          }
        : null,
      created_at: report.createdAt.toISOString(),
      updated_at: report.updatedAt.toISOString(),
    };
  }
}