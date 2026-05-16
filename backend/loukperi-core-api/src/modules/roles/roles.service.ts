import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { CurrentUserPayload } from 'src/common/decorators/current-user.decorator';
import { PrismaService } from 'src/database/prisma.service';
import { CreateRoleDto } from './dto/create-role.dto';
import { ReplaceRolePermissionsDto } from './dto/replace-role-permissions.dto';
import { ReplaceWorkspaceUserRolesDto } from './dto/replace-workspace-user-roles.dto';
import { UpdateRoleDto } from './dto/update-role.dto';

@Injectable()
export class RolesService {
  constructor(private readonly prisma: PrismaService) {}

  async list(
    workspaceId: string | undefined,
    currentUser: CurrentUserPayload | undefined,
  ) {
    const resolvedWorkspaceId = this.resolveWorkspaceId(workspaceId, currentUser);

    const roles = await this.prisma.role.findMany({
      where: {
        workspaceId: resolvedWorkspaceId,
      },
      orderBy: [{ isSystemRole: 'desc' }, { name: 'asc' }],
      include: this.roleInclude(),
    });

    return roles.map((role) => this.toRoleResponse(role));
  }

  async listPermissions() {
    const permissions = await this.prisma.permission.findMany({
      orderBy: [{ module: 'asc' }, { code: 'asc' }],
    });

    return permissions.map((permission) => ({
      id: permission.id,
      code: permission.code,
      name: permission.name,
      description: permission.description,
      module: permission.module,
      created_at: permission.createdAt,
      updated_at: permission.updatedAt,
    }));
  }

  async getOne(
    workspaceId: string | undefined,
    currentUser: CurrentUserPayload | undefined,
    roleId: string,
  ) {
    const resolvedWorkspaceId = this.resolveWorkspaceId(workspaceId, currentUser);
    this.validateUuid(roleId, 'roleId');

    const role = await this.prisma.role.findFirst({
      where: {
        id: roleId,
        workspaceId: resolvedWorkspaceId,
      },
      include: this.roleInclude(),
    });

    if (!role) {
      throw new NotFoundException('Role not found');
    }

    return this.toRoleResponse(role);
  }

  async create(
    workspaceId: string | undefined,
    currentUser: CurrentUserPayload | undefined,
    dto: CreateRoleDto,
  ) {
    const resolvedWorkspaceId = this.resolveWorkspaceId(workspaceId, currentUser);
    const normalizedCode = this.normalizeCode(dto.code);

    await this.ensureRoleCodeIsAvailable(resolvedWorkspaceId, normalizedCode);
    await this.validatePermissionIds(dto.permission_ids ?? []);

    const created = await this.prisma.$transaction(async (tx) => {
      const role = await tx.role.create({
        data: {
          workspaceId: resolvedWorkspaceId,
          code: normalizedCode,
          name: dto.name,
          description: dto.description,
          isSystemRole: false,
        },
      });

      if (dto.permission_ids?.length) {
        await tx.rolePermission.createMany({
          data: dto.permission_ids.map((permissionId) => ({
            workspaceId: resolvedWorkspaceId,
            roleId: role.id,
            permissionId,
          })),
          skipDuplicates: true,
        });
      }

      return tx.role.findUniqueOrThrow({
        where: { id: role.id },
        include: this.roleInclude(),
      });
    });

    return this.toRoleResponse(created);
  }

  async update(
    workspaceId: string | undefined,
    currentUser: CurrentUserPayload | undefined,
    roleId: string,
    dto: UpdateRoleDto,
  ) {
    const resolvedWorkspaceId = this.resolveWorkspaceId(workspaceId, currentUser);
    this.validateUuid(roleId, 'roleId');

    const existing = await this.prisma.role.findFirst({
      where: {
        id: roleId,
        workspaceId: resolvedWorkspaceId,
      },
    });

    if (!existing) {
      throw new NotFoundException('Role not found');
    }

    if (dto.permission_ids !== undefined) {
      await this.validatePermissionIds(dto.permission_ids);
    }

    const updated = await this.prisma.$transaction(async (tx) => {
      await tx.role.update({
        where: {
          id: roleId,
        },
        data: {
          name: dto.name,
          description: dto.description,
        },
      });

      if (dto.permission_ids !== undefined) {
        await tx.rolePermission.deleteMany({
          where: {
            workspaceId: resolvedWorkspaceId,
            roleId,
          },
        });

        if (dto.permission_ids.length) {
          await tx.rolePermission.createMany({
            data: dto.permission_ids.map((permissionId) => ({
              workspaceId: resolvedWorkspaceId,
              roleId,
              permissionId,
            })),
            skipDuplicates: true,
          });
        }
      }

      return tx.role.findUniqueOrThrow({
        where: { id: roleId },
        include: this.roleInclude(),
      });
    });

    return this.toRoleResponse(updated);
  }

