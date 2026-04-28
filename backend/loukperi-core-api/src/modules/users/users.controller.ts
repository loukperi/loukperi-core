import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards, UseInterceptors } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentUser, CurrentUserPayload } from 'src/common/decorators/current-user.decorator';
import { Permissions } from 'src/common/decorators/permissions.decorator';
import { WorkspaceId } from 'src/common/decorators/workspace-id.decorator';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';
import { PermissionsGuard } from 'src/common/guards/permissions.guard';
import { ResponseEnvelopeInterceptor } from 'src/common/interceptors/response-envelope.interceptor';
import { CreateUserDto } from './dto/create-user.dto';
import { ListUsersQueryDto } from './dto/list-users.query.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UsersService } from './users.service';

@ApiTags('Users')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@UseInterceptors(ResponseEnvelopeInterceptor)
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  @Permissions('users.read')
  list(
    @WorkspaceId() workspaceId: string | undefined,
    @CurrentUser() currentUser: CurrentUserPayload | undefined,
    @Query() query: ListUsersQueryDto,
  ) {
    return this.usersService.list(workspaceId, currentUser, query);
  }

  @Post()
  @Permissions('users.create')
  create(
    @WorkspaceId() workspaceId: string | undefined,
    @CurrentUser() currentUser: CurrentUserPayload | undefined,
    @Body() dto: CreateUserDto,
  ) {
    return this.usersService.create(workspaceId, currentUser, dto);
  }

  @Get(':userId')
  @Permissions('users.read')
  getOne(
    @WorkspaceId() workspaceId: string | undefined,
    @CurrentUser() currentUser: CurrentUserPayload | undefined,
    @Param('userId') userId: string,
  ) {
    return this.usersService.getOne(workspaceId, currentUser, userId);
  }

  @Patch(':userId')
  @Permissions('users.update')
  update(
    @WorkspaceId() workspaceId: string | undefined,
    @CurrentUser() currentUser: CurrentUserPayload | undefined,
    @Param('userId') userId: string,
    @Body() dto: UpdateUserDto,
  ) {
    return this.usersService.update(workspaceId, currentUser, userId, dto);
  }
}
