import { prisma } from '../config/prisma';
import { AppError } from '../utils/appError';

export const departmentService = {
  list() {
    return prisma.department.findMany({ orderBy: { name: 'asc' } });
  },

  async create(payload: { name: string }) {
    const organization = await prisma.organization.findFirst();

    if (!organization) {
      throw new AppError('No organization configured', 500);
    }

    return prisma.department.create({ data: { name: payload.name, organizationId: organization.id } });
  },
};
