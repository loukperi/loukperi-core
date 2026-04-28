import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma.service';

type ListReportsQuery = {
  page: number;
  page_size: number;
  entity_type?: string;
  report_type?: string;
};

const reportInclude = { createdByUser: true } satisfies Prisma.SavedReportInclude;

@Injectable()
export class ReportRepository {
  constructor(private readonly prisma: PrismaService) {}

  async listByWorkspace(workspaceId: string, query: ListReportsQuery) {
    const where: Prisma.SavedReportWhereInput = {
      workspaceId,
      ...(query.entity_type ? { entityType: query.entity_type } : {}),
      ...(query.report_type ? { reportType: query.report_type } : {}),
    };

    const [items, total] = await this.prisma.$transaction([
      this.prisma.savedReport.findMany({
        where,
        include: reportInclude,
        orderBy: [{ createdAt: 'desc' }],
        skip: (query.page - 1) * query.page_size,
        take: query.page_size,
      }),
      this.prisma.savedReport.count({ where }),
    ]);

    return { items, total };
  }

  create(data: Prisma.SavedReportUncheckedCreateInput) {
    return this.prisma.savedReport.create({ data, include: reportInclude });
  }

  findOne(workspaceId: string, reportId: string) {
    return this.prisma.savedReport.findFirst({
      where: { workspaceId, id: reportId },
      include: reportInclude,
    });
  }

  update(reportId: string, data: Prisma.SavedReportUncheckedUpdateInput) {
    return this.prisma.savedReport.update({
      where: { id: reportId },
      data,
      include: reportInclude,
    });
  }

  async runReport(workspaceId: string, report: { entityType: string }) {
    switch (report.entityType) {
      case 'record': {
        const [total, open, byPriority] = await this.prisma.$transaction([
          this.prisma.record.count({ where: { workspaceId } }),
          this.prisma.record.count({ where: { workspaceId, OR: [{ closedAt: null }, { status: { isTerminal: false } }] } }),
          this.prisma.record.groupBy({
            by: ['priority'],
            where: { workspaceId },
            orderBy: { priority: 'asc' },
            _count: { id: true },
          }),
        ]);

        return {
          columns: ['metric', 'value'],
          rows: [{ metric: 'total_records', value: total }, { metric: 'open_records', value: open }],
          totals: {
            by_priority: byPriority.map((item) => ({
              priority: item.priority,
              count: (item as any)._count?.id ?? (item as any)._count?._all ?? 0,
            })),
          },
        };
      }
      case 'task': {
        const grouped = await this.prisma.task.groupBy({ by: ['status'], _count: { _all: true }, where: { workspaceId } });
        return {
          columns: ['status', 'count'],
          rows: grouped.map((item) => ({ status: item.status, count: item._count._all })),
          totals: { total_tasks: grouped.reduce((acc, item) => acc + item._count._all, 0) },
        };
      }
      case 'account': {
        const total = await this.prisma.account.count({ where: { workspaceId } });
        return { columns: ['metric', 'value'], rows: [{ metric: 'total_accounts', value: total }], totals: { total_accounts: total } };
      }
      default:
        return { columns: [], rows: [], totals: {} };
    }
  }
}
