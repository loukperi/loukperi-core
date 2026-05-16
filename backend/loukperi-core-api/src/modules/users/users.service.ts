import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import * as argon2 from 'argon2';
import { CurrentUserPayload } from 'src/common/decorators/current-user.decorator';
import { UserRepository } from 'src/database/repositories/user.repository';
import { CreateUserDto } from './dto/create-user.dto';
import { ListUsersQueryDto } from './dto/list-users.query.dto';
import { UpdateUserDto } from './dto/update-user.dto';

@Injectable()
export class UsersService {
  constructor(private readonly userRepository: UserRepository) {}

  async list(
    workspaceId: string | undefined,
    currentUser: CurrentUserPayload | undefined,
    query: ListUsersQueryDto,
  ) {
    const resolvedWorkspaceId = this.resolveWorkspaceId(workspaceId, currentUser);
    const result = await this.userRepository.listByWorkspace(
      resolvedWorkspaceId,
      query,
    );

    return {
      items: result.items.map((membership) => this.toUserResponse(membership)),
      pagination: {
        page: query.page,
        page_size: query.page_size,
        total: result.total,
        total_pages: Math.ceil(result.total / query.page_size),
      },
    };
  }

  async create(
    workspaceId: string | undefined,
    currentUser: CurrentUserPayload | undefined,
    dto: CreateUserDto,
  ) {
    const resolvedWorkspaceId = this.resolveWorkspaceId(workspaceId, currentUser);

    await this.validateRoleIds(resolvedWorkspaceId, dto.role_ids ?? []);

    const membership = await this.userRepository.createInWorkspace({
      workspaceId: resolvedWorkspaceId,
      email: dto.email,
      firstName: dto.first_name,
      lastName: dto.last_name,
      phone: dto.phone,
      jobTitle: dto.job_title,
      passwordHash: await argon2.hash(dto.password ?? 'ChangeMe123!'),
      roleIds: dto.role_ids ?? [],
    });

    return this.toUserResponse(membership);
  }

  async getOne(
    workspaceId: string | undefined,
    currentUser: CurrentUserPayload | undefined,
    userId: string,
  ) {
    const resolvedWorkspaceId = this.resolveWorkspaceId(workspaceId, currentUser);
    const membership = await this.userRepository.findMembershipByUserId(
      resolvedWorkspaceId,
      userId,
    );

    if (!membership) {
      throw new NotFoundException('User not found in workspace');
    }

    return this.toUserResponse(membership);
  }

  async update(
    workspaceId: string | undefined,
    currentUser: CurrentUserPayload | undefined,
    userId: string,
    dto: UpdateUserDto,
  ) {
    const resolvedWorkspaceId = this.resolveWorkspaceId(workspaceId, currentUser);

    const existing = await this.userRepository.findMembershipByUserId(
      resolvedWorkspaceId,
      userId,
    );

    if (!existing) {
      throw new NotFoundException('User not found in workspace');
    }

    if (dto.role_ids !== undefined) {
      await this.validateRoleIds(resolvedWorkspaceId, dto.role_ids);
    }

    const updated = await this.userRepository.updateInWorkspace({
      workspaceId: resolvedWorkspaceId,
      userId,
      userData: {
        firstName: dto.first_name,
        lastName: dto.last_name,
        phone: dto.phone,
        isActive: dto.is_active,
      },
      membershipData: {
        status: dto.membership_status,
        jobTitle: dto.job_title,
      },
      roleIds: dto.role_ids,
    });

    return this.toUserResponse(updated);
  }

  async activate(
    workspaceId: string | undefined,
    currentUser: CurrentUserPayload | undefined,
    userId: string,
  ) {
    const resolvedWorkspaceId = this.resolveWorkspaceId(workspaceId, currentUser);

    const existing = await this.userRepository.findMembershipByUserId(
      resolvedWorkspaceId,
      userId,
    );

    if (!existing) {
      throw new NotFoundException('User not found in workspace');
    }

    const updated = await this.userRepository.updateInWorkspace({
      workspaceId: resolvedWorkspaceId,
      userId,
      userData: {
        isActive: true,
      },
      membershipData: {
        status: 'active',
      },
    });

    return this.toUserResponse(updated);
  }

  async deactivate(
    workspaceId: string | undefined,
    currentUser: CurrentUserPayload | undefined,
    userId: string,
  ) {
    const resolvedWorkspaceId = this.resolveWorkspaceId(workspaceId, currentUser);

    const existing = await this.userRepository.findMembershipByUserId(
      resolvedWorkspaceId,
      userId,
    );

    if (!existing) {
      throw new NotFoundException('User not found in workspace');
    }

    if (existing.isOwner) {
      throw new BadRequestException('Workspace owner cannot be deactivated');
    }

    const updated = await this.userRepository.updateInWorkspace({
      workspaceId: resolvedWorkspaceId,
      userId,
      userData: {
        isActive: false,
      },
      membershipData: {
        status: 'inactive',
      },
    });

    return this.toUserResponse(updated);
  }

  private async validateRoleIds(workspaceId: string, roleIds: string[]) {
    if (!roleIds.length) {
      return;
    }

    const roles = await this.userRepository.findRolesByIds(workspaceId, roleIds);

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

  private toUserResponse(membership: {
    id: string;
    status: string;
    jobTitle: string | null;
    avatarUrl: string | null;
    isOwner: boolean;
    createdAt: Date;
    updatedAt: Date;
    user: {
      id: string;
      email: string;
      firstName: string;
      lastName: string;
      phone: string | null;
      isActive: boolean;
      lastLoginAt: Date | null;
      createdAt: Date;
      updatedAt: Date;
    };
    roles: Array<{
      role: {
        id: string;
        code: string;
        name: string;
      };
    }>;
  }) {
    return {
      id: membership.user.id,
      workspace_user_id: membership.id,
      email: membership.user.email,
      first_name: membership.user.firstName,
      last_name: membership.user.lastName,
      full_name: `${membership.user.firstName} ${membership.user.lastName}`,
      phone: membership.user.phone,
      is_active: membership.user.isActive,
      last_login_at: membership.user.lastLoginAt,
      membership_status: membership.status,
      job_title: membership.jobTitle,
      avatar_url: membership.avatarUrl,
      is_owner: membership.isOwner,
      role_ids: membership.roles.map((item) => item.role.id),
      roles: membership.roles.map((item) => ({
        id: item.role.id,
        code: item.role.code,
        name: item.role.name,
      })),
      created_at: membership.user.createdAt,
      updated_at: membership.user.updatedAt,
    };
  }
}