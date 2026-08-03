import { prisma } from '../config/prisma';
import { AppError } from '../utils/appError';

const withManagerInfo = {
  _count: { select: { employees: true } },
  employees: {
    where: { user: { role: 'MANAGER' as const } },
    select: { id: true, fullName: true, email: true },
    take: 1,
  },
} as const;

const toPublicDepartment = <T extends { _count: { employees: number }; employees: { id: string; fullName: string; email: string }[] }>(
  department: T,
) => {
  const { _count, employees, ...rest } = department;
  return { ...rest, employeeCount: _count.employees, manager: employees[0] ?? null };
};

export const departmentService = {
  async list() {
    const departments = await prisma.department.findMany({
      include: withManagerInfo,
      orderBy: { name: 'asc' },
    });

    return departments.map(toPublicDepartment);
  },

  async getById(id: string) {
    const department = await prisma.department.findUnique({ where: { id }, include: withManagerInfo });

    if (!department) {
      throw new AppError('Department not found', 404);
    }

    return toPublicDepartment(department);
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
