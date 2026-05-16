import { Injectable } from '@nestjs/common';
import { Prisma, User, WorkspaceUser } from '@prisma/client';
import { PrismaService } from '../prisma.service';

type UserPatch = Partial<
  Pick<User, 'firstName' | 'lastName' | 'phone' | 'isActive'>
>;

type MembershipPatch = Partial<Pick<WorkspaceUser, 'status' | 'jobTitle'>>;

const workspaceUserInclude = {
  user: true,
  roles: {
    include: {
      role: true,
    },
  },
  workspace: true,
} satisfies Prisma.WorkspaceUserInclude;

@Injectable()
export class UserRepository {
  constructor(private readonly prisma: PrismaService) {}

  async listByWorkspace(
    workspaceId: string,
    query: { page: number; page_size: number; search?: string; status?: string },
  ) {
    const where: Prisma.WorkspaceUserWhereInput = {
      workspaceId,
      ...(query.status ? { status: query.status } : {}),
      ...(query.search
        ? {
            OR: [
              { user: { email: { contains: query.search, mode: 'insensitive' } } },
              { user: { firstName: { contains: query.search, mode: 'insensitive' } } },
              { user: { lastName: { contains: query.search, mode: 'insensitive' } } },
            ],
          }
        : {}),
    };

    const [items, total] = await this.prisma.$transaction([
      this.prisma.workspaceUser.findMany({
        where,
        include: workspaceUserInclude,
        orderBy: [{ user: { firstName: 'asc' } }, { createdAt: 'asc' }],
        skip: (query.page - 1) * query.page_size,
        take: query.page_size,
      }),
      this.prisma.workspaceUser.count({ where }),
    ]);

    return { items, total };
  }

  findMembershipByUserId(workspaceId: string, userId: string) {
    return this.prisma.workspaceUser.findFirst({
      where: { workspaceId, userId },
      include: workspaceUserInclude,
    });
  }

  findMembershipById(workspaceId: string, workspaceUserId: string) {
    return this.prisma.workspaceUser.findFirst({
      where: { workspaceId, id: workspaceUserId },
      include: workspaceUserInclude,
    });
  }

  findUserByEmail(email: string) {
    return this.prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    });
  }

  async findRolesByIds(workspaceId: string, roleIds: string[]) {
    if (!roleIds.length) {
      return [];
    }

    return this.prisma.role.findMany({
      where: {
        workspaceId,
        id: {
          in: roleIds,
        },
      },
    });
  }

  async createInWorkspace(params: {
    workspaceId: string;
    email: string;
    firstName: string;
    lastName: string;
    phone?: string;
    jobTitle?: string;
    passwordHash: string;
    roleIds?: string[];
  }) {
    return this.prisma.$transaction(async (tx) => {
      const existingUser = await tx.user.findUnique({
        where: { email: params.email.toLowerCase() },
      });

      const user =
        existingUser ??
        (await tx.user.create({
          data: {
            email: params.email.toLowerCase(),
            passwordHash: params.passwordHash,
            firstName: params.firstName,
            lastName: params.lastName,
            phone: params.phone,
          },
        }));

      const membership = await tx.workspaceUser.upsert({
        where: {
          workspaceId_userId: {
            workspaceId: params.workspaceId,
            userId: user.id,
          },
        },
        update: {
          status: 'active',
          jobTitle: params.jobTitle,
        },
        create: {
          workspaceId: params.workspaceId,
          userId: user.id,
          status: 'active',
          jobTitle: params.jobTitle,
        },
      });

      if (params.roleIds !== undefined) {
        await tx.workspaceUserRole.deleteMany({
          where: {
            workspaceId: params.workspaceId,
            workspaceUserId: membership.id,
          },
        });

        if (params.roleIds.length) {
          await tx.workspaceUserRole.createMany({
            data: params.roleIds.map((roleId) => ({
              workspaceId: params.workspaceId,
              workspaceUserId: membership.id,
              roleId,
            })),
            skipDuplicates: true,
          });
        }
      }

      return tx.workspaceUser.findUniqueOrThrow({
        where: { id: membership.id },
        include: workspaceUserInclude,
      });
    });
  }

  async updateInWorkspace(params: {
    workspaceId: string;
    userId: string;
    userData: UserPatch;
    membershipData: MembershipPatch;
    roleIds?: string[];
  }) {
    return this.prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: params.userId },
        data: params.userData,
      });

      const membership = await tx.workspaceUser.update({
        where: {
          workspaceId_userId: {
            workspaceId: params.workspaceId,
            userId: params.userId,
          },
        },
        data: params.membershipData,
      });

      if (params.roleIds !== undefined) {
        await tx.workspaceUserRole.deleteMany({
          where: {
            workspaceId: params.workspaceId,
            workspaceUserId: membership.id,
          },
        });

        if (params.roleIds.length) {
          await tx.workspaceUserRole.createMany({
            data: params.roleIds.map((roleId) => ({
              workspaceId: params.workspaceId,
              workspaceUserId: membership.id,
              roleId,
            })),
            skipDuplicates: true,
          });
        }
      }

      return tx.workspaceUser.findUniqueOrThrow({
        where: { id: membership.id },
        include: workspaceUserInclude,
      });
    });
  }
}