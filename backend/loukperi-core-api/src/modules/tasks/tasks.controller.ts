import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards, UseInterceptors } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentUser, CurrentUserPayload } from 'src/common/decorators/current-user.decorator';
import { Permissions } from 'src/common/decorators/permissions.decorator';
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
  @Permissions('tasks.read')
  list(
    @WorkspaceId() workspaceId: string | undefined,
    @CurrentUser() currentUser: CurrentUserPayload | undefined,
    @Query() query: ListTasksQueryDto,
  ) {
    return this.tasksService.list(workspaceId, currentUser, query);
  }

  @Post()
  @Permissions('tasks.create')
  create(
    @WorkspaceId() workspaceId: string | undefined,
    @CurrentUser() currentUser: CurrentUserPayload | undefined,
    @Body() dto: CreateTaskDto,
  ) {
    return this.tasksService.create(workspaceId, currentUser, dto);
  }

  @Get(':taskId')
  @Permissions('tasks.read')
  getOne(
    @WorkspaceId() workspaceId: string | undefined,
    @CurrentUser() currentUser: CurrentUserPayload | undefined,
    @Param('taskId') taskId: string,
  ) {
    return this.tasksService.getOne(workspaceId, currentUser, taskId);
  }

  @Patch(':taskId')
  @Permissions('tasks.update')
  update(
    @WorkspaceId() workspaceId: string | undefined,
    @CurrentUser() currentUser: CurrentUserPayload | undefined,
    @Param('taskId') taskId: string,
    @Body() dto: UpdateTaskDto,
  ) {
    return this.tasksService.update(workspaceId, currentUser, taskId, dto);
  }

  @Post(':taskId/complete')
  @Permissions('tasks.complete')
  complete(
    @WorkspaceId() workspaceId: string | undefined,
    @CurrentUser() currentUser: CurrentUserPayload | undefined,
    @Param('taskId') taskId: string,
    @Body() dto: CompleteTaskDto,
  ) {
    return this.tasksService.complete(workspaceId, currentUser, taskId, dto);
  }

  @Post(':taskId/reopen')
  @Permissions('tasks.update')
  reopen(
    @WorkspaceId() workspaceId: string | undefined,
    @CurrentUser() currentUser: CurrentUserPayload | undefined,
    @Param('taskId') taskId: string,
  ) {
    return this.tasksService.reopen(workspaceId, currentUser, taskId);
  }
}
