import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma.service';

type ListContactsQuery = {
  page: number;
  page_size: number;
  search?: string;
  account_id?: string;
};

const contactInclude = { account: true } satisfies Prisma.ContactInclude;

@Injectable()
export class ContactRepository {
  constructor(private readonly prisma: PrismaService) {}

  async listByWorkspace(workspaceId: string, query: ListContactsQuery) {
    const where: Prisma.ContactWhereInput = {
      workspaceId,
      ...(query.account_id ? { accountId: query.account_id } : {}),
      ...(query.search
        ? {
            OR: [
              { firstName: { contains: query.search, mode: 'insensitive' } },
              { lastName: { contains: query.search, mode: 'insensitive' } },
              { email: { contains: query.search, mode: 'insensitive' } },
              { phone: { contains: query.search, mode: 'insensitive' } },
            ],
          }
        : {}),
    };

    const [items, total] = await this.prisma.$transaction([
      this.prisma.contact.findMany({
        where,
        include: contactInclude,
        orderBy: [{ createdAt: 'desc' }],
        skip: (query.page - 1) * query.page_size,
        take: query.page_size,
      }),
      this.prisma.contact.count({ where }),
    ]);

    return { items, total };
  }

  create(data: Prisma.ContactUncheckedCreateInput) {
    return this.prisma.contact.create({ data, include: contactInclude });
  }

  findOne(workspaceId: string, contactId: string) {
    return this.prisma.contact.findFirst({
      where: { workspaceId, id: contactId },
      include: contactInclude,
    });
  }

  update(contactId: string, data: Prisma.ContactUncheckedUpdateInput) {
    return this.prisma.contact.update({
      where: { id: contactId },
      data,
      include: contactInclude,
    });
  }
}
