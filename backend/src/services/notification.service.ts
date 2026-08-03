import { prisma } from '../config/prisma';
import { AppError } from '../utils/appError';

export const notificationService = {
  listForUser(userId: string) {
    return prisma.notification.findMany({ where: { userId }, orderBy: { createdAt: 'desc' } });
  },

  create(payload: { userId: string; title: string; message: string; type: string }) {
    return prisma.notification.create({ data: payload });
  },

  async markRead(id: string, userId: string) {
    const notification = await prisma.notification.findUnique({ where: { id } });

    if (!notification || notification.userId !== userId) {
      throw new AppError('Notification not found', 404);
    }

    return prisma.notification.update({ where: { id }, data: { isRead: true } });
  },

  markAllRead(userId: string) {
    return prisma.notification.updateMany({ where: { userId, isRead: false }, data: { isRead: true } });
  },
};
