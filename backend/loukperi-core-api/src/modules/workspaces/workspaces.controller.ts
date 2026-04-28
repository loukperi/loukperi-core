import { Body, Controller, Get, Patch, UseGuards, UseInterceptors } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentUser, CurrentUserPayload } from 'src/common/decorators/current-user.decorator';
import { WorkspaceId } from 'src/common/decorators/workspace-id.decorator';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';
import { ResponseEnvelopeInterceptor } from 'src/common/interceptors/response-envelope.interceptor';
import { UpdateWorkspaceSettingsDto } from './dto/update-workspace-settings.dto';
import { UpdateWorkspaceDto } from './dto/update-workspace.dto';
import { WorkspacesService } from './workspaces.service';

@ApiTags('Workspaces')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@UseInterceptors(ResponseEnvelopeInterceptor)
@Controller('workspaces/current')
export class WorkspacesController {
  constructor(private readonly workspacesService: WorkspacesService) {}

  @Get()
  getCurrent(
    @WorkspaceId() workspaceId: string | undefined,
    @CurrentUser() currentUser: CurrentUserPayload | undefined,
  ) {
    return this.workspacesService.getCurrent(workspaceId, currentUser);
  }

  @Patch()
  updateCurrent(
    @WorkspaceId() workspaceId: string | undefined,
    @CurrentUser() currentUser: CurrentUserPayload | undefined,
    @Body() dto: UpdateWorkspaceDto,
  ) {
    return this.workspacesService.updateCurrent(workspaceId, currentUser, dto);
  }

  @Get('settings')
  getSettings(
    @WorkspaceId() workspaceId: string | undefined,
    @CurrentUser() currentUser: CurrentUserPayload | undefined,
  ) {
    return this.workspacesService.getSettings(workspaceId, currentUser);
  }

  @Patch('settings')
  updateSettings(
    @WorkspaceId() workspaceId: string | undefined,
    @CurrentUser() currentUser: CurrentUserPayload | undefined,
    @Body() dto: UpdateWorkspaceSettingsDto,
  ) {
    return this.workspacesService.updateSettings(workspaceId, currentUser, dto);
  }
}
