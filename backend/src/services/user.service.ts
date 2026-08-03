import { prisma } from '../config/prisma';
import { AppError } from '../utils/appError';

export type AppRole = 'SUPER_ADMIN' | 'HR_ADMIN' | 'MANAGER' | 'EMPLOYEE';

export const userService = {
  async updateRole(id: string, role: AppRole) {
    const existing = await prisma.user.findUnique({ where: { id } });

    if (!existing) {
      throw new AppError('User not found', 404);
    }

    return prisma.user.update({
      where: { id },
      data: { role },
      select: { id: true, name: true, email: true, role: true, organizationId: true },
    });
  },
};
