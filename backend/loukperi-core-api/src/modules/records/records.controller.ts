import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards, UseInterceptors } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentUser, CurrentUserPayload } from 'src/common/decorators/current-user.decorator';
import { Permissions } from 'src/common/decorators/permissions.decorator';
import { WorkspaceId } from 'src/common/decorators/workspace-id.decorator';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';
import { PermissionsGuard } from 'src/common/guards/permissions.guard';
import { ResponseEnvelopeInterceptor } from 'src/common/interceptors/response-envelope.interceptor';
import { AssignRecordDto } from './dto/assign-record.dto';
import { AssignTagDto } from './dto/assign-tag.dto';
import { ChangeRecordStatusDto } from './dto/change-record-status.dto';
import { CreateRecordDto } from './dto/create-record.dto';
import { ListRecordsQueryDto } from './dto/list-records.query.dto';
import { UpdateRecordDto } from './dto/update-record.dto';
import { RecordsService } from './records.service';

@ApiTags('Records')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@UseInterceptors(ResponseEnvelopeInterceptor)
@Controller('records')
export class RecordsController {
  constructor(private readonly recordsService: RecordsService) {}

  @Get()
  @Permissions('records.read')
  list(
    @WorkspaceId() workspaceId: string | undefined,
    @CurrentUser() currentUser: CurrentUserPayload | undefined,
    @Query() query: ListRecordsQueryDto,
  ) {
    return this.recordsService.list(workspaceId, currentUser, query);
  }

  @Post()
  @Permissions('records.create')
  create(
    @WorkspaceId() workspaceId: string | undefined,
    @CurrentUser() currentUser: CurrentUserPayload | undefined,
    @Body() dto: CreateRecordDto,
  ) {
    return this.recordsService.create(workspaceId, currentUser, dto);
  }

  @Get(':recordId')
  @Permissions('records.read')
  getOne(
    @WorkspaceId() workspaceId: string | undefined,
    @CurrentUser() currentUser: CurrentUserPayload | undefined,
    @Param('recordId') recordId: string,
  ) {
    return this.recordsService.getOne(workspaceId, currentUser, recordId);
  }

  @Patch(':recordId')
  @Permissions('records.update')
  update(
    @WorkspaceId() workspaceId: string | undefined,
    @CurrentUser() currentUser: CurrentUserPayload | undefined,
    @Param('recordId') recordId: string,
    @Body() dto: UpdateRecordDto,
  ) {
    return this.recordsService.update(workspaceId, currentUser, recordId, dto);
  }

  @Post(':recordId/status')
  @Permissions('records.change_status')
  changeStatus(
    @WorkspaceId() workspaceId: string | undefined,
    @CurrentUser() currentUser: CurrentUserPayload | undefined,
    @Param('recordId') recordId: string,
    @Body() dto: ChangeRecordStatusDto,
  ) {
    return this.recordsService.changeStatus(workspaceId, currentUser, recordId, dto);
  }

  @Post(':recordId/assign')
  @Permissions('records.assign')
  assign(
    @WorkspaceId() workspaceId: string | undefined,
    @CurrentUser() currentUser: CurrentUserPayload | undefined,
    @Param('recordId') recordId: string,
    @Body() dto: AssignRecordDto,
  ) {
    return this.recordsService.assign(workspaceId, currentUser, recordId, dto);
  }

  @Post(':recordId/tags')
  @Permissions('records.update')
  assignTag(
    @WorkspaceId() workspaceId: string | undefined,
    @CurrentUser() currentUser: CurrentUserPayload | undefined,
    @Param('recordId') recordId: string,
    @Body() dto: AssignTagDto,
  ) {
    return this.recordsService.assignTag(workspaceId, currentUser, recordId, dto);
  }

  @Delete(':recordId')
  @Permissions('records.update')
  remove(
    @WorkspaceId() workspaceId: string | undefined,
    @CurrentUser() currentUser: CurrentUserPayload | undefined,
    @Param('recordId') recordId: string,
  ) {
    return this.recordsService.remove(workspaceId, currentUser, recordId);
  }

  @Delete(':recordId/tags/:tagId')
  @Permissions('records.update')
  removeTag(
    @WorkspaceId() workspaceId: string | undefined,
    @CurrentUser() currentUser: CurrentUserPayload | undefined,
    @Param('recordId') recordId: string,
    @Param('tagId') tagId: string,
  ) {
    return this.recordsService.removeTag(workspaceId, currentUser, recordId, tagId);
  }
}
