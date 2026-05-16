import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Put,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import {
  CurrentUser,
  CurrentUserPayload,
} from 'src/common/decorators/current-user.decorator';
import { Permissions } from 'src/common/decorators/permissions.decorator';
import { WorkspaceId } from 'src/common/decorators/workspace-id.decorator';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';
import { PermissionsGuard } from 'src/common/guards/permissions.guard';
import { ResponseEnvelopeInterceptor } from 'src/common/interceptors/response-envelope.interceptor';
import { CreateRoleDto } from './dto/create-role.dto';
import { ReplaceRolePermissionsDto } from './dto/replace-role-permissions.dto';
import { ReplaceWorkspaceUserRolesDto } from './dto/replace-workspace-user-roles.dto';
import { UpdateRoleDto } from './dto/update-role.dto';
import { RolesService } from './roles.service';

@ApiTags('Roles')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@UseInterceptors(ResponseEnvelopeInterceptor)
@Controller()
export class RolesController {
  constructor(private readonly rolesService: RolesService) {}

  @Get('roles')
  @Permissions('roles.read')
  list(
    @WorkspaceId() workspaceId: string | undefined,
    @CurrentUser() currentUser: CurrentUserPayload | undefined,
  ) {
    return this.rolesService.list(workspaceId, currentUser);
  }

  @Get('permissions')
  @Permissions('roles.read')
  listPermissions() {
    return this.rolesService.listPermissions();
  }

  @Post('roles')
  @Permissions('roles.create')
  create(
    @WorkspaceId() workspaceId: string | undefined,
    @CurrentUser() currentUser: CurrentUserPayload | undefined,
    @Body() dto: CreateRoleDto,
  ) {
    return this.rolesService.create(workspaceId, currentUser, dto);
  }

  @Get('roles/:roleId')
  @Permissions('roles.read')
  getOne(
    @WorkspaceId() workspaceId: string | undefined,
    @CurrentUser() currentUser: CurrentUserPayload | undefined,
    @Param('roleId') roleId: string,
  ) {
    return this.rolesService.getOne(workspaceId, currentUser, roleId);
  }

  @Patch('roles/:roleId')
  @Permissions('roles.update')
  update(
    @WorkspaceId() workspaceId: string | undefined,
    @CurrentUser() currentUser: CurrentUserPayload | undefined,
    @Param('roleId') roleId: string,
    @Body() dto: UpdateRoleDto,
  ) {
    return this.rolesService.update(workspaceId, currentUser, roleId, dto);
  }

  @Delete('roles/:roleId')
  @Permissions('roles.update')
  remove(
    @WorkspaceId() workspaceId: string | undefined,
    @CurrentUser() currentUser: CurrentUserPayload | undefined,
    @Param('roleId') roleId: string,
  ) {
    return this.rolesService.remove(workspaceId, currentUser, roleId);
  }

  @Put('roles/:roleId/permissions')
  @Permissions('roles.assign')
  replacePermissions(
    @WorkspaceId() workspaceId: string | undefined,
    @CurrentUser() currentUser: CurrentUserPayload | undefined,
    @Param('roleId') roleId: string,
    @Body() dto: ReplaceRolePermissionsDto,
  ) {
    return this.rolesService.replacePermissions(
      workspaceId,
      currentUser,
      roleId,
      dto,
    );
  }

  @Put('workspace-users/:workspaceUserId/roles')
  @Permissions('roles.assign')
  replaceWorkspaceUserRoles(
    @WorkspaceId() workspaceId: string | undefined,
    @CurrentUser() currentUser: CurrentUserPayload | undefined,
    @Param('workspaceUserId') workspaceUserId: string,
    @Body() dto: ReplaceWorkspaceUserRolesDto,
  ) {
    return this.rolesService.replaceWorkspaceUserRoles(
      workspaceId,
      currentUser,
      workspaceUserId,
      dto,
    );
  }
}