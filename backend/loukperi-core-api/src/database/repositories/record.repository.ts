import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma.service';

type ListRecordsQuery = {
  page: number;
  page_size: number;
  record_type_id?: string;
  status_id?: string;
  assignee_user_id?: string;
  owner_user_id?: string;
  account_id?: string;
  priority?: string;
  due_before?: string;
  due_after?: string;
  search?: string;
};

type CreateRecordInput = Prisma.RecordUncheckedCreateInput;

const recordInclude = {
  recordType: true,
  status: true,
  account: true,
  contact: true,
  ownerUser: true,
  assigneeUser: true,
  tagAssignments: {
    include: {
      tag: true,
    },
  },
} satisfies Prisma.RecordInclude;

@Injectable()
export class RecordRepository {
  constructor(private readonly prisma: PrismaService) {}

  async listByWorkspace(workspaceId: string, query: ListRecordsQuery) {
    const where: Prisma.RecordWhereInput = {
      workspaceId,
      ...(query.record_type_id ? { recordTypeId: query.record_type_id } : {}),
      ...(query.status_id ? { statusId: query.status_id } : {}),
      ...(query.assignee_user_id ? { assigneeUserId: query.assignee_user_id } : {}),
      ...(query.owner_user_id ? { ownerUserId: query.owner_user_id } : {}),
      ...(query.account_id ? { accountId: query.account_id } : {}),
      ...(query.priority ? { priority: query.priority } : {}),
      ...(query.due_before || query.due_after
        ? {
            dueAt: {
              ...(query.due_before ? { lte: new Date(query.due_before) } : {}),
              ...(query.due_after ? { gte: new Date(query.due_after) } : {}),
            },
          }
        : {}),
      ...(query.search
        ? {
            OR: [
              { title: { contains: query.search, mode: 'insensitive' } },
              { code: { contains: query.search, mode: 'insensitive' } },
              { description: { contains: query.search, mode: 'insensitive' } },
            ],
          }
        : {}),
    };

    const [items, total] = await this.prisma.$transaction([
      this.prisma.record.findMany({
        where,
        include: recordInclude,
        orderBy: [{ createdAt: 'desc' }],
        skip: (query.page - 1) * query.page_size,
        take: query.page_size,
      }),
      this.prisma.record.count({ where }),
    ]);

    return { items, total };
  }

  create(data: CreateRecordInput) {
    return this.prisma.record.create({
      data,
      include: recordInclude,
    });
  }

  findOne(workspaceId: string, recordId: string) {
    return this.prisma.record.findFirst({
      where: { workspaceId, id: recordId },
      include: recordInclude,
    });
  }

  update(recordId: string, data: Prisma.RecordUncheckedUpdateInput) {
    return this.prisma.record.update({
      where: { id: recordId },
      data,
      include: recordInclude,
    });
  }
}
