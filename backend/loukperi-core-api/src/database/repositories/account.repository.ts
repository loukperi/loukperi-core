import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma.service';

type ListAccountsQuery = {
  page: number;
  page_size: number;
  search?: string;
  account_type?: string;
  status?: string;
  owner_user_id?: string;
};

const accountInclude = {
  ownerUser: true,
  contacts: { take: 5, orderBy: { createdAt: 'desc' as const } },
  records: { take: 5, orderBy: { createdAt: 'desc' as const } },
} satisfies Prisma.AccountInclude;

@Injectable()
export class AccountRepository {
  constructor(private readonly prisma: PrismaService) {}

  async listByWorkspace(workspaceId: string, query: ListAccountsQuery) {
    const where: Prisma.AccountWhereInput = {
      workspaceId,
      ...(query.account_type ? { accountType: query.account_type } : {}),
      ...(query.status ? { status: query.status } : {}),
      ...(query.owner_user_id ? { ownerUserId: query.owner_user_id } : {}),
      ...(query.search
        ? {
            OR: [
              { name: { contains: query.search, mode: 'insensitive' } },
              { code: { contains: query.search, mode: 'insensitive' } },
              { email: { contains: query.search, mode: 'insensitive' } },
              { vatNumber: { contains: query.search, mode: 'insensitive' } },
            ],
          }
        : {}),
    };

    const [items, total] = await this.prisma.$transaction([
      this.prisma.account.findMany({
        where,
        include: accountInclude,
        orderBy: [{ createdAt: 'desc' }],
        skip: (query.page - 1) * query.page_size,
        take: query.page_size,
      }),
      this.prisma.account.count({ where }),
    ]);

    return { items, total };
  }

  create(data: Prisma.AccountUncheckedCreateInput) {
    return this.prisma.account.create({ data, include: accountInclude });
  }

  findOne(workspaceId: string, accountId: string) {
    return this.prisma.account.findFirst({
      where: { workspaceId, id: accountId },
      include: accountInclude,
    });
  }

  update(accountId: string, data: Prisma.AccountUncheckedUpdateInput) {
    return this.prisma.account.update({
      where: { id: accountId },
      data,
      include: accountInclude,
    });
  }

  async listRecords(workspaceId: string, accountId: string, page: number, pageSize: number) {
    const where: Prisma.RecordWhereInput = { workspaceId, accountId };
    const [items, total] = await this.prisma.$transaction([
      this.prisma.record.findMany({
        where,
        include: { recordType: true, status: true, assigneeUser: true },
        orderBy: [{ createdAt: 'desc' }],
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.record.count({ where }),
    ]);

    return { items, total };
  }

  async listContacts(workspaceId: string, accountId: string, page: number, pageSize: number) {
    const where: Prisma.ContactWhereInput = { workspaceId, accountId };
    const [items, total] = await this.prisma.$transaction([
      this.prisma.contact.findMany({
        where,
        include: { account: true },
        orderBy: [{ createdAt: 'desc' }],
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.contact.count({ where }),
    ]);

    return { items, total };
  }
}