  async remove(
    workspaceId: string | undefined,
    currentUser: CurrentUserPayload | undefined,
    roleId: string,
  ) {
    const resolvedWorkspaceId = this.resolveWorkspaceId(workspaceId, currentUser);
    this.validateUuid(roleId, 'roleId');

    const existing = await this.prisma.role.findFirst({
      where: {
        id: roleId,
        workspaceId: resolvedWorkspaceId,
      },
      include: {
        workspaceUsers: true,
      },
    });

    if (!existing) {
      throw new NotFoundException('Role not found');
    }

    if (existing.isSystemRole) {
      throw new BadRequestException('System roles cannot be deleted');
    }

    if (existing.workspaceUsers.length > 0) {
      throw new BadRequestException(
        'Role is assigned to workspace users and cannot be deleted',
      );
    }

    await this.prisma.role.delete({
      where: {
        id: roleId,
      },
    });

    return {
      id: roleId,
      deleted: true,
    };
  }

  async replacePermissions(
    workspaceId: string | undefined,
    currentUser: CurrentUserPayload | undefined,
    roleId: string,
    dto: ReplaceRolePermissionsDto,
  ) {
    const resolvedWorkspaceId = this.resolveWorkspaceId(workspaceId, currentUser);
    this.validateUuid(roleId, 'roleId');

    const existing = await this.prisma.role.findFirst({
      where: {
        id: roleId,
        workspaceId: resolvedWorkspaceId,
      },
    });

    if (!existing) {
      throw new NotFoundException('Role not found');
    }

    await this.validatePermissionIds(dto.permission_ids);

    const updated = await this.prisma.$transaction(async (tx) => {
      await tx.rolePermission.deleteMany({
        where: {
          workspaceId: resolvedWorkspaceId,
          roleId,
        },
      });

      if (dto.permission_ids.length) {
        await tx.rolePermission.createMany({
          data: dto.permission_ids.map((permissionId) => ({
            workspaceId: resolvedWorkspaceId,
            roleId,
            permissionId,
          })),
          skipDuplicates: true,
        });
      }

      return tx.role.findUniqueOrThrow({
        where: {
          id: roleId,
        },
        include: this.roleInclude(),
      });
    });

    return this.toRoleResponse(updated);
  }

  async replaceWorkspaceUserRoles(
    workspaceId: string | undefined,
    currentUser: CurrentUserPayload | undefined,
    workspaceUserId: string,
    dto: ReplaceWorkspaceUserRolesDto,
  ) {
    const resolvedWorkspaceId = this.resolveWorkspaceId(workspaceId, currentUser);
    this.validateUuid(workspaceUserId, 'workspaceUserId');

    const workspaceUser = await this.prisma.workspaceUser.findFirst({
      where: {
        id: workspaceUserId,
        workspaceId: resolvedWorkspaceId,
      },
    });

    if (!workspaceUser) {
      throw new NotFoundException('Workspace user not found');
    }

    await this.validateRoleIds(resolvedWorkspaceId, dto.role_ids);

    const updated = await this.prisma.$transaction(async (tx) => {
      await tx.workspaceUserRole.deleteMany({
        where: {
          workspaceId: resolvedWorkspaceId,
          workspaceUserId,
        },
      });

      if (dto.role_ids.length) {
        await tx.workspaceUserRole.createMany({
          data: dto.role_ids.map((roleId) => ({
            workspaceId: resolvedWorkspaceId,
            workspaceUserId,
            roleId,
          })),
          skipDuplicates: true,
        });
      }

      return tx.workspaceUser.findUniqueOrThrow({
        where: {
          id: workspaceUserId,
        },
        include: {
          user: true,
          roles: {
            include: {
              role: true,
            },
          },
        },
      });
    });

    return {
      workspace_user_id: updated.id,
      user_id: updated.userId,
      email: updated.user.email,
      full_name: `${updated.user.firstName} ${updated.user.lastName}`,
      role_ids: updated.roles.map((item) => item.role.id),
      roles: updated.roles.map((item) => ({
        id: item.role.id,
        code: item.role.code,
        name: item.role.name,
      })),
    };
  }

