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
import { CreateSavedViewDto } from './dto/create-saved-view.dto';
import { ListSavedViewsQueryDto } from './dto/list-saved-views.query.dto';
import { UpdateSavedViewDto } from './dto/update-saved-view.dto';
import { SavedViewsService } from './saved-views.service';

@ApiTags('Saved Views')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@UseInterceptors(ResponseEnvelopeInterceptor)
@Controller('saved-views')
export class SavedViewsController {
  constructor(private readonly savedViewsService: SavedViewsService) {}

  @Get()
  list(
    @WorkspaceId() workspaceId: string | undefined,
    @CurrentUser() currentUser: CurrentUserPayload | undefined,
    @Query() query: ListSavedViewsQueryDto,
  ) {
    return this.savedViewsService.list(workspaceId, currentUser, query);
  }

  @Post()
  create(
    @WorkspaceId() workspaceId: string | undefined,
    @CurrentUser() currentUser: CurrentUserPayload | undefined,
    @Body() dto: CreateSavedViewDto,
  ) {
    return this.savedViewsService.create(workspaceId, currentUser, dto);
  }

  @Get(':viewId')
  getOne(
    @WorkspaceId() workspaceId: string | undefined,
    @CurrentUser() currentUser: CurrentUserPayload | undefined,
    @Param('viewId') viewId: string,
  ) {
    return this.savedViewsService.getOne(workspaceId, currentUser, viewId);
  }

  @Patch(':viewId')
  update(
    @WorkspaceId() workspaceId: string | undefined,
    @CurrentUser() currentUser: CurrentUserPayload | undefined,
    @Param('viewId') viewId: string,
    @Body() dto: UpdateSavedViewDto,
  ) {
    return this.savedViewsService.update(workspaceId, currentUser, viewId, dto);
  }

  @Delete(':viewId')
  remove(
    @WorkspaceId() workspaceId: string | undefined,
    @CurrentUser() currentUser: CurrentUserPayload | undefined,
    @Param('viewId') viewId: string,
  ) {
    return this.savedViewsService.remove(workspaceId, currentUser, viewId);
  }

  @Post(':viewId/set-default')
  setDefault(
    @WorkspaceId() workspaceId: string | undefined,
    @CurrentUser() currentUser: CurrentUserPayload | undefined,
    @Param('viewId') viewId: string,
  ) {
    return this.savedViewsService.setDefault(workspaceId, currentUser, viewId);
  }
}