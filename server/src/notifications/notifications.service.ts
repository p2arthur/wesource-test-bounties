import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class NotificationsService {
  constructor(private readonly prisma: PrismaService) {}

  async getNotifications(walletAddress: string, page: number = 1, limit: number = 20) {
    const skip = (page - 1) * limit;

    const user = await this.prisma.user.findFirst({
      where: { wallet: walletAddress },
    });

    if (!user) {
      return {
        data: [],
        total: 0,
        page,
        limit,
        totalPages: 0,
      };
    }

    const [notifications, total] = await Promise.all([
      this.prisma.notification.findMany({
        where: { userId: user.id },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        include: {
          bounty: {
            select: {
              id: true,
              issueUrl: true,
              amount: true,
            },
          },
        },
      }),
      this.prisma.notification.count({ where: { userId: user.id } }),
    ]);

    const totalPages = Math.ceil(total / limit);

    return {
      data: notifications,
      total,
      page,
      limit,
      totalPages,
    };
  }

  async markNotificationAsRead(notificationId: number) {
    return this.prisma.notification.update({
      where: { id: notificationId },
      data: { read: true },
    });
  }

  async getUnreadCount(walletAddress: string) {
    const user = await this.prisma.user.findFirst({
      where: { wallet: walletAddress },
    });

    if (!user) {
      return { unreadCount: 0 };
    }

    const unreadCount = await this.prisma.notification.count({
      where: {
        userId: user.id,
        read: false,
      },
    });

    return { unreadCount };
  }

  async createNotification(
    walletAddress: string,
    type: string,
    message: string,
    bountyId?: number,
  ) {
    const user = await this.prisma.user.findFirst({
      where: { wallet: walletAddress },
    });

    if (!user) {
      return null;
    }

    return this.prisma.notification.create({
      data: {
        userId: user.id,
        type,
        message,
        bountyId,
      },
    });
  }
}
