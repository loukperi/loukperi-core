import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards, UseInterceptors } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentUser, CurrentUserPayload } from 'src/common/decorators/current-user.decorator';
import { Permissions } from 'src/common/decorators/permissions.decorator';
import { LOUKPERI_PERMISSIONS } from 'src/common/permissions/permission-codes';
import { WorkspaceId } from 'src/common/decorators/workspace-id.decorator';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';
import { PermissionsGuard } from 'src/common/guards/permissions.guard';
import { ResponseEnvelopeInterceptor } from 'src/common/interceptors/response-envelope.interceptor';
import { CompleteTaskDto } from './dto/complete-task.dto';
import { CreateTaskDto } from './dto/create-task.dto';
import { ListTasksQueryDto } from './dto/list-tasks.query.dto';
import { UpdateTaskDto } from './dto/update-task.dto';
import { TasksService } from './tasks.service';

@ApiTags('Tasks')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@UseInterceptors(ResponseEnvelopeInterceptor)
@Controller('tasks')
export class TasksController {
  constructor(private readonly tasksService: TasksService) {}

  @Get()
  @Permissions(LOUKPERI_PERMISSIONS.TASKS_VIEW)
  list(
    @WorkspaceId() workspaceId: string | undefined,
    @CurrentUser() currentUser: CurrentUserPayload | undefined,
    @Query() query: ListTasksQueryDto,
  ) {
    return this.tasksService.list(workspaceId, currentUser, query);
  }

  @Post()
  @Permissions(LOUKPERI_PERMISSIONS.TASKS_CREATE)
  create(
    @WorkspaceId() workspaceId: string | undefined,
    @CurrentUser() currentUser: CurrentUserPayload | undefined,
    @Body() dto: CreateTaskDto,
  ) {
    return this.tasksService.create(workspaceId, currentUser, dto);
  }

  @Get(':taskId')
  @Permissions(LOUKPERI_PERMISSIONS.TASKS_VIEW)
  getOne(
    @WorkspaceId() workspaceId: string | undefined,
    @CurrentUser() currentUser: CurrentUserPayload | undefined,
    @Param('taskId') taskId: string,
  ) {
    return this.tasksService.getOne(workspaceId, currentUser, taskId);
  }

  @Patch(':taskId')
  @Permissions(LOUKPERI_PERMISSIONS.TASKS_UPDATE)
  update(
    @WorkspaceId() workspaceId: string | undefined,
    @CurrentUser() currentUser: CurrentUserPayload | undefined,
    @Param('taskId') taskId: string,
    @Body() dto: UpdateTaskDto,
  ) {
    return this.tasksService.update(workspaceId, currentUser, taskId, dto);
  }

  @Delete(':taskId')
  @Permissions(LOUKPERI_PERMISSIONS.TASKS_DELETE)
  remove(
    @WorkspaceId() workspaceId: string | undefined,
    @CurrentUser() currentUser: CurrentUserPayload | undefined,
    @Param('taskId') taskId: string,
  ) {
    return this.tasksService.remove(workspaceId, currentUser, taskId);
  }
  
  @Post(':taskId/complete')
  @Permissions(LOUKPERI_PERMISSIONS.TASKS_COMPLETE)
  complete(
    @WorkspaceId() workspaceId: string | undefined,
    @CurrentUser() currentUser: CurrentUserPayload | undefined,
    @Param('taskId') taskId: string,
    @Body() dto: CompleteTaskDto,
  ) {
    return this.tasksService.complete(workspaceId, currentUser, taskId, dto);
  }

  @Post(':taskId/reopen')
  @Permissions(LOUKPERI_PERMISSIONS.TASKS_COMPLETE)
  reopen(
    @WorkspaceId() workspaceId: string | undefined,
    @CurrentUser() currentUser: CurrentUserPayload | undefined,
    @Param('taskId') taskId: string,
  ) {
    return this.tasksService.reopen(workspaceId, currentUser, taskId);
  }
}
