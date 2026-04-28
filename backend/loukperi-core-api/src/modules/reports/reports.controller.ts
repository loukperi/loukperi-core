import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards, UseInterceptors } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentUser, CurrentUserPayload } from 'src/common/decorators/current-user.decorator';
import { Permissions } from 'src/common/decorators/permissions.decorator';
import { WorkspaceId } from 'src/common/decorators/workspace-id.decorator';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';
import { PermissionsGuard } from 'src/common/guards/permissions.guard';
import { ResponseEnvelopeInterceptor } from 'src/common/interceptors/response-envelope.interceptor';
import { CreateReportDto } from './dto/create-report.dto';
import { ExportDataDto } from './dto/export-data.dto';
import { ListReportsQueryDto } from './dto/list-reports.query.dto';
import { RunReportDto } from './dto/run-report.dto';
import { UpdateReportDto } from './dto/update-report.dto';
import { ReportsService } from './reports.service';

@ApiTags('Reports')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@UseInterceptors(ResponseEnvelopeInterceptor)
@Controller()
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Get('reports')
  @Permissions('reports.read')
  list(@WorkspaceId() workspaceId: string | undefined, @CurrentUser() currentUser: CurrentUserPayload | undefined, @Query() query: ListReportsQueryDto) {
    return this.reportsService.list(workspaceId, currentUser, query);
  }

  @Post('reports')
  @Permissions('reports.create')
  create(@WorkspaceId() workspaceId: string | undefined, @CurrentUser() currentUser: CurrentUserPayload | undefined, @Body() dto: CreateReportDto) {
    return this.reportsService.create(workspaceId, currentUser, dto);
  }

  @Get('reports/:reportId')
  @Permissions('reports.read')
  getOne(@WorkspaceId() workspaceId: string | undefined, @CurrentUser() currentUser: CurrentUserPayload | undefined, @Param('reportId') reportId: string) {
    return this.reportsService.getOne(workspaceId, currentUser, reportId);
  }

  @Patch('reports/:reportId')
  @Permissions('reports.create')
  update(@WorkspaceId() workspaceId: string | undefined, @CurrentUser() currentUser: CurrentUserPayload | undefined, @Param('reportId') reportId: string, @Body() dto: UpdateReportDto) {
    return this.reportsService.update(workspaceId, currentUser, reportId, dto);
  }

  @Post('reports/:reportId/run')
  @Permissions('reports.read')
  run(@WorkspaceId() workspaceId: string | undefined, @CurrentUser() currentUser: CurrentUserPayload | undefined, @Param('reportId') reportId: string, @Body() dto: RunReportDto) {
    return this.reportsService.run(workspaceId, currentUser, reportId, dto);
  }

  @Post('exports')
  @Permissions('reports.export')
  exportData(@WorkspaceId() workspaceId: string | undefined, @CurrentUser() currentUser: CurrentUserPayload | undefined, @Body() dto: ExportDataDto) {
    return this.reportsService.export(workspaceId, currentUser, dto);
  }
}
