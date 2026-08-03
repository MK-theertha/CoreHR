import { prisma } from '../config/prisma';
import { AppError } from '../utils/appError';

export const organizationService = {
  async get() {
    const organization = await prisma.organization.findFirst();

    if (!organization) {
      throw new AppError('No organization configured', 500);
    }

    return organization;
  },

  async update(payload: { name: string }) {
    const organization = await prisma.organization.findFirst();

    if (!organization) {
      throw new AppError('No organization configured', 500);
    }

    return prisma.organization.update({ where: { id: organization.id }, data: { name: payload.name } });
  },
};
