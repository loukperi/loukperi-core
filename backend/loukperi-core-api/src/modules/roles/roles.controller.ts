import { Body, Controller, Get, Param, Patch, Post, Put, UseGuards, UseInterceptors } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Permissions } from 'src/common/decorators/permissions.decorator';
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
  list() {
    return this.rolesService.list();
  }

  @Post('roles')
  @Permissions('roles.create')
  create(@Body() dto: CreateRoleDto) {
    return this.rolesService.create(dto);
  }

  @Patch('roles/:roleId')
  @Permissions('roles.update')
  update(@Param('roleId') roleId: string, @Body() dto: UpdateRoleDto) {
    return this.rolesService.update(roleId, dto);
  }

  @Put('roles/:roleId/permissions')
  @Permissions('roles.assign')
  replacePermissions(
    @Param('roleId') roleId: string,
    @Body() dto: ReplaceRolePermissionsDto,
  ) {
    return this.rolesService.replacePermissions(roleId, dto);
  }

  @Put('workspace-users/:workspaceUserId/roles')
  @Permissions('roles.assign')
  replaceWorkspaceUserRoles(
    @Param('workspaceUserId') workspaceUserId: string,
    @Body() dto: ReplaceWorkspaceUserRolesDto,
  ) {
    return this.rolesService.replaceWorkspaceUserRoles(workspaceUserId, dto);
  }
}
