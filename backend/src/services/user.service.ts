import { prisma } from '../config/prisma';
import { AppError } from '../utils/appError';
import { auditService } from './audit.service';

export type AppRole = 'SUPER_ADMIN' | 'HR_ADMIN' | 'MANAGER' | 'EMPLOYEE';
type Actor = { userId: string; ipAddress?: string | null };

export const userService = {
  async updateRole(id: string, role: AppRole, actor?: Actor) {
    const existing = await prisma.user.findUnique({ where: { id } });

    if (!existing) {
      throw new AppError('User not found', 404);
    }

    const updated = await prisma.user.update({
      where: { id },
      data: { role },
      select: { id: true, name: true, email: true, role: true, organizationId: true },
    });

    if (actor) {
      await auditService.record({
        userId: actor.userId,
        ipAddress: actor.ipAddress,
        action: 'USER_ROLE_CHANGED',
        entityType: 'User',
        entityId: id,
        metadata: { fromRole: existing.role, toRole: role },
      });
    }

    return updated;
  },
};
