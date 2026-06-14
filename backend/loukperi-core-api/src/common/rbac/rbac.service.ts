import { Injectable } from '@nestjs/common';
import { CurrentUserPayload } from 'src/common/decorators/current-user.decorator';
import { PrismaService } from 'src/database/prisma.service';

@Injectable()
export class RbacService {
  constructor(private readonly prisma: PrismaService) {}

  async hasAllPermissions(
    workspaceId: string | undefined,
    currentUser: CurrentUserPayload | undefined,
    requiredPermissions: string[],
  ) {
    if (requiredPermissions.length === 0) {
      return true;
    }

    const userPermissionSet = await this.getPermissionSet(workspaceId, currentUser);

    if (userPermissionSet.has('*')) {
      return true;
    }

    return requiredPermissions.every((permission) =>
      userPermissionSet.has(permission),
    );
  }

  async hasAnyPermission(
    workspaceId: string | undefined,
    currentUser: CurrentUserPayload | undefined,
    requiredPermissions: string[],
  ) {
    if (requiredPermissions.length === 0) {
      return true;
    }

    const userPermissionSet = await this.getPermissionSet(workspaceId, currentUser);

    if (userPermissionSet.has('*')) {
      return true;
    }

    return requiredPermissions.some((permission) =>
      userPermissionSet.has(permission),
    );
  }

  async getPermissionSet(
    workspaceId: string | undefined,
    currentUser: CurrentUserPayload | undefined,
  ) {
    const permissionSet = new Set<string>();

    for (const permission of currentUser?.permissions ?? []) {
      permissionSet.add(permission);
    }

    const userId = await this.resolveActorUserDbId(currentUser);

    if (!userId) {
      return permissionSet;
    }

    const resolvedWorkspaceId =
      workspaceId ??
      currentUser?.defaultWorkspaceId ??
      (currentUser as any)?.workspaceId ??
      (currentUser as any)?.workspace_id ??
      (currentUser?.workspaceIds?.length === 1 ? currentUser.workspaceIds[0] : undefined);

    if (!resolvedWorkspaceId) {
      return permissionSet;
    }

    const membership = await this.prisma.workspaceUser.findFirst({
      where: {
        workspaceId: resolvedWorkspaceId,
        userId,
        status: 'active',
        workspace: {
          isActive: true,
        },
      },
      select: {
        id: true,
        isOwner: true,
        roles: {
          select: {
            role: {
              select: {
                code: true,
                name: true,
                rolePermissions: {
                  select: {
                    permission: {
                      select: {
                        code: true,
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!membership) {
      return permissionSet;
    }

    // Workspace owners are treated as full admins.
    if (membership.isOwner) {
      permissionSet.add('*');
      return permissionSet;
    }

    for (const workspaceUserRole of membership.roles) {
      for (const rolePermission of workspaceUserRole.role.rolePermissions) {
        permissionSet.add(rolePermission.permission.code);
      }
    }

    return permissionSet;
  }

  async getCapabilities(
    workspaceId: string | undefined,
    currentUser: CurrentUserPayload | undefined,
  ) {
    const permissions = Array.from(
      await this.getPermissionSet(workspaceId, currentUser),
    ).sort();

    return {
      workspaceId:
        workspaceId ??
        currentUser?.defaultWorkspaceId ??
        (currentUser as any)?.workspaceId ??
        (currentUser as any)?.workspace_id ??
        null,
      permissions,
      isOwnerOrAdmin: permissions.includes('*'),
    };
  }

  private async resolveActorUserDbId(
    currentUser: CurrentUserPayload | undefined,
  ) {
    const user = currentUser as any;

    const candidateIds = [
      user?.id,
      user?.userId,
      user?.user_id,
      user?.sub,
    ].filter(Boolean);

    for (const candidateId of candidateIds) {
      const found = await this.prisma.user.findUnique({
        where: { id: candidateId },
        select: { id: true },
      });

      if (found) {
        return found.id;
      }
    }

    const candidateEmails = [
      user?.email,
      user?.username,
      user?.login,
    ].filter(Boolean);

    for (const candidateEmail of candidateEmails) {
      const found = await this.prisma.user.findFirst({
        where: { email: candidateEmail },
        select: { id: true },
      });

      if (found) {
        return found.id;
      }
    }

    return null;
  }
}