  private async ensureRoleCodeIsAvailable(workspaceId: string, code: string) {
    const existing = await this.prisma.role.findUnique({
      where: {
        workspaceId_code: {
          workspaceId,
          code,
        },
      },
    });

    if (existing) {
      throw new BadRequestException('Role code already exists in this workspace');
    }
  }

  private async validatePermissionIds(permissionIds: string[]) {
    if (!permissionIds.length) {
      return;
    }

    const permissions = await this.prisma.permission.findMany({
      where: {
        id: {
          in: permissionIds,
        },
      },
      select: {
        id: true,
      },
    });

    if (permissions.length !== permissionIds.length) {
      throw new BadRequestException('One or more permission_ids do not exist');
    }
  }

  private async validateRoleIds(workspaceId: string, roleIds: string[]) {
    if (!roleIds.length) {
      return;
    }

    const roles = await this.prisma.role.findMany({
      where: {
        workspaceId,
        id: {
          in: roleIds,
        },
      },
      select: {
        id: true,
      },
    });

    if (roles.length !== roleIds.length) {
      throw new BadRequestException(
        'One or more role_ids do not exist in this workspace',
      );
    }
  }

  private resolveWorkspaceId(
    workspaceId: string | undefined,
    currentUser: CurrentUserPayload | undefined,
  ) {
    const resolvedWorkspaceId = workspaceId ?? currentUser?.defaultWorkspaceId;

    if (!resolvedWorkspaceId) {
      throw new ForbiddenException('Workspace context is required');
    }

    if (!currentUser || !currentUser.workspaceIds.includes(resolvedWorkspaceId)) {
      throw new ForbiddenException('No access to workspace');
    }

    return resolvedWorkspaceId;
  }

  private validateUuid(value: string, fieldName: string) {
    const normalizedValue = String(value ?? '')
      .trim()
      .replace(/[‐-‒–—―]/g, '-');

    const uuidRegex =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

    if (!uuidRegex.test(normalizedValue)) {
      throw new BadRequestException(`${fieldName} must be a valid UUID`);
    }
  }

  private normalizeCode(code: string) {
    return String(code ?? '')
      .trim()
      .toLowerCase()
      .replace(/\s+/g, '_')
      .replace(/[^a-z0-9_.-]/g, '_');
  }

  private roleInclude() {
    return {
      rolePermissions: {
        include: {
          permission: true,
        },
      },
      workspaceUsers: {
        select: {
          id: true,
        },
      },
    } satisfies Prisma.RoleInclude;
  }

  private toRoleResponse(role: {
    id: string;
    workspaceId: string;
    code: string;
    name: string;
    description: string | null;
    isSystemRole: boolean;
    createdAt: Date;
    updatedAt: Date;
    rolePermissions: Array<{
      permission: {
        id: string;
        code: string;
        name: string;
        description: string | null;
        module: string;
      };
    }>;
    workspaceUsers: Array<{
      id: string;
    }>;
  }) {
    return {
      id: role.id,
      workspace_id: role.workspaceId,
      code: role.code,
      name: role.name,
      description: role.description,
      is_system_role: role.isSystemRole,
      assigned_users_count: role.workspaceUsers.length,
      permission_ids: role.rolePermissions.map((item) => item.permission.id),
      permissions: role.rolePermissions.map((item) => ({
        id: item.permission.id,
        code: item.permission.code,
        name: item.permission.name,
        description: item.permission.description,
        module: item.permission.module,
      })),
      created_at: role.createdAt,
      updated_at: role.updatedAt,
    };
  }
}