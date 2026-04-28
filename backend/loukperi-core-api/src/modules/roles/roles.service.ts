import { Injectable } from '@nestjs/common';
import { CreateRoleDto } from './dto/create-role.dto';
import { ReplaceRolePermissionsDto } from './dto/replace-role-permissions.dto';
import { ReplaceWorkspaceUserRolesDto } from './dto/replace-workspace-user-roles.dto';
import { UpdateRoleDto } from './dto/update-role.dto';

@Injectable()
export class RolesService {
  async list() {
    return [];
  }

  async create(dto: CreateRoleDto) {
    return { id: '00000000-0000-0000-0000-000000000200', ...dto };
  }

  async update(roleId: string, dto: UpdateRoleDto) {
    return { id: roleId, ...dto };
  }

  async replacePermissions(roleId: string, dto: ReplaceRolePermissionsDto) {
    return { id: roleId, permission_ids: dto.permission_ids };
  }

  async replaceWorkspaceUserRoles(
    workspaceUserId: string,
    dto: ReplaceWorkspaceUserRolesDto,
  ) {
    return { id: workspaceUserId, role_ids: dto.role_ids };
  }
}
