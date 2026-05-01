import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as argon2 from 'argon2';
import { CurrentUserPayload } from 'src/common/decorators/current-user.decorator';
import { resolvePermissionsFromRoleCodes } from 'src/common/constants/role-permissions-map';
import { AuthRepository } from 'src/database/repositories/auth.repository';
import { LoginDto } from './dto/login.dto';
import { LogoutDto } from './dto/logout.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';

type AuthUser = Awaited<ReturnType<AuthRepository['findUserById']>>;

@Injectable()
export class AuthService {
  constructor(
    private readonly authRepository: AuthRepository,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  async login(dto: LoginDto) {
    const user = await this.authRepository.findUserByEmail(dto.email);

    if (!user || !user.isActive) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const passwordMatches = await this.verifyPassword(
      dto.password,
      user.passwordHash,
    );

    if (!passwordMatches) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const authPayload = this.buildAuthPayload(user);

    await this.authRepository.markLastLogin(user.id);

    return {
      access_token: await this.signAccessToken(authPayload),
      refresh_token: await this.signRefreshToken(user.id, user.email),
      user: {
        id: user.id,
        email: user.email,
        first_name: user.firstName,
        last_name: user.lastName,
      },
      workspaces: authPayload.workspaceIds.map((workspaceId) => {
        const membership = user.memberships.find(
          (item) => item.workspaceId === workspaceId,
        );

        return {
          id: membership?.workspace.id ?? workspaceId,
          name: membership?.workspace.name ?? 'Workspace',
          slug: membership?.workspace.slug ?? 'workspace',
        };
      }),
    };
  }

  async refresh(dto: RefreshTokenDto) {
    try {
      const decoded = await this.jwtService.verifyAsync<{
        sub: string;
        email?: string;
        type?: string;
      }>(dto.refresh_token, {
        secret: this.configService.getOrThrow<string>('JWT_REFRESH_SECRET'),
      });

      if (decoded.type !== 'refresh') {
        throw new UnauthorizedException('Invalid refresh token');
      }

      const user = await this.authRepository.findUserById(decoded.sub);

      if (!user || !user.isActive) {
        throw new UnauthorizedException('Invalid refresh token');
      }

      const authPayload = this.buildAuthPayload(user);

      return {
        access_token: await this.signAccessToken(authPayload),
        refresh_token: await this.signRefreshToken(user.id, user.email),
      };
    } catch {
      throw new UnauthorizedException('Invalid refresh token');
    }
  }

  async logout(_dto: LogoutDto) {
    return { success: true };
  }

  async me(user: CurrentUserPayload | undefined) {
    if (!user) {
      throw new UnauthorizedException('Unauthorized');
    }

    const currentUser = await this.authRepository.findUserById(user.sub);

    if (!currentUser) {
      throw new UnauthorizedException('Unauthorized');
    }

    const authPayload = this.buildAuthPayload(currentUser);

    return {
      user: {
        id: currentUser.id,
        email: currentUser.email,
        first_name: currentUser.firstName,
        last_name: currentUser.lastName,
        is_active: currentUser.isActive,
      },
      memberships: currentUser.memberships.map((membership) => ({
        id: membership.id,
        workspace_id: membership.workspaceId,
        workspace_name: membership.workspace.name,
        workspace_slug: membership.workspace.slug,
        status: membership.status,
        is_owner: membership.isOwner,
        roles: membership.roles.map((item) => ({
          id: item.role.id,
          code: item.role.code,
          name: item.role.name,
        })),
      })),
      effective_permissions: authPayload.permissions,
      default_workspace_id: authPayload.defaultWorkspaceId,
    };
  }

  private async signAccessToken(payload: Record<string, unknown>) {
    return this.jwtService.signAsync(payload, {
      secret: this.configService.getOrThrow<string>('JWT_ACCESS_SECRET'),
      expiresIn: (this.configService.get<string>('JWT_ACCESS_TTL') ?? '12h') as any,
    });
  }

  private async signRefreshToken(userId: string, email: string) {
    return this.jwtService.signAsync(
      {
        sub: userId,
        email,
        type: 'refresh',
      },
      {
        secret: this.configService.getOrThrow<string>('JWT_REFRESH_SECRET'),
        expiresIn: (this.configService.get<string>('JWT_REFRESH_TTL') ?? '30d') as any,
      },
    );
  }

  private buildAuthPayload(user: AuthUser) {
    if (!user) {
      throw new UnauthorizedException('Unauthorized');
    }

    const activeMemberships = user.memberships.filter(
      (membership) =>
        membership.status === 'active' && membership.workspace.isActive,
    );

    const workspaceIds = activeMemberships.map(
      (membership) => membership.workspaceId,
    );

    const roleCodes = activeMemberships.flatMap((membership) =>
      membership.roles.map((item) => item.role.code),
    );

    const dbPermissions = activeMemberships.flatMap((membership) =>
      membership.roles.flatMap((item) =>
        item.role.rolePermissions.map(
          (rolePermission) => rolePermission.permission.code,
        ),
      ),
    );

    const permissions = Array.from(
      new Set([...resolvePermissionsFromRoleCodes(roleCodes), ...dbPermissions]),
    );

    return {
      sub: user.id,
      email: user.email,
      workspaceIds,
      defaultWorkspaceId: workspaceIds[0],
      permissions,
    };
  }

  private async verifyPassword(
    plainTextPassword: string,
    passwordHash: string,
  ) {
    if (passwordHash.startsWith('$argon2')) {
      return argon2.verify(passwordHash, plainTextPassword);
    }

    if (passwordHash.startsWith('plain:')) {
      return passwordHash === `plain:${plainTextPassword}`;
    }

    return false;
  }
}