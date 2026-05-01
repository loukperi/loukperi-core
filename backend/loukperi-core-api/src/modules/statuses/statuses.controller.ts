import { Controller, Get, Param, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiQuery, ApiTags } from '@nestjs/swagger';
import { StatusesService } from './statuses.service';

@ApiTags('Statuses')
@ApiBearerAuth()
@Controller('api/v1/statuses')
export class StatusesController {
  constructor(private readonly statusesService: StatusesService) {}

  @Get()
  @ApiQuery({ name: 'workspace_id', required: false })
  @ApiQuery({ name: 'entity_type', required: false, example: 'record' })
  @ApiQuery({ name: 'record_type_id', required: false })
  findAll(
    @Query('workspace_id') workspaceId?: string,
    @Query('entity_type') entityType?: string,
    @Query('record_type_id') recordTypeId?: string,
  ) {
    return this.statusesService.findAll({
      workspaceId,
      entityType,
      recordTypeId,
    });
  }

  @Get(':statusId')
  findOne(@Param('statusId') statusId: string) {
    return this.statusesService.findOne(statusId);
  }
}