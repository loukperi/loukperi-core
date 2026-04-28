import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma.service';

type ListNotificationsQuery = {
  page: number;
  page_size: number;
  is_read?: boolean;
};

@Injectable()
export class NotificationRepository {
  constructor(private readonly prisma: PrismaService) {}

  async listByWorkspaceAndUser(workspaceId: string, userId: string, query: ListNotificationsQuery) {
    const where: Prisma.NotificationWhereInput = {
      workspaceId,
      userId,
      ...(query.is_read !== undefined ? { isRead: query.is_read } : {}),
    };

    const [items, total] = await this.prisma.$transaction([
      this.prisma.notification.findMany({
        where,
        orderBy: [{ createdAt: 'desc' }],
        skip: (query.page - 1) * query.page_size,
        take: query.page_size,
      }),
      this.prisma.notification.count({ where }),
    ]);

    return { items, total };
  }

  findOne(workspaceId: string, userId: string, notificationId: string) {
    return this.prisma.notification.findFirst({ where: { id: notificationId, workspaceId, userId } });
  }

  create(data: Prisma.NotificationUncheckedCreateInput) {
    return this.prisma.notification.create({ data });
  }

  update(notificationId: string, data: Prisma.NotificationUncheckedUpdateInput) {
    return this.prisma.notification.update({ where: { id: notificationId }, data });
  }

  readAll(workspaceId: string, userId: string) {
    return this.prisma.notification.updateMany({
      where: { workspaceId, userId, isRead: false },
      data: { isRead: true, readAt: new Date() },
    });
  }
}
