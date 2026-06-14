import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { CurrentUserPayload } from 'src/common/decorators/current-user.decorator';
import { PERMISSIONS_KEY } from 'src/common/decorators/permissions.decorator';
import { RbacService } from 'src/common/rbac/rbac.service';

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly rbacService: RbacService,
  ) {}

  async canActivate(context: ExecutionContext) {
    const requiredPermissions =
      this.reflector.getAllAndOverride<string[]>(PERMISSIONS_KEY, [
        context.getHandler(),
        context.getClass(),
      ]) ?? [];

    if (requiredPermissions.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest<{
      user?: CurrentUserPayload;
      headers: Record<string, string | string[] | undefined>;
      params?: Record<string, string | undefined>;
      body?: Record<string, unknown>;
    }>();

    const workspaceId = this.resolveWorkspaceId(request);
    const allowed = await this.rbacService.hasAnyPermission(
      workspaceId,
      request.user,
      requiredPermissions,
    );

    if (!allowed) {
      throw new ForbiddenException(
        `Missing permission. Required one of: ${requiredPermissions.join(', ')}`,
      );
    }

    return true;
  }

  private resolveWorkspaceId(request: {
    user?: CurrentUserPayload;
    headers: Record<string, string | string[] | undefined>;
    params?: Record<string, string | undefined>;
    body?: Record<string, unknown>;
  }) {
    const headerWorkspaceId = request.headers['x-workspace-id'];
    const workspaceIdFromHeader = Array.isArray(headerWorkspaceId)
      ? headerWorkspaceId[0]
      : headerWorkspaceId;

    const workspaceIdFromBody =
      typeof request.body?.workspace_id === 'string'
        ? request.body.workspace_id
        : typeof request.body?.workspaceId === 'string'
          ? request.body.workspaceId
          : undefined;

    return (
      workspaceIdFromHeader ??
      request.params?.workspaceId ??
      workspaceIdFromBody ??
      request.user?.defaultWorkspaceId ??
      (request.user as any)?.workspaceId ??
      (request.user as any)?.workspace_id ??
      (request.user?.workspaceIds?.length === 1
        ? request.user.workspaceIds[0]
        : undefined)
    );
  }
}
