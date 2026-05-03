import { Controller, Get, Param, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiQuery, ApiTags } from '@nestjs/swagger';
import { ActivityService } from './activity.service';

@ApiTags('Activity')
@ApiBearerAuth()
@Controller()
export class ActivityController {
  constructor(private readonly activityService: ActivityService) {}

  @Get('activity')
  @ApiQuery({ name: 'workspace_id', required: false })
  @ApiQuery({ name: 'entity_type', required: false, example: 'record' })
  @ApiQuery({ name: 'entity_id', required: false })
  @ApiQuery({ name: 'actor_user_id', required: false })
  @ApiQuery({ name: 'page', required: false, example: 1 })
  @ApiQuery({ name: 'page_size', required: false, example: 25 })
  findAll(
    @Query('workspace_id') workspaceId?: string,
    @Query('entity_type') entityType?: string,
    @Query('entity_id') entityId?: string,
    @Query('actor_user_id') actorUserId?: string,
    @Query('page') page?: string,
    @Query('page_size') pageSize?: string,
  ) {
    return this.activityService.findAll({
      workspaceId,
      entityType,
      entityId,
      actorUserId,
      page: page ? Number(page) : undefined,
      pageSize: pageSize ? Number(pageSize) : undefined,
    });
  }

  @Get('records/:recordId/activity')
  @ApiQuery({ name: 'workspace_id', required: false })
  findRecordActivity(
    @Param('recordId') recordId: string,
    @Query('workspace_id') workspaceId?: string,
  ) {
    return this.activityService.findRecordActivity(recordId, workspaceId);
  }
}