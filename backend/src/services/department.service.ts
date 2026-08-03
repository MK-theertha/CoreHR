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

  async update(id: string, payload: { name: string }) {
    const existing = await prisma.department.findUnique({ where: { id } });

    if (!existing) {
      throw new AppError('Department not found', 404);
    }

    return prisma.department.update({ where: { id }, data: { name: payload.name } });
  },

  async remove(id: string) {
    const existing = await prisma.department.findUnique({ where: { id } });

    if (!existing) {
      throw new AppError('Department not found', 404);
    }

    return prisma.department.delete({ where: { id } });
  },
};
