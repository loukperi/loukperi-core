import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import {
  CurrentUser,
  CurrentUserPayload,
} from 'src/common/decorators/current-user.decorator';
import { WorkspaceId } from 'src/common/decorators/workspace-id.decorator';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';
import { ResponseEnvelopeInterceptor } from 'src/common/interceptors/response-envelope.interceptor';
import { CreateDashboardWidgetDto } from './dto/create-dashboard-widget.dto';
import { CreateDashboardDto } from './dto/create-dashboard.dto';
import { ListDashboardsQueryDto } from './dto/list-dashboards.query.dto';
import { UpdateDashboardWidgetDto } from './dto/update-dashboard-widget.dto';
import { UpdateDashboardDto } from './dto/update-dashboard.dto';
import { DashboardsService } from './dashboards.service';

@ApiTags('Dashboards')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@UseInterceptors(ResponseEnvelopeInterceptor)
@Controller()
export class DashboardsController {
  constructor(private readonly dashboardsService: DashboardsService) {}

  @Get('dashboards')
  list(
    @WorkspaceId() workspaceId: string | undefined,
    @CurrentUser() currentUser: CurrentUserPayload | undefined,
    @Query() query: ListDashboardsQueryDto,
  ) {
    return this.dashboardsService.list(workspaceId, currentUser, query);
  }

  @Get('dashboards/default')
  getDefault(
    @WorkspaceId() workspaceId: string | undefined,
    @CurrentUser() currentUser: CurrentUserPayload | undefined,
    @Query() query: ListDashboardsQueryDto,
  ) {
    return this.dashboardsService.getDefault(workspaceId, currentUser, query);
  }

  @Post('dashboards')
  create(
    @WorkspaceId() workspaceId: string | undefined,
    @CurrentUser() currentUser: CurrentUserPayload | undefined,
    @Body() dto: CreateDashboardDto,
  ) {
    return this.dashboardsService.create(workspaceId, currentUser, dto);
  }

  @Get('dashboards/:dashboardId/data')
  getDashboardData(
    @WorkspaceId() workspaceId: string | undefined,
    @CurrentUser() currentUser: CurrentUserPayload | undefined,
    @Param('dashboardId') dashboardId: string,
  ) {
    return this.dashboardsService.getDashboardData(
      workspaceId,
      currentUser,
      dashboardId,
    );
  }

  @Get('dashboard-widgets/:widgetId/data')
  getWidgetData(
    @WorkspaceId() workspaceId: string | undefined,
    @CurrentUser() currentUser: CurrentUserPayload | undefined,
    @Param('widgetId') widgetId: string,
  ) {
    return this.dashboardsService.getWidgetData(
      workspaceId,
      currentUser,
      widgetId,
    );
  }

  @Get('dashboards/:dashboardId')
  getOne(
    @WorkspaceId() workspaceId: string | undefined,
    @CurrentUser() currentUser: CurrentUserPayload | undefined,
    @Param('dashboardId') dashboardId: string,
  ) {
    return this.dashboardsService.getOne(workspaceId, currentUser, dashboardId);
  }

  @Patch('dashboards/:dashboardId')
  update(
    @WorkspaceId() workspaceId: string | undefined,
    @CurrentUser() currentUser: CurrentUserPayload | undefined,
    @Param('dashboardId') dashboardId: string,
    @Body() dto: UpdateDashboardDto,
  ) {
    return this.dashboardsService.update(
      workspaceId,
      currentUser,
      dashboardId,
      dto,
    );
  }

  @Delete('dashboards/:dashboardId')
  remove(
    @WorkspaceId() workspaceId: string | undefined,
    @CurrentUser() currentUser: CurrentUserPayload | undefined,
    @Param('dashboardId') dashboardId: string,
  ) {
    return this.dashboardsService.remove(workspaceId, currentUser, dashboardId);
  }

  @Post('dashboards/:dashboardId/set-default')
  setDefault(
    @WorkspaceId() workspaceId: string | undefined,
    @CurrentUser() currentUser: CurrentUserPayload | undefined,
    @Param('dashboardId') dashboardId: string,
  ) {
    return this.dashboardsService.setDefault(
      workspaceId,
      currentUser,
      dashboardId,
    );
  }

  @Post('dashboards/:dashboardId/widgets')
  addWidget(
    @WorkspaceId() workspaceId: string | undefined,
    @CurrentUser() currentUser: CurrentUserPayload | undefined,
    @Param('dashboardId') dashboardId: string,
    @Body() dto: CreateDashboardWidgetDto,
  ) {
    return this.dashboardsService.addWidget(
      workspaceId,
      currentUser,
      dashboardId,
      dto,
    );
  }

  @Patch('dashboard-widgets/:widgetId')
  updateWidget(
    @WorkspaceId() workspaceId: string | undefined,
    @CurrentUser() currentUser: CurrentUserPayload | undefined,
    @Param('widgetId') widgetId: string,
    @Body() dto: UpdateDashboardWidgetDto,
  ) {
    return this.dashboardsService.updateWidget(
      workspaceId,
      currentUser,
      widgetId,
      dto,
    );
  }

  @Delete('dashboard-widgets/:widgetId')
  removeWidget(
    @WorkspaceId() workspaceId: string | undefined,
    @CurrentUser() currentUser: CurrentUserPayload | undefined,
    @Param('widgetId') widgetId: string,
  ) {
    return this.dashboardsService.removeWidget(
      workspaceId,
      currentUser,
      widgetId,
    );
  }
}